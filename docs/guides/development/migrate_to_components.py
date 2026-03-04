#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для миграции всех страниц на использование компонентов
"""

import os
import re
from pathlib import Path

def get_base_path_depth(file_path):
    """Определяет уровень вложенности файла"""
    path = Path(file_path)
    parts = path.parts
    
    # Исключаем корень и имя файла
    depth = len([p for p in parts if p != '.' and p != 'index.html']) - 1
    return max(depth, 0)

def update_page(file_path):
    """Обновляет страницу для использования компонентов"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Определяем базовый путь для скриптов
        depth = get_base_path_depth(file_path)
        script_base = '../' * depth if depth > 0 else ''
        
        # 1. Заменяем header на компонент
        header_pattern = r'(<header class="header">.*?</header>)'
        header_match = re.search(header_pattern, content, re.DOTALL)
        if header_match:
            content = content.replace(header_match.group(1), '<div data-component="header"></div>')
        
        # 2. Заменяем footer на компонент
        footer_pattern = r'(<footer class="footer">.*?</footer>)'
        footer_match = re.search(footer_pattern, content, re.DOTALL)
        if footer_match:
            content = content.replace(footer_match.group(1), '<div data-component="footer"></div>')
        
        # 3. Для страниц раздела "О компании" заменяем sidebar на компонент
        if 'about' in file_path:
            sidebar_pattern = r'(<aside class="sidebar-menu".*?</aside>)'
            sidebar_match = re.search(sidebar_pattern, content, re.DOTALL)
            if sidebar_match:
                content = content.replace(sidebar_match.group(1), '<div data-component="sidebar-about"></div>')
        
        # 4. Добавляем скрипт загрузки компонентов перед закрывающим тегом body
        if '<div data-component="header">' in content or '<div data-component="footer">' in content or '<div data-component="sidebar-about">' in content:
            # Проверяем, не добавлен ли уже скрипт
            if 'components-loader.js' not in content:
                # Ищем место перед закрывающим тегом body
                body_end_pattern = r'(</body>)'
                body_match = re.search(body_end_pattern, content)
                if body_match:
                    script_tag = f'    <script src="{script_base}js/components-loader.js"></script>\n'
                    # Проверяем, есть ли уже другие скрипты
                    if 'js/main.js' in content:
                        # Вставляем перед другими скриптами
                        main_js_pattern = r'(<script src="[^"]*js/main\.js"[^>]*></script>)'
                        main_match = re.search(main_js_pattern, content)
                        if main_match:
                            insert_pos = main_match.start()
                            content = content[:insert_pos] + script_tag + content[insert_pos:]
                        else:
                            # Вставляем перед </body>
                            content = content[:body_match.start()] + script_tag + content[body_match.start():]
                    else:
                        # Вставляем перед </body>
                        content = content[:body_match.start()] + script_tag + content[body_match.start():]
        
        # 5. Удаляем старые скрипты для sidebar, если они есть (они теперь в компоненте)
        if '<div data-component="sidebar-about">' in content:
            # Удаляем старый скрипт управления sidebar, если он есть
            sidebar_script_pattern = r'(<script>\s*//\s*Управление боковым меню.*?</script>)'
            content = re.sub(sidebar_script_pattern, '', content, flags=re.DOTALL)
        
        # Сохраняем только если были изменения
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        
        return False
    except Exception as e:
        print(f"Ошибка при обработке {file_path}: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Основная функция"""
    updated = 0
    skipped = 0
    errors = 0
    
    # Ищем все HTML файлы
    for root, dirs, files in os.walk('.'):
        # Пропускаем служебные папки
        if 'node_modules' in root or '.git' in root or '__pycache__' in root or 'components' in root:
            continue
        
        for file in files:
            if file == 'index.html' and file != 'index.new.html':
                file_path = os.path.join(root, file)
                
                if update_page(file_path):
                    updated += 1
                    print(f"✓ Обновлен: {file_path}")
                else:
                    skipped += 1
    
    print(f"\nГотово! Обновлено: {updated}, Пропущено: {skipped}, Ошибок: {errors}")

if __name__ == '__main__':
    main()

