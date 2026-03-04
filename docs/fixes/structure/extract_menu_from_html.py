#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Извлечение меню из сохраненного HTML файла и загрузка содержимого страниц"""

from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import json
import time
import re
import os
import platform


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

def extract_menu_from_html():
    """Извлекает структуру меню из сохраненного HTML файла"""
    # Ищем HTML файл в разных местах
    html_files = [
        "about_original.html",
        "../about_original.html",
        "../../about_original.html"
    ]
    
    html_file = None
    for f in html_files:
        if os.path.exists(f):
            html_file = f
            break
    
    if not html_file:
        print(f"Файл about_original.html не найден! Искали: {html_files}")
        return None
    
    print(f"Парсинг HTML файла: {html_file}")
    
    with open(html_file, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    soup = BeautifulSoup(html_content, 'html.parser')
    
    menu_items = []
    
    # Ищем блок sidebar-menu-desktop
    menu_container = soup.select_one('.sidebar-menu-desktop, [class*="sidebar-menu-desktop"], sidebar-menu-desktop')
    
    if not menu_container:
        print("Блок sidebar-menu-desktop не найден, пробуем другие селекторы...")
        menu_container = soup.select_one('[class*="sidebar-menu"]')
    
    if menu_container:
        print("Найден контейнер меню")
        
        # Ищем все ссылки внутри контейнера
        links = menu_container.find_all('a', href=True)
        
        print(f"Найдено ссылок в меню: {len(links)}")
        
        base_url = "https://business.mgts.ru"
        
        for link in links:
            href = link.get('href', '').strip()
            text = link.get_text(strip=True)
            
            # Фильтруем ссылки
            if (href and (href.startswith('/') or href.startswith(base_url)) and
                text and len(text) > 2 and len(text) < 100 and
                'tel:' not in href and 'mailto:' not in href and 
                'javascript:' not in href and '#' not in href and
                href != '/'):
                
                # Преобразуем относительные URL в абсолютные
                if href.startswith('/'):
                    href = base_url + href
                
                menu_items.append({
                    "text": text,
                    "href": href
                })
                print(f"  - {text}: {href}")
    else:
        print("Контейнер меню не найден в HTML!")
        # Попробуем найти все ссылки с about_mgts или другие релевантные
        print("Попытка найти ссылки по всему документу...")
        all_links = soup.find_all('a', href=True)
        
        base_url = "https://business.mgts.ru"
        for link in all_links:
            href = link.get('href', '').strip()
            text = link.get_text(strip=True)
            
            # Ищем ссылки, которые могут быть в меню about_mgts
            if (href and (href.startswith('/general_director') or 
                          href.startswith('/compliance') or
                          href.startswith('/corporate') or
                          href.startswith('/partners') or
                          href.startswith('/about_registrar') or
                          'about_mgts' in href) and
                text and len(text) > 2 and len(text) < 100):
                
                if href.startswith('/'):
                    href = base_url + href
                
                menu_items.append({
                    "text": text,
                    "href": href
                })
                print(f"  - {text}: {href}")
    
    # Убираем дубликаты
    seen = {}
    unique_items = []
    for item in menu_items:
        key = item['href']
        if key not in seen:
            seen[key] = True
            unique_items.append(item)
    
    print(f"\nИтого уникальных пунктов меню: {len(unique_items)}")
    
    return unique_items

def extract_page_content(driver, url):
    """Извлекает содержимое страницы"""
    try:
        print(f"  Загрузка: {url}")
        driver.get(url)
        WebDriverWait(driver, 15).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
        time.sleep(2)
        
        # Прокручиваем страницу
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(1)
        driver.execute_script("window.scrollTo(0, 0);")
        time.sleep(1)
        
        page_content = {
            "url": url,
            "title": "",
            "sections": [],
            "full_text": ""
        }
        
        # Ищем заголовок
        try:
            h1 = driver.find_element(By.TAG_NAME, "h1")
            page_content["title"] = h1.text.strip()
        except:
            try:
                h2 = driver.find_element(By.TAG_NAME, "h2")
                page_content["title"] = h2.text.strip()
            except:
                page_content["title"] = ""
        
        # Извлекаем все разделы
        headings = driver.find_elements(By.CSS_SELECTOR, "h1, h2, h3")
        seen_headings = set()
        
        for heading in headings:
            try:
                title = heading.text.strip()
                if not title or title in seen_headings or len(title) < 3:
                    continue
                seen_headings.add(title)
                
                # Получаем контент после заголовка
                try:
                    parent = heading.find_element(By.XPATH, "./ancestor::section | ./ancestor::div[contains(@class, 'content')][1] | ./ancestor::article | ./ancestor::main")
                    content_text = parent.text.strip()
                except:
                    try:
                        next_elem = heading.find_element(By.XPATH, "./following-sibling::*[1]")
                        content_text = next_elem.text.strip()
                    except:
                        content_text = ""
                
                if content_text and len(content_text) > 50:
                    if len(content_text) > 5000:
                        content_text = content_text[:5000] + "..."
                    
                    page_content["sections"].append({
                        "title": title,
                        "content": content_text
                    })
            except:
                continue
        
        # Сохраняем весь текст страницы
        try:
            main = driver.find_element(By.TAG_NAME, "main")
            page_content["full_text"] = main.text.strip()
        except:
            try:
                content_block = driver.find_element(By.CSS_SELECTOR, "[class*='content'], article, section")
                page_content["full_text"] = content_block.text.strip()
            except:
                try:
                    body = driver.find_element(By.TAG_NAME, "body")
                    page_content["full_text"] = body.text.strip()
                except:
                    page_content["full_text"] = ""
        
        if len(page_content["full_text"]) > 10000:
            page_content["full_text"] = page_content["full_text"][:10000] + "..."
        
        return page_content
        
    except Exception as e:
        print(f"    Ошибка: {e}")
        return None

def main():
    # Проверяем наличие BeautifulSoup
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        print("Установите BeautifulSoup4: pip install beautifulsoup4")
        return
    
    # 1. Извлекаем меню из HTML
    menu_items = extract_menu_from_html()
    
    if not menu_items:
        print("Не удалось извлечь меню из HTML файла!")
        return
    
    # 2. Загружаем содержимое каждой страницы через Selenium
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument(f'user-agent={get_user_agent()}')
    
    driver = None
    try:
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        driver.set_page_load_timeout(30)
        
        result = {
            "menu_items": menu_items,
            "menu_pages": {},
            "history_periods": []
        }
        
        print(f"\n=== Извлечение содержимого страниц меню ===")
        for i, menu_item in enumerate(menu_items):
            try:
                menu_url = menu_item["href"]
                menu_text = menu_item["text"]
                
                print(f"\n[{i+1}/{len(menu_items)}] Обработка: {menu_text}")
                
                page_content = extract_page_content(driver, menu_url)
                
                if page_content:
                    result["menu_pages"][menu_text] = page_content
                    print(f"  Извлечено: заголовок '{page_content['title']}', разделов: {len(page_content['sections'])}")
                else:
                    print(f"  Не удалось извлечь содержимое")
                    
            except Exception as e:
                print(f"  Ошибка при обработке {menu_item['text']}: {e}")
                continue
        
        # Сохраняем результат
        output_file = "about_content_complete.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        
        print(f"\n=== Итоговый результат ===")
        print(f"Пунктов меню: {len(result['menu_items'])}")
        print(f"Страниц из меню: {len(result['menu_pages'])}")
        print(f"\nДанные сохранены в {output_file}")
        
        # Выводим список страниц
        print("\nИзвлеченные страницы:")
        for page_name in result["menu_pages"].keys():
            page = result["menu_pages"][page_name]
            print(f"  - {page_name}: {len(page['sections'])} разделов")
        
    except Exception as e:
        print(f"Ошибка: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if driver:
            driver.quit()

if __name__ == "__main__":
    main()


