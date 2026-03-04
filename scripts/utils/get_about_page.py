#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Простой скрипт для получения содержимого страницы about_mgts
"""

import sys
import os

# Добавляем путь к site_structure_builder для использования его классов
script_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.join(script_dir, '..')
sys.path.insert(0, os.path.abspath(parent_dir))

try:
    from site_structure_builder import SiteCrawler
    import json
    
    def get_about_page_content():
        """Получает содержимое страницы about_mgts"""
        base_url = "https://business.mgts.ru/"
        url = base_url + "about_mgts"
        
        print("Инициализация браузера...")
        crawler = SiteCrawler(base_url=base_url, max_depth=1, delay=1.0, headless=True)
        
        try:
            print(f"Загрузка страницы: {url}")
            crawler.driver.get(url)
            
            # Ждем загрузки
            import time
            time.sleep(3)
            
            # Получаем HTML
            html = crawler.driver.page_source
            
            # Сохраняем HTML
            script_dir = os.path.dirname(os.path.abspath(__file__))
            output_file = os.path.join(script_dir, "about_original.html")
            with open(output_file, "w", encoding="utf-8") as f:
                f.write(html)
            
            print(f"HTML сохранен в: {output_file}")
            
            # Пытаемся извлечь текст основных разделов
            try:
                from selenium.webdriver.common.by import By
                
                sections_data = []
                
                # Ищем все заголовки h2 (обычно это названия разделов)
                h2_elements = crawler.driver.find_elements(By.TAG_NAME, "h2")
                print(f"\nНайдено заголовков h2: {len(h2_elements)}")
                
                for h2 in h2_elements:
                    section_title = h2.text.strip()
                    print(f"- {section_title}")
                    
                    # Пытаемся найти следующий блок контента
                    parent = h2.find_element(By.XPATH, "./..")
                    section_text = parent.text.strip()
                    
                    sections_data.append({
                        "title": section_title,
                        "content": section_text[:500] + "..." if len(section_text) > 500 else section_text
                    })
                
                # Сохраняем данные
                json_file = os.path.join(script_dir, "about_content.json")
                with open(json_file, "w", encoding="utf-8") as f:
                    json.dump({"sections": sections_data}, f, ensure_ascii=False, indent=2)
                
                print(f"\nДанные разделов сохранены в: {json_file}")
                
            except Exception as e:
                print(f"Ошибка при извлечении текста: {e}")
                import traceback
                traceback.print_exc()
            
        finally:
            crawler.driver.quit()
            print("\nГотово!")
    
    if __name__ == "__main__":
        get_about_page_content()
        
except ImportError as e:
    print(f"Ошибка импорта: {e}")
    print("Убедитесь, что файл site_structure_builder.py находится в родительской директории")
except Exception as e:
    print(f"Ошибка: {e}")
    import traceback
    traceback.print_exc()


