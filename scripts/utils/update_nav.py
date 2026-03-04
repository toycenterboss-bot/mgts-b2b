#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Кросс-платформенный скрипт для обновления навигации на всех страницах
Работает на Windows, macOS и Linux
"""

import os
import re
from pathlib import Path


def get_nav_template(level):
    """Возвращает шаблон навигации в зависимости от уровня вложенности"""
    if level == 3:  # business/category/service/index.html
        return """                <nav class="nav" id="mainNav">
                    <a href="../../../index.html" class="nav-link">Главная</a>
                    <a href="../index.html" class="nav-link">Услуги</a>
                    <a href="../../index.html" class="nav-link">Бизнес</a>
                    <a href="../../../operators/index.html" class="nav-link">Операторы</a>
                    <a href="../../../developers/index.html" class="nav-link">Застройщики</a>
                    <a href="../../../partners/index.html" class="nav-link">Партнеры</a>
                    <a href="../../../government/index.html" class="nav-link">Госсектор</a>
                    <a href="../../../about/index.html" class="nav-link">О компании</a>
                    <a href="../../../contacts/index.html" class="nav-link">Контакты</a>
                    <a href="tel:+749563600636" class="nav-link">📞 8 800 250-0-250</a>
                </nav>"""
    elif level == 2:  # business/category/index.html
        return """                <nav class="nav" id="mainNav">
                    <a href="../../index.html" class="nav-link">Главная</a>
                    <a href="index.html" class="nav-link">Услуги</a>
                    <a href="../index.html" class="nav-link">Бизнес</a>
                    <a href="../../operators/index.html" class="nav-link">Операторы</a>
                    <a href="../../developers/index.html" class="nav-link">Застройщики</a>
                    <a href="../../partners/index.html" class="nav-link">Партнеры</a>
                    <a href="../../government/index.html" class="nav-link">Госсектор</a>
                    <a href="../../about/index.html" class="nav-link">О компании</a>
                    <a href="../../contacts/index.html" class="nav-link">Контакты</a>
                    <a href="tel:+749563600636" class="nav-link">📞 8 800 250-0-250</a>
                </nav>"""
    else:  # business/index.html или другие
        return """                <nav class="nav" id="mainNav">
                    <a href="../index.html" class="nav-link">Главная</a>
                    <a href="index.html" class="nav-link">Услуги</a>
                    <a href="index.html" class="nav-link">Бизнес</a>
                    <a href="../operators/index.html" class="nav-link">Операторы</a>
                    <a href="../developers/index.html" class="nav-link">Застройщики</a>
                    <a href="../partners/index.html" class="nav-link">Партнеры</a>
                    <a href="../government/index.html" class="nav-link">Госсектор</a>
                    <a href="../about/index.html" class="nav-link">О компании</a>
                    <a href="../contacts/index.html" class="nav-link">Контакты</a>
                    <a href="tel:+749563600636" class="nav-link">📞 8 800 250-0-250</a>
                </nav>"""


def calculate_depth(file_path, root_path):
    """Вычисляет глубину вложенности файла относительно корня"""
    try:
        relative_path = file_path.relative_to(root_path)
        # Считаем количество частей пути (папок)
        depth = len(relative_path.parts)
        return depth
    except ValueError:
        # Если файл не внутри root_path
        return 0


def update_nav_in_file(file_path, nav_template):
    """Обновляет навигацию в HTML файле"""
    try:
        # Читаем файл с правильной кодировкой
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Ищем существующее меню (регулярное выражение для многострочного поиска)
        nav_pattern = r'(?s)<nav\s+class="nav"[^>]*>.*?</nav>'
        
        if re.search(nav_pattern, content):
            # Заменяем меню
            new_content = re.sub(nav_pattern, nav_template, content)
            
            # Сохраняем файл
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            
            return True
        else:
            return False
    except Exception as e:
        print(f"  ✗ Ошибка обработки {file_path.name}: {e}")
        return False


def update_navigation(root_path=None, target_level=3):
    """Обновляет навигацию на всех страницах указанного уровня"""
    if root_path is None:
        root_path = Path(__file__).parent.absolute()
    else:
        root_path = Path(root_path).absolute()
    
    print("=" * 60)
    print("Обновление навигации")
    print("=" * 60)
    print(f"Корневая папка: {root_path}")
    print(f"Целевой уровень: {target_level}")
    print()
    
    # Находим все index.html файлы в папке business
    business_path = root_path / 'business'
    
    if not business_path.exists():
        print(f"⚠ Папка {business_path} не найдена!")
        return
    
    # Находим все index.html файлы
    html_files = list(business_path.rglob('index.html'))
    
    if not html_files:
        print("⚠ HTML файлы не найдены!")
        return
    
    print(f"Найдено HTML файлов: {len(html_files)}")
    print()
    
    updated_count = 0
    skipped_count = 0
    error_count = 0
    
    # Обрабатываем каждый файл
    for html_file in html_files:
        depth = calculate_depth(html_file, root_path)
        
        # Обрабатываем только файлы нужного уровня
        if depth == target_level:
            print(f"Обработка: {html_file.relative_to(root_path)}")
            
            nav_template = get_nav_template(target_level)
            
            if update_nav_in_file(html_file, nav_template):
                print(f"  ✓ Обновлено: {html_file.name}")
                updated_count += 1
            else:
                print(f"  ⚠ Меню не найдено: {html_file.name}")
                skipped_count += 1
        else:
            # Пропускаем файлы других уровней (можно обработать все уровни)
            pass
    
    print()
    print("=" * 60)
    print("Результат:")
    print(f"  Обновлено: {updated_count}")
    print(f"  Пропущено: {skipped_count}")
    print(f"  Ошибок: {error_count}")
    print("=" * 60)


def main():
    """Главная функция"""
    import sys
    
    # Можно указать корневую папку и уровень как аргументы
    root_path = None
    target_level = 3
    
    if len(sys.argv) > 1:
        root_path = sys.argv[1]
    if len(sys.argv) > 2:
        try:
            target_level = int(sys.argv[2])
        except ValueError:
            print("⚠ Неверный уровень, используется значение по умолчанию: 3")
    
    try:
        update_navigation(root_path, target_level)
    except KeyboardInterrupt:
        print("\n\nПрервано пользователем")
        exit(1)
    except Exception as e:
        print(f"\n✗ Критическая ошибка: {e}")
        import traceback
        traceback.print_exc()
        exit(1)


if __name__ == '__main__':
    main()

