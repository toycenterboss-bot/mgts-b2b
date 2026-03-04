/**
 * Скрипт для миграции изображений со старого сайта в Strapi Media Library
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
const DOWNLOAD_DIR = path.join(__dirname, '../../temp/downloads/images');
const REPORT_FILE = path.join(__dirname, '../../temp/services-extraction/images-migration-report.json');
const MD_REPORT_FILE = path.join(__dirname, '../../docs/IMAGES_MIGRATION_REPORT.md');

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
                fs.unlinkSync(filePath);
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
    console.log('🖼️  Миграция изображений в Strapi\n');
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
    const images = filesData.uniqueImagesList || [];
    
    console.log(`📦 Найдено изображений для миграции: ${images.length}\n`);
    
    const results = {
        timestamp: new Date().toISOString(),
        total: images.length,
        downloaded: [],
        uploaded: [],
        failed: [],
        skipped: []
    };
    
    // Мигрируем каждое изображение
    for (let i = 0; i < images.length; i++) {
        const image = images[i];
        console.log(`[${i + 1}/${images.length}] ${image.filename}...`);
        
        try {
            // Скачиваем изображение
            const filePath = path.join(DOWNLOAD_DIR, image.filename);
            
            // Пропускаем, если уже скачано
            if (fs.existsSync(filePath)) {
                console.log(`   ⏭️  Уже скачано, пропускаем`);
                results.skipped.push({
                    filename: image.filename,
                    reason: 'Уже скачано'
                });
                continue;
            }
            
            await downloadFile(image.url, filePath);
            console.log(`   ✅ Скачано`);
            results.downloaded.push({
                filename: image.filename,
                url: image.url,
                path: filePath
            });
            
            // Загружаем в Strapi
            const fileStats = fs.statSync(filePath);
            const fileSizeMB = fileStats.size / 1024 / 1024;
            
            if (fileSizeMB > 10) {
                console.log(`   ⚠️  Файл слишком большой (${fileSizeMB.toFixed(2)} MB), пропускаем загрузку в Strapi`);
                results.skipped.push({
                    filename: image.filename,
                    reason: `Файл слишком большой (${fileSizeMB.toFixed(2)} MB)`
                });
                continue;
            }
            
            const uploadedFile = await uploadToStrapi(filePath, image.filename);
            console.log(`   ✅ Загружено в Strapi (ID: ${uploadedFile.id})`);
            
            results.uploaded.push({
                filename: image.filename,
                url: image.url,
                strapiId: uploadedFile.id,
                strapiUrl: uploadedFile.url,
                size: fileStats.size
            });
            
        } catch (error) {
            console.error(`   ❌ Ошибка: ${error.message}`);
            results.failed.push({
                filename: image.filename,
                url: image.url,
                error: error.message
            });
        }
        
        console.log('');
    }
    
    // Сохраняем отчет
    fs.writeFileSync(REPORT_FILE, JSON.stringify(results, null, 2), 'utf-8');
    
    // Создаем Markdown отчет
    let md = `# Отчет о миграции изображений\n\n`;
    md += `**Дата:** ${new Date().toISOString()}\n\n`;
    md += `## 📊 Сводка\n\n`;
    md += `- **Всего изображений:** ${results.total}\n`;
    md += `- **Скачано:** ${results.downloaded.length}\n`;
    md += `- **Загружено в Strapi:** ${results.uploaded.length}\n`;
    md += `- **Пропущено:** ${results.skipped.length}\n`;
    md += `- **Ошибок:** ${results.failed.length}\n\n`;
    
    if (results.uploaded.length > 0) {
        md += `## ✅ Загруженные изображения\n\n`;
        md += `| Файл | Strapi ID | Размер |\n`;
        md += `|------|-----------|--------|\n`;
        results.uploaded.forEach(img => {
            md += `| ${img.filename} | ${img.strapiId} | ${(img.size / 1024).toFixed(2)} KB |\n`;
        });
        md += `\n`;
    }
    
    if (results.failed.length > 0) {
        md += `## ❌ Ошибки\n\n`;
        md += `| Файл | Ошибка |\n`;
        md += `|------|--------|\n`;
        results.failed.forEach(img => {
            md += `| ${img.filename} | ${img.error} |\n`;
        });
        md += `\n`;
    }
    
    fs.writeFileSync(MD_REPORT_FILE, md, 'utf-8');
    
    console.log('='.repeat(60) + '\n');
    console.log('✅ Миграция изображений завершена!\n');
    console.log(`   Скачано: ${results.downloaded.length}`);
    console.log(`   Загружено в Strapi: ${results.uploaded.length}`);
    console.log(`   Пропущено: ${results.skipped.length}`);
    console.log(`   Ошибок: ${results.failed.length}\n`);
    console.log(`📄 Отчеты сохранены:`);
    console.log(`   - JSON: ${REPORT_FILE}`);
    console.log(`   - Markdown: ${MD_REPORT_FILE}\n`);
    
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
