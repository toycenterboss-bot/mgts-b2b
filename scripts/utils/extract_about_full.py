#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Полное извлечение содержимого страницы about_mgts с учетом меню и интерактивных элементов"""

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
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

def extract_full_content():
    # Ищем HTML файл в текущей или родительской директории
    html_file = None
    for path in ["./about_original.html", "../about_original.html", "../../about_original.html"]:
        if os.path.exists(path):
            html_file = path
            break
    
    url = "https://business.mgts.ru/about_mgts"
    
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
        
        print(f"Загрузка страницы: {url}")
        driver.get(url)
        
        # Ждем полной загрузки
        WebDriverWait(driver, 15).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
        time.sleep(5)  # Даем время на загрузку JS
        
        # Прокручиваем страницу для загрузки динамического контента
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)
        driver.execute_script("window.scrollTo(0, 0);")
        time.sleep(2)
        
        result = {
            "url": url,
            "menu_items": [],
            "sections": [],
            "history_periods": []
        }
        
        # 1. Извлекаем элементы левого меню
        print("\n=== Извлечение меню ===")
        try:
            # Ищем элементы меню
            menu_selectors = [
                "nav a",
                "aside a",
                "[class*='menu'] a",
                "[class*='sidebar'] a",
                "[class*='nav'] a"
            ]
            
            menu_links_found = []
            for selector in menu_selectors:
                try:
                    links = driver.find_elements(By.CSS_SELECTOR, selector)
                    for link in links:
                        text = link.text.strip()
                        href = link.get_attribute('href') or ''
                        if text and len(text) > 1 and 'about_mgts' in href:
                            menu_links_found.append({
                                "text": text,
                                "href": href
                            })
                except:
                    continue
            
            # Убираем дубликаты
            seen = set()
            for item in menu_links_found:
                key = item['text']
                if key not in seen:
                    seen.add(key)
                    result["menu_items"].append(item)
            
            print(f"Найдено пунктов меню: {len(result['menu_items'])}")
            for item in result["menu_items"]:
                print(f"  - {item['text']}")
                
        except Exception as e:
            print(f"Ошибка при извлечении меню: {e}")
        
        # 2. Извлекаем интерактивную историю по годам
        print("\n=== Извлечение истории по периодам ===")
        try:
            # Ищем все элементы, которые могут быть периодами (кнопки, ссылки с датами)
            all_interactive = driver.find_elements(By.CSS_SELECTOR, "button, a, [class*='period'], [class*='year'], [class*='timeline']")
            
            periods_found = []
            for elem in all_interactive:
                try:
                    text = elem.text.strip()
                    # Проверяем, содержит ли текст диапазон лет
                    if re.search(r'\d{4}\s*[—–-]\s*\d{4}|\d{4}\s*[—–-]', text):
                        periods_found.append({
                            "element": elem,
                            "text": text,
                            "tag": elem.tag_name
                        })
                except:
                    continue
            
            print(f"Найдено потенциальных периодов: {len(periods_found)}")
            
            # Для каждого периода кликаем и получаем контент
            for i, period_info in enumerate(periods_found[:15]):  # Ограничиваем 15 элементами
                try:
                    period_text = period_info["text"]
                    elem = period_info["element"]
                    
                    print(f"  Обработка периода {i+1}: {period_text[:50]}")
                    
                    # Прокручиваем к элементу
                    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", elem)
                    time.sleep(0.5)
                    
                    # Кликаем
                    try:
                        elem.click()
                    except:
                        driver.execute_script("arguments[0].click();", elem)
                    
                    time.sleep(2)  # Ждем загрузки контента
                    
                    # Ищем контент, который появился
                    # Ищем ближайший контейнер с текстом
                    try:
                        # Пытаемся найти родительский контейнер
                        parent = elem.find_element(By.XPATH, "./ancestor::*[contains(@class, 'content') or contains(@class, 'text') or contains(@class, 'description')][1]")
                        content_text = parent.text.strip()
                    except:
                        # Если не нашли родителя, ищем следующий элемент-брат
                        try:
                            next_sibling = elem.find_element(By.XPATH, "./following-sibling::*[1]")
                            content_text = next_sibling.text.strip()
                        except:
                            # Берем весь body текст (это не идеально, но лучше чем ничего)
                            body = driver.find_element(By.TAG_NAME, "body")
                            content_text = body.text.strip()
                    
                    # Ограничиваем длину и очищаем от дубликатов
                    if len(content_text) > 3000:
                        content_text = content_text[:3000] + "..."
                    
                    result["history_periods"].append({
                        "period": period_text,
                        "content": content_text
                    })
                    
                    print(f"    Получено {len(content_text)} символов")
                    
                except Exception as e:
                    print(f"    Ошибка: {str(e)[:100]}")
                    continue
            
        except Exception as e:
            print(f"Ошибка при извлечении истории: {e}")
            import traceback
            traceback.print_exc()
        
        # 3. Извлекаем все разделы страницы
        print("\n=== Извлечение всех разделов ===")
        try:
            headings = driver.find_elements(By.CSS_SELECTOR, "h1, h2, h3")
            seen_titles = set()
            
            for heading in headings:
                try:
                    title = heading.text.strip()
                    if not title or title in seen_titles or len(title) < 3:
                        continue
                    seen_titles.add(title)
                    
                    # Получаем контент после заголовка
                    try:
                        # Находим следующий элемент после заголовка
                        next_elem = heading.find_element(By.XPATH, "./following-sibling::*[1]")
                        content_text = next_elem.text.strip()
                    except:
                        # Или берем родительский контейнер
                        try:
                            parent = heading.find_element(By.XPATH, "./ancestor::section | ./ancestor::div[contains(@class, 'content')][1]")
                            content_text = parent.text.strip()
                        except:
                            content_text = ""
                    
                    if content_text and len(content_text) > 50:
                        if len(content_text) > 2000:
                            content_text = content_text[:2000] + "..."
                        
                        result["sections"].append({
                            "title": title,
                            "content": content_text
                        })
                        print(f"  - {title[:50]}")
                        
                except Exception as e:
                    continue
                    
        except Exception as e:
            print(f"Ошибка при извлечении разделов: {e}")
        
        # Сохраняем результат
        output_file = "about_content_full.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        
        print(f"\n=== Результат ===")
        print(f"Элементов меню: {len(result['menu_items'])}")
        print(f"Разделов: {len(result['sections'])}")
        print(f"Периодов истории: {len(result['history_periods'])}")
        print(f"\nДанные сохранены в {output_file}")
        
        return result
        
    except Exception as e:
        print(f"Ошибка: {e}")
        import traceback
        traceback.print_exc()
        return None
    finally:
        if driver:
            driver.quit()

if __name__ == "__main__":
    extract_full_content()


