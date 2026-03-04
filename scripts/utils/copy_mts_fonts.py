#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Кросс-платформенный скрипт для копирования шрифтов МТС в проект
Работает на Windows, macOS и Linux
"""

import os
import shutil
import platform
from pathlib import Path


def get_fonts_source_path():
    """Определяет путь к системным шрифтам в зависимости от ОС"""
    system = platform.system()
    
    if system == 'Windows':
        return Path('C:/Windows/Fonts')
    elif system == 'Darwin':  # macOS
        # macOS может иметь шрифты в нескольких местах
        possible_paths = [
            Path('/Library/Fonts'),
            Path('/System/Library/Fonts'),
            Path.home() / 'Library/Fonts'
        ]
        for path in possible_paths:
            if path.exists():
                return path
        return Path('/Library/Fonts')  # По умолчанию
    elif system == 'Linux':
        # Linux может иметь шрифты в разных местах
        possible_paths = [
            Path('/usr/share/fonts'),
            Path('/usr/local/share/fonts'),
            Path.home() / '.fonts',
            Path.home() / '.local/share/fonts'
        ]
        for path in possible_paths:
            if path.exists():
                return path
        return Path('/usr/share/fonts')  # По умолчанию
    else:
        raise OSError(f"Неподдерживаемая ОС: {system}")


def find_font_in_system(font_name, search_paths=None):
    """Ищет шрифт в системе, проверяя несколько возможных путей"""
    if search_paths is None:
        search_paths = [get_fonts_source_path()]
    
    # Также добавляем возможные альтернативные пути
    system = platform.system()
    if system == 'Windows':
        search_paths.append(Path('C:/Windows/Fonts'))
    elif system == 'Darwin':
        search_paths.extend([
            Path('/Library/Fonts'),
            Path('/System/Library/Fonts'),
            Path.home() / 'Library/Fonts'
        ])
    elif system == 'Linux':
        search_paths.extend([
            Path('/usr/share/fonts'),
            Path('/usr/local/share/fonts'),
            Path.home() / '.fonts',
            Path.home() / '.local/share/fonts'
        ])
    
    # Ищем шрифт (с учетом разных регистров)
    for search_path in search_paths:
        if not search_path.exists():
            continue
        
        # Проверяем точное совпадение
        font_path = search_path / font_name
        if font_path.exists():
            return font_path
        
        # Ищем без учета регистра (для Linux)
        if system == 'Linux':
            try:
                for file in search_path.rglob('*'):
                    if file.name.lower() == font_name.lower():
                        return file
            except (PermissionError, OSError):
                continue
    
    return None


def copy_fonts():
    """Копирует шрифты МТС в папку проекта"""
    print("=" * 60)
    print("Копирование шрифтов МТС")
    print("=" * 60)
    print(f"ОС: {platform.system()} {platform.release()}")
    print()
    
    # Определяем пути
    script_dir = Path(__file__).parent.absolute()
    fonts_dest = script_dir / 'fonts'
    
    # Создаем папку fonts если её нет
    fonts_dest.mkdir(exist_ok=True)
    print(f"Папка назначения: {fonts_dest}")
    print()
    
    # Список шрифтов для копирования
    fonts_to_copy = [
        'MTSText-Regular.otf',
        'MTSText-Medium.otf',
        'MTSText-Bold.otf',
        'MTSText-Black.otf',
        'MTSSans-Regular.otf',
        'MTSSans-Medium.otf',
        'MTSSans-Bold.otf',
        'MTSSans-Black.otf',
        'MTSCompact-Regular.otf',
        'MTSCompact-Medium.otf',
        'MTSCompact-Bold.otf',
        'MTSCompact-Black.otf',
    ]
    
    # Получаем путь к системным шрифтам
    try:
        fonts_source = get_fonts_source_path()
        print(f"Путь к системным шрифтам: {fonts_source}")
    except OSError as e:
        print(f"⚠ Ошибка: {e}")
        print("Попытка найти шрифты в альтернативных местах...")
        fonts_source = None
    
    print()
    
    copied_count = 0
    not_found_count = 0
    already_exists_count = 0
    
    # Копируем каждый шрифт
    for font in fonts_to_copy:
        dest_path = fonts_dest / font
        
        # Проверяем, не существует ли уже
        if dest_path.exists():
            print(f"✓ Уже существует: {font}")
            already_exists_count += 1
            continue
        
        # Ищем шрифт
        if fonts_source:
            source_path = fonts_source / font
            if not source_path.exists():
                # Пытаемся найти в альтернативных местах
                source_path = find_font_in_system(font)
        else:
            source_path = find_font_in_system(font)
        
        if source_path and source_path.exists():
            try:
                shutil.copy2(source_path, dest_path)
                file_size = dest_path.stat().st_size
                print(f"✓ Скопирован: {font} ({file_size:,} байт)")
                copied_count += 1
            except (PermissionError, OSError) as e:
                print(f"✗ Ошибка копирования {font}: {e}")
                not_found_count += 1
        else:
            print(f"⚠ Не найден: {font}")
            not_found_count += 1
    
    print()
    print("=" * 60)
    print("Результат:")
    print(f"  Скопировано: {copied_count}")
    print(f"  Уже существует: {already_exists_count}")
    print(f"  Не найдено: {not_found_count}")
    print("=" * 60)
    print(f"\nШрифты находятся в: {fonts_dest}")
    
    if not_found_count > 0:
        print("\n⚠ Некоторые шрифты не найдены в системе.")
        print("Если шрифты МТС установлены в другом месте, скопируйте их вручную.")
        print("Или скачайте шрифты с официального сайта МТС.")


if __name__ == '__main__':
    try:
        copy_fonts()
    except KeyboardInterrupt:
        print("\n\nПрервано пользователем")
        exit(1)
    except Exception as e:
        print(f"\n✗ Критическая ошибка: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

