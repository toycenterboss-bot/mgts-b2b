const fs = require('fs');
const path = require('path');

const ANALYSIS_FILE = path.join(__dirname, '../../temp/services-extraction/classes-semantic-analysis.json');
const CSS_DIR = path.join(__dirname, '../../../SiteMGTS/css/components');

console.log('🎨 Генерация CSS файлов на основе семантического анализа...\n');

// Создаем директорию для компонентов
if (!fs.existsSync(CSS_DIR)) {
    fs.mkdirSync(CSS_DIR, { recursive: true });
    console.log(`📁 Создана директория: ${CSS_DIR}\n`);
}

// Загружаем результаты анализа
if (!fs.existsSync(ANALYSIS_FILE)) {
    console.error(`❌ Файл анализа не найден: ${ANALYSIS_FILE}`);
    process.exit(1);
}

const analysisData = JSON.parse(fs.readFileSync(ANALYSIS_FILE, 'utf-8'));
const classes = analysisData.analysis;

// Группируем классы по компонентам
const byComponent = new Map();
classes.forEach(cls => {
    if (!byComponent.has(cls.component)) {
        byComponent.set(cls.component, []);
    }
    byComponent.get(cls.component).push(cls);
});

// Функция для генерации CSS правил на основе рекомендаций
function generateCSSRule(analysis) {
    const { className, semanticRole, cssRecommendations, tagName, contentAnalysis } = analysis;
    
    let css = '';
    const selector = `.${className}`;
    
    css += `/* ${analysis.purpose} */\n`;
    css += `${selector} {\n`;
    
    // Display
    if (cssRecommendations.display) {
        if (cssRecommendations.display.includes('flex')) {
            css += `  display: flex;\n`;
        } else if (cssRecommendations.display.includes('inline-block')) {
            css += `  display: inline-block;\n`;
        } else if (cssRecommendations.display.includes('inline')) {
            css += `  display: inline;\n`;
        } else if (cssRecommendations.display.includes('list-item')) {
            css += `  display: list-item;\n`;
        } else {
            css += `  display: block;\n`;
        }
    } else {
        css += `  display: block;\n`;
    }
    
    // Typography для заголовков
    if (semanticRole === 'heading') {
        if (className.includes('title') && !className.includes('subtitle')) {
            css += `  font-size: clamp(1.75rem, 3vw, 2.25rem);\n`;
            css += `  font-weight: 600;\n`;
            css += `  line-height: 1.2;\n`;
            css += `  color: var(--color-gray-900, #111827);\n`;
        } else if (className.includes('subtitle')) {
            css += `  font-size: clamp(1.25rem, 2vw, 1.5rem);\n`;
            css += `  font-weight: 500;\n`;
            css += `  line-height: 1.3;\n`;
            css += `  color: var(--color-gray-800, #1f2937);\n`;
        }
    }
    
    // Typography для контента
    if (semanticRole === 'content' || semanticRole === 'text') {
        css += `  font-size: 1rem;\n`;
        css += `  line-height: 1.6;\n`;
        css += `  color: var(--color-gray-700, #374151);\n`;
    }
    
    // Typography для кнопок
    if (semanticRole === 'action' || semanticRole === 'button') {
        css += `  font-size: 1rem;\n`;
        css += `  font-weight: 500;\n`;
        css += `  text-align: center;\n`;
        css += `  cursor: pointer;\n`;
        css += `  transition: all 0.2s ease;\n`;
    }
    
    // Spacing для заголовков
    if (semanticRole === 'heading') {
        css += `  margin-bottom: var(--spacing-lg, 1.5rem);\n`;
    }
    
    // Spacing для контента
    if (semanticRole === 'content' || semanticRole === 'text') {
        css += `  margin-bottom: var(--spacing-md, 1rem);\n`;
    }
    
    // Spacing для контейнеров
    if (semanticRole === 'container') {
        css += `  padding: var(--spacing-lg, 1.5rem);\n`;
        css += `  max-width: var(--container-max-width, 1200px);\n`;
        css += `  margin: 0 auto;\n`;
    }
    
    // Spacing для карточек
    if (semanticRole === 'card') {
        css += `  margin-bottom: var(--spacing-lg, 1.5rem);\n`;
        css += `  padding: var(--spacing-xl, 2rem);\n`;
        css += `  border-radius: var(--radius-lg, 0.5rem);\n`;
        css += `  box-shadow: var(--shadow-md, 0 4px 6px rgba(0, 0, 0, 0.1));\n`;
        css += `  background-color: var(--color-white, #ffffff);\n`;
    }
    
    // Spacing для полей форм
    if (semanticRole === 'form-control') {
        css += `  margin-bottom: var(--spacing-md, 1rem);\n`;
    }
    
    // Colors
    if (cssRecommendations.colors) {
        if (cssRecommendations.colors.includes('white')) {
            css += `  background-color: var(--color-white, #ffffff);\n`;
            css += `  color: var(--color-gray-900, #111827);\n`;
        } else if (cssRecommendations.colors.includes('gray')) {
            css += `  background-color: var(--color-gray-100, #f3f4f6);\n`;
            css += `  color: var(--color-gray-900, #111827);\n`;
        } else if (cssRecommendations.colors.includes('primary')) {
            css += `  background-color: var(--color-primary, #0066cc);\n`;
            css += `  color: var(--color-white, #ffffff);\n`;
        }
    }
    
    // Layout для ограниченной ширины
    if (cssRecommendations.layout && cssRecommendations.layout.includes('narrow')) {
        css += `  max-width: 800px;\n`;
        css += `  margin-left: auto;\n`;
        css += `  margin-right: auto;\n`;
    }
    
    // Layout для увеличенного размера
    if (className.includes('--xl') || className.includes('--large')) {
        css += `  width: 100%;\n`;
        css += `  padding: var(--spacing-xl, 2rem);\n`;
    }
    
    // Дополнительные стили
    if (contentAnalysis.hasImages) {
        css += `}\n\n${selector} img {\n`;
        css += `  width: 100%;\n`;
        css += `  height: auto;\n`;
        css += `  object-fit: cover;\n`;
    }
    
    if (contentAnalysis.hasLinks) {
        css += `}\n\n${selector} a {\n`;
        css += `  color: var(--color-primary, #0066cc);\n`;
        css += `  text-decoration: none;\n`;
        css += `  transition: color 0.2s ease;\n`;
        css += `}\n\n${selector} a:hover {\n`;
        css += `  color: var(--color-primary-dark, #0052a3);\n`;
        css += `  text-decoration: underline;\n`;
    }
    
    if (contentAnalysis.hasButtons) {
        css += `}\n\n${selector}:hover {\n`;
        css += `  opacity: 0.9;\n`;
        css += `  transform: translateY(-2px);\n`;
    }
    
    if (contentAnalysis.hasForms) {
        css += `}\n\n${selector} input,\n${selector} select,\n${selector} textarea {\n`;
        css += `  width: 100%;\n`;
        css += `  padding: var(--spacing-sm, 0.75rem);\n`;
        css += `  border: 1px solid var(--color-gray-300, #d1d5db);\n`;
        css += `  border-radius: var(--radius-md, 0.375rem);\n`;
        css += `  font-size: 1rem;\n`;
        css += `}\n\n${selector} input:focus,\n${selector} select:focus,\n${selector} textarea:focus {\n`;
        css += `  outline: none;\n`;
        css += `  border-color: var(--color-primary, #0066cc);\n`;
        css += `  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);\n`;
    }
    
    css += `}\n\n`;
    
    return css;
}

// Генерируем CSS файлы для каждого компонента
let totalRules = 0;

byComponent.forEach((classes, component) => {
    const cssFilePath = path.join(CSS_DIR, `${component}.css`);
    let cssContent = `/* ============================================\n`;
    cssContent += `   ${component.toUpperCase()}\n`;
    cssContent += `   ============================================ */\n\n`;
    cssContent += `/* Генерировано на основе семантического анализа */\n`;
    cssContent += `/* Дата: ${new Date().toISOString()} */\n\n`;
    
    // Сортируем классы: сначала основной класс компонента, затем по использованию
    const sortedClasses = classes.sort((a, b) => {
        // Основной класс компонента идет первым
        if (a.className === component) return -1;
        if (b.className === component) return 1;
        // Затем по использованию
        return b.usageCount - a.usageCount;
    });
    
    sortedClasses.forEach(cls => {
        cssContent += generateCSSRule(cls);
        totalRules++;
    });
    
    fs.writeFileSync(cssFilePath, cssContent, 'utf-8');
    console.log(`✅ Создан: ${component}.css (${sortedClasses.length} классов)`);
});

// Создаем главный файл для импорта всех компонентов
const mainCssPath = path.join(CSS_DIR, 'components.css');
let mainCss = `/* ============================================\n`;
mainCss += `   ИМПОРТ ВСЕХ КОМПОНЕНТОВ\n`;
mainCss += `   ============================================ */\n\n`;
mainCss += `/* Генерировано автоматически */\n`;
mainCss += `/* Дата: ${new Date().toISOString()} */\n\n`;

Array.from(byComponent.keys()).sort().forEach(component => {
    mainCss += `@import './${component}.css';\n`;
});

fs.writeFileSync(mainCssPath, mainCss, 'utf-8');
console.log(`\n✅ Создан главный файл: components.css`);

// Создаем индексный файл с описанием
const indexPath = path.join(CSS_DIR, 'README.md');
let indexContent = `# CSS Компоненты\n\n`;
indexContent += `**Дата создания:** ${new Date().toISOString()}\n\n`;
indexContent += `**Всего классов:** ${totalRules}\n`;
indexContent += `**Компонентов:** ${byComponent.size}\n\n`;
indexContent += `## Структура\n\n`;
indexContent += `CSS файлы организованы по компонентам:\n\n`;

Array.from(byComponent.keys()).sort().forEach(component => {
    const count = byComponent.get(component).length;
    indexContent += `- \`${component}.css\` - ${count} классов\n`;
});

indexContent += `\n## Использование\n\n`;
indexContent += `Импортируйте главный файл в ваш основной CSS:\n\n`;
indexContent += `\`\`\`css\n`;
indexContent += `@import './components/components.css';\n`;
indexContent += `\`\`\`\n\n`;
indexContent += `Или импортируйте отдельные компоненты:\n\n`;
indexContent += `\`\`\`css\n`;
Array.from(byComponent.keys()).sort().forEach(component => {
    indexContent += `@import './components/${component}.css';\n`;
});
indexContent += `\`\`\`\n\n`;
indexContent += `## Переменные CSS\n\n`;
indexContent += `Стили используют CSS переменные. Убедитесь, что они определены:\n\n`;
indexContent += `\`\`\`css\n`;
indexContent += `:root {\n`;
indexContent += `  --spacing-xs: 0.5rem;\n`;
indexContent += `  --spacing-sm: 0.75rem;\n`;
indexContent += `  --spacing-md: 1rem;\n`;
indexContent += `  --spacing-lg: 1.5rem;\n`;
indexContent += `  --spacing-xl: 2rem;\n`;
indexContent += `  --spacing-3xl: 3rem;\n`;
indexContent += `  --color-white: #ffffff;\n`;
indexContent += `  --color-gray-100: #f3f4f6;\n`;
indexContent += `  --color-gray-300: #d1d5db;\n`;
indexContent += `  --color-gray-700: #374151;\n`;
indexContent += `  --color-gray-800: #1f2937;\n`;
indexContent += `  --color-gray-900: #111827;\n`;
indexContent += `  --color-primary: #0066cc;\n`;
indexContent += `  --color-primary-dark: #0052a3;\n`;
indexContent += `  --container-max-width: 1200px;\n`;
indexContent += `  --radius-md: 0.375rem;\n`;
indexContent += `  --radius-lg: 0.5rem;\n`;
indexContent += `  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);\n`;
indexContent += `}\n`;
indexContent += `\`\`\`\n`;

fs.writeFileSync(indexPath, indexContent, 'utf-8');
console.log(`✅ Создан README.md`);

console.log(`\n📊 Итоговая статистика:`);
console.log(`  Всего CSS правил: ${totalRules}`);
console.log(`  Компонентов: ${byComponent.size}`);
console.log(`  Файлов создано: ${byComponent.size + 2} (${byComponent.size} компонентов + components.css + README.md)`);
console.log(`\n📁 Файлы сохранены в: ${CSS_DIR}`);
console.log(`\n✅ Генерация CSS завершена!`);
