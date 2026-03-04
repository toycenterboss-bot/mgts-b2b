const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { getPageUrl } = require('./load-pages-urls');

const BASE_URL = 'https://business.mgts.ru';

// Фильтруем нулевые байты из stdout/stderr, чтобы они не попадали в лог
(() => {
    const sanitizeChunk = (chunk) => {
        if (typeof chunk === 'string') {
            return chunk.replace(/\u0000/g, '');
        }
        if (Buffer.isBuffer(chunk)) {
            return Buffer.from(chunk.toString('utf8').replace(/\u0000/g, ''), 'utf8');
        }
        return chunk;
    };
    const origStdoutWrite = process.stdout.write.bind(process.stdout);
    const origStderrWrite = process.stderr.write.bind(process.stderr);
    process.stdout.write = (chunk, encoding, callback) => origStdoutWrite(sanitizeChunk(chunk), encoding, callback);
    process.stderr.write = (chunk, encoding, callback) => origStderrWrite(sanitizeChunk(chunk), encoding, callback);
})();

function sanitizeFileLabel(label) {
    const safe = (label || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80);
    return safe || 'image';
}

function saveLLMScreenshot(outputDir, safeSlug, label, base64) {
    const imagesDir = path.join(outputDir, `${safeSlug}_llm_images`);
    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
    }
    const fileName = `${safeSlug}_${sanitizeFileLabel(label)}.png`;
    const filePath = path.join(imagesDir, fileName);
    fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
    return filePath;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeInfoformenResult(result) {
    if (!result || !Array.isArray(result.sections)) {
        return;
    }

    const sections = result.sections;
    const accordionSections = sections.filter(section => section && section.type === 'accordion');
    if (accordionSections.length === 0) {
        return;
    }

    const hasContent = (item) => {
        if (!item) return false;
        const text = (item.content?.text || '').trim();
        const fileLinks = Array.isArray(item.content?.fileLinks) ? item.content.fileLinks : [];
        const cards = Array.isArray(item.content?.cards) ? item.content.cards : [];
        const table = item.content?.table;
        const tableRows = Array.isArray(table?.rows) ? table.rows.length : 0;
        const tableHeaders = Array.isArray(table?.headers) ? table.headers.length : 0;
        return Boolean(text) || fileLinks.length > 0 || cards.length > 0 || tableRows > 0 || tableHeaders > 0;
    };

    let contentSection = sections.find(section => section && section.type === 'content' && Array.isArray(section.elements));
    if (!contentSection) {
        contentSection = {
            type: 'content',
            title: result.metadata?.title || 'Информация для акционеров',
            subtitle: null,
            text: '',
            elements: []
        };
        sections.push(contentSection);
    }

    let accordionElement = contentSection.elements.find(element => element && element.type === 'accordion');
    if (!accordionElement) {
        accordionElement = {
            type: 'accordion',
            title: 'Собрания акционеров по датам',
            items: []
        };
        contentSection.elements.push(accordionElement);
    }

    const items = [];
    const indexByTitle = new Map();

    accordionSections.forEach(section => {
        const title = (section.title || '').trim();
        if (!title) return;

        const fileLinks = Array.isArray(section.links?.fileLinks) ? section.links.fileLinks : [];
        const text = (section.text || '').trim();
        const cards = Array.isArray(section.cards) ? section.cards : [];
        const table = section.table || null;
        const score = (fileLinks.length * 10) + text.length + (cards.length * 2) + (table ? 5 : 0);
        const item = {
            title,
            isActive: false,
            content: {
                text,
                fileLinks,
                cards,
                table
            },
            _score: score
        };

        if (indexByTitle.has(title)) {
            const idx = indexByTitle.get(title);
            if (score > items[idx]._score) {
                items[idx] = item;
            }
        } else {
            indexByTitle.set(title, items.length);
            items.push(item);
        }
    });

    accordionElement.items = items
        .filter(hasContent)
        .map(({ _score, ...rest }) => rest);

    // Удаляем отдельные accordion-секции, оставляя единый аккордеон в content
    result.sections = sections.filter(section => section && section.type !== 'accordion');

    result.sections.forEach((section, index) => {
        section.sectionIndex = index + 1;
    });
}

function getApiKeyFromContext() {
    try {
        const contextPath = path.join(__dirname, '..', '..', 'docs', 'project', 'CONTEXT.md');
        if (fs.existsSync(contextPath)) {
            const contextContent = fs.readFileSync(contextPath, 'utf-8');
            const perplexityKeyMatch = contextContent.match(/pplx-[a-zA-Z0-9]+/);
            if (perplexityKeyMatch) {
                return perplexityKeyMatch[0];
            }
            const perplexityExportMatch = contextContent.match(/PERPLEXITY_API_KEY["']?\s*=\s*["']?([^"'\s]+)["']?/i);
            if (perplexityExportMatch) {
                return perplexityExportMatch[1];
            }
            const openaiMatch = contextContent.match(/OPENAI_API_KEY["']?\s*=\s*["']?([^"'\s]+)["']?/i);
            if (openaiMatch) {
                return openaiMatch[1];
            }
        }
    } catch (error) {
        console.warn('⚠️  Не удалось прочитать CONTEXT.md:', error.message);
    }
    return null;
}

const LLM_CONFIG = {
    provider: process.env.LLM_PROVIDER || 'perplexity',
    apiKey: process.env.PERPLEXITY_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || getApiKeyFromContext() || '',
    model: process.env.LLM_MODEL || 'sonar',
    baseURL: process.env.LLM_BASE_URL || 'https://api.perplexity.ai'
};

const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS) || 180000;
const LLM_RETRY_COUNT = Number(process.env.LLM_RETRY_COUNT) || 3;
const LLM_RETRY_DELAY_MS = Number(process.env.LLM_RETRY_DELAY_MS) || 5000;

function isRetryableLLMError(error) {
    const code = error?.code;
    const status = error?.response?.status;
    if (code && ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNABORTED'].includes(code)) {
        return true;
    }
    if (status && [408, 429, 500, 502, 503, 504].includes(status)) {
        return true;
    }
    return false;
}

function buildAccordionPrompt(pageUrl, accordionTitle) {
    return `Ты анализируешь ОДИН раскрытый аккордеон на странице и возвращаешь структуру только для него.

URL страницы: ${pageUrl}
Название аккордеона: "${accordionTitle}"

Требования:
- Верни JSON строго по формату ниже.
- НЕ добавляй другие секции (sidebar/hero/таблицы вне аккордеона).
- НЕ выдумывай данные. Используй только HTML и скриншот.
- Извлекай все ссылки и файлы из HTML.
- КРИТИЧЕСКИ ВАЖНО для fileLinks: у каждого файла должны быть поля:
  * text: название файла (если рядом есть подпись/заголовок)
  * href: абсолютная или относительная ссылка
  * type: расширение файла (pdf, doc, xls и т.д.) или mime-тип, если виден
  * size: размер файла, если указан в тексте рядом
- НЕ возвращай fileLinks как строки. Только массив объектов.
- Если в аккордеоне есть таблицы (<table>), извлеки headers и rows полностью.

Формат ответа:
{
  "sections": [
    {
      "type": "accordion",
      "title": "ТОЧНЫЙ заголовок аккордеона",
      "description": "краткое описание содержимого аккордеона",
      "text": "основной текст из раскрытого аккордеона",
      "links": {
        "internalLinks": [],
        "externalLinks": [],
        "fileLinks": [
          { "text": "Название файла", "href": "/path/file.pdf", "type": "pdf", "size": "1.2 MB" }
        ],
        "imageLinks": []
      },
      "cards": [],
      "table": null
    }
  ]
}`;
}

function buildBasePrompt(pageUrl) {
    return `Ты - эксперт по анализу веб-страниц. Проанализируй HTML и скриншот, чтобы описать основной контент страницы, НО ИСКЛЮЧИ ВСЕ АККОРДЕОНЫ (их контент будет обработан отдельно).

URL страницы: ${pageUrl}

Требования:
- Игнорируй header и footer.
- Если есть sidebar, создай отдельную секцию "sidebar" и извлеки ВСЕ ссылки.
- КРИТИЧЕСКИ ВАЖНО для sidebar:
  * для каждой ссылки укажи text (точный текст пункта меню), href и purpose
  * НЕ возвращай sidebar.links как массив строк
  * опиши структуру меню (группы, заголовки, активный пункт)
- НЕ включай секции типа "accordion".
- НЕ выдумывай данные. Используй только HTML и скриншот.

Формат ответа:
{
  "sections": [
    {
      "type": "content",
      "title": "заголовок секции",
      "subtitle": null,
      "text": "текст секции",
      "links": {
        "internalLinks": [],
        "externalLinks": [],
        "fileLinks": [],
        "imageLinks": []
      },
      "cards": [],
      "table": null
    }
  ]
}`;
}

async function callLLM({ prompt, htmlContent, textContent, screenshotBase64, chunkMeta }) {
    if (!LLM_CONFIG.apiKey) {
        throw new Error('Не задан API ключ для LLM. Установи PERPLEXITY_API_KEY или LLM_PROVIDER/LLM_MODEL.');
    }

    const requestStartedAt = new Date();
    if (chunkMeta) {
        const metaLabel = `chunk ${chunkMeta.index}/${chunkMeta.total}`;
        const metaTitle = chunkMeta.title ? `, title="${chunkMeta.title}"` : '';
        console.log(`[${requestStartedAt.toISOString()}] 🧠 LLM запрос: ${metaLabel}${metaTitle}, html=${htmlContent.length} chars, text=${textContent.length} chars`);
    }

    if (LLM_CONFIG.provider !== 'perplexity' && LLM_CONFIG.provider !== 'openai') {
        throw new Error('Режим анализа по скриншоту поддерживается только для Perplexity и OpenAI');
    }

    const apiBaseURL = LLM_CONFIG.provider === 'perplexity'
        ? 'https://api.perplexity.ai'
        : (LLM_CONFIG.baseURL || 'https://api.openai.com/v1');

    let apiDots = 0;
    const apiProgressInterval = setInterval(() => {
        apiDots++;
        process.stdout.write(`\r   📤 Отправка запроса к LLM API${'.'.repeat(apiDots % 4)}   `);
    }, 800);

    let response;
    for (let attempt = 1; attempt <= LLM_RETRY_COUNT; attempt++) {
        try {
            if (attempt > 1) {
                console.warn(`\n   ↻ Повтор запроса к LLM (${attempt}/${LLM_RETRY_COUNT}) через ${LLM_RETRY_DELAY_MS} ms`);
                await new Promise(resolve => setTimeout(resolve, LLM_RETRY_DELAY_MS));
            }

            response = await axios.post(
                `${apiBaseURL}/chat/completions`,
                {
                    model: LLM_CONFIG.model,
                    messages: [
                        {
                            role: 'system',
                            content: 'Ты - эксперт по анализу веб-страниц. Возвращай результат строго в формате JSON без дополнительных комментариев.'
                        },
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'text',
                                    text: `${prompt}

HTML контент:
${htmlContent.substring(0, 30000)}

Текстовая версия:
${textContent.substring(0, 8000)}`
                                },
                                {
                                    type: 'image_url',
                                    image_url: {
                                        url: `data:image/png;base64,${screenshotBase64}`
                                    }
                                }
                            ]
                        }
                    ],
                    temperature: 0.3,
                    max_tokens: 32000
                },
                {
                    headers: {
                        'Authorization': `Bearer ${LLM_CONFIG.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: LLM_TIMEOUT_MS
                }
            );
            break;
        } catch (apiError) {
            const retryable = isRetryableLLMError(apiError);
            if (!retryable || attempt === LLM_RETRY_COUNT) {
                clearInterval(apiProgressInterval);
                if (apiError.code === 'ECONNABORTED') {
                    console.error(`\n   ❌ Превышен таймаут LLM (${LLM_TIMEOUT_MS} ms).`);
                }
                const elapsedMs = Date.now() - requestStartedAt.getTime();
                if (chunkMeta) {
                    console.warn(`[${new Date().toISOString()}] 🧠 LLM запрос завершился ошибкой (${elapsedMs} ms): chunk ${chunkMeta.index}/${chunkMeta.total}`);
                }
                throw apiError;
            }
            console.warn(`\n   ⚠️  Ошибка LLM (${apiError.code || apiError.response?.status || 'unknown'}), повторяем...`);
        }
    }

    clearInterval(apiProgressInterval);
    process.stdout.write(`\r   ✅ Получен ответ от LLM API\n`);

    process.stdout.write('   📄 Обработка ответа...');
    const llmResponse = response.data.choices[0].message.content;

    const rawResponsePath = path.join(__dirname, '..', 'temp', 'page-analysis-llm', `${Date.now()}_llm_raw_response.txt`);
    fs.writeFileSync(rawResponsePath, llmResponse);
    process.stdout.write(` ✓\n   📄 Парсинг JSON ответа...`);

    const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            const parsed = JSON.parse(jsonMatch[0]);
            process.stdout.write(` ✓\n`);
            const elapsedMs = Date.now() - requestStartedAt.getTime();
            if (chunkMeta) {
                console.log(`[${new Date().toISOString()}] 🧠 LLM ответ получен (${elapsedMs} ms): chunk ${chunkMeta.index}/${chunkMeta.total}`);
            }
            return parsed;
        } catch (parseError) {
            console.warn('⚠️  Ошибка парсинга JSON, пытаемся исправить...');
            console.warn(`   Позиция ошибки: ${parseError.message}`);

            let fixedJson = jsonMatch[0]
                .replace(/,\s*}/g, '}')
                .replace(/,\s*]/g, ']')
                .replace(/([^\\])\n/g, '$1 ')
                .replace(/,\s*,/g, ',');

            try {
                const parsed = JSON.parse(fixedJson);
                const elapsedMs = Date.now() - requestStartedAt.getTime();
                if (chunkMeta) {
                    console.log(`[${new Date().toISOString()}] 🧠 LLM ответ восстановлен (${elapsedMs} ms): chunk ${chunkMeta.index}/${chunkMeta.total}`);
                }
                return parsed;
            } catch (secondError) {
                console.error('❌ Не удалось восстановить JSON:', secondError.message);
                const errorJsonPath = path.join(__dirname, '..', 'temp', 'page-analysis-llm', `${Date.now()}_error_json.txt`);
                fs.writeFileSync(errorJsonPath, fixedJson);
                console.error(`   📄 Проблемный JSON сохранен: ${errorJsonPath}`);
                return { error: `Ошибка парсинга JSON: ${secondError.message}`, rawResponse: llmResponse };
            }
        }
    }

    return { error: 'Не удалось извлечь JSON из ответа LLM', rawResponse: llmResponse };
}

async function main() {
    const slug = process.argv[2] || 'infoformen';
    const outputDir = path.join(__dirname, '..', 'temp', 'page-analysis-llm');
    const safeSlug = slug.replace(/\//g, '_');

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const pageUrl = getPageUrl(slug, BASE_URL);
    const debugLogPath = path.join(outputDir, `${safeSlug}_accordion_debug.log`);
    const writeDebugLog = (message) => {
        const line = `[${new Date().toISOString()}] ${message}`;
        try {
            fs.appendFileSync(debugLogPath, line + '\n');
        } catch (error) {
            console.warn(`⚠️  Не удалось записать debug лог: ${error.message}`);
        }
        console.log(line);
    };

    writeDebugLog(`🤖 АНАЛИЗ АККОРДЕОНОВ ДЛЯ: ${slug}`);
    writeDebugLog(`🌐 URL: ${pageUrl}`);
    writeDebugLog(`📁 Вывод: ${outputDir}`);
    writeDebugLog(`🤖 LLM: ${LLM_CONFIG.provider} (${LLM_CONFIG.model})`);

    const chromeHomeDir = path.join(outputDir, `${safeSlug}_chrome_home`);
    const chromeProfileDir = path.join(chromeHomeDir, 'profile');
    try {
        fs.mkdirSync(chromeProfileDir, { recursive: true });
    } catch (error) {
        writeDebugLog(`WARN: Не удалось создать Chrome profile dir: ${error.message}`);
    }
    const puppeteerExecutablePath =
        typeof puppeteer.executablePath === 'function' ? puppeteer.executablePath() : null;
    const chromeCandidates = [
        process.env.PUPPETEER_EXECUTABLE_PATH,
        process.env.CHROME_PATH,
        puppeteerExecutablePath,
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
        '/Applications/Chromium.app/Contents/MacOS/Chromium'
    ].filter(Boolean);
    const chromeExecutablePath = chromeCandidates.find(candidate => {
        try {
            return fs.existsSync(candidate);
        } catch {
            return false;
        }
    });
    if (chromeExecutablePath) {
        writeDebugLog(`INFO: Используется Chrome executablePath: ${chromeExecutablePath}`);
    } else {
        writeDebugLog('WARN: Не найден локальный Chrome. Используется bundled Chromium.');
    }

    const browser = await puppeteer.launch({
        headless: false,
        userDataDir: chromeProfileDir,
        ...(chromeExecutablePath ? { executablePath: chromeExecutablePath } : {}),
        env: { ...process.env, HOME: chromeHomeDir },
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-crashpad',
            '--no-crashpad',
            '--disable-breakpad',
            '--disable-crash-reporter',
            '--no-crash-upload',
            '--disable-features=Crashpad,CrashpadUserStream',
            '--force-device-scale-factor=1',
            '--high-dpi-support=1',
            '--window-size=1920,1080',
            '--no-first-run',
            '--no-default-browser-check'
        ],
        defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 }
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

        page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            if (type === 'log') {
                process.stdout.write(`   [Browser] ${text}\n`);
            } else if (type === 'warn') {
                process.stdout.write(`   [Browser WARN] ${text}\n`);
            } else if (type === 'error') {
                process.stdout.write(`   [Browser ERROR] ${text}\n`);
            }
        });

        writeDebugLog(`📥 Загрузка страницы: ${pageUrl}`);
        await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 120000 });
        await sleep(2000);

        const pageTitle = await page.title();
        const fullScreenshotPath = path.join(outputDir, `${safeSlug}_screenshot.png`);
        await page.screenshot({ path: fullScreenshotPath, fullPage: true });
        writeDebugLog(`📸 Скриншот: ${fullScreenshotPath}`);

        const baseContent = await page.evaluate(() => {
            const clone = document.cloneNode(true);
            const toRemove = clone.querySelectorAll('.accordion-row, .accordion, [class*="accordion"]');
            toRemove.forEach(node => node.remove());
            const body = clone.body || clone;
            return {
                html: body.innerHTML || '',
                text: body.innerText || ''
            };
        });

        writeDebugLog(`🧾 Base HTML (без аккордеонов): ${(baseContent.html.length / 1024).toFixed(1)} KB`);

        let sections = [];

        const basePrompt = buildBasePrompt(pageUrl);
        const baseScreenshotBase64 = fs.readFileSync(fullScreenshotPath, { encoding: 'base64' });
        writeDebugLog('📤 Отправка base-контента в LLM (без аккордеонов)...');
        const baseResult = await callLLM({
            prompt: basePrompt,
            htmlContent: baseContent.html,
            textContent: baseContent.text,
            screenshotBase64: baseScreenshotBase64,
            chunkMeta: { index: 1, total: 1, title: 'base-content' }
        });
        if (baseResult && Array.isArray(baseResult.sections)) {
            sections = sections.concat(baseResult.sections);
        }

        const accordionRows = await page.$$('.accordion-row');
        writeDebugLog(`🧩 Найдено аккордеонов: ${accordionRows.length}`);

        for (let i = 0; i < accordionRows.length; i++) {
            const rowHandle = accordionRows[i];
            await rowHandle.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'center' }));
            await sleep(400);

            const headerHandle = await rowHandle.$('.accordion-row__header') ||
                await rowHandle.$('button[aria-expanded], [data-toggle="collapse"], [aria-controls]');
            const titleText = headerHandle
                ? await headerHandle.evaluate(el => (el.textContent || '').trim())
                : `accordion-${i + 1}`;

            const isExpanded = await rowHandle.evaluate(el => {
                const header = el.querySelector('.accordion-row__header [aria-expanded], .accordion-row__header button, .accordion-row__header');
                const aria = header?.getAttribute?.('aria-expanded');
                if (aria === 'true') return true;
                if (header?.classList?.contains('active') || header?.classList?.contains('open')) return true;
                const content = el.querySelector('.accordion-row__content, .accordion-row__container-collapse, .accordion-row__content-inner');
                if (content && content.scrollHeight > 0 && content.offsetHeight > 0) return true;
                return false;
            });

            if (!isExpanded && headerHandle) {
                await headerHandle.click();
                await sleep(800);
            }

            const contentHandle = await rowHandle.$('.accordion-row__content') ||
                await rowHandle.$('.accordion-row__container-collapse') ||
                await rowHandle.$('.accordion-row__content-inner') ||
                rowHandle;

            const accordionHtml = await contentHandle.evaluate(el => el.outerHTML || '');
            const accordionText = await contentHandle.evaluate(el => (el.innerText || '').trim());
            const screenshotBase64 = await contentHandle.screenshot({ encoding: 'base64' });
            const screenshotPath = saveLLMScreenshot(outputDir, safeSlug, `accordion_${i + 1}_${titleText}`, screenshotBase64);
            writeDebugLog(`📸 Аккордеон ${i + 1} скриншот: ${screenshotPath}`);

            const prompt = buildAccordionPrompt(pageUrl, titleText);
            writeDebugLog(`📤 LLM аккордеон ${i + 1}/${accordionRows.length}: ${titleText}`);

            const accordionResult = await callLLM({
                prompt,
                htmlContent: accordionHtml,
                textContent: accordionText,
                screenshotBase64,
                chunkMeta: { index: i + 1, total: accordionRows.length, title: titleText }
            });

            if (accordionResult && Array.isArray(accordionResult.sections)) {
                sections = sections.concat(accordionResult.sections);
            }
        }

        const result = {
            page: {
                slug,
                url: pageUrl,
                pathname: `/${slug}`,
                analyzedAt: new Date().toISOString(),
                screenshot: fullScreenshotPath,
                llmProvider: LLM_CONFIG.provider,
                llmModel: LLM_CONFIG.model
            },
            metadata: {
                title: pageTitle
            },
            sections
        };

        normalizeInfoformenResult(result);

        const outputPath = path.join(outputDir, `${safeSlug}_spec.json`);
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
        writeDebugLog(`✅ ТЗ сохранено: ${outputPath}`);
    } finally {
        await browser.close();
    }
}

main().catch(error => {
    console.error('❌ Ошибка анализа:', error.message);
    process.exit(1);
});
