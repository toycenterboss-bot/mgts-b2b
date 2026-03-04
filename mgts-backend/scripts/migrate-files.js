/**
 * Скрипт для миграции файлов (PDF, DOCX, XLSX и т.д.) со старого сайта
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

if (!API_TOKEN) {
    console.error('\n❌ Ошибка: Необходимо установить STRAPI_API_TOKEN');
    process.exit(1);
}

const api = axios.create({
    baseURL: `${STRAPI_URL}/api`,
    headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
    }
});

const FILES_DATA_FILE = path.join(__dirname, '../../temp/services-extraction/files-to-migrate.json');
const DOWNLOAD_DIR = path.join(__dirname, '../../temp/downloads/files');
const REPORT_FILE = path.join(__dirname, '../../temp/services-extraction/files-migration-report.json');
const MD_REPORT_FILE = path.join(__dirname, '../../docs/FILES_MIGRATION_REPORT.md');

const MAX_SIZE_STRAPI_MB = 10; // Максимальный размер файла для Strapi Media Library

/**
 * Скачать файл
 */
async function downloadFile(url, filePath) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        
        const file = fs.createWriteStream(filePath);
        
        protocol.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                // Редирект
                return downloadFile(response.headers.location, filePath).then(resolve).catch(reject);
            }
            
            if (response.statusCode !== 200) {
                file.close();
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
                reject(new Error(`HTTP ${response.statusCode}`));
                return;
            }
            
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            file.close();
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            reject(err);
        });
    });
}

/**
 * Загрузить файл в Strapi Media Library
 */
async function uploadToStrapi(filePath, filename) {
    const FormData = require('form-data');
    const form = new FormData();
    
    form.append('files', fs.createReadStream(filePath), filename);
    
    try {
        const response = await axios.post(`${STRAPI_URL}/api/upload`, form, {
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`,
                ...form.getHeaders()
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
        
        return response.data[0]; // Strapi возвращает массив
    } catch (error) {
        throw new Error(error.response?.data?.error?.message || error.message);
    }
}

/**
 * Главная функция
 */
async function main() {
    console.log('📁 Миграция файлов в Strapi\n');
    console.log('='.repeat(60) + '\n');
    
    // Создаем директорию для загрузок
    if (!fs.existsSync(DOWNLOAD_DIR)) {
        fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
    }
    
    // Загружаем данные о файлах
    if (!fs.existsSync(FILES_DATA_FILE)) {
        console.error(`❌ Файл не найден: ${FILES_DATA_FILE}`);
        console.error('   Сначала запустите analyze-files-to-migrate.js');
        process.exit(1);
    }
    
    const filesData = JSON.parse(fs.readFileSync(FILES_DATA_FILE, 'utf-8'));
    const uniqueFiles = filesData.uniqueFilesList || [];
    
    console.log(`📦 Найдено файлов для миграции: ${uniqueFiles.length}\n`);
    
    const results = {
        timestamp: new Date().toISOString(),
        total: uniqueFiles.length,
        downloaded: [],
        uploadedToStrapi: [],
        tooLargeForStrapi: [],
        failed: [],
        skipped: []
    };
    
    // Загружаем предыдущий отчет, если есть, чтобы продолжить с места остановки
    let previousReport = null;
    if (fs.existsSync(REPORT_FILE)) {
        try {
            previousReport = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf-8'));
            console.log(`📋 Найден предыдущий отчет: ${previousReport.uploadedToStrapi.length} файлов уже загружено\n`);
        } catch (e) {
            // Игнорируем ошибки чтения
        }
    }
    
    // Создаем множество уже обработанных файлов
    const processedFiles = new Set();
    if (previousReport) {
        previousReport.uploadedToStrapi.forEach(f => processedFiles.add(f.filename));
        previousReport.tooLargeForStrapi.forEach(f => processedFiles.add(f.filename));
        // Не пропускаем failed, чтобы попробовать еще раз
    }
    
    // Мигрируем каждый файл
    let processedCount = 0;
    const totalToProcess = uniqueFiles.length;
    const startTime = Date.now();
    
    for (let i = 0; i < uniqueFiles.length; i++) {
        const file = uniqueFiles[i];
        const progress = ((i + 1) / totalToProcess * 100).toFixed(1);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        const avgTime = elapsed / (i + 1);
        const remaining = ((totalToProcess - i - 1) * avgTime).toFixed(0);
        
        console.log(`[${i + 1}/${totalToProcess}] (${progress}%) ${file.filename}`);
        console.log(`   ⏱️  Прошло: ${elapsed}с | Осталось: ~${remaining}с`);
        
        // Пропускаем уже обработанные
        if (processedFiles.has(file.filename)) {
            console.log(`   ⏭️  Уже обработан, пропускаем`);
            processedCount++;
            console.log('');
            continue;
        }
        
        try {
            // Скачиваем файл
            const filePath = path.join(DOWNLOAD_DIR, file.filename);
            
            // Пропускаем, если уже скачано
            if (fs.existsSync(filePath)) {
                console.log(`   📥 Уже скачано, проверяем размер...`);
            } else {
                process.stdout.write(`   📥 Скачивание... `);
                await downloadFile(file.url, filePath);
                console.log(`✅`);
            }
            
            const fileStats = fs.statSync(filePath);
            const fileSizeMB = fileStats.size / 1024 / 1024;
            
            results.downloaded.push({
                filename: file.filename,
                url: file.url,
                path: filePath,
                size: fileStats.size,
                sizeMB: fileSizeMB
            });
            
            // Определяем, куда загружать
            if (fileSizeMB >= MAX_SIZE_STRAPI_MB) {
                console.log(`   ⚠️  Файл слишком большой (${fileSizeMB.toFixed(2)} MB), требуется Cloudinary/S3`);
                results.tooLargeForStrapi.push({
                    filename: file.filename,
                    url: file.url,
                    size: fileStats.size,
                    sizeMB: fileSizeMB,
                    note: 'Требуется загрузка в Cloudinary или S3'
                });
                processedCount++;
                console.log('');
                continue;
            }
            
            // Загружаем в Strapi
            process.stdout.write(`   📤 Загрузка в Strapi... `);
            const uploadedFile = await uploadToStrapi(filePath, file.filename);
            console.log(`✅ (ID: ${uploadedFile.id})`);
            
            results.uploadedToStrapi.push({
                filename: file.filename,
                url: file.url,
                strapiId: uploadedFile.id,
                strapiUrl: uploadedFile.url,
                size: fileStats.size,
                sizeMB: fileSizeMB
            });
            
            processedCount++;
            
        } catch (error) {
            console.error(`   ❌ Ошибка: ${error.message}`);
            results.failed.push({
                filename: file.filename,
                url: file.url,
                error: error.message
            });
        }
        
        // Показываем промежуточную статистику каждые 10 файлов
        if ((i + 1) % 10 === 0) {
            console.log(`\n   📊 Промежуточная статистика:`);
            console.log(`      Загружено в Strapi: ${results.uploadedToStrapi.length}`);
            console.log(`      Слишком большие: ${results.tooLargeForStrapi.length}`);
            console.log(`      Ошибок: ${results.failed.length}`);
            console.log(`      Обработано: ${processedCount}/${totalToProcess}\n`);
        }
        
        // Добавляем небольшую задержку, чтобы не перегружать сервер
        if (i < uniqueFiles.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        console.log('');
    }
    
    // Сохраняем отчет
    fs.writeFileSync(REPORT_FILE, JSON.stringify(results, null, 2), 'utf-8');
    
    // Создаем Markdown отчет
    let md = `# Отчет о миграции файлов\n\n`;
    md += `**Дата:** ${new Date().toISOString()}\n\n`;
    md += `## 📊 Сводка\n\n`;
    md += `- **Всего файлов:** ${results.total}\n`;
    md += `- **Скачано:** ${results.downloaded.length}\n`;
    md += `- **Загружено в Strapi:** ${results.uploadedToStrapi.length}\n`;
    md += `- **Слишком большие для Strapi (>= ${MAX_SIZE_STRAPI_MB}MB):** ${results.tooLargeForStrapi.length}\n`;
    md += `- **Ошибок:** ${results.failed.length}\n\n`;
    
    if (results.uploadedToStrapi.length > 0) {
        md += `## ✅ Загруженные в Strapi файлы\n\n`;
        md += `| Файл | Strapi ID | Размер |\n`;
        md += `|------|-----------|--------|\n`;
        results.uploadedToStrapi.slice(0, 50).forEach(file => {
            md += `| ${file.filename} | ${file.strapiId} | ${file.sizeMB.toFixed(2)} MB |\n`;
        });
        if (results.uploadedToStrapi.length > 50) {
            md += `\n*... и еще ${results.uploadedToStrapi.length - 50} файлов*\n`;
        }
        md += `\n`;
    }
    
    if (results.tooLargeForStrapi.length > 0) {
        md += `## ⚠️  Файлы, требующие Cloudinary/S3\n\n`;
        md += `| Файл | Размер |\n`;
        md += `|------|--------|\n`;
        results.tooLargeForStrapi.slice(0, 20).forEach(file => {
            md += `| ${file.filename} | ${file.sizeMB.toFixed(2)} MB |\n`;
        });
        if (results.tooLargeForStrapi.length > 20) {
            md += `\n*... и еще ${results.tooLargeForStrapi.length - 20} файлов*\n`;
        }
        md += `\n`;
    }
    
    if (results.failed.length > 0) {
        md += `## ❌ Ошибки\n\n`;
        md += `| Файл | Ошибка |\n`;
        md += `|------|--------|\n`;
        results.failed.slice(0, 20).forEach(file => {
            md += `| ${file.filename} | ${file.error} |\n`;
        });
        if (results.failed.length > 20) {
            md += `\n*... и еще ${results.failed.length - 20} ошибок*\n`;
        }
        md += `\n`;
    }
    
    fs.writeFileSync(MD_REPORT_FILE, md, 'utf-8');
    
    console.log('='.repeat(60) + '\n');
    console.log('✅ Миграция файлов завершена!\n');
    console.log(`   Скачано: ${results.downloaded.length}`);
    console.log(`   Загружено в Strapi: ${results.uploadedToStrapi.length}`);
    console.log(`   Слишком большие (>= ${MAX_SIZE_STRAPI_MB}MB): ${results.tooLargeForStrapi.length}`);
    console.log(`   Ошибок: ${results.failed.length}\n`);
    console.log(`📄 Отчеты сохранены:`);
    console.log(`   - JSON: ${REPORT_FILE}`);
    console.log(`   - Markdown: ${MD_REPORT_FILE}\n`);
    
    if (results.tooLargeForStrapi.length > 0) {
        console.log(`⚠️  Внимание: ${results.tooLargeForStrapi.length} файлов слишком большие для Strapi Media Library.`);
        console.log(`   Их необходимо загрузить в Cloudinary или S3.\n`);
    }
    
    return results;
}

// Запуск
if (require.main === module) {
    main().catch(error => {
        console.error('\n❌ Ошибка:', error.message);
        process.exit(1);
    });
}

module.exports = { main };
