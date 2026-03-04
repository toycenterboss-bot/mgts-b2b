/**
 * Сезонные и праздничные адаптации дизайна
 * Автоматически адаптирует сайт под время года и российские праздники
 */

(function() {
    'use strict';

    // Определение времени года
    function getSeason() {
        const month = new Date().getMonth() + 1; // 1-12
        if (month >= 3 && month <= 5) return 'spring'; // март-май
        if (month >= 6 && month <= 8) return 'summer'; // июнь-август
        if (month >= 9 && month <= 11) return 'autumn'; // сентябрь-ноябрь
        return 'winter'; // декабрь-февраль
    }

    // Определение праздников
    function getHoliday() {
        const today = new Date();
        const month = today.getMonth() + 1;
        const day = today.getDate();
        
        // Новый год и Рождество (24 декабря - 8 января)
        if ((month === 12 && day >= 24) || (month === 1 && day <= 8)) {
            return 'newyear';
        }
        
        // День защитника Отечества (23 февраля)
        if (month === 2 && day === 23) {
            return 'defender';
        }
        
        // Международный женский день (8 марта)
        if (month === 3 && day === 8) {
            return 'womensday';
        }
        
        // День Победы (9 мая)
        if (month === 5 && day === 9) {
            return 'victory';
        }
        
        // День России (12 июня)
        if (month === 6 && day === 12) {
            return 'russiaday';
        }
        
        // День знаний (1 сентября)
        if (month === 9 && day === 1) {
            return 'knowledge';
        }
        
        // День народного единства (4 ноября)
        if (month === 11 && day === 4) {
            return 'unity';
        }
        
        return null;
    }

    // Применение сезонных стилей
    function applySeasonalStyles(season) {
        const root = document.documentElement;
        const body = document.body;
        
        // Удаляем предыдущие классы сезонов
        body.classList.remove('season-spring', 'season-summer', 'season-autumn', 'season-winter');
        body.classList.add(`season-${season}`);
        
        // Сезонные цвета (легкие акценты)
        const seasonColors = {
            spring: {
                accent: '#4CAF50', // зеленый
                gradient: 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)'
            },
            summer: {
                accent: '#FFC107', // желтый/золотой
                gradient: 'linear-gradient(135deg, #FFC107 0%, #FFD54F 100%)'
            },
            autumn: {
                accent: '#FF9800', // оранжевый
                gradient: 'linear-gradient(135deg, #FF9800 0%, #FFB74D 100%)'
            },
            winter: {
                accent: '#2196F3', // голубой
                gradient: 'linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)'
            }
        };
        
        const colors = seasonColors[season];
        root.style.setProperty('--seasonal-accent', colors.accent);
        root.style.setProperty('--seasonal-gradient', colors.gradient);
    }

    // Применение праздничных стилей
    function applyHolidayStyles(holiday) {
        if (!holiday) return;
        
        const root = document.documentElement;
        const body = document.body;
        
        // Удаляем предыдущие праздничные классы
        body.classList.remove('holiday-newyear', 'holiday-defender', 'holiday-womensday', 
                             'holiday-victory', 'holiday-russiaday', 'holiday-knowledge', 'holiday-unity');
        body.classList.add(`holiday-${holiday}`);
        
        const holidayStyles = {
            newyear: {
                accent: '#2196F3', // голубой
                gradient: 'linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)',
                animation: 'sparkle'
            },
            defender: {
                accent: '#9C27B0', // фиолетовый
                gradient: 'linear-gradient(135deg, #9C27B0 0%, #BA68C8 100%)',
                animation: 'subtle-pulse'
            },
            womensday: {
                accent: '#EC407A', // розовый
                gradient: 'linear-gradient(135deg, #EC407A 0%, #F48FB1 100%)',
                animation: 'gentle-float'
            },
            victory: {
                accent: '#FF5722', // красно-оранжевый
                gradient: 'linear-gradient(135deg, #FF5722 0%, #FF8A65 100%)',
                animation: 'subtle-pulse'
            },
            russiaday: {
                accent: '#F44336', // красный
                gradient: 'linear-gradient(135deg, #F44336 0%, #EF5350 100%)',
                animation: 'gentle-float'
            },
            knowledge: {
                accent: '#3F51B5', // индиго
                gradient: 'linear-gradient(135deg, #3F51B5 0%, #7986CB 100%)',
                animation: 'subtle-pulse'
            },
            unity: {
                accent: '#E30611', // красный МТС
                gradient: 'linear-gradient(135deg, #E30611 0%, #FF5252 100%)',
                animation: 'gentle-float'
            }
        };
        
        const style = holidayStyles[holiday];
        if (style) {
            root.style.setProperty('--holiday-accent', style.accent);
            root.style.setProperty('--holiday-gradient', style.gradient);
            
            // Добавляем праздничную анимацию к hero секциям
            const heroSections = document.querySelectorAll('.hero');
            heroSections.forEach(hero => {
                hero.style.animation = `${style.animation} 3s ease-in-out infinite`;
            });
        }
    }

    // Создание снегопада для Нового года
    function createSnowfall() {
        const holiday = getHoliday();
        if (holiday !== 'newyear') return;
        
        const body = document.body;
        
        // Удаляем предыдущий снегопад, если есть
        const existingSnow = document.querySelector('.snow-container');
        if (existingSnow) {
            existingSnow.remove();
        }
        
        const snowContainer = document.createElement('div');
        snowContainer.className = 'snow-container';
        body.appendChild(snowContainer);
        
        // Создаем снежинки
        const snowflakeCount = 50;
        for (let i = 0; i < snowflakeCount; i++) {
            const snowflake = document.createElement('div');
            snowflake.className = 'snowflake';
            snowflake.innerHTML = '❄';
            
            const size = Math.random() * 15 + 10;
            const left = Math.random() * 100;
            const delay = Math.random() * 5;
            const duration = Math.random() * 3 + 7;
            const drift = (Math.random() - 0.5) * 100;
            
            snowflake.style.cssText = `
                font-size: ${size}px;
                left: ${left}%;
                top: -20px;
                opacity: ${Math.random() * 0.5 + 0.5};
                animation: snowfall ${duration}s linear infinite;
                animation-delay: ${delay}s;
                --snow-drift: ${drift}px;
            `;
            
            snowContainer.appendChild(snowflake);
        }
    }

    // Инициализация при загрузке страницы
    function init() {
        const season = getSeason();
        const holiday = getHoliday();
        
        applySeasonalStyles(season);
        if (holiday) {
            applyHolidayStyles(holiday);
            if (holiday === 'newyear') {
                createSnowfall();
            }
        }
        
        // Добавляем легкую анимацию для элементов при скролле
        if ('IntersectionObserver' in window) {
            const observerOptions = {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            };
            
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate-in');
                        observer.unobserve(entry.target);
                    }
                });
            }, observerOptions);
            
            // Наблюдаем за карточками и секциями
            document.querySelectorAll('.card, .service-card, .section').forEach(el => {
                observer.observe(el);
            });
        }
    }

    // Запуск при загрузке DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

