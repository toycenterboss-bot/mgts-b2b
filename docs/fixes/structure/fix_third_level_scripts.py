#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Исправление путей к components-loader.js на страницах третьего уровня
"""

import os
import re

def get_file_depth(file_path):
    """Определяет уровень вложенности файла"""
    parts = file_path.split(os.sep)
    # Исключаем корень и имя файла
    depth = len([p for p in parts if p and p != 'index.html']) - 1
    return depth

def fix_script_path(file_path):
    """Исправляет путь к components-loader.js"""
    try:
        depth = get_file_depth(file_path)
        correct_path = '../' * depth + 'js/components-loader.js'
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Ищем неправильные пути
        patterns = [
            (r'<script src="\.\./\.\./js/components-loader\.js"></script>', '../' * depth + 'js/components-loader.js'),
            (r'<script src="\.\./js/components-loader\.js"></script>', '../' * depth + 'js/components-loader.js'),
        ]
        
        for pattern, replacement in patterns:
            if re.search(pattern, content):
                # Проверяем, правильный ли уже путь
                current_match = re.search(r'<script src="([^"]*js/components-loader\.js)"></script>', content)
                if current_match:
                    current_path = current_match.group(1)
                    if current_path != replacement:
                        content = re.sub(pattern, f'<script src="{replacement}"></script>', content)
                        print(f"  Исправлен путь: {current_path} -> {replacement}")
        
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
                depth = get_file_depth(file_path)
                
                # Проверяем только страницы третьего уровня и глубже
                if depth >= 3:
                    if fix_script_path(file_path):
                        updated += 1
                        print(f"✓ Обновлен (уровень {depth}): {file_path}")
    
    print(f"\nОбновлено файлов: {updated}")

if __name__ == '__main__':
    main()

