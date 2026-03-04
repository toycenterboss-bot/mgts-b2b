const fs = require('fs');
const path = require('path');

const MAPPING_FILE = path.join(__dirname, '../../temp/services-extraction/complete-class-mapping.json');
const NORMALIZE_SCRIPT = path.join(__dirname, 'normalize-html-structure.js');

// Загружаем маппинг
const mappingData = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf-8'));
const completeMapping = mappingData.mapping;

// Загружаем скрипт нормализации
let scriptContent = fs.readFileSync(NORMALIZE_SCRIPT, 'utf-8');

console.log('📋 ПРИМЕНЕНИЕ ПОЛНОГО МАППИНГА К СКРИПТУ НОРМАЛИЗАЦИИ');
console.log('='.repeat(70));

// Для каждого компонента добавляем маппинги
Object.keys(completeMapping).forEach(component => {
    const componentMapping = completeMapping[component];
    const classCount = Object.keys(componentMapping).length;
    
    console.log(`\n${component}: ${classCount} классов`);
    
    // Находим определение компонента в скрипте
    const componentPattern = new RegExp(`(['"])${component}\\1\\s*:\\s*\\{([^}]*)\\}(,|\\s*\\n\\s*//)`, 's');
    const match = scriptContent.match(componentPattern);
    
    if (match) {
        // Находим закрывающую скобку компонента
        const startIndex = match.index + match[0].indexOf('{');
        let braceCount = 0;
        let inString = false;
        let stringChar = null;
        let endIndex = startIndex + 1;
        
        for (let i = startIndex; i < scriptContent.length; i++) {
            const char = scriptContent[i];
            
            if (!inString && (char === '"' || char === "'")) {
                inString = true;
                stringChar = char;
            } else if (inString && char === stringChar && scriptContent[i - 1] !== '\\') {
                inString = false;
                stringChar = null;
            } else if (!inString) {
                if (char === '{') braceCount++;
                if (char === '}') {
                    braceCount--;
                    if (braceCount === 0) {
                        endIndex = i;
                        break;
                    }
                }
            }
        }
        
        // Извлекаем текущее содержимое
        const currentContent = scriptContent.substring(startIndex + 1, endIndex);
        
        // Добавляем новые маппинги
        let newMappings = '';
        Object.keys(componentMapping).forEach(oldClass => {
            const newClass = componentMapping[oldClass];
            // Проверяем, нет ли уже такого маппинга
            if (!currentContent.includes(`'${oldClass}':`) && !currentContent.includes(`"${oldClass}":`)) {
                const comment = newClass === '' ? ' // служебный класс, удаляем' : '';
                newMappings += `        '${oldClass}': '${newClass}',${comment}\n`;
            }
        });
        
        if (newMappings) {
            // Вставляем перед закрывающей скобкой
            const insertIndex = endIndex;
            const indent = '    ';
            scriptContent = scriptContent.substring(0, insertIndex) + 
                          (currentContent.trim().endsWith(',') ? '' : ',') + '\n' + 
                          newMappings.trim().split('\n').map(line => indent + line).join('\n') + 
                          '\n' + scriptContent.substring(insertIndex);
        }
    } else {
        console.log(`  ⚠️  Не найдено определение компонента ${component}`);
    }
});

// Сохраняем обновленный скрипт
fs.writeFileSync(NORMALIZE_SCRIPT, scriptContent, 'utf-8');

console.log('\n✅ Маппинг применен к скрипту нормализации');
console.log('='.repeat(70));
