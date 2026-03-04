# Алгоритм сохранения ссылок на файлы при нормализации HTML

## Проблема

При нормализации HTML структуры ссылки на файлы теряются, потому что они находятся не внутри тега с текстовым контентом, а в окружающих элементах (иконки, обертки, классы оформления).

**Пример структуры:**
```html
<div class="file-item">
  <span class="file-icon">...</span>
  <a href="/files/document.pdf" class="file-name">
    Название документа
  </a>
  <span class="file-type">PDF</span>
  <span class="file-size">2.5 MB</span>
</div>
```

При нормализации извлекается только текстовый контент (`textContent`), и ссылка теряется.

## Решение

### Этап 1: Извлечение контента с сохранением ссылок

**Модификация функции `extractSectionContent` в `html-parser.js`:**

1. **Для текстовых секций:**
   - Вместо простого `innerHTML` или `textContent` использовать комбинированный подход
   - Найти все ссылки на файлы (`<a href>` с расширениями файлов) в секции
   - Для каждой ссылки:
     - Извлечь текст ссылки
     - Извлечь URL
     - Сохранить связь между текстом и URL
   - При формировании HTML контента заменять ссылки на файлы на структурированный формат:
     ```html
     <a href="/files/document.pdf" data-file-link="true">Название документа</a>
     ```

2. **Для секций с файлами (`.files-list`, `.file-item`):**
   - Определять специальные контейнеры файлов
   - Извлекать структуру:
     ```javascript
     {
       text: "Название документа",
       href: "/files/document.pdf",
       type: "PDF",
       size: "2.5 MB"
     }
     ```
   - Сохранять в нормализованном виде как HTML с сохранением ссылок

### Этап 2: Нормализация с сохранением ссылок

**Модификация функции `transformElement` в `normalize-html-structure.js`:**

1. **При обработке элементов с файлами:**
   - Определять элементы с классами `file-item`, `files-list`, и т.д.
   - Сохранять структуру ссылок при нормализации классов
   - Не удалять теги `<a>` с атрибутом `data-file-link="true"`

2. **При обработке `document-tabs` и `files-table`:**
   - Извлекать все ссылки на файлы из каждого таба
   - Сохранять их в структуре компонента
   - При формировании HTML сохранять ссылки внутри контента

### Этап 3: Обновление скрипта нормализации

**Новая функция `extractFileLinksFromElement(element)`:**
```javascript
function extractFileLinksFromElement(element) {
    const fileLinks = [];
    const fileExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'zip', 'rar', 'txt', 'csv', 'xml', 'json', 'pptx', 'ppt'];
    
    // Находим все ссылки на файлы
    element.querySelectorAll('a[href]').forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;
        
        const ext = path.extname(href).toLowerCase().replace('.', '');
        if (fileExtensions.includes(ext)) {
            fileLinks.push({
                href: href,
                text: link.textContent.trim(),
                element: link
            });
        }
    });
    
    return fileLinks;
}
```

**Модификация функции нормализации контента:**
```javascript
function normalizeContentWithFileLinks(htmlContent, parentElement) {
    // 1. Извлекаем все ссылки на файлы
    const fileLinks = extractFileLinksFromElement(parentElement);
    
    // 2. Для каждой ссылки проверяем, есть ли она в HTML контенте
    let normalizedContent = htmlContent;
    
    fileLinks.forEach(link => {
        const linkText = link.text;
        // Если текст ссылки есть в контенте, но самой ссылки нет - добавляем её
        if (normalizedContent.includes(linkText) && !normalizedContent.includes(link.href)) {
            // Заменяем текст на ссылку
            normalizedContent = normalizedContent.replace(
                new RegExp(linkText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                `<a href="${link.href}" data-file-link="true">${linkText}</a>`
            );
        } else if (!normalizedContent.includes(link.href)) {
            // Если ссылки вообще нет в контенте - добавляем в конец
            normalizedContent += ` <a href="${link.href}" data-file-link="true">${linkText}</a>`;
        }
    });
    
    return normalizedContent;
}
```

### Этап 4: Обработка динамического контента (табы)

**Для `document-tabs` компонента:**

1. При извлечении контента из табов:
   - Для каждого таба извлекать не только текстовый контент, но и все ссылки на файлы
   - Сохранять структуру:
     ```javascript
     {
       tabName: "Внутренние документы",
       content: "<p>Текст...</p><a href='file.pdf'>Документ</a>",
       files: [
         { href: "/files/doc1.pdf", text: "Документ 1" },
         { href: "/files/doc2.pdf", text: "Документ 2" }
       ]
     }
     ```

2. При нормализации:
   - Сохранять ссылки внутри HTML контента таба
   - Использовать функцию `normalizeContentWithFileLinks` для каждого таба

## Алгоритм работы

### Шаг 1: Предварительный анализ
1. При загрузке HTML страницы найти все элементы с классами `file-item`, `files-list`, `document-tabs`
2. Для каждого элемента извлечь все ссылки на файлы
3. Сохранить маппинг: текст контента → ссылка на файл

### Шаг 2: Извлечение контента
1. При извлечении контента секции использовать функцию `extractFileLinksFromElement`
2. При формировании HTML контента вставлять ссылки на файлы рядом с соответствующим текстом
3. Использовать атрибут `data-file-link="true"` для идентификации ссылок на файлы

### Шаг 3: Нормализация
1. При нормализации классов сохранять теги `<a>` с `data-file-link="true"`
2. При упрощении структуры не удалять ссылки на файлы
3. При обработке табов сохранять ссылки внутри контента каждого таба

### Шаг 4: Валидация
1. После нормализации проверить, что все ссылки на файлы сохранены
2. Сравнить количество ссылок до и после нормализации
3. Если ссылки потеряны - добавить их обратно на основе маппинга из шага 1

## Пример реализации

```javascript
// В html-parser.js
extractSectionContent(section, type) {
    if (type === 'text') {
        // Извлекаем HTML контент
        let content = section.innerHTML;
        
        // Извлекаем ссылки на файлы
        const fileLinks = this.extractFileLinksFromElement(section);
        
        // Вставляем ссылки в контент, если их там нет
        fileLinks.forEach(link => {
            const linkText = link.text;
            // Если текст есть, но ссылки нет - заменяем текст на ссылку
            if (content.includes(linkText) && !content.includes(link.href)) {
                content = content.replace(
                    new RegExp(`(?:^|>|\\s)${linkText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:<|\\s|$)`, 'g'),
                    `$1<a href="${link.href}" data-file-link="true">${linkText}</a>$2`
                );
            }
        });
        
        // Удаляем заголовки
        return content.replace(/<h[1-6][^>]*>.*?<\/h[1-6]>/gi, '').trim();
    }
    // ... остальные типы
}

extractFileLinksFromElement(element) {
    const fileLinks = [];
    const fileExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'zip', 'rar', 'txt', 'csv', 'xml', 'json', 'pptx', 'ppt'];
    
    element.querySelectorAll('a[href]').forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;
        
        const ext = path.extname(href).toLowerCase().replace('.', '');
        if (fileExtensions.includes(ext)) {
            fileLinks.push({
                href: href,
                text: link.textContent.trim(),
                element: link
            });
        }
    });
    
    return fileLinks;
}
```

## Следующие шаги

1. ✅ Модифицировать `html-parser.js` для сохранения ссылок на файлы
2. ✅ Модифицировать `normalize-html-structure.js` для сохранения ссылок при нормализации
3. ✅ Перезапустить нормализацию всех страниц
4. ✅ Обновить страницы в Strapi с новым контентом
5. ✅ Запустить скрипт обновления ссылок на Media Library
