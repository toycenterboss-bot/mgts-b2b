#!/usr/bin/env python3
"""
Скрипт для получения содержимого страницы "О компании" с оригинального сайта
"""

import json
import platform
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager


def get_user_agent():
    """Возвращает User-Agent в зависимости от операционной системы"""
    system = platform.system()
    if system == 'Windows':
        return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    elif system == 'Darwin':  # macOS
        return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    elif system == 'Linux':
        return 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    else:
        return 'Mozilla/5.0 (compatible; SiteCrawler/1.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

def fetch_about_page():
    url = "https://business.mgts.ru/about_mgts"
    
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument(f'user-agent={get_user_agent()}')
    
    try:
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        driver.set_page_load_timeout(30)
        
        print(f"Загрузка страницы: {url}")
        driver.get(url)
        
        # Ждем загрузки основного контента
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        
        # Получаем весь HTML
        html_content = driver.page_source
        
        # Сохраняем в файл
        with open("about_original.html", "w", encoding="utf-8") as f:
            f.write(html_content)
        
        print("Страница сохранена в about_original.html")
        
        # Пытаемся извлечь основные разделы
        try:
            main_content = driver.find_element(By.TAG_NAME, "main")
            sections = main_content.find_elements(By.TAG_NAME, "section")
            
            content_data = {
                "url": url,
                "sections": []
            }
            
            for i, section in enumerate(sections):
                try:
                    title = section.find_element(By.TAG_NAME, "h2").text if section.find_elements(By.TAG_NAME, "h2") else f"Section {i+1}"
                    text = section.text
                    content_data["sections"].append({
                        "title": title,
                        "content": text
                    })
                except:
                    pass
            
            with open("about_content.json", "w", encoding="utf-8") as f:
                json.dump(content_data, f, ensure_ascii=False, indent=2)
            
            print("Контент извлечен и сохранен в about_content.json")
            print(f"\nНайдено разделов: {len(content_data['sections'])}")
            for section in content_data["sections"]:
                print(f"- {section['title']}")
                
        except Exception as e:
            print(f"Ошибка при извлечении контента: {e}")
            print("HTML сохранен, можете проанализировать вручную")
        
        driver.quit()
        
    except Exception as e:
        print(f"Ошибка: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    fetch_about_page()


