/**
 * Section Map - Компонент карты с точками объектов
 * 
 * Функциональность:
 * - Инициализация карты (Яндекс.Карты или другой провайдер)
 * - Добавление меток для каждого объекта из списка
 * - Взаимодействие между списком объектов и картой (hover, click)
 * - Поддержка кластеров для большого количества точек
 */

(function() {
    'use strict';

    class SectionMap {
        constructor(container) {
            this.container = container;
            this.mapContainer = container.querySelector('[id*="map"]') || container.querySelector('.section-map__map-container') || null;
            this.objectsList = container.querySelector('.section-map__objects-list');
            this.objectItems = container.querySelectorAll('.section-map__item');
            this.mapInstance = null;
            this.markers = [];
            this.coordinates = [];
            
            // Проверяем наличие элементов
            if (!this.mapContainer && !this.objectsList) {
                console.warn('[Section Map] No map container or objects list found');
                return;
            }
            
            // Создаем контейнер карты, если его нет
            if (!this.mapContainer) {
                this.mapContainer = document.createElement('div');
                this.mapContainer.id = `map-${Date.now()}`;
                this.mapContainer.className = 'section-map__map-container';
                this.mapContainer.style.width = '100%';
                this.mapContainer.style.height = '400px';
                
                // Вставляем контейнер карты после списка объектов или в контейнер
                if (this.objectsList && this.objectsList.nextSibling) {
                    this.objectsList.parentNode.insertBefore(this.mapContainer, this.objectsList.nextSibling);
                } else {
                    container.appendChild(this.mapContainer);
                }
            }
            
            this.init();
        }

        async init() {
            // Извлекаем координаты из адресов (можно использовать геокодирование)
            await this.extractCoordinates();
            
            // Инициализируем карту
            await this.initMap();
            
            // Добавляем маркеры на карту
            this.addMarkers();
            
            // Добавляем обработчики событий для списка объектов
            this.attachEventListeners();
            
            console.log(`[Section Map] Инициализирована карта с ${this.objectItems.length} объектами`);
        }

        async extractCoordinates() {
            // В будущем здесь можно использовать геокодирование для получения координат из адресов
            // Пока создаем заглушку - координаты будут устанавливаться вручную или через data-атрибуты
            
            this.objectItems.forEach((item, index) => {
                const address = item.textContent.trim();
                const dataLat = item.getAttribute('data-lat');
                const dataLng = item.getAttribute('data-lng');
                
                if (dataLat && dataLng) {
                    this.coordinates.push({
                        address: address,
                        lat: parseFloat(dataLat),
                        lng: parseFloat(dataLng)
                    });
                } else {
                    // Заглушка - используем случайные координаты Москвы для демонстрации
                    // В реальности нужно использовать геокодирование
                    console.warn(`[Section Map] Координаты не найдены для адреса: ${address}`);
                }
            });
            
            console.log(`[Section Map] Извлечено координат: ${this.coordinates.length} из ${this.objectItems.length}`);
        }

        async initMap() {
            // Проверяем, используется ли Яндекс.Карты
            if (window.ymaps && typeof window.ymaps.ready === 'function') {
                try {
                    await new Promise((resolve) => {
                        window.ymaps.ready(() => {
                            // Инициализация Яндекс.Карты
                            this.mapInstance = new window.ymaps.Map(this.mapContainer.id, {
                                center: [55.7558, 37.6173], // Москва по умолчанию
                                zoom: 10,
                                controls: ['zoomControl', 'typeSelector', 'fullscreenControl']
                            });
                            
                            resolve();
                        });
                    });
                    console.log('[Section Map] Яндекс.Карта инициализирована');
                } catch (error) {
                    console.error('[Section Map] Ошибка инициализации Яндекс.Карты:', error);
                    this.initStaticMap();
                }
            } else {
                // Если Яндекс.Карты не загружены, используем статическую карту или iframe
                console.warn('[Section Map] Яндекс.Карты не найдены, используем статическую карту');
                this.initStaticMap();
            }
        }

        initStaticMap() {
            // Заглушка для статической карты или iframe
            // Можно использовать статическое изображение или embed карту Google/Яндекс
            this.mapContainer.innerHTML = `
                <div style="width: 100%; height: 100%; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #666;">
                    <div style="text-align: center;">
                        <p>Карта объектов</p>
                        <p style="font-size: 12px; margin-top: 10px;">Для отображения карты необходим API ключ Яндекс.Карт</p>
                    </div>
                </div>
            `;
            console.log('[Section Map] Статическая карта инициализирована');
        }

        addMarkers() {
            if (!this.mapInstance || this.coordinates.length === 0) {
                return;
            }
            
            // Очищаем существующие маркеры
            this.mapInstance.geoObjects.removeAll();
            this.markers = [];
            
            // Добавляем маркеры для каждого объекта
            this.coordinates.forEach((coord, index) => {
                const marker = new window.ymaps.Placemark(
                    [coord.lat, coord.lng],
                    {
                        balloonContent: coord.address,
                        hintContent: coord.address
                    },
                    {
                        preset: 'islands#blueDotIcon'
                    }
                );
                
                // Добавляем обработчик клика на маркер
                marker.events.add('click', () => {
                    // Выделяем соответствующий элемент в списке
                    if (this.objectItems[index]) {
                        this.objectItems[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
                        this.objectItems[index].classList.add('highlighted');
                        setTimeout(() => {
                            this.objectItems[index].classList.remove('highlighted');
                        }, 2000);
                    }
                });
                
                this.mapInstance.geoObjects.add(marker);
                this.markers.push(marker);
            });
            
            // Автоматически подстраиваем границы карты под все маркеры
            if (this.markers.length > 0) {
                this.mapInstance.setBounds(this.mapInstance.geoObjects.getBounds(), {
                    checkZoomRange: true,
                    duration: 300
                });
            }
            
            console.log(`[Section Map] Добавлено маркеров: ${this.markers.length}`);
        }

        attachEventListeners() {
            // Добавляем обработчики для элементов списка объектов
            this.objectItems.forEach((item, index) => {
                item.setAttribute('role', 'button');
                item.setAttribute('tabindex', '0');
                
                // Обработчик клика
                item.addEventListener('click', () => {
                    this.focusOnObject(index);
                });
                
                // Обработчик hover
                item.addEventListener('mouseenter', () => {
                    if (this.markers[index]) {
                        this.markers[index].balloon.open();
                    }
                });
                
                item.addEventListener('mouseleave', () => {
                    if (this.markers[index]) {
                        this.markers[index].balloon.close();
                    }
                });
                
                // Поддержка клавиатуры
                item.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.focusOnObject(index);
                    }
                });
            });
        }

        focusOnObject(index) {
            if (index < 0 || index >= this.coordinates.length) {
                return;
            }
            
            const coord = this.coordinates[index];
            
            // Выделяем элемент в списке
            this.objectItems.forEach((item, i) => {
                item.classList.remove('active');
            });
            if (this.objectItems[index]) {
                this.objectItems[index].classList.add('active');
                this.objectItems[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            
            // Центрируем карту на выбранном объекте
            if (this.mapInstance && coord) {
                this.mapInstance.setCenter([coord.lat, coord.lng], 15, {
                    duration: 300
                });
                
                // Открываем балун маркера
                if (this.markers[index]) {
                    this.markers[index].balloon.open();
                }
            }
        }

        destroy() {
            // Удаляем обработчики событий и маркеры
            if (this.mapInstance) {
                this.mapInstance.destroy();
            }
            this.markers = [];
        }
    }

    // Инициализация всех карт на странице
    function initSectionMaps() {
        const maps = document.querySelectorAll('.section-map');
        
        if (maps.length === 0) {
            console.log('[Section Map] Карты не найдены на странице');
            return;
        }
        
        console.log(`[Section Map] Найдено карт: ${maps.length}`);
        
        const mapInstances = [];
        
        maps.forEach((map, index) => {
            // Пропускаем уже инициализированные
            if (map.dataset.initialized === 'true') {
                console.log(`[Section Map] Карта ${index + 1} уже инициализирована, пропускаем`);
                return;
            }
            
            try {
                const instance = new SectionMap(map);
                map.dataset.initialized = 'true'; // Помечаем как инициализированную
                mapInstances.push(instance);
                console.log(`[Section Map] Карта ${index + 1} инициализирована успешно`);
            } catch (error) {
                console.error(`[Section Map] Ошибка при инициализации карты ${index + 1}:`, error);
            }
        });
        
        // Сохраняем экземпляры для возможного использования
        if (!window.sectionMaps) {
            window.sectionMaps = [];
        }
        window.sectionMaps.push(...mapInstances);
        
        if (mapInstances.length > 0) {
            console.log(`[Section Map] Инициализировано новых карт: ${mapInstances.length}`);
        }
    }

    // Инициализация при загрузке DOM
    function initWhenReady() {
        // Проверяем наличие карт (может быть загружена из CMS)
        const maps = document.querySelectorAll('.section-map');
        if (maps.length > 0) {
            // Ждем немного, чтобы убедиться, что Яндекс.Карты загружены (если используются)
            setTimeout(() => {
                initSectionMaps();
            }, 500);
        } else {
            // Если карта еще не загружена, ждем немного и проверяем снова
            setTimeout(() => {
                const mapsRetry = document.querySelectorAll('.section-map');
                if (mapsRetry.length > 0) {
                    initSectionMaps();
                }
            }, 1000);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWhenReady);
    } else {
        initWhenReady();
    }

    // Также инициализируем при загрузке контента из CMS
    window.addEventListener('cmsContentLoaded', () => {
        setTimeout(initSectionMaps, 500); // Даем больше времени для загрузки Яндекс.Карт
    });
    window.addEventListener('cms-content-loaded', () => {
        setTimeout(initSectionMaps, 500);
    });

    // Экспорт для использования в других скриптах
    window.SectionMap = SectionMap;
    window.initSectionMaps = initSectionMaps;
})();
