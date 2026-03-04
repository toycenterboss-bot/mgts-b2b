#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для добавления бокового меню на все страницы раздела "О компании"
"""

import os
import re
from pathlib import Path

# Шаблон бокового меню для разных уровней вложенности
SIDEBAR_MENU_TEMPLATES = {
    0: """                    <!-- Боковое меню -->
                    <aside class="sidebar-menu" style="position: sticky; top: 100px; align-self: start;">
                        <nav style="background: white; border-radius: var(--radius-lg); padding: var(--spacing-lg); box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                            <h3 style="margin-bottom: var(--spacing-md); color: var(--color-primary); font-size: var(--font-size-lg);">Разделы</h3>
                            <ul style="list-style: none; padding: 0; margin: 0;">
                                <li style="margin-bottom: var(--spacing-sm);">
                                    <a href="index.html" class="sidebar-link" style="display: block; padding: var(--spacing-sm) var(--spacing-md); color: var(--color-gray-700); text-decoration: none; border-radius: var(--radius-md); transition: all 0.2s;">О компании</a>
                                </li>
                                <li style="margin-bottom: var(--spacing-sm);">
                                    <a href="values/index.html" class="sidebar-link" style="display: block; padding: var(--spacing-sm) var(--spacing-md); color: var(--color-gray-700); text-decoration: none; border-radius: var(--radius-md); transition: all 0.2s;">Ценности МГТС</a>
                                </li>
                                <li style="margin-bottom: var(--spacing-sm);" class="sidebar-has-submenu">
                                    <a href="ethics/index.html" class="sidebar-link sidebar-parent" style="display: block; padding: var(--spacing-sm) var(--spacing-md); color: var(--color-gray-700); text-decoration: none; border-radius: var(--radius-md); transition: all 0.2s;">Деловая этика и комплаенс</a>
                                    <ul class="sidebar-submenu" style="list-style: none; padding-left: var(--spacing-md); margin-top: var(--spacing-xs); max-height: 0; overflow: hidden; transition: max-height 0.3s ease;">
                                        <li style="margin-bottom: var(--spacing-xs);">
                                            <a href="ethics/general-director-message/index.html" class="sidebar-link" style="display: block; padding: var(--spacing-xs) var(--spacing-md); color: var(--color-gray-600); text-decoration: none; font-size: var(--font-size-sm); border-radius: var(--radius-sm); transition: all 0.2s;">Обращение генерального директора</a>
                                        </li>
                                        <li style="margin-bottom: var(--spacing-xs);">
                                            <a href="ethics/compliance-policies/index.html" class="sidebar-link" style="display: block; padding: var(--spacing-xs) var(--spacing-md); color: var(--color-gray-600); text-decoration: none; font-size: var(--font-size-sm); border-radius: var(--radius-sm); transition: all 0.2s;">Политики комплаенса</a>
                                        </li>
                                        <li style="margin-bottom: var(--spacing-xs);">
                                            <a href="ethics/interaction-partners/index.html" class="sidebar-link" style="display: block; padding: var(--spacing-xs) var(--spacing-md); color: var(--color-gray-600); text-decoration: none; font-size: var(--font-size-sm); border-radius: var(--radius-sm); transition: all 0.2s;">Взаимодействие с партнерами</a>
                                        </li>
                                        <li style="margin-bottom: var(--spacing-xs);">
                                            <a href="ethics/partners-feedback/index.html" class="sidebar-link" style="display: block; padding: var(--spacing-xs) var(--spacing-md); color: var(--color-gray-600); text-decoration: none; font-size: var(--font-size-sm); border-radius: var(--radius-sm); transition: all 0.2s;">Обратная связь от партнеров</a>
                                        </li>
                                        <li style="margin-bottom: var(--spacing-xs);">
                                            <a href="ethics/single-hotline/index.html" class="sidebar-link" style="display: block; padding: var(--spacing-xs) var(--spacing-md); color: var(--color-gray-600); text-decoration: none; font-size: var(--font-size-sm); border-radius: var(--radius-sm); transition: all 0.2s;">Единая горячая линия</a>
                                        </li>
                                    </ul>
                                </li>
                                <li style="margin-bottom: var(--spacing-sm);" class="sidebar-has-submenu">
                                    <a href="governance/index.html" class="sidebar-link sidebar-parent" style="display: block; padding: var(--spacing-sm) var(--spacing-md); color: var(--color-gray-700); text-decoration: none; border-radius: var(--radius-md); transition: all 0.2s;">Корпоративное управление</a>
                                    <ul class="sidebar-submenu" style="list-style: none; padding-left: var(--spacing-md); margin-top: var(--spacing-xs); max-height: 0; overflow: hidden; transition: max-height 0.3s ease;">
                                        <li style="margin-bottom: var(--spacing-xs);">
                                            <a href="governance/principles/index.html" class="sidebar-link" style="display: block; padding: var(--spacing-xs) var(--spacing-md); color: var(--color-gray-600); text-decoration: none; font-size: var(--font-size-sm); border-radius: var(--radius-sm); transition: all 0.2s;">Принципы корпоративного управления</a>
                                        </li>
                                        <li style="margin-bottom: var(--spacing-xs);">
                                            <a href="governance/documents/index.html" class="sidebar-link" style="display: block; padding: var(--spacing-xs) var(--spacing-md); color: var(--color-gray-600); text-decoration: none; font-size: var(--font-size-sm); border-radius: var(--radius-sm); transition: all 0.2s;">Корпоративные документы</a>
                                        </li>
                                        <li style="margin-bottom: var(--spacing-xs);">
                                            <a href="governance/shareholders/index.html" class="sidebar-link" style="display: block; padding: var(--spacing-xs) var(--spacing-md); color: var(--color-gray-600); text-decoration: none; font-size: var(--font-size-sm); border-radius: var(--radius-sm); transition: all 0.2s;">Решения собраний акционеров</a>
                                        </li>
                                        <li style="margin-bottom: var(--spacing-xs);">
                                            <a href="governance/infoformen/index.html" class="sidebar-link" style="display: block; padding: var(--spacing-xs) var(--spacing-md); color: var(--color-gray-600); text-decoration: none; font-size: var(--font-size-sm); border-radius: var(--radius-sm); transition: all 0.2s;">Раскрытие информации</a>
                                        </li>
                                        <li style="margin-bottom: var(--spacing-xs);">
                                            <a href="governance/registrar/index.html" class="sidebar-link" style="display: block; padding: var(--spacing-xs) var(--spacing-md); color: var(--color-gray-600); text-decoration: none; font-size: var(--font-size-sm); border-radius: var(--radius-sm); transition: all 0.2s;">О регистраторе</a>
                                        </li>
                                    </ul>
                                </li>
                            </ul>
                        </nav>
                    </aside>""",
    1: """                    <!-- Боковое меню -->
                    <aside class="sidebar-menu" style="position: sticky; top: 100px; align-self: start;">
                        <nav style="background: white; border-radius: var(--radius-lg); padding: var(--spacing-lg); box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                            <h3 style="margin-bottom: var(--spacing-md); color: var(--color-primary); font-size: var(--font-size-lg);">Разделы</h3>
                            <ul style="list-style: none; padding: 0; margin: 0;">
                                <li style="margin-bottom: var(--spacing-sm);">
                                    <a href="../index.html" class="sidebar-link" style="display: block; padding: var(--spacing-sm) var(--spacing-md); color: var(--color-gray-700); text-decoration: none; border-radius: var(--radius-md); transition: all 0.2s;">О компании</a>
                                </li>
                                <li style="margin-bottom: var(--spacing-sm);">
                                    <a href="../values/index.html" class="sidebar-link" style="display: block; padding: var(--spacing-sm) var(--spacing-md); color: var(--color-gray-700); text-decoration: none; border-radius: var(--radius-md); transition: all 0.2s;">Ценности МГТС</a>
                                </li>
                                <li style="margin-bottom: var(--spacing-sm);" class="sidebar-has-submenu">
                                    <a href="../ethics/index.html" class="sidebar-link sidebar-parent" style="display: block; padding: var(--spacing-sm) var(--spacing-md); color: var(--color-gray-700); text-decoration: none; border-radius: var(--radius-md); transition: all 0.2s;">Деловая этика и комплаенс</a>
                                    <ul class="sidebar-submenu" style="list-style: none; padding-left: var(--spacing-md); margin-top: var(--spacing-xs); max-height: 0; overflow: hidden; transition: max-height 0.3s ease;">
                                        <li style="margin-bottom: var(--spacing-xs);">
                                            <a href="../ethics/general-director-message/index.html" class="sidebar-link" style="display: block; padding: var(--spacing-xs) var(--spacing-md); color: var(--color-gray-600); text-decoration: none; font-size: var(--font-size-sm); border-radius: var(--radius-sm); transition: all 0.2s;">Обращение генерального директора</a>
                                        </li>
                                        <li style="margin-bottom: var(--spacing-xs);">
                                            <a href="../ethics/compliance-policies/index.html" class="sidebar-link" style="display: block; padding: var(--spacing-xs) var(--spacing-md); color: var(--color-gray-600); text-decoration: none; font-size: var(--font-size-sm); border-radius: var(--radius-sm); transition: all 0.2s;">Политики комплаенса</a>
                                        </li>
                                        <li style="margin-bottom: var(--spacing-xs);">
                                            <a href="../ethics/interaction-partners/index.html" class="sidebar-link" style="display: block; padding: var(--spacing-xs) var(--spacing-md); color: var(--color-gray-600); text-decoration: none; font-size: var(--font-size-sm); border-radius: var(--radius-sm); transition: all 0.2s;">Взаимодействие с партнерами</a>
                                        </li>
                                        <li style="margin-bottom: var(--spacing-xs);">
                                            <a href="../ethics/partners-feedback/index.html" class="sidebar-link" style="display: block; padding: var(--spacing-xs) var(--spacing-md); color: var(--color-gray-600); text-decoration: none; font-size: var(--font-size-sm); border-radius: var(--radius-sm); transition: all 0.2s;">Обратная связь от партнеров</a>
                                        </li>
                                        <li style="margin-bottom: var(--spacing-xs);">
                                            <a href="../ethics/single-hotline/index.html" class="sidebar-link" style="display: block; padding: var(--spacing-xs) var(--spacing-md); color: var(--color-gray-600); text-decoration: none; font-size: var(--font-size-sm); border-radius: var(--radius-sm); transition: all 0.2s;">Единая горячая линия</a>
                                        </li>
                                    </ul>
                                </li>
                                <li style="margin-bottom: var(--spacing-sm);" class="sidebar-has-submenu">
                                    <a href="../governance/index.html" class="sidebar-link sidebar-parent" style="display: block; padding: var(--spacing-sm) var(--spacing-md); color: var(--color-gray-700); text-decoration: none; border-radius: var(--radius-md); transition: all 0.2s;">Корпоративное управление</a>
                                    <ul class="sidebar-submenu" style="list-style: none; padding-left: var(--spacing-md); margin-top: var(--spacing-xs); max-height: 0; overflow: hidden; transition: max-height 0.3s ease;">
                                        <li style="margin-bottom: var(--spacing-xs);">
                                            <a href="../governance/principles/index.html" class="sidebar-link" style="display: block; padding: var(--spacing-xs) var(--spacing-md); color: var(--color-gray-600); text-decoration: none; font-size: var(--font-size-sm); border-radius: var(--radius-sm); transition: all 0.2s;">Принципы корпоративного управления</a>
                                        </li>
                                        <li style="margin-bottom: var(--spacing-xs);">
                                            <a href="../governance/documents/index.html" class="sidebar-link" style="display: block; padding: var(--spacing-xs) var(--spacing-md); color: var(--color-gray-600); text-decoration: none; font-size: var(--font-size-sm); border-radius: var(--radius-sm); transition: all 0.2s;">Корпоративные документы</a>
                                        </li>
                                        <li style="margin-bottom: var(--spacing-xs);">
                                            <a href="../governance/shareholders/index.html" class="sidebar-link" style="display: block; padding: var(--spacing-xs) var(--spacing-md); color: var(--color-gray-600); text-decoration: none; font-size: var(--font-size-sm); border-radius: var(--radius-sm); transition: all 0.2s;">Решения собраний акционеров</a>
                                        </li>
                                        <li style="margin-bottom: var(--spacing-xs);">
                                            <a href="../governance/infoformen/index.html" class="sidebar-link" style="display: block; padding: var(--spacing-xs) var(--spacing-md); color: var(--color-gray-600); text-decoration: none; font-size: var(--font-size-sm); border-radius: var(--radius-sm); transition: all 0.2s;">Раскрытие информации</a>
                                        </li>
                                        <li style="margin-bottom: var(--spacing-xs);">
                                            <a href="../governance/registrar/index.html" class="sidebar-link" style="display: block; padding: var(--spacing-xs) var(--spacing-md); color: var(--color-gray-600); text-decoration: none; font-size: var(--font-size-sm); border-radius: var(--radius-sm); transition: all 0.2s;">О регистраторе</a>
                                        </li>
                                    </ul>
                                </li>
                            </ul>
                        </nav>
                    </aside>""",
    2: """                    <!-- Боковое меню -->
                    <aside class="sidebar-menu" style="position: sticky; top: 100px; align-self: start;">
                        <nav style="background: white; border-radius: var(--radius-lg); padding: var(--spacing-lg); box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                            <h3 style="margin-bottom: var(--spacing-md); color: var(--color-primary); font-size: var(--font-size-lg);">Разделы</h3>
                            <ul style="list-style: none; padding: 0; margin: 0;">
                                <li style="margin-bottom: var(--spacing-sm);">
                                    <a href="../../index.html" class="sidebar-link" style="display: block; padding: var(--spacing-sm) var(--spacing-md); color: var(--color-gray-700); text-decoration: none; border-radius: var(--radius-md); transition: all 0.2s;">О компании</a>
                                </li>
                                <li style="margin-bottom: var(--spacing-sm);">
                                    <a href="../../values/index.html" class="sidebar-link" style="display: block; padding: var(--spacing-sm) var(--spacing-md); color: var(--color-gray-700); text-decoration: none; border-radius: var(--radius-md); transition: all 0.2s;">Ценности МГТС</a>
                                </li>
                                <li style="margin-bottom: var(--spacing-sm);" class="sidebar-has-submenu">
                                    <a href="../../ethics/index.html" class="sidebar-link sidebar-parent" style="display: block; padding: var(--spacing-sm) var(--spacing-md); color: var(--color-gray-700); text-decoration: none; border-radius: var(--radius-md); transition: all 0.2s;">Деловая этика и комплаенс</a>
                                    <ul class="sidebar-submenu" style="list-style: none; padding-left: var(--spacing-md); margin-top: var(--spacing-xs); max-height: 0; overflow: hidden; transition: max-height 0.3s ease;">
                                        <li style="margin-bottom: var(--spacing-xs);">
                                            <a href="../../ethics/general-director-message/index.html" class="sidebar-link" style="display: block; padding: var(--spacing-xs) var(--spacing-md); color: var(--color-gray-600); text-decoration: none; font-size: var(--font-size-sm); border-radius: var(--radius-sm); transition: all 0.2s;">Обращение генерального директора</a>
                                        </li>
                                        <li style="margin-bottom: var(--spacing-xs);">
                                            <a href="../../ethics/compliance-policies/index.html" class="sidebar-link" style="display: block; padding: var(--spacing-xs) var(--spacing-md); color: var(--color-gray-600); text-decoration: none; font-size: var(--font-size-sm); border-radius: var(--radius-sm); transition: all 0.2s;">Политики комплаенса</a>
                                        </li>
                                        <li style="margin-bottom: var(--spacing-xs);">
                                            <a href="../../ethics/interaction-partners/index.html" class="sidebar-link" style="display: block; padding: var(--spacing-xs) var(--spacing-md); color: var(--color-gray-600); text-decoration: none; font-size: var(--font-size-sm); border-radius: var(--radius-sm); transition: all 0.2s;">Взаимодействие с партнерами</a>
                                        </li>
                                        <li style="margin-bottom: var(--spacing-xs);">
                                            <a href="../../ethics/partners-feedback/index.html" class="sidebar-link" style="display: block; padding: var(--spacing-xs) var(--spacing-md); color: var(--color-gray-600); text-decoration: none; font-size: var(--font-size-sm); border-radius: var(--radius-sm); transition: all 0.2s;">Обратная связь от партнеров</a>
                                        </li>
                                        <li style="margin-bottom: var(--spacing-xs);">
                                            <a href="../../ethics/single-hotline/index.html" class="sidebar-link" style="display: block; padding: var(--spacing-xs) var(--spacing-md); color: var(--color-gray-600); text-decoration: none; font-size: var(--font-size-sm); border-radius: var(--radius-sm); transition: all 0.2s;">Единая горячая линия</a>
                                        </li>
                                    </ul>
                                </li>
                                <li style="margin-bottom: var(--spacing-sm);" class="sidebar-has-submenu">
                                    <a href="../../governance/index.html" class="sidebar-link sidebar-parent" style="display: block; padding: var(--spacing-sm) var(--spacing-md); color: var(--color-gray-700); text-decoration: none; border-radius: var(--radius-md); transition: all 0.2s;">Корпоративное управление</a>
                                    <ul class="sidebar-submenu" style="list-style: none; padding-left: var(--spacing-md); margin-top: var(--spacing-xs); max-height: 0; overflow: hidden; transition: max-height 0.3s ease;">
                                        <li style="margin-bottom: var(--spacing-xs);">
                                            <a href="../../governance/principles/index.html" class="sidebar-link" style="display: block; padding: var(--spacing-xs) var(--spacing-md); color: var(--color-gray-600); text-decoration: none; font-size: var(--font-size-sm); border-radius: var(--radius-sm); transition: all 0.2s;">Принципы корпоративного управления</a>
                                        </li>
                                        <li style="margin-bottom: var(--spacing-xs);">
                                            <a href="../../governance/documents/index.html" class="sidebar-link" style="display: block; padding: var(--spacing-xs) var(--spacing-md); color: var(--color-gray-600); text-decoration: none; font-size: var(--font-size-sm); border-radius: var(--radius-sm); transition: all 0.2s;">Корпоративные документы</a>
                                        </li>
                                        <li style="margin-bottom: var(--spacing-xs);">
                                            <a href="../../governance/shareholders/index.html" class="sidebar-link" style="display: block; padding: var(--spacing-xs) var(--spacing-md); color: var(--color-gray-600); text-decoration: none; font-size: var(--font-size-sm); border-radius: var(--radius-sm); transition: all 0.2s;">Решения собраний акционеров</a>
                                        </li>
                                        <li style="margin-bottom: var(--spacing-xs);">
                                            <a href="../../governance/infoformen/index.html" class="sidebar-link" style="display: block; padding: var(--spacing-xs) var(--spacing-md); color: var(--color-gray-600); text-decoration: none; font-size: var(--font-size-sm); border-radius: var(--radius-sm); transition: all 0.2s;">Раскрытие информации</a>
                                        </li>
                                        <li style="margin-bottom: var(--spacing-xs);">
                                            <a href="../../governance/registrar/index.html" class="sidebar-link" style="display: block; padding: var(--spacing-xs) var(--spacing-md); color: var(--color-gray-600); text-decoration: none; font-size: var(--font-size-sm); border-radius: var(--radius-sm); transition: all 0.2s;">О регистраторе</a>
                                        </li>
                                    </ul>
                                </li>
                            </ul>
                        </nav>
                    </aside>"""
}

# JavaScript для управления подменю
SIDEBAR_SCRIPT = """
    <script>
        // Управление боковым меню
        document.addEventListener('DOMContentLoaded', function() {
            const sidebarMenu = document.querySelector('.sidebar-menu');
            if (sidebarMenu) {
                const parentLinks = sidebarMenu.querySelectorAll('.sidebar-parent');
                let hoverTimeout = null;
                
                parentLinks.forEach(parentLink => {
                    const submenu = parentLink.nextElementSibling;
                    if (submenu && submenu.classList.contains('sidebar-submenu')) {
                        const parentLi = parentLink.closest('li');
                        
                        // При наведении на родительский пункт
                        parentLi.addEventListener('mouseenter', function() {
                            clearTimeout(hoverTimeout);
                            submenu.style.maxHeight = '500px';
                            parentLi.classList.add('active');
                        });
                        
                        // При уходе с родительского пункта
                        parentLi.addEventListener('mouseleave', function(e) {
                            // Проверяем, не переходим ли мы на подменю
                            const relatedTarget = e.relatedTarget;
                            if (!parentLi.contains(relatedTarget)) {
                                hoverTimeout = setTimeout(() => {
                                    submenu.style.maxHeight = '0';
                                    parentLi.classList.remove('active');
                                }, 300); // Задержка 300мс
                            }
                        });
                        
                        // При наведении на подменю
                        submenu.addEventListener('mouseenter', function() {
                            clearTimeout(hoverTimeout);
                            submenu.style.maxHeight = '500px';
                            parentLi.classList.add('active');
                        });
                        
                        // При уходе с подменю
                        submenu.addEventListener('mouseleave', function() {
                            hoverTimeout = setTimeout(() => {
                                submenu.style.maxHeight = '0';
                                parentLi.classList.remove('active');
                            }, 300);
                        });
                    }
                });
                
                // Определение активного пункта меню
                const currentPath = window.location.pathname;
                const sidebarLinks = sidebarMenu.querySelectorAll('.sidebar-link');
                sidebarLinks.forEach(link => {
                    const linkPath = new URL(link.href).pathname;
                    if (currentPath.endsWith(linkPath) || currentPath === linkPath) {
                        link.style.backgroundColor = 'var(--color-primary)';
                        link.style.color = 'white';
                        link.style.fontWeight = 'var(--font-weight-medium)';
                        
                        // Раскрываем родительское меню, если есть
                        const parentLi = link.closest('li.sidebar-has-submenu');
                        if (parentLi) {
                            const submenu = parentLi.querySelector('.sidebar-submenu');
                            if (submenu) {
                                submenu.style.maxHeight = '500px';
                                parentLi.classList.add('active');
                            }
                        }
                    }
                });
            }
        });
    </script>
"""

def get_depth(file_path):
    """Определяет уровень вложенности файла относительно about/"""
    path = Path(file_path)
    parts = path.parts
    
    # Находим индекс 'about' в пути
    try:
        about_index = parts.index('about')
        # Считаем уровни после about
        depth = len(parts) - about_index - 2  # -2 для 'about' и 'index.html'
        return min(max(depth, 0), 2)  # Ограничиваем 0-2
    except ValueError:
        return 0

def get_current_page_class(file_path):
    """Определяет класс для активного пункта меню"""
    path = Path(file_path)
    parts = path.parts
    
    # Определяем текущую страницу
    if 'values' in parts:
        return 'values'
    elif 'ethics' in parts:
        if 'general-director-message' in parts:
            return 'ethics-general-director-message'
        elif 'compliance-policies' in parts:
            return 'ethics-compliance-policies'
        elif 'interaction-partners' in parts:
            return 'ethics-interaction-partners'
        elif 'partners-feedback' in parts:
            return 'ethics-partners-feedback'
        elif 'single-hotline' in parts:
            return 'ethics-single-hotline'
        else:
            return 'ethics'
    elif 'governance' in parts:
        if 'principles' in parts:
            return 'governance-principles'
        elif 'documents' in parts:
            return 'governance-documents'
        elif 'shareholders' in parts:
            return 'governance-shareholders'
        elif 'infoformen' in parts:
            return 'governance-infoformen'
        elif 'registrar' in parts:
            return 'governance-registrar'
        else:
            return 'governance'
    else:
        return 'about'

def update_file(file_path):
    """Обновляет файл, добавляя боковое меню"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Пропускаем главную страницу about/index.html (там уже есть меню)
        if file_path == 'about/index.html':
            return False
        
        # Проверяем, есть ли уже боковое меню
        if 'sidebar-menu' in content:
            return False
        
        # Определяем уровень вложенности
        depth = get_depth(file_path)
        sidebar_menu = SIDEBAR_MENU_TEMPLATES.get(depth, SIDEBAR_MENU_TEMPLATES[2])
        
        # Ищем место для вставки - после hero section, перед основным контентом
        # Ищем паттерн: </section> после hero, затем <section class="section">
        pattern = r'(</section>\s*<!--.*?-->\s*<section class="section")'
        match = re.search(pattern, content, re.DOTALL)
        
        if match:
            # Вставляем меню перед первой секцией после hero
            insert_pos = match.start()
            # Нужно обернуть контент в grid
            section_start = match.group(1)
            
            # Ищем конец контейнера section для обертки
            # Создаем структуру: container -> grid -> sidebar + content
            new_structure = f"""    <section class="section">
        <div class="container">
            <div style="max-width: 1200px; margin: 0 auto;">
                <div style="display: grid; grid-template-columns: 250px 1fr; gap: var(--spacing-2xl);">
{sidebar_menu}
                    
                    <!-- Основной контент -->
                    <div>"""
            
            # Заменяем начало секции
            content = content.replace(section_start, new_structure, 1)
            
            # Нужно найти конец секции и добавить закрывающие теги
            # Ищем последний </section> перед следующей секцией или footer
            section_end_pattern = r'(</div>\s*</div>\s*</section>\s*(?:<section|</section>\s*<footer|</body))'
            end_match = re.search(section_end_pattern, content[insert_pos:], re.DOTALL)
            
            if end_match:
                end_pos = insert_pos + end_match.start()
                # Добавляем закрывающие теги перед </section>
                content = content[:end_pos] + """
                    </div>
                </div>
            </div>
        </div>
    </section>""" + content[end_pos:]
        else:
            # Альтернативный паттерн - после </section> hero
            pattern2 = r'(</section>\s*<section class="section">)'
            match2 = re.search(pattern2, content)
            if match2:
                insert_pos = match2.end()
                new_structure = f"""
        <div class="container">
            <div style="max-width: 1200px; margin: 0 auto;">
                <div style="display: grid; grid-template-columns: 250px 1fr; gap: var(--spacing-2xl);">
{sidebar_menu}
                    
                    <!-- Основной контент -->
                    <div>"""
                content = content[:insert_pos] + new_structure + content[insert_pos:]
                
                # Находим конец первой секции после вставки
                section_end = content.find('</section>', insert_pos)
                if section_end != -1:
                    # Ищем последний </div> перед </section>
                    last_div = content.rfind('</div>', insert_pos, section_end)
                    if last_div != -1:
                        content = content[:section_end] + """
                    </div>
                </div>
            </div>
        </div>""" + content[section_end:]
        
        # Добавляем JavaScript перед закрывающим тегом body
        if SIDEBAR_SCRIPT not in content:
            content = content.replace('</body>', SIDEBAR_SCRIPT + '\n</body>')
        
        # Сохраняем файл
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return True
    except Exception as e:
        print(f"Ошибка при обработке {file_path}: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Основная функция"""
    updated = 0
    skipped = 0
    
    # Ищем все HTML файлы в папке about
    for root, dirs, files in os.walk('about'):
        for file in files:
            if file == 'index.html':
                file_path = os.path.join(root, file)
                if update_file(file_path):
                    updated += 1
                    print(f"✓ Обновлен: {file_path}")
                else:
                    skipped += 1
    
    print(f"\nГотово! Обновлено: {updated}, Пропущено: {skipped}")

if __name__ == '__main__':
    main()

