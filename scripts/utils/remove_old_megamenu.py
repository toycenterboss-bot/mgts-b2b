#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Удаление остатков старого mega-menu со страниц
"""

import os
import re

def remove_old_megamenu(file_path):
    """Удаляет старые mega-menu блоки, которые остались после миграции"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Проверяем, есть ли data-component="header" (значит компонент используется)
        if 'data-component="header"' not in content:
            return False
        
        # Удаляем старые mega-menu блоки, которые идут сразу после data-component="header"
        # Паттерн: <div data-component="header"></div> + пробелы + <!-- Mega Menu: ... --> + весь блок до </div> + </div>
        pattern1 = r'(<div data-component="header"></div>\s*)<!-- Mega Menu:.*?</div>\s*</div>\s*'
        content = re.sub(pattern1, r'\1', content, flags=re.DOTALL)
        
        # Также удаляем отдельные mega-menu блоки после header
        pattern2 = r'(<div data-component="header"></div>\s*)(<div id="(?:aboutMenu|servicesMenu|segmentsMenu)" class="mega-menu">.*?</div>\s*</div>\s*)'
        content = re.sub(pattern2, r'\1', content, flags=re.DOTALL)
        
        # Удаляем mega-menu блоки, которые идут между header и breadcrumbs
        pattern3 = r'(<div data-component="header"></div>\s*)(<!-- Mega Menu:.*?</div>\s*</div>\s*)(<nav class="breadcrumbs">)'
        content = re.sub(pattern3, r'\1\3', content, flags=re.DOTALL)
        
        # Удаляем пустые строки между header и breadcrumbs
        pattern4 = r'(<div data-component="header"></div>\s*)\n\s*\n\s*(<nav class="breadcrumbs">)'
        content = re.sub(pattern4, r'\1\n\n    \2', content)
        
        if content != original_content:
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
            if file == 'index.html':
                file_path = os.path.join(root, file)
                if remove_old_megamenu(file_path):
                    updated += 1
                    print(f"✓ Обновлен: {file_path}")
    
    print(f"\nОбновлено файлов: {updated}")

if __name__ == '__main__':
    main()

