#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Полное извлечение содержимого страницы about_mgts с учетом меню в sidebar-menu-mobile"""

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

def extract_all_content():
    base_url = "https://business.mgts.ru"
    url = f"{base_url}/about_mgts"
    
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
        time.sleep(5)
        
        result = {
            "url": url,
            "menu_items": [],
            "menu_pages": {},
            "history_periods": []
        }
        
        # 1. Ищем меню в блоке sidebar-menu-desktop
        print("\n=== Поиск меню в sidebar-menu-desktop ===")
        try:
            # Ищем блок sidebar-menu-desktop (приоритет) или sidebar-menu-mobile (fallback)
            menu_container = None
            selectors = [
                ".sidebar-menu-desktop",
                "sidebar-menu-desktop",
                "[class*='sidebar-menu-desktop']",
                ".sidebar-menu-mobile",
                "[class*='sidebar-menu-mobile']"
            ]
            
            for selector in selectors:
                try:
                    menu_container = driver.find_element(By.CSS_SELECTOR, selector)
                    print(f"Найден контейнер меню: {selector}")
                    break
                except:
                    continue
            
            if not menu_container:
                raise NoSuchElementException("Меню не найдено ни в одном из блоков")
            
            # Ищем ссылки, включая те, что в разворачивающихся подменю
            print("  Поиск ссылок в меню и подменю...")
            
            # Сначала пытаемся развернуть все подменю
            menu_headers = menu_container.find_elements(By.CSS_SELECTOR, ".sidebar-menu-item_header, [class*='menu-item_header']")
            print(f"  Найдено заголовков меню для разворачивания: {len(menu_headers)}")
            
            for header in menu_headers:
                try:
                    # Кликаем, чтобы развернуть подменю (если оно не развернуто)
                    driver.execute_script("arguments[0].click();", header)
                    time.sleep(0.3)
                except:
                    continue
            
            time.sleep(1)  # Даем время на разворачивание
            
            # Теперь ищем все ссылки, включая в подменю
            menu_links = menu_container.find_elements(By.CSS_SELECTOR, "a, .sidebar-submenu-item_label, [class*='submenu-item'] a, [class*='submenu'] a")
            
            print(f"  Найдено ссылок всего: {len(menu_links)}")
            
            for link in menu_links:
                try:
                    href = link.get_attribute('href') or ''
                    text = link.text.strip()
                    
                    # Фильтруем только релевантные ссылки (любые ссылки, начинающиеся с /)
                    if (href and (href.startswith('/') or href.startswith(base_url)) and
                        text and len(text) > 2 and len(text) < 100 and
                        'tel:' not in href and 'mailto:' not in href and 'javascript:' not in href and '#' not in href):
                        
                        # Преобразуем относительные URL в абсолютные
                        if href.startswith('/'):
                            href = base_url + href
                        
                        # Проверяем, что это не дубликат
                        exists = any(item['href'] == href for item in result["menu_items"])
                        if not exists:
                            result["menu_items"].append({
                                "text": text,
                                "href": href
                            })
                            print(f"  - {text}: {href}")
                except Exception as e:
                    continue
                
        except NoSuchElementException:
            print("  Контейнер .sidebar-menu-desktop не найден, пытаемся альтернативные селекторы...")
            # Пробуем альтернативные селекторы
            alt_selectors = [
                "[class*='sidebar-menu-desktop']",
                "[class*='sidebar-menu-mobile']",
                "[class*='sidebar-menu']",
                "aside",
                "nav"
            ]
            
            for selector in alt_selectors:
                try:
                    menu_container = driver.find_element(By.CSS_SELECTOR, selector)
                    print(f"  Найден контейнер через: {selector}")
                    menu_links = menu_container.find_elements(By.CSS_SELECTOR, "a[href*='about_mgts']")
                    
                    for link in menu_links:
                        try:
                            href = link.get_attribute('href') or ''
                            text = link.text.strip()
                            
                            if (text and len(text) > 2 and len(text) < 100 and
                                'tel:' not in href and 'mailto:' not in href):
                                
                                if href.startswith('/'):
                                    href = base_url + href
                                
                                result["menu_items"].append({
                                    "text": text,
                                    "href": href
                                })
                                print(f"    - {text}: {href}")
                        except:
                            continue
                    
                    if len(result["menu_items"]) > 0:
                        break
                except:
                    continue
        
        except Exception as e:
            print(f"Ошибка при поиске меню: {e}")
            import traceback
            traceback.print_exc()
        
        # Убираем дубликаты
        seen = set()
        unique_menu_items = []
        for item in result["menu_items"]:
            key = item['text'] + item['href']
            if key not in seen:
                seen.add(key)
                unique_menu_items.append(item)
        result["menu_items"] = unique_menu_items
        
        print(f"\nИтого уникальных пунктов меню: {len(result['menu_items'])}")
        
        # 2. Для каждого пункта меню загружаем страницу и извлекаем контент
        print("\n=== Извлечение содержимого страниц меню ===")
        for i, menu_item in enumerate(result["menu_items"]):
            try:
                menu_url = menu_item["href"]
                menu_text = menu_item["text"]
                
                print(f"\n[{i+1}/{len(result['menu_items'])}] Обработка: {menu_text}")
                print(f"  URL: {menu_url}")
                
                # Загружаем страницу
                driver.get(menu_url)
                WebDriverWait(driver, 15).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
                time.sleep(3)
                
                # Прокручиваем страницу
                driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                time.sleep(1)
                driver.execute_script("window.scrollTo(0, 0);")
                time.sleep(1)
                
                # Извлекаем основной контент
                page_content = {
                    "url": menu_url,
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
                        title_elem = driver.find_element(By.CSS_SELECTOR, "[class*='title'], [class*='heading'], h2")
                        page_content["title"] = title_elem.text.strip()
                    except:
                        page_content["title"] = menu_text
                
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
                
                # Также сохраняем весь текст страницы
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
                
                result["menu_pages"][menu_text] = page_content
                
                print(f"  Извлечено: заголовок '{page_content['title']}', разделов: {len(page_content['sections'])}")
                
            except Exception as e:
                print(f"  Ошибка при обработке {menu_item['text']}: {e}")
                import traceback
                traceback.print_exc()
                continue
        
        # Сохраняем результат
        output_file = "about_content_complete.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        
        print(f"\n=== Итоговый результат ===")
        print(f"Пунктов меню: {len(result['menu_items'])}")
        print(f"Страниц из меню: {len(result['menu_pages'])}")
        print(f"Периодов истории: {len(result['history_periods'])}")
        print(f"\nДанные сохранены в {output_file}")
        
        # Выводим список страниц
        print("\nИзвлеченные страницы:")
        for page_name in result["menu_pages"].keys():
            page = result["menu_pages"][page_name]
            print(f"  - {page_name}: {len(page['sections'])} разделов")
        
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
    extract_all_content()
