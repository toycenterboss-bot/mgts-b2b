#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Добавление дополнительной логики загрузки компонентов на все страницы
"""

import os
import re

RETRY_SCRIPT = """    <!-- Дополнительная инициализация после загрузки всех скриптов -->
    <script>
        // Убеждаемся, что компоненты загружены после всех скриптов
        window.addEventListener('load', function() {
            setTimeout(function() {
                if (typeof ComponentLoader !== 'undefined' && typeof ComponentLoader.init === 'function') {
                    // Повторная инициализация на случай, если первая не сработала
                    const header = document.querySelector('[data-component="header"]');
                    const footer = document.querySelector('[data-component="footer"]');
                    
                    if (header && header.innerHTML.trim() === '') {
                        console.log('Retrying header load...');
                        ComponentLoader.load('header', '[data-component="header"]');
                    }
                    
                    if (footer && footer.innerHTML.trim() === '') {
                        console.log('Retrying footer load...');
                        ComponentLoader.load('footer', '[data-component="footer"]');
                    }
                }
            }, 500);
        });
    </script>"""

def update_page(file_path):
    """Добавляет дополнительную логику загрузки компонентов"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Проверяем, есть ли уже этот скрипт
        if 'Retrying header load' in content:
            return False
        
        # Проверяем, есть ли компоненты на странице
        if 'data-component="header"' not in content and 'data-component="footer"' not in content:
            return False
        
        # Ищем место перед закрывающим тегом body
        body_end_pattern = r'(</body>)'
        body_match = re.search(body_end_pattern, content)
        
        if body_match:
            # Вставляем скрипт перед </body>
            content = content[:body_match.start()] + RETRY_SCRIPT + '\n' + content[body_match.start():]
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        
        return False
    except Exception as e:
        print(f"Ошибка при обработке {file_path}: {e}")
        return False

def main():
    """Основная функция"""
    updated = 0
    
    for root, dirs, files in os.walk('.'):
        if 'node_modules' in root or '.git' in root or '__pycache__' in root or 'components' in root:
            continue
        
        for file in files:
            if file == 'index.html' and file != 'test-components.html':
                file_path = os.path.join(root, file)
                if update_page(file_path):
                    updated += 1
                    print(f"✓ Обновлен: {file_path}")
    
    print(f"\nОбновлено файлов: {updated}")

if __name__ == '__main__':
    main()

