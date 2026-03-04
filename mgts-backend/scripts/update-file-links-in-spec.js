const fs = require('fs');
const path = require('path');

const specPath = process.argv[2] || 'temp/page-analysis-llm/business_payment_methods_spec.json';
const extractedPath = specPath.replace('_spec.json', '_extracted_file_links.json');

if (!fs.existsSync(specPath)) {
    console.error(`❌ Файл не найден: ${specPath}`);
    process.exit(1);
}

if (!fs.existsSync(extractedPath)) {
    console.error(`❌ Файл не найден: ${extractedPath}`);
    process.exit(1);
}

const extracted = JSON.parse(fs.readFileSync(extractedPath, 'utf-8'));
const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));

let updatedCount = 0;
spec.sections.forEach(section => {
    if (section.links && section.links.fileLinks) {
        section.links.fileLinks.forEach(fileLink => {
            const fileText = fileLink.text || '';
            if (fileText && (!fileLink.href || fileLink.href.trim() === '')) {
                const normalizedText = fileText.toLowerCase().trim().replace(/\s+/g, ' ');
                
                const foundLink = Object.keys(extracted).find(key => {
                    const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, ' ');
                    if (normalizedKey === normalizedText) return true;
                    if (normalizedText.length >= 20 && normalizedKey.includes(normalizedText.substring(0, Math.min(50, normalizedText.length)))) return true;
                    if (normalizedKey.length >= 20 && normalizedText.includes(normalizedKey.substring(0, Math.min(50, normalizedKey.length)))) return true;
                    const textWords = normalizedText.split(/\s+/).slice(0, 5).join(' ');
                    const keyWords = normalizedKey.split(/\s+/).slice(0, 5).join(' ');
                    if (textWords.length >= 15 && keyWords.length >= 15 && 
                        (textWords === keyWords || textWords.includes(keyWords) || keyWords.includes(textWords))) {
                        return true;
                    }
                    return false;
                });
                
                if (foundLink && extracted[foundLink] && extracted[foundLink].localPath) {
                    fileLink.href = extracted[foundLink].localPath;
                    if (extracted[foundLink].fileName) fileLink.fileName = extracted[foundLink].fileName;
                    if (extracted[foundLink].fileType) fileLink.fileType = extracted[foundLink].fileType;
                    updatedCount++;
                    console.log(`✓ Обновлено: "${fileText.substring(0, 50)}..." -> ${extracted[foundLink].localPath}`);
                }
            }
        });
    }
});

fs.writeFileSync(specPath, JSON.stringify(spec, null, 2), 'utf-8');
console.log(`\n✅ Всего обновлено ссылок: ${updatedCount}`);
console.log(`✅ JSON сохранен: ${specPath}`);
