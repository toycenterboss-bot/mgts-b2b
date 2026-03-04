#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Исправление путей к components-loader.js
"""

import os
import re

def fix_script_paths(file_path):
    """Исправляет пути к components-loader.js"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Определяем правильный путь
        depth = len([p for p in file_path.split(os.sep) if p and p != 'index.html']) - 1
        correct_path = '../' * depth + 'js/components-loader.js' if depth > 0 else 'js/components-loader.js'
        
        # Ищем неправильные пути
        pattern = r'<script src="js/components-loader\.js"></script>'
        if re.search(pattern, content):
            content = re.sub(pattern, f'<script src="{correct_path}"></script>', content)
        
        # Также проверяем относительные пути
        pattern2 = r'<script src="\.\./js/components-loader\.js"></script>'
        if re.search(pattern2, content) and depth > 0:
            # Проверяем, правильный ли путь
            current_path = '../' * depth + 'js/components-loader.js'
            if current_path != '../js/components-loader.js':
                content = re.sub(pattern2, f'<script src="{correct_path}"></script>', content)
        
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
                if fix_script_paths(file_path):
                    updated += 1
                    print(f"✓ Исправлен: {file_path}")
    
    print(f"\nИсправлено файлов: {updated}")

if __name__ == '__main__':
    main()

