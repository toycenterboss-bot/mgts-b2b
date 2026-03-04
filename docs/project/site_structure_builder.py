#!/usr/bin/env python3
"""
Полный скрипт для сбора структуры сайта, перестройки иерархии и сохранения дерева.
Выполняет все шаги в одном файле.
"""

import json
import time
from urllib.parse import urljoin, urlparse
from typing import Dict, Set, List, Optional
import os
import sys
import platform
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException
from webdriver_manager.chrome import ChromeDriverManager

# ============================================================================
# КОНФИГУРАЦИЯ
# ============================================================================

BASE_URL = "https://business.mgts.ru/"
MAX_DEPTH = 10
DELAY = 2.0
HEADLESS = True
SAVE_INTERVAL = 10

# ============================================================================
# ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ КРОСС-ПЛАТФОРМЕННОСТИ
# ============================================================================

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
        # Универсальный User-Agent для других ОС
        return 'Mozilla/5.0 (compatible; SiteCrawler/1.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

# Страницы верхнего уровня меню
TOP_LEVEL_PATTERNS = [
    'about_mgts',
    'news',
    'contact',
    'general_director_message',
    'about_registrar',
    'principles_corporate_manage',
    'decisions_meetings_shareholders',
    'single_hotline',
    'cookie_processing',
    'corporate_documents',
    'infoformen',
    'mgts_compliance_policies',
]

# ============================================================================
# КЛАСС ДЛЯ ОБХОДА САЙТА
# ============================================================================

class SiteCrawler:
    def __init__(self, base_url: str, max_depth: int = 10, delay: float = 2.0, headless: bool = True):
        self.base_url = base_url.rstrip('/')
        self.domain = urlparse(base_url).netloc
        self.max_depth = max_depth
        self.delay = delay
        
        self.visited: Set[str] = set()
        self.structure: Dict[str, Dict] = {}
        self.errors: List[tuple] = []
        self.save_interval = SAVE_INTERVAL
        
        chrome_options = Options()
        if headless:
            chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--window-size=1920,1080')
        chrome_options.add_argument(f'user-agent={get_user_agent()}')
        
        try:
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
            self.driver.set_page_load_timeout(30)
        except Exception as e:
            print(f"Ошибка инициализации WebDriver: {e}")
            try:
                self.driver = webdriver.Chrome(options=chrome_options)
                self.driver.set_page_load_timeout(30)
            except Exception as e2:
                raise Exception(f"Не удалось инициализировать WebDriver: {e2}")
    
    def __del__(self):
        if hasattr(self, 'driver'):
            try:
                self.driver.quit()
            except:
                pass
    
    def is_valid_url(self, url: str) -> bool:
        parsed = urlparse(url)
        if parsed.netloc != self.domain:
            return False
        
        excluded_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.svg', '.pdf', 
                              '.zip', '.rar', '.doc', '.docx', '.xls', '.xlsx',
                              '.js', '.css', '.ico', '.woff', '.woff2', '.ttf'}
        
        path_lower = parsed.path.lower()
        if any(path_lower.endswith(ext) for ext in excluded_extensions):
            return False
        
        clean_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
        return clean_url.startswith(self.base_url)
    
    def normalize_url(self, url: str) -> str:
        parsed = urlparse(url)
        return f"{parsed.scheme}://{parsed.netloc}{parsed.path}".rstrip('/')
    
    def get_links(self, url: str) -> List[str]:
        try:
            # Индикатор загрузки страницы
            sys.stdout.write(f"\r[{datetime.now().strftime('%H:%M:%S')}] ⟳ Загрузка страницы...")
            sys.stdout.flush()
            
            self.driver.get(url)
            
            sys.stdout.write(f"\r[{datetime.now().strftime('%H:%M:%S')}] ⟳ Ожидание загрузки контента...")
            sys.stdout.flush()
            
            try:
                WebDriverWait(self.driver, 15).until(
                    EC.presence_of_element_located((By.TAG_NAME, "body"))
                )
            except TimeoutException:
                pass
            
            sys.stdout.write(f"\r[{datetime.now().strftime('%H:%M:%S')}] ⟳ Ожидание JavaScript (3 сек)...")
            sys.stdout.flush()
            time.sleep(3)
            
            sys.stdout.write(f"\r[{datetime.now().strftime('%H:%M:%S')}] ⟳ Прокрутка страницы...")
            sys.stdout.flush()
            try:
                self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                time.sleep(1)
                self.driver.execute_script("window.scrollTo(0, 0);")
                time.sleep(1)
            except:
                pass
            
            # Определяем, главная ли это страница
            normalized_url = self.normalize_url(url)
            is_main_page = normalized_url == self.base_url
            
            links = []
            
            try:
                # Для главной страницы собираем ссылки из header и footer (меню верхнего уровня)
                # Для остальных страниц - только из <main> блока
                if is_main_page:
                    sys.stdout.write(f"\r[{datetime.now().strftime('%H:%M:%S')}] ⟳ Поиск ссылок в header/footer (главная страница)...")
                    sys.stdout.flush()
                    
                    # Ищем ссылки в header
                    header_links = []
                    try:
                        header_elements = self.driver.find_elements(By.CSS_SELECTOR, "header a, header nav a")
                        header_links.extend(header_elements)
                    except:
                        pass
                    
                    # Ищем ссылки в footer
                    footer_links = []
                    try:
                        footer_elements = self.driver.find_elements(By.CSS_SELECTOR, "footer a, footer nav a")
                        footer_links.extend(footer_elements)
                    except:
                        pass
                    
                    link_elements = header_links + footer_links
                else:
                    sys.stdout.write(f"\r[{datetime.now().strftime('%H:%M:%S')}] ⟳ Поиск ссылок в <main> блоке...")
                    sys.stdout.flush()
                    
                    # Ищем ссылки только в <main> блоке
                    link_elements = []
                    try:
                        main_elements = self.driver.find_elements(By.CSS_SELECTOR, "main a")
                        link_elements.extend(main_elements)
                    except Exception as e:
                        # Если <main> не найден, пробуем альтернативные селекторы
                        try:
                            # Пробуем найти основной контент по другим тегам
                            main_elements = self.driver.find_elements(By.CSS_SELECTOR, "article a, .content a, [role='main'] a")
                            link_elements.extend(main_elements)
                        except:
                            pass
                
                for i, element in enumerate(link_elements):
                    if i % 50 == 0 and i > 0:
                        sys.stdout.write(f"\r[{datetime.now().strftime('%H:%M:%S')}] ⟳ Обработка ссылок: {i}/{len(link_elements)}...")
                        sys.stdout.flush()
                    
                    try:
                        href = element.get_attribute('href')
                        if href:
                            absolute_url = urljoin(url, href)
                            normalized = self.normalize_url(absolute_url)
                            
                            if self.is_valid_url(normalized):
                                links.append(normalized)
                    except:
                        continue
                
            except Exception as e:
                self.errors.append((url, f"Ошибка поиска ссылок: {str(e)}"))
            
            return list(set(links))
            
        except WebDriverException as e:
            self.errors.append((url, f"WebDriver error: {str(e)}"))
            return []
        except Exception as e:
            self.errors.append((url, f"Unexpected error: {str(e)}"))
            return []
    
    def print_progress(self, message: str, status: str = "INFO"):
        """Выводит сообщение с временной меткой и статусом."""
        timestamp = datetime.now().strftime('%H:%M:%S')
        status_symbols = {
            'INFO': '→',
            'SUCCESS': '✓',
            'WARNING': '⚠',
            'ERROR': '✗',
            'PROCESSING': '⟳'
        }
        symbol = status_symbols.get(status, '→')
        print(f"[{timestamp}] {symbol} {message}")
        sys.stdout.flush()
    
    def crawl(self, url: Optional[str] = None, depth: int = 0, parent: Optional[str] = None):
        if url is None:
            url = self.base_url
        
        normalized_url = self.normalize_url(url)
        
        if depth > self.max_depth:
            return
        
        if normalized_url in self.visited:
            return
        
        total_visited = len(self.visited) + 1
        elapsed = time.time() - getattr(self, 'start_time', time.time())
        if not hasattr(self, 'start_time'):
            self.start_time = time.time()
        
        # Прогресс-индикатор
        progress_pct = (total_visited / max(1, len(self.visited) + 1)) * 100
        bar_length = 30
        filled = int(bar_length * total_visited / max(1, total_visited + 10))
        bar = '█' * filled + '░' * (bar_length - filled)
        
        print(f"\r[{datetime.now().strftime('%H:%M:%S')}] ⟳ [{bar}] {total_visited} страниц | Depth: {depth} | {normalized_url[:60]}...", end='', flush=True)
        
        self.visited.add(normalized_url)
        
        if normalized_url not in self.structure:
            # Определяем правильного родителя согласно логике меню
            if normalized_url == self.base_url:
                actual_parent = None
            else:
                # Проверяем, является ли страница верхнего уровня меню
                url_path = urlparse(normalized_url).path.strip('/')
                is_top = any(url_path == pattern or url_path.startswith(pattern + '/') 
                           for pattern in TOP_LEVEL_PATTERNS) if url_path else False
                
                if is_top:
                    # Страница верхнего уровня - родитель главная
                    actual_parent = self.base_url
                else:
                    # Страница второго уровня - родитель главная
                    actual_parent = self.base_url
            
            self.structure[normalized_url] = {
                'url': normalized_url,
                'children': [],
                'parent': actual_parent,
                'depth': depth
            }
        
        if total_visited % self.save_interval == 0:
            self.save_to_json("site_structure_progress.json", silent=True)
            print(f"\n[{datetime.now().strftime('%H:%M:%S')}] ✓ Автосохранение: {total_visited} страниц", flush=True)
        
        self.print_progress(f"Загрузка страницы: {normalized_url[:70]}...", "PROCESSING")
        links = self.get_links(normalized_url)
        
        if links:
            self.print_progress(f"Найдено ссылок: {len(links)}", "SUCCESS")
        else:
            self.print_progress("Ссылки не найдены", "WARNING")
        
        time.sleep(self.delay)
        
        for link in links:
            # Определяем, является ли ссылка страницей верхнего уровня меню
            # Используем встроенную проверку, так как функция определена позже
            link_path = urlparse(link).path.strip('/')
            is_link_top_level = any(link_path == pattern or link_path.startswith(pattern + '/') 
                                   for pattern in TOP_LEVEL_PATTERNS) if link_path else False
            
            current_path = urlparse(normalized_url).path.strip('/')
            is_current_top_level = any(current_path == pattern or current_path.startswith(pattern + '/') 
                                      for pattern in TOP_LEVEL_PATTERNS) if current_path else False
            
            # Логика иерархии:
            # - Если текущая страница - верхний уровень, и ссылка тоже верхний уровень или дочерняя верхнего уровня
            # - Если текущая страница - не верхний уровень, ссылка должна быть прямой дочерней главной
            if is_current_top_level:
                # Страница верхнего уровня - добавляем только дочерние верхнего уровня
                if is_link_top_level or (link in self.visited and is_top_level_page(link)):
                    if link not in [child['url'] for child in self.structure[normalized_url]['children']]:
                        self.structure[normalized_url]['children'].append({
                            'url': link,
                            'depth': depth + 1
                        })
            else:
                # Страница второго уровня - все ссылки второго уровня становятся дочерними главной
                # Но если ссылка - страница верхнего уровня, она тоже дочерняя главной
                if link not in [child['url'] for child in self.structure[normalized_url]['children']]:
                    self.structure[normalized_url]['children'].append({
                        'url': link,
                        'depth': depth + 1
                    })
            
            if link not in self.visited:
                self.crawl(link, depth + 1, normalized_url)
            else:
                # Ссылка уже посещена, но добавляем связь если нужно
                if link not in [child['url'] for child in self.structure[normalized_url]['children']]:
                    self.structure[normalized_url]['children'].append({
                        'url': link,
                        'depth': depth + 1,
                        'visited': True
                    })
    
    def save_to_json(self, filename: str = "site_structure.json", silent: bool = False):
        output = {
            'base_url': self.base_url,
            'total_pages': len(self.visited),
            'errors': [{'url': url, 'error': error} for url, error in self.errors],
            'structure': self.structure
        }
        
        # Убеждаемся, что используем абсолютный путь
        filename = os.path.abspath(filename)
        
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(output, f, ensure_ascii=False, indent=2)
                f.flush()
                if hasattr(f, 'fileno'):
                    try:
                        os.fsync(f.fileno())
                    except:
                        pass
            
            if not silent:
                file_size = os.path.getsize(filename) if os.path.exists(filename) else 0
                file_mtime = datetime.fromtimestamp(os.path.getmtime(filename)).strftime('%Y-%m-%d %H:%M:%S')
                print(f"\nСтруктура сохранена в {filename} ({file_size:,} байт)")
                print(f"Время модификации: {file_mtime}")
                sys.stdout.flush()
        except Exception as e:
            print(f"\n✗ ОШИБКА сохранения в {filename}: {e}")
            import traceback
            traceback.print_exc()
            raise

# ============================================================================
# ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ============================================================================

def is_top_level_page(url):
    """Проверяет, является ли страница страницей верхнего уровня меню."""
    parsed = urlparse(url)
    path = parsed.path.strip('/')
    
    if not path:
        return False
    
    for pattern in TOP_LEVEL_PATTERNS:
        if path == pattern or path.startswith(pattern + '/'):
            return True
    
    return False

# ============================================================================
# ПЕРЕСТРОЙКА ИЕРАРХИИ
# ============================================================================

def rebuild_hierarchy(data):
    """Перестраивает иерархию согласно логике меню."""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] → Начало перестройки иерархии...")
    sys.stdout.flush()
    
    base_url = data['base_url']
    structure = data['structure']
    
    print(f"[{datetime.now().strftime('%H:%M:%S')}] → Инициализация новой структуры ({len(structure)} страниц)...")
    sys.stdout.flush()
    
    new_structure = {}
    
    processed = 0
    for url in structure.keys():
        new_structure[url] = {
            'url': url,
            'children': [],
            'parent': None,
            'depth': 0
        }
        processed += 1
        if processed % 10 == 0:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] → Инициализация: {processed}/{len(structure)}...")
            sys.stdout.flush()
    
    print(f"[{datetime.now().strftime('%H:%M:%S')}] → Поиск страниц верхнего уровня...")
    sys.stdout.flush()
    
    top_level_children = set()
    top_level_pages = [url for url in structure.keys() if is_top_level_page(url)]
    print(f"[{datetime.now().strftime('%H:%M:%S')}] → Найдено страниц верхнего уровня: {len(top_level_pages)}")
    sys.stdout.flush()
    
    def collect_top_level_children(url, visited=None, depth=0):
        if depth > 10:  # Защита от бесконечной рекурсии
            return
        if visited is None:
            visited = set()
        if url in visited:
            return
        visited.add(url)
        
        if url not in structure:
            return
        
        children = structure[url].get('children', [])
        is_top = is_top_level_page(url)
        
        for child in children:
            child_url = child['url']
            if is_top:
                # Если родитель - страница верхнего уровня, проверяем дочернюю
                if not is_top_level_page(child_url):
                    # Это дочерняя страница верхнего уровня
                    top_level_children.add(child_url)
                # Продолжаем рекурсию только для страниц верхнего уровня
                if is_top_level_page(child_url):
                    collect_top_level_children(child_url, visited, depth + 1)
            # Для не-верхних страниц не собираем дочерние
    
    print(f"[{datetime.now().strftime('%H:%M:%S')}] → Сбор дочерних страниц верхнего уровня...")
    sys.stdout.flush()
    
    processed = 0
    for url in top_level_pages:
        collect_top_level_children(url)
        processed += 1
        if processed % 5 == 0:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] → Обработано: {processed}/{len(top_level_pages)}...")
            sys.stdout.flush()
    
    print(f"[{datetime.now().strftime('%H:%M:%S')}] → Найдено дочерних страниц верхнего уровня: {len(top_level_children)}")
    sys.stdout.flush()
    
    print(f"[{datetime.now().strftime('%H:%M:%S')}] → Построение новой иерархии...")
    sys.stdout.flush()
    
    processed = 0
    errors_found = []
    
    for url, page_data in structure.items():
        try:
            if url not in new_structure:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] ⚠ Предупреждение: URL {url} отсутствует в new_structure, пропускаем")
                sys.stdout.flush()
                continue
                
            new_page = new_structure[url]
            
            if url == base_url:
                new_page['parent'] = None
                new_page['depth'] = 0
                
                for child_url in structure.keys():
                    if child_url != base_url:
                        if child_url not in new_structure:
                            errors_found.append(f"Дочерний URL {child_url} отсутствует в new_structure")
                            continue
                        new_page['children'].append({
                            'url': child_url,
                            'depth': 1
                        })
                        new_structure[child_url]['parent'] = base_url
                        new_structure[child_url]['depth'] = 1
            
            elif is_top_level_page(url):
                new_page['parent'] = base_url
                new_page['depth'] = 1
                
                if url in structure:
                    for child in structure[url].get('children', []):
                        child_url = child['url']
                        if child_url not in new_structure:
                            errors_found.append(f"Дочерний URL {child_url} страницы {url} отсутствует в new_structure")
                            continue
                        if child_url in top_level_children or is_top_level_page(child_url):
                            if child_url != url:
                                new_page['children'].append({
                                    'url': child_url,
                                    'depth': 2
                                })
                                if new_structure[child_url]['parent'] is None:
                                    new_structure[child_url]['parent'] = url
                                    new_structure[child_url]['depth'] = 2
            
            else:
                pass
            
            processed += 1
            if processed % 20 == 0:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] → Построение иерархии: {processed}/{len(structure)}...")
                sys.stdout.flush()
                
        except KeyError as e:
            error_msg = f"Ошибка KeyError для URL {url}: {e}"
            errors_found.append(error_msg)
            print(f"[{datetime.now().strftime('%H:%M:%S')}] ✗ {error_msg}")
            sys.stdout.flush()
            continue
        except Exception as e:
            error_msg = f"Неожиданная ошибка для URL {url}: {e}"
            errors_found.append(error_msg)
            print(f"[{datetime.now().strftime('%H:%M:%S')}] ✗ {error_msg}")
            import traceback
            traceback.print_exc()
            sys.stdout.flush()
            continue
    
    if errors_found:
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] ⚠ Найдено ошибок при перестройке: {len(errors_found)}")
        print(f"[{datetime.now().strftime('%H:%M:%S')}] → Первые 10 ошибок:")
        for i, error in enumerate(errors_found[:10], 1):
            print(f"  {i}. {error}")
        sys.stdout.flush()
    
    print(f"[{datetime.now().strftime('%H:%M:%S')}] ✓ Иерархия перестроена")
    if errors_found:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ⚠ Внимание: при перестройке было {len(errors_found)} ошибок")
    sys.stdout.flush()
    
    return new_structure

# ============================================================================
# ЭКСПОРТ В GRAPHVIZ (DOT ФОРМАТ)
# ============================================================================

def save_to_graphviz(data, output_filename="site_structure.dot"):
    """Сохраняет структуру в формате Graphviz DOT."""
    output_filename = os.path.abspath(output_filename)
    
    print(f"[{datetime.now().strftime('%H:%M:%S')}] → Экспорт в Graphviz DOT формат...")
    sys.stdout.flush()
    
    with open(output_filename, 'w', encoding='utf-8') as f:
        f.write('digraph SiteStructure {\n')
        f.write('    rankdir=TB;\n')
        f.write('    node [shape=box, style=rounded];\n')
        f.write('    edge [color=gray];\n\n')
        
        base_url = data['base_url']
        structure = data.get('structure', {})
        visited_nodes = set()
        
        def add_node(url, depth=0):
            if url in visited_nodes:
                return
            visited_nodes.add(url)
            
            # Экранируем специальные символы для DOT
            node_id = url.replace('://', '_').replace('/', '_').replace('.', '_').replace('-', '_')
            node_id = ''.join(c if c.isalnum() or c == '_' else '_' for c in node_id)
            
            # Создаем короткую метку
            label = url.replace('https://business.mgts.ru', '').replace('/', ' / ')
            if not label or label == ' / ':
                label = 'Главная'
            else:
                label = label.strip(' / ')
                if len(label) > 50:
                    label = label[:47] + '...'
            
            # Цвет в зависимости от уровня меню
            if url == base_url:
                color = 'lightblue'
            elif is_top_level_page(url):
                color = 'lightgreen'
            else:
                color = 'lightyellow'
            
            f.write(f'    "{node_id}" [label="{label}", URL="{url}", fillcolor={color}, style="filled,rounded"];\n')
        
        def add_edges(url, visited_edges=None):
            if visited_edges is None:
                visited_edges = set()
            
            if url not in structure:
                return
            
            node_id = url.replace('://', '_').replace('/', '_').replace('.', '_').replace('-', '_')
            node_id = ''.join(c if c.isalnum() or c == '_' else '_' for c in node_id)
            
            add_node(url)
            
            for child in structure[url].get('children', []):
                child_url = child['url']
                child_node_id = child_url.replace('://', '_').replace('/', '_').replace('.', '_').replace('-', '_')
                child_node_id = ''.join(c if c.isalnum() or c == '_' else '_' for c in child_node_id)
                
                edge_key = (node_id, child_node_id)
                if edge_key not in visited_edges:
                    visited_edges.add(edge_key)
                    add_node(child_url)
                    f.write(f'    "{node_id}" -> "{child_node_id}";\n')
                    add_edges(child_url, visited_edges)
        
        add_edges(base_url)
        
        f.write('}\n')
    
    file_size = os.path.getsize(output_filename) if os.path.exists(output_filename) else 0
    print(f"[{datetime.now().strftime('%H:%M:%S')}] ✓ Graphviz файл сохранен: {output_filename} ({file_size:,} байт)")
    print(f"[{datetime.now().strftime('%H:%M:%S')}] → Для просмотра установите Graphviz и выполните: dot -Tpng {output_filename} -o site_structure.png")
    sys.stdout.flush()

# ============================================================================
# ЭКСПОРТ В ИНТЕРАКТИВНЫЙ HTML (D3.JS)
# ============================================================================

def save_to_interactive_html(data, output_filename="site_structure.html"):
    """Создает интерактивную HTML визуализацию с использованием D3.js."""
    output_filename = os.path.abspath(output_filename)
    
    print(f"[{datetime.now().strftime('%H:%M:%S')}] → Создание интерактивной HTML визуализации...")
    sys.stdout.flush()
    
    # Подготавливаем данные для D3.js
    structure = data.get('structure', {})
    base_url = data['base_url']
    
    nodes = []
    links = []
    node_map = {}
    
    def add_node(url, depth=0):
        if url in node_map:
            return node_map[url]
        
        node_id = len(nodes)
        label = url.replace('https://business.mgts.ru', '').replace('/', ' / ')
        if not label or label == ' / ':
            label = 'Главная'
        else:
            label = label.strip(' / ')
        
        is_top = is_top_level_page(url)
        node = {
            'id': node_id,
            'name': label,
            'url': url,
            'depth': depth,
            'isTopLevel': is_top,
            'group': 1 if is_top else 2
        }
        nodes.append(node)
        node_map[url] = node_id
        return node_id
    
    def build_graph(url, visited=None, depth=0):
        if visited is None:
            visited = set()
        if url in visited:
            return
        visited.add(url)
        
        if url not in structure:
            return
        
        parent_id = add_node(url, depth)
        
        for child in structure[url].get('children', []):
            child_url = child['url']
            child_id = add_node(child_url, depth + 1)
            links.append({
                'source': parent_id,
                'target': child_id,
                'value': 1
            })
            build_graph(child_url, visited, depth + 1)
    
    build_graph(base_url)
    
    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Структура сайта {data['base_url']}</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        body {{
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }}
        .container {{
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        h1 {{
            margin-top: 0;
            color: #333;
        }}
        .info {{
            margin-bottom: 20px;
            color: #666;
        }}
        svg {{
            border: 1px solid #ddd;
            background: white;
        }}
        .node {{
            cursor: pointer;
        }}
        .node circle {{
            stroke: #fff;
            stroke-width: 2px;
        }}
        .link {{
            fill: none;
            stroke: #999;
            stroke-opacity: 0.6;
            stroke-width: 1.5px;
        }}
        .node-label {{
            font-size: 12px;
            pointer-events: none;
        }}
        .tooltip {{
            position: absolute;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 8px;
            border-radius: 4px;
            font-size: 12px;
            pointer-events: none;
            opacity: 0;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>Структура сайта: {data['base_url']}</h1>
        <div class="info">
            Всего страниц: {data['total_pages']} | 
            Узлов: {len(nodes)} | 
            Связей: {len(links)}
        </div>
        <div id="graph"></div>
    </div>
    
    <div class="tooltip" id="tooltip"></div>
    
    <script>
        const data = {{
            nodes: {json.dumps(nodes, ensure_ascii=False)},
            links: {json.dumps(links, ensure_ascii=False)}
        }};
        
        const width = 1200;
        const height = 800;
        
        const svg = d3.select("#graph")
            .append("svg")
            .attr("width", width)
            .attr("height", height);
        
        const simulation = d3.forceSimulation(data.nodes)
            .force("link", d3.forceLink(data.links).id(d => d.id).distance(100))
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(30));
        
        const link = svg.append("g")
            .selectAll("line")
            .data(data.links)
            .enter().append("line")
            .attr("class", "link");
        
        const node = svg.append("g")
            .selectAll("g")
            .data(data.nodes)
            .enter().append("g")
            .attr("class", "node")
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));
        
        node.append("circle")
            .attr("r", d => d.isTopLevel ? 8 : 6)
            .attr("fill", d => d.isTopLevel ? "#4CAF50" : "#2196F3");
        
        node.append("text")
            .attr("class", "node-label")
            .attr("dx", 12)
            .attr("dy", 4)
            .text(d => d.name.length > 30 ? d.name.substring(0, 27) + "..." : d.name);
        
        const tooltip = d3.select("#tooltip");
        
        node.on("mouseover", function(event, d) {{
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`<strong>${{d.name}}</strong><br/>${{d.url}}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        }})
        .on("mouseout", function(d) {{
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        }})
        .on("click", function(event, d) {{
            window.open(d.url, '_blank');
        }});
        
        simulation.on("tick", () => {{
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);
            
            node
                .attr("transform", d => `translate(${{d.x}},${{d.y}})`);
        }});
        
        function dragstarted(event, d) {{
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }}
        
        function dragged(event, d) {{
            d.fx = event.x;
            d.fy = event.y;
        }}
        
        function dragended(event, d) {{
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }}
    </script>
</body>
</html>"""
    
    with open(output_filename, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    file_size = os.path.getsize(output_filename) if os.path.exists(output_filename) else 0
    print(f"[{datetime.now().strftime('%H:%M:%S')}] ✓ HTML файл сохранен: {output_filename} ({file_size:,} байт)")
    print(f"[{datetime.now().strftime('%H:%M:%S')}] → Откройте файл в браузере для интерактивной визуализации")
    sys.stdout.flush()

# ============================================================================
# СОХРАНЕНИЕ ДЕРЕВА В ТЕКСТОВЫЙ ФАЙЛ
# ============================================================================

def print_tree_to_file(data, url, output_file, indent="", visited_in_tree=None):
    """Выводит древовидную структуру в файл."""
    if visited_in_tree is None:
        visited_in_tree = set()
    
    if url in visited_in_tree:
        output_file.write(f"{indent}└── {url} [уже показано]\n")
        return
    
    visited_in_tree.add(url)
    output_file.write(f"{indent}{url}\n")
    
    if url in data.get('structure', {}):
        children = data['structure'][url].get('children', [])
        for i, child in enumerate(children):
            is_last = (i == len(children) - 1)
            child_indent = indent + ("    " if is_last else "│   ")
            prefix = "└── " if is_last else "├── "
            output_file.write(f"{indent}{prefix}")
            print_tree_to_file(data, child['url'], output_file, child_indent, visited_in_tree)

def save_tree_to_file(data, output_filename="site_tree.txt"):
    """Сохраняет древовидную структуру в текстовый файл."""
    total_pages = len(data.get('structure', {}))
    processed = 0
    
    # Убеждаемся, что используем абсолютный путь
    output_filename = os.path.abspath(output_filename)
    
    try:
        with open(output_filename, 'w', encoding='utf-8') as out:
            out.write("=" * 70 + "\n")
            out.write("ДРЕВОВИДНАЯ СТРУКТУРА САЙТА\n")
            out.write("=" * 70 + "\n")
            out.write(f"Всего страниц: {data['total_pages']}\n")
            out.write(f"Ошибок: {len(data.get('errors', []))}\n")
            out.write("=" * 70 + "\n")
            out.write("\n")
            
            base_url = data['base_url']
            
            # Показываем прогресс при записи дерева
            def print_tree_with_progress(data, url, output_file, indent="", visited_in_tree=None):
                nonlocal processed
                if visited_in_tree is None:
                    visited_in_tree = set()
                
                if url in visited_in_tree:
                    output_file.write(f"{indent}└── {url} [уже показано]\n")
                    return
                
                visited_in_tree.add(url)
                processed += 1
                
                if processed % 10 == 0:
                    progress = (processed / total_pages) * 100
                    sys.stdout.write(f"\r[{datetime.now().strftime('%H:%M:%S')}] ⟳ Запись дерева: {processed}/{total_pages} ({progress:.1f}%)...")
                    sys.stdout.flush()
                
                output_file.write(f"{indent}{url}\n")
                
                if url in data.get('structure', {}):
                    children = data['structure'][url].get('children', [])
                    for i, child in enumerate(children):
                        is_last = (i == len(children) - 1)
                        child_indent = indent + ("    " if is_last else "│   ")
                        prefix = "└── " if is_last else "├── "
                        output_file.write(f"{indent}{prefix}")
                        print_tree_with_progress(data, child['url'], output_file, child_indent, visited_in_tree)
            
            print_tree_with_progress(data, base_url, out)
            
            out.write("\n" + "=" * 70 + "\n")
            out.flush()
            if hasattr(out, 'fileno'):
                try:
                    os.fsync(out.fileno())
                except:
                    pass
        
        file_size = os.path.getsize(output_filename) if os.path.exists(output_filename) else 0
        file_mtime = datetime.fromtimestamp(os.path.getmtime(output_filename)).strftime('%Y-%m-%d %H:%M:%S')
        sys.stdout.write(f"\r[{datetime.now().strftime('%H:%M:%S')}] ✓ Древовидная структура сохранена: {file_size:,} байт\n")
        sys.stdout.write(f"[{datetime.now().strftime('%H:%M:%S')}] → Время модификации: {file_mtime}\n")
        sys.stdout.flush()
    except Exception as e:
        print(f"\n✗ ОШИБКА сохранения дерева в {output_filename}: {e}")
        import traceback
        traceback.print_exc()
        raise

# ============================================================================
# ГЛАВНАЯ ФУНКЦИЯ
# ============================================================================

def main():
    """Основная функция - выполняет все шаги."""
    import sys
    
    # Принудительно отключаем буферизацию
    sys.stdout.reconfigure(line_buffering=True) if hasattr(sys.stdout, 'reconfigure') else None
    
    # Устанавливаем рабочую директорию на директорию скрипта
    script_dir = os.path.dirname(os.path.abspath(__file__))
    if script_dir:
        os.chdir(script_dir)
        print(f"[{datetime.now().strftime('%H:%M:%S')}] → Рабочая директория: {script_dir}", flush=True)
        sys.stdout.flush()
    
    # Проверяем, есть ли уже собранные данные
    use_existing = False
    if len(sys.argv) > 1 and sys.argv[1] == '--use-existing':
        use_existing = True
        if not os.path.exists("site_structure.json") and not os.path.exists("site_structure_raw.json"):
            print("ОШИБКА: Файлы с собранными данными не найдены!")
            print("Запустите скрипт без флага --use-existing для сбора данных.")
            return
    
    print("=" * 70, flush=True)
    print("СБОР И ПОСТРОЕНИЕ СТРУКТУРЫ САЙТА", flush=True)
    print("=" * 70, flush=True)
    print(f"Сайт: {BASE_URL}", flush=True)
    print(f"Максимальная глубина: {MAX_DEPTH}", flush=True)
    print(f"Задержка между запросами: {DELAY} сек", flush=True)
    if use_existing:
        print("РЕЖИМ: Использование существующих данных", flush=True)
    print("=" * 70, flush=True)
    print(flush=True)
    sys.stdout.flush()
    
    # ШАГ 1: Обход сайта (или загрузка существующих данных)
    if not use_existing:
        print("ШАГ 1: Обход сайта...")
        print("-" * 70)
        print(f"[{datetime.now().strftime('%H:%M:%S')}] → Инициализация браузера...")
        sys.stdout.flush()
        
        crawler = SiteCrawler(
            base_url=BASE_URL,
            max_depth=MAX_DEPTH,
            delay=DELAY,
            headless=HEADLESS
        )
        
        crawler.start_time = time.time()
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ✓ Браузер инициализирован")
        print(f"[{datetime.now().strftime('%H:%M:%S')}] → Начало обхода сайта...")
        print("-" * 70)
        sys.stdout.flush()
        
        try:
            crawler.crawl()
            
            print("\n" + "-" * 70)
            elapsed_time = time.time() - crawler.start_time
            minutes = int(elapsed_time // 60)
            seconds = int(elapsed_time % 60)
            print(f"[{datetime.now().strftime('%H:%M:%S')}] ✓ ОБХОД ЗАВЕРШЕН")
            print(f"[{datetime.now().strftime('%H:%M:%S')}] → Время работы: {minutes} мин {seconds} сек")
            print("-" * 70)
            
            stats = {
                'total_pages': len(crawler.visited),
                'total_errors': len(crawler.errors),
                'max_depth_found': max([page['depth'] for page in crawler.structure.values()]) if crawler.structure else 0
            }
            
            print(f"Всего страниц: {stats['total_pages']}")
            print(f"Ошибок: {stats['total_errors']}")
            print(f"Максимальная глубина: {stats['max_depth_found']}")
            
            # Сохраняем исходную структуру
            output_file = os.path.abspath("site_structure_raw.json")
            crawler.save_to_json(output_file)
            file_size = os.path.getsize(output_file) if os.path.exists(output_file) else 0
            print(f"[{datetime.now().strftime('%H:%M:%S')}] → Исходная структура сохранена: {file_size:,} байт")
            sys.stdout.flush()
        
        except KeyboardInterrupt:
            print("\n\nОбход прерван пользователем.")
            print(f"Обработано страниц: {len(crawler.visited)}")
            crawler.save_to_json("site_structure_partial.json")
            return
        except Exception as e:
            print(f"\nКритическая ошибка: {e}")
            crawler.save_to_json("site_structure_error.json")
            return
        finally:
            if hasattr(crawler, 'driver'):
                try:
                    crawler.driver.quit()
                except:
                    pass
    else:
        # Используем существующие данные
        print("ШАГ 1: Загрузка существующих данных...")
        print("-" * 70)
        
        if os.path.exists("site_structure_raw.json"):
            input_file = "site_structure_raw.json"
        elif os.path.exists("site_structure.json"):
            input_file = "site_structure.json"
        else:
            print("ОШИБКА: Файлы с данными не найдены!")
            return
        
        try:
            with open(input_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            print(f"Загружено страниц: {data['total_pages']}")
        except Exception as e:
            print(f"Ошибка загрузки данных: {e}")
            return
    
    # ШАГ 2: Перестройка иерархии
    print("\n" + "=" * 70)
    print("ШАГ 2: Перестройка иерархии согласно логике меню...")
    print("-" * 70)
    
    step2_start = time.time()
    print(f"[{datetime.now().strftime('%H:%M:%S')}] → Загрузка данных...")
    sys.stdout.flush()
    
    try:
        if not use_existing:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] → Чтение site_structure_raw.json...")
            sys.stdout.flush()
            with open("site_structure_raw.json", 'r', encoding='utf-8') as f:
                data = json.load(f)
        else:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] → Использование загруженных ранее данных...")
            sys.stdout.flush()
        
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ✓ Данные загружены: {data['total_pages']} страниц, {len(data.get('structure', {}))} в структуре")
        print(f"[{datetime.now().strftime('%H:%M:%S')}] → Анализ структуры меню...")
        sys.stdout.flush()
        
        new_structure = rebuild_hierarchy(data)
        
        print(f"[{datetime.now().strftime('%H:%M:%S')}] → Перестройка завершена, обновление данных...")
        sys.stdout.flush()
        
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ✓ Иерархия перестроена")
        print(f"[{datetime.now().strftime('%H:%M:%S')}] → Сохранение результатов...")
        sys.stdout.flush()
        
        data['structure'] = new_structure
        
        output_file = os.path.abspath("site_structure.json")
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
                f.flush()
                if hasattr(f, 'fileno'):
                    try:
                        os.fsync(f.fileno())
                    except:
                        pass
            
            step2_elapsed = time.time() - step2_start
            file_size = os.path.getsize(output_file)
            file_mtime = datetime.fromtimestamp(os.path.getmtime(output_file)).strftime('%Y-%m-%d %H:%M:%S')
            print(f"[{datetime.now().strftime('%H:%M:%S')}] ✓ Иерархия сохранена в: site_structure.json ({step2_elapsed:.2f} сек, {file_size:,} байт)")
            print(f"[{datetime.now().strftime('%H:%M:%S')}] → Полный путь: {output_file}")
            print(f"[{datetime.now().strftime('%H:%M:%S')}] → Время модификации файла: {file_mtime}")
            sys.stdout.flush()
        except Exception as e:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] ✗ ОШИБКА сохранения: {e}")
            import traceback
            traceback.print_exc()
            raise
        
        top_level = [url for url in new_structure.keys() if is_top_level_page(url)]
        second_level = [url for url in new_structure.keys() 
                       if url != data['base_url'] and not is_top_level_page(url)]
        
        print(f"\nСтатистика:")
        print(f"  Страниц верхнего уровня меню: {len(top_level)}")
        print(f"  Страниц второго уровня меню: {len(second_level)}")
    
    except Exception as e:
        print(f"Ошибка при перестройке иерархии: {e}")
        return
    
    # ШАГ 3: Сохранение дерева в текстовый файл
    print("\n" + "=" * 70)
    print("ШАГ 3: Сохранение древовидной структуры в текстовый файл...")
    print("-" * 70)
    
    step3_start = time.time()
    print(f"[{datetime.now().strftime('%H:%M:%S')}] → Формирование дерева...")
    sys.stdout.flush()
    
    try:
        output_file = os.path.abspath("site_tree.txt")
        save_tree_to_file(data, output_file)
        
        step3_elapsed = time.time() - step3_start
        file_size = os.path.getsize(output_file) if os.path.exists(output_file) else 0
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ✓ Дерево сохранено в: site_tree.txt ({step3_elapsed:.2f} сек, {file_size:,} байт)")
        print(f"[{datetime.now().strftime('%H:%M:%S')}] → Полный путь: {output_file}")
        sys.stdout.flush()
    
    except Exception as e:
        print(f"Ошибка при сохранении дерева: {e}")
        return
    
    # ШАГ 4: Экспорт в Graphviz и HTML
    print("\n" + "=" * 70)
    print("ШАГ 4: Экспорт в форматы визуализации...")
    print("-" * 70)
    
    step4_start = time.time()
    
    try:
        # Экспорт в Graphviz DOT
        save_to_graphviz(data, "site_structure.dot")
        
        # Экспорт в интерактивный HTML
        save_to_interactive_html(data, "site_structure.html")
        
        step4_elapsed = time.time() - step4_start
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ✓ Экспорт завершен ({step4_elapsed:.2f} сек)")
        sys.stdout.flush()
    
    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ⚠ Ошибка при экспорте: {e}")
        import traceback
        traceback.print_exc()
        sys.stdout.flush()
    
    # ИТОГИ
    print("\n" + "=" * 70)
    print("ВСЕ ШАГИ ВЫПОЛНЕНЫ УСПЕШНО!")
    print("=" * 70)
    
    # Проверяем существование файлов
    files_created = []
    if os.path.exists("site_structure_raw.json"):
        files_created.append("site_structure_raw.json")
    if os.path.exists("site_structure.json"):
        files_created.append("site_structure.json")
    if os.path.exists("site_tree.txt"):
        files_created.append("site_tree.txt")
    if os.path.exists("site_structure.dot"):
        files_created.append("site_structure.dot (Graphviz)")
    if os.path.exists("site_structure.html"):
        files_created.append("site_structure.html (Интерактивная визуализация)")
    
    print("\nСозданные/обновленные файлы:")
    for file in files_created:
        file_path = os.path.abspath(file)
        file_size = os.path.getsize(file) if os.path.exists(file) else 0
        print(f"  ✓ {file} ({file_size:,} байт)")
        print(f"    Путь: {file_path}")
    
    if not files_created:
        print("  ⚠ Файлы не найдены!")
    
    print("=" * 70)
    print(f"[{datetime.now().strftime('%H:%M:%S')}] → Скрипт завершен успешно")
    print("=" * 70)
    
    # Явное завершение
    sys.exit(0)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n[ПРЕРВАНО] Скрипт остановлен пользователем")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n[ОШИБКА] Критическая ошибка: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)