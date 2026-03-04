#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для добавления mega-menu "О компании" на все страницы сайта
"""

import os
import re
from pathlib import Path

# Шаблон mega-menu для разных уровней вложенности
MEGA_MENU_TEMPLATES = {
    0: """        <!-- Mega Menu: О компании -->
        <div id="aboutMenu" class="mega-menu">
            <div class="container">
                <div class="mega-menu-grid">
                    <div class="mega-menu-section">
                        <h3><a href="about/index.html" style="color: inherit; text-decoration: none;">О компании</a></h3>
                        <p>История, миссия и ценности МГТС</p>
                    </div>
                    <div class="mega-menu-section">
                        <h3><a href="about/values/index.html" style="color: inherit; text-decoration: none;">Ценности МГТС</a></h3>
                        <p>Принципы, которые определяют нашу работу</p>
                    </div>
                    <div class="mega-menu-section">
                        <h3><a href="about/ethics/index.html" style="color: inherit; text-decoration: none;">Деловая этика и комплаенс</a></h3>
                        <ul class="mega-menu-list">
                            <li class="mega-menu-item"><a href="about/ethics/general-director-message/index.html">Обращение генерального директора</a></li>
                            <li class="mega-menu-item"><a href="about/ethics/compliance-policies/index.html">Политики комплаенса</a></li>
                            <li class="mega-menu-item"><a href="about/ethics/interaction-partners/index.html">Взаимодействие с партнерами</a></li>
                            <li class="mega-menu-item"><a href="about/ethics/partners-feedback/index.html">Обратная связь от партнеров</a></li>
                            <li class="mega-menu-item"><a href="about/ethics/single-hotline/index.html">Единая горячая линия</a></li>
                        </ul>
                    </div>
                    <div class="mega-menu-section">
                        <h3><a href="about/governance/index.html" style="color: inherit; text-decoration: none;">Корпоративное управление</a></h3>
                        <ul class="mega-menu-list">
                            <li class="mega-menu-item"><a href="about/governance/principles/index.html">Принципы корпоративного управления</a></li>
                            <li class="mega-menu-item"><a href="about/governance/documents/index.html">Корпоративные документы</a></li>
                            <li class="mega-menu-item"><a href="about/governance/shareholders/index.html">Решения собраний акционеров</a></li>
                            <li class="mega-menu-item"><a href="about/governance/infoformen/index.html">Раскрытие информации</a></li>
                            <li class="mega-menu-item"><a href="about/governance/registrar/index.html">О регистраторе</a></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>""",
    1: """        <!-- Mega Menu: О компании -->
        <div id="aboutMenu" class="mega-menu">
            <div class="container">
                <div class="mega-menu-grid">
                    <div class="mega-menu-section">
                        <h3><a href="../about/index.html" style="color: inherit; text-decoration: none;">О компании</a></h3>
                        <p>История, миссия и ценности МГТС</p>
                    </div>
                    <div class="mega-menu-section">
                        <h3><a href="../about/values/index.html" style="color: inherit; text-decoration: none;">Ценности МГТС</a></h3>
                        <p>Принципы, которые определяют нашу работу</p>
                    </div>
                    <div class="mega-menu-section">
                        <h3><a href="../about/ethics/index.html" style="color: inherit; text-decoration: none;">Деловая этика и комплаенс</a></h3>
                        <ul class="mega-menu-list">
                            <li class="mega-menu-item"><a href="../about/ethics/general-director-message/index.html">Обращение генерального директора</a></li>
                            <li class="mega-menu-item"><a href="../about/ethics/compliance-policies/index.html">Политики комплаенса</a></li>
                            <li class="mega-menu-item"><a href="../about/ethics/interaction-partners/index.html">Взаимодействие с партнерами</a></li>
                            <li class="mega-menu-item"><a href="../about/ethics/partners-feedback/index.html">Обратная связь от партнеров</a></li>
                            <li class="mega-menu-item"><a href="../about/ethics/single-hotline/index.html">Единая горячая линия</a></li>
                        </ul>
                    </div>
                    <div class="mega-menu-section">
                        <h3><a href="../about/governance/index.html" style="color: inherit; text-decoration: none;">Корпоративное управление</a></h3>
                        <ul class="mega-menu-list">
                            <li class="mega-menu-item"><a href="../about/governance/principles/index.html">Принципы корпоративного управления</a></li>
                            <li class="mega-menu-item"><a href="../about/governance/documents/index.html">Корпоративные документы</a></li>
                            <li class="mega-menu-item"><a href="../about/governance/shareholders/index.html">Решения собраний акционеров</a></li>
                            <li class="mega-menu-item"><a href="../about/governance/infoformen/index.html">Раскрытие информации</a></li>
                            <li class="mega-menu-item"><a href="../about/governance/registrar/index.html">О регистраторе</a></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>""",
    2: """        <!-- Mega Menu: О компании -->
        <div id="aboutMenu" class="mega-menu">
            <div class="container">
                <div class="mega-menu-grid">
                    <div class="mega-menu-section">
                        <h3><a href="../../about/index.html" style="color: inherit; text-decoration: none;">О компании</a></h3>
                        <p>История, миссия и ценности МГТС</p>
                    </div>
                    <div class="mega-menu-section">
                        <h3><a href="../../about/values/index.html" style="color: inherit; text-decoration: none;">Ценности МГТС</a></h3>
                        <p>Принципы, которые определяют нашу работу</p>
                    </div>
                    <div class="mega-menu-section">
                        <h3><a href="../../about/ethics/index.html" style="color: inherit; text-decoration: none;">Деловая этика и комплаенс</a></h3>
                        <ul class="mega-menu-list">
                            <li class="mega-menu-item"><a href="../../about/ethics/general-director-message/index.html">Обращение генерального директора</a></li>
                            <li class="mega-menu-item"><a href="../../about/ethics/compliance-policies/index.html">Политики комплаенса</a></li>
                            <li class="mega-menu-item"><a href="../../about/ethics/interaction-partners/index.html">Взаимодействие с партнерами</a></li>
                            <li class="mega-menu-item"><a href="../../about/ethics/partners-feedback/index.html">Обратная связь от партнеров</a></li>
                            <li class="mega-menu-item"><a href="../../about/ethics/single-hotline/index.html">Единая горячая линия</a></li>
                        </ul>
                    </div>
                    <div class="mega-menu-section">
                        <h3><a href="../../about/governance/index.html" style="color: inherit; text-decoration: none;">Корпоративное управление</a></h3>
                        <ul class="mega-menu-list">
                            <li class="mega-menu-item"><a href="../../about/governance/principles/index.html">Принципы корпоративного управления</a></li>
                            <li class="mega-menu-item"><a href="../../about/governance/documents/index.html">Корпоративные документы</a></li>
                            <li class="mega-menu-item"><a href="../../about/governance/shareholders/index.html">Решения собраний акционеров</a></li>
                            <li class="mega-menu-item"><a href="../../about/governance/infoformen/index.html">Раскрытие информации</a></li>
                            <li class="mega-menu-item"><a href="../../about/governance/registrar/index.html">О регистраторе</a></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>""",
    3: """        <!-- Mega Menu: О компании -->
        <div id="aboutMenu" class="mega-menu">
            <div class="container">
                <div class="mega-menu-grid">
                    <div class="mega-menu-section">
                        <h3><a href="../../../about/index.html" style="color: inherit; text-decoration: none;">О компании</a></h3>
                        <p>История, миссия и ценности МГТС</p>
                    </div>
                    <div class="mega-menu-section">
                        <h3><a href="../../../about/values/index.html" style="color: inherit; text-decoration: none;">Ценности МГТС</a></h3>
                        <p>Принципы, которые определяют нашу работу</p>
                    </div>
                    <div class="mega-menu-section">
                        <h3><a href="../../../about/ethics/index.html" style="color: inherit; text-decoration: none;">Деловая этика и комплаенс</a></h3>
                        <ul class="mega-menu-list">
                            <li class="mega-menu-item"><a href="../../../about/ethics/general-director-message/index.html">Обращение генерального директора</a></li>
                            <li class="mega-menu-item"><a href="../../../about/ethics/compliance-policies/index.html">Политики комплаенса</a></li>
                            <li class="mega-menu-item"><a href="../../../about/ethics/interaction-partners/index.html">Взаимодействие с партнерами</a></li>
                            <li class="mega-menu-item"><a href="../../../about/ethics/partners-feedback/index.html">Обратная связь от партнеров</a></li>
                            <li class="mega-menu-item"><a href="../../../about/ethics/single-hotline/index.html">Единая горячая линия</a></li>
                        </ul>
                    </div>
                    <div class="mega-menu-section">
                        <h3><a href="../../../about/governance/index.html" style="color: inherit; text-decoration: none;">Корпоративное управление</a></h3>
                        <ul class="mega-menu-list">
                            <li class="mega-menu-item"><a href="../../../about/governance/principles/index.html">Принципы корпоративного управления</a></li>
                            <li class="mega-menu-item"><a href="../../../about/governance/documents/index.html">Корпоративные документы</a></li>
                            <li class="mega-menu-item"><a href="../../../about/governance/shareholders/index.html">Решения собраний акционеров</a></li>
                            <li class="mega-menu-item"><a href="../../../about/governance/infoformen/index.html">Раскрытие информации</a></li>
                            <li class="mega-menu-item"><a href="../../../about/governance/registrar/index.html">О регистраторе</a></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>"""
}

def get_depth(file_path):
    """Определяет уровень вложенности файла"""
    path = Path(file_path)
    parts = path.parts
    # Исключаем корень и имя файла
    depth = len([p for p in parts if p != '.' and p != 'index.html']) - 1
    return min(depth, 3)  # Максимум 3 уровня

def update_file(file_path):
    """Обновляет файл, добавляя mega-menu"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Пропускаем файлы в папке about
        if 'about' in file_path and file_path != 'index.html':
            return False
        
        # Проверяем, есть ли уже mega-menu
        if 'id="aboutMenu"' in content:
            return False
        
        # Ищем ссылку "О компании" в меню
        about_link_pattern = r'(<a\s+href=["\']([^"\']*about[^"\']*)["\'][^>]*class=["\']nav-link[^"\']*["\'][^>]*>О компании</a>)'
        match = re.search(about_link_pattern, content)
        
        if not match:
            return False
        
        # Определяем уровень вложенности
        depth = get_depth(file_path)
        mega_menu = MEGA_MENU_TEMPLATES.get(depth, MEGA_MENU_TEMPLATES[3])
        
        # Добавляем data-mega-menu к ссылке
        old_link = match.group(1)
        new_link = old_link.replace('class="nav-link', 'class="nav-link" data-mega-menu="aboutMenu"').replace('class=\'nav-link', 'class="nav-link" data-mega-menu="aboutMenu"')
        content = content.replace(old_link, new_link)
        
        # Ищем место для вставки mega-menu (после </header> или перед <!-- Breadcrumbs -->)
        header_end_pattern = r'(</header>)'
        header_match = re.search(header_end_pattern, content)
        
        if header_match:
            insert_pos = header_match.end()
            # Проверяем, нет ли уже mega-menu после header
            after_header = content[insert_pos:insert_pos+100]
            if 'mega-menu' not in after_header:
                content = content[:insert_pos] + '\n' + mega_menu + '\n' + content[insert_pos:]
        
        # Сохраняем файл
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return True
    except Exception as e:
        print(f"Ошибка при обработке {file_path}: {e}")
        return False

def main():
    """Основная функция"""
    updated = 0
    skipped = 0
    
    # Ищем все HTML файлы
    for root, dirs, files in os.walk('.'):
        # Пропускаем служебные папки
        if 'node_modules' in root or '.git' in root or '__pycache__' in root:
            continue
        
        for file in files:
            if file == 'index.html':
                file_path = os.path.join(root, file)
                # Пропускаем файлы в папке about (кроме корня)
                if 'about' in file_path and file_path != 'index.html':
                    continue
                
                if update_file(file_path):
                    updated += 1
                    print(f"✓ Обновлен: {file_path}")
                else:
                    skipped += 1
    
    print(f"\nГотово! Обновлено: {updated}, Пропущено: {skipped}")

if __name__ == '__main__':
    main()

