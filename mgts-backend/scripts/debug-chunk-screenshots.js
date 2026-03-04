const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { getPageUrl } = require('./load-pages-urls');

function parseArgs(argv) {
    const args = {
        slug: null,
        url: null,
        strategy: 'heading',
        tags: ['h2', 'h3', 'h4'],
        chunks: 0,
        fullWidth: false,
        headless: false,
        outputDir: null
    };
    argv.forEach((arg, i) => {
        if (!arg.startsWith('--') && !args.slug) {
            args.slug = arg;
            return;
        }
        if (arg.startsWith('--url=')) args.url = arg.split('=')[1];
        if (arg.startsWith('--strategy=')) args.strategy = arg.split('=')[1];
        if (arg.startsWith('--tag=')) args.tags = arg.split('=')[1].split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
        if (arg.startsWith('--chunks=')) args.chunks = parseInt(arg.split('=')[1], 10) || 0;
        if (arg === '--full-width') args.fullWidth = true;
        if (arg === '--headless') args.headless = true;
        if (arg.startsWith('--output=')) args.outputDir = arg.split('=')[1];
    });
    return args;
}

function sanitizeFileLabel(label) {
    const safe = (label || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80);
    return safe || 'chunk';
}

function extractHeadings(html, tags) {
    const tagGroup = tags.map(tag => tag.replace(/[^\w]/g, '')).join('|');
    const headingRegex = new RegExp(`<(${tagGroup})[^>]*>(.*?)<\\/\\1>`, 'gi');
    const headings = [];
    const seen = new Set();
    const occurrences = new Map();
    let match;
    while ((match = headingRegex.exec(html)) !== null) {
        const tag = match[1].toLowerCase();
        const text = match[2].replace(/<[^>]+>/g, '').trim();
        if (!text || text.length > 200) continue;
        const key = `${text}|${Math.floor(match.index / 1000)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const occ = (occurrences.get(text) || 0) + 1;
        occurrences.set(text, occ);
        headings.push({ tag, text, index: match.index, occurrence: occ });
    }
    return headings;
}

async function getChunkScreenshot(page, heading, options) {
    return page.evaluate(
        (heading, options) => {
            const headings = Array.from(document.querySelectorAll(options.tags.join(',')));
            const matches = headings.filter(h => h.tagName.toLowerCase() === heading.tag && h.textContent.trim().includes(heading.text));
            const desiredIndex = Math.max(0, (heading.occurrence || 1) - 1);
            if (desiredIndex >= matches.length) return null;
            const target = matches[desiredIndex];
            const allHeadings = Array.from(document.querySelectorAll(options.tags.join(',')));
            const currentIndex = allHeadings.indexOf(target);
            const rawHeadingLevel = parseInt(target.tagName.charAt(1), 10);
            const headingLevel = Number.isNaN(rawHeadingLevel) ? 1 : rawHeadingLevel;
            let nextHeading = null;
            for (let i = currentIndex + 1; i < allHeadings.length; i++) {
                const next = allHeadings[i];
                const rawNextLevel = parseInt(next.tagName.charAt(1), 10);
                const nextLevel = Number.isNaN(rawNextLevel) ? headingLevel : rawNextLevel;
                if (options.sectionByH1 ? next.tagName === 'H1' : nextLevel <= headingLevel) {
                    nextHeading = next;
                    break;
                }
            }
            const rect = target.getBoundingClientRect();
            const scrollY = window.scrollY;
            let endY = window.innerHeight + scrollY;
            if (nextHeading) {
                const nextRect = nextHeading.getBoundingClientRect();
                endY = nextRect.top + scrollY;
            }
            let x = rect.left;
            let width = rect.width;
            let y = rect.top + scrollY;
            let height = Math.max(100, endY - y);

            if (options.useCardBackground) {
                const container =
                    target.closest('[class*="card"], .card, [class*="tile"], [class*="item"], [class*="benefit"], [class*="advantage"], [class*="tariff"]') ||
                    target.parentElement;
                if (container) {
                    const cRect = container.getBoundingClientRect();
                    x = cRect.left;
                    width = cRect.width;
                    y = cRect.top + scrollY - 20;
                    height = cRect.height + 40;
                }
            }

            if (options.fullWidth) {
                x = 0;
                width = window.innerWidth;
            }
            return { x, y, width, height };
        },
        heading,
        options
    );
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (!args.slug && !args.url) {
        console.error('Usage: node scripts/debug-chunk-screenshots.js <slug> [--strategy=heading|scroll] [--tag=h1,h2] [--chunks=5] [--full-width] [--headless]');
        process.exit(1);
    }

    const slug = args.slug || 'custom';
    const safeSlug = slug.replace(/\//g, '_');
    const pageUrl = args.url || getPageUrl(slug);
    const outputBase = args.outputDir || path.join(__dirname, '..', 'temp', 'page-analysis-llm');
    const outputDir = path.join(outputBase, `${safeSlug}_chunk_debug`);
    fs.mkdirSync(outputDir, { recursive: true });

    const chromeProfileDir = path.join(outputDir, `${safeSlug}_chrome_profile`);
    const chromeHomeDir = path.join(outputDir, `${safeSlug}_chrome_home`);
    fs.mkdirSync(chromeProfileDir, { recursive: true });
    fs.mkdirSync(chromeHomeDir, { recursive: true });

    const candidates = [
        process.env.PUPPETEER_EXECUTABLE_PATH,
        process.env.CHROME_PATH,
        typeof puppeteer.executablePath === 'function' ? puppeteer.executablePath() : null
    ].filter(Boolean);
    const executablePath = candidates.find(candidate => fs.existsSync(candidate)) || undefined;

    const browser = await puppeteer.launch({
        headless: args.headless ? 'new' : false,
        userDataDir: chromeProfileDir,
        ...(executablePath ? { executablePath } : {}),
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
            '--no-first-run',
            '--no-default-browser-check'
        ],
        defaultViewport: { width: 1920, height: 1080 }
    });

    try {
        const page = await browser.newPage();
        await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        try {
            const client = await page.target().createCDPSession();
            await client.send('Page.setZoomFactor', { zoomFactor: 1 });
        } catch {
            // ignore
        }

        const html = await page.content();
        const text = await page.evaluate(() => document.body.innerText || '');
        fs.writeFileSync(path.join(outputDir, `${safeSlug}_html.html`), html);

        const results = { full: null, sections: [], cards: [], scroll: [] };

        const fullScreenshot = await page.screenshot({ encoding: 'base64', type: 'png', fullPage: true });
        const fullName = `${safeSlug}_full.png`;
        fs.writeFileSync(path.join(outputDir, fullName), Buffer.from(fullScreenshot, 'base64'));
        results.full = fullName;

        if (args.strategy === 'scroll') {
            const total = args.chunks || 6;
            for (let i = 0; i < total; i++) {
                await page.evaluate((idx, count) => {
                    const maxScroll = Math.max(0, document.body.scrollHeight - window.innerHeight);
                    const ratio = count > 1 ? idx / (count - 1) : 0;
                    window.scrollTo(0, Math.floor(maxScroll * ratio));
                }, i, total);
                await new Promise(resolve => setTimeout(resolve, 500));
                const screenshot = await page.screenshot({ encoding: 'base64', type: 'png' });
                const fileName = `${safeSlug}_scroll_${i + 1}.png`;
                fs.writeFileSync(path.join(outputDir, fileName), Buffer.from(screenshot, 'base64'));
                results.scroll.push({ index: i + 1, file: fileName });
            }
        } else {
            const sectionSelectors = ['.title-promo-long__title-text', 'h1'];
            const sectionHeadings = await page.evaluate((selectors) => {
                const elements = Array.from(document.querySelectorAll(selectors.join(',')));
                const occurrences = new Map();
                return elements.map(el => {
                    const text = (el.textContent || '').trim();
                    const tag = el.tagName.toLowerCase();
                    const occ = (occurrences.get(text) || 0) + 1;
                    occurrences.set(text, occ);
                    return { tag, text, occurrence: occ };
                }).filter(item => item.text && item.text.length <= 200);
            }, sectionSelectors);

            // Sections by h1 (full width to next h1)
            const sectionOptions = {
                tags: sectionSelectors,
                fullWidth: true,
                sectionByH1: false
            };
            for (let i = 0; i < sectionHeadings.length; i++) {
                const heading = sectionHeadings[i];
                let clip = await getChunkScreenshot(page, heading, sectionOptions);
                if (!clip) {
                    results.sections.push({ index: i + 1, title: heading.text, skipped: true });
                    continue;
                }
                const scrollTarget = Math.max(0, clip.y - 80);
                await page.evaluate((y) => window.scrollTo(0, y), scrollTarget);
                await page.waitForFunction((y) => Math.abs(window.scrollY - y) < 2, {}, scrollTarget).catch(() => {});
                await new Promise(resolve => setTimeout(resolve, 300));
                clip = await getChunkScreenshot(page, heading, sectionOptions) || clip;
                const screenshot = await page.screenshot({
                    encoding: 'base64',
                    type: 'png',
                    clip: {
                        x: Math.max(0, clip.x),
                        y: Math.max(0, clip.y),
                        width: Math.min(clip.width, 1920),
                        height: Math.min(clip.height, 1080)
                    },
                    captureBeyondViewport: true
                });
                const fileName = `${safeSlug}_section_${i + 1}_${sanitizeFileLabel(heading.text)}.png`;
                fs.writeFileSync(path.join(outputDir, fileName), Buffer.from(screenshot, 'base64'));
                results.sections.push({ index: i + 1, title: heading.text, file: fileName, clip });
            }

            // Cards skipped for this debug run.
        }

        fs.writeFileSync(path.join(outputDir, `${safeSlug}_chunks.json`), JSON.stringify({ url: pageUrl, strategy: args.strategy, tags: args.tags, results }, null, 2));
        console.log(`✅ Готово. Файлы сохранены в ${outputDir}`);
    } finally {
        await browser.close();
    }
}

main().catch(err => {
    console.error('❌ Ошибка:', err);
    process.exit(1);
});
