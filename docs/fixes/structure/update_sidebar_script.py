#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для обновления JavaScript бокового меню на всех страницах раздела about
"""

import os
import re

IMPROVED_SCRIPT = """    <script>
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
                                }, 500); // Задержка 500мс
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
                            }, 500);
                        });
                    }
                });
                
                // Определение активного пункта меню
                const currentPath = window.location.pathname;
                const sidebarLinks = sidebarMenu.querySelectorAll('.sidebar-link');
                sidebarLinks.forEach(link => {
                    try {
                        const linkPath = new URL(link.href).pathname;
                        const currentPathClean = currentPath.replace(/\/$/, '');
                        const linkPathClean = linkPath.replace(/\/$/, '');
                        
                        if (currentPath.endsWith(linkPath) || currentPath === linkPath || 
                            currentPathClean === linkPathClean ||
                            currentPath.includes(linkPathClean) || linkPathClean.includes(currentPathClean)) {
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
                    } catch(e) {
                        // Игнорируем ошибки парсинга URL
                    }
                });
            }
        });
    </script>"""

def update_file(file_path):
    """Обновляет JavaScript в файле"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Ищем старый скрипт
        script_pattern = r'(<script>\s*//\s*Управление боковым меню.*?</script>)'
        match = re.search(script_pattern, content, re.DOTALL)
        
        if match:
            # Заменяем старый скрипт на новый
            content = content.replace(match.group(1), IMPROVED_SCRIPT)
            
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
    
    # Ищем все HTML файлы в папке about
    for root, dirs, files in os.walk('about'):
        for file in files:
            if file == 'index.html':
                file_path = os.path.join(root, file)
                if update_file(file_path):
                    updated += 1
                    print(f"✓ Обновлен: {file_path}")
    
    print(f"\nГотово! Обновлено: {updated} файлов")

if __name__ == '__main__':
    main()

