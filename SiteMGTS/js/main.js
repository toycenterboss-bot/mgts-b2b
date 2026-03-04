// МГТС Business - Основной JavaScript

// === Utility Functions ===
const utils = {
  // Дебаунс функция
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Throttle функция
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Проверка видимости элемента
  isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  },

  // Плавная прокрутка
  smoothScrollTo(target, offset = 0) {
    const element = typeof target === 'string' ? document.querySelector(target) : target;
    if (element) {
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }
};

// === Navigation ===
const Navigation = {
  init() {
    this.mobileMenuToggle();
    this.horizontalNav();
    this.megaMenu();
    this.activeNavLink();
    this.stickyHeader();
  },

  // Мобильное меню
  mobileMenuToggle() {
    const toggle = document.querySelector('.mobile-menu-toggle');
    const nav = document.querySelector('.nav');
    const body = document.body;

    if (toggle && nav) {
      toggle.addEventListener('click', () => {
        const isActive = nav.classList.toggle('active');
        toggle.setAttribute('aria-expanded', isActive);
        
        if (isActive) {
          body.style.overflow = 'hidden';
        } else {
          body.style.overflow = '';
        }
      });

      // Закрытие при клике вне меню
      document.addEventListener('click', (e) => {
        if (!nav.contains(e.target) && !toggle.contains(e.target) && nav.classList.contains('active')) {
          nav.classList.remove('active');
          toggle.setAttribute('aria-expanded', 'false');
          body.style.overflow = '';
        }
      });

      // Закрытие при клике на ссылку
      nav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          nav.classList.remove('active');
          toggle.setAttribute('aria-expanded', 'false');
          body.style.overflow = '';
        });
      });
    }
  },

  // Навигация между пунктами меню стрелками влево-вправо
  horizontalNav() {
    const allNavLinks = document.querySelectorAll('.nav-link');
    
    allNavLinks.forEach((link, index) => {
      link.addEventListener('keydown', (e) => {
        // ArrowRight - следующий пункт меню
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          e.stopPropagation();
          const nextLink = allNavLinks[index + 1];
          if (nextLink) {
            nextLink.focus();
          } else {
            // Если это последний элемент, переходим к первому
            allNavLinks[0].focus();
          }
        }
        // ArrowLeft - предыдущий пункт меню
        else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          e.stopPropagation();
          const prevLink = allNavLinks[index - 1];
          if (prevLink) {
            prevLink.focus();
          } else {
            // Если это первый элемент, переходим к последнему
            allNavLinks[allNavLinks.length - 1].focus();
          }
        }
        // Home - первый пункт меню
        else if (e.key === 'Home') {
          e.preventDefault();
          e.stopPropagation();
          allNavLinks[0].focus();
        }
        // End - последний пункт меню
        else if (e.key === 'End') {
          e.preventDefault();
          e.stopPropagation();
          allNavLinks[allNavLinks.length - 1].focus();
        }
      });
    });
  },

  // Мега-меню
  megaMenu() {
    const navLinks = document.querySelectorAll('.nav-link[data-mega-menu]');
    
    navLinks.forEach(link => {
      const megaMenuId = link.getAttribute('data-mega-menu');
      const megaMenu = document.getElementById(megaMenuId);

      if (megaMenu) {
        let timeout;

        const openMenu = () => {
          clearTimeout(timeout);
          requestAnimationFrame(() => {
            megaMenu.classList.add('active');
            link.classList.add('active');
            link.setAttribute('aria-expanded', 'true');
            megaMenu.setAttribute('aria-hidden', 'false');
          });
        };

        const closeMenu = () => {
          megaMenu.classList.remove('active');
          link.classList.remove('active');
          link.setAttribute('aria-expanded', 'false');
          megaMenu.setAttribute('aria-hidden', 'true');
        };

        // Mouse events
        link.addEventListener('mouseenter', openMenu);
        link.addEventListener('mouseleave', () => {
          timeout = setTimeout(closeMenu, 200);
        });

        megaMenu.addEventListener('mouseenter', () => {
          clearTimeout(timeout);
        });

        megaMenu.addEventListener('mouseleave', closeMenu);

        // Keyboard events
        link.addEventListener('keydown', (e) => {
          // Enter или Space - открыть/закрыть меню
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            if (megaMenu.classList.contains('active')) {
              closeMenu();
            } else {
              openMenu();
              // Фокус на первый элемент меню
              const firstLink = megaMenu.querySelector('a');
              if (firstLink) {
                setTimeout(() => firstLink.focus(), 100);
              }
            }
          } 
          // Escape - закрыть меню
          else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            closeMenu();
            link.focus();
          }
          // ArrowDown - открыть меню и перейти к первому элементу
          else if (e.key === 'ArrowDown') {
            e.preventDefault();
            e.stopPropagation();
            if (!megaMenu.classList.contains('active')) {
              openMenu();
            }
            const firstLink = megaMenu.querySelector('a');
            if (firstLink) {
              setTimeout(() => firstLink.focus(), 100);
            }
          }
          // ArrowLeft/ArrowRight - закрыть меню (навигация обработается в horizontalNav)
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            // Закрываем меню, но не предотвращаем навигацию
            // Навигация обработается в horizontalNav
            if (megaMenu.classList.contains('active')) {
              closeMenu();
            }
          }
        });

        // Навигация внутри mega-menu с клавиатуры
        const menuSections = megaMenu.querySelectorAll('.mega-menu-section');
        const allMenuLinks = megaMenu.querySelectorAll('a');
        
        // Функция для определения секции и позиции элемента
        function getElementSectionAndIndex(element) {
          for (let sectionIndex = 0; sectionIndex < menuSections.length; sectionIndex++) {
            const section = menuSections[sectionIndex];
            const sectionLinks = section.querySelectorAll('a');
            const linkIndex = Array.from(sectionLinks).indexOf(element);
            if (linkIndex !== -1) {
              return { sectionIndex, linkIndex, sectionLinks };
            }
          }
          return null;
        }
        
        // Функция для получения элемента в соседней секции
        function getElementInAdjacentSection(currentElement, direction) {
          const current = getElementSectionAndIndex(currentElement);
          if (!current) return null;
          
          const { sectionIndex, linkIndex, sectionLinks } = current;
          let targetSectionIndex;
          
          if (direction === 'right') {
            targetSectionIndex = sectionIndex + 1;
            if (targetSectionIndex >= menuSections.length) {
              // Если это последняя секция, переходим к первой
              targetSectionIndex = 0;
            }
          } else {
            targetSectionIndex = sectionIndex - 1;
            if (targetSectionIndex < 0) {
              // Если это первая секция, переходим к последней
              targetSectionIndex = menuSections.length - 1;
            }
          }
          
          const targetSection = menuSections[targetSectionIndex];
          const targetSectionLinks = targetSection.querySelectorAll('a');
          
          // Переходим к элементу с тем же индексом в соседней секции
          // Если такого индекса нет, берем последний элемент секции
          const targetIndex = Math.min(linkIndex, targetSectionLinks.length - 1);
          return targetSectionLinks[targetIndex] || null;
        }
        
        allMenuLinks.forEach((menuLink, globalIndex) => {
          menuLink.addEventListener('keydown', (e) => {
            // Escape - закрыть меню и вернуть фокус на родительскую ссылку
            if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              closeMenu();
              link.focus();
            }
            // ArrowDown - следующий элемент в текущей секции или следующей
            else if (e.key === 'ArrowDown') {
              e.preventDefault();
              e.stopPropagation();
              const current = getElementSectionAndIndex(menuLink);
              if (current) {
                const { sectionLinks, linkIndex } = current;
                // Следующий элемент в текущей секции
                const nextInSection = sectionLinks[linkIndex + 1];
                if (nextInSection) {
                  nextInSection.focus();
                } else {
                  // Если это последний элемент секции, переходим к первому элементу следующей секции
                  const nextSectionElement = getElementInAdjacentSection(menuLink, 'right');
                  if (nextSectionElement) {
                    nextSectionElement.focus();
                  }
                }
              } else {
                // Fallback: последовательная навигация
                const nextLink = allMenuLinks[globalIndex + 1] || allMenuLinks[0];
                if (nextLink) nextLink.focus();
              }
            }
            // ArrowUp - предыдущий элемент в текущей секции или предыдущей
            else if (e.key === 'ArrowUp') {
              e.preventDefault();
              e.stopPropagation();
              const current = getElementSectionAndIndex(menuLink);
              if (current) {
                const { sectionLinks, linkIndex } = current;
                // Предыдущий элемент в текущей секции
                const prevInSection = sectionLinks[linkIndex - 1];
                if (prevInSection) {
                  prevInSection.focus();
                } else {
                  // Если это первый элемент секции, переходим к последнему элементу предыдущей секции
                  const prevSectionElement = getElementInAdjacentSection(menuLink, 'left');
                  if (prevSectionElement) {
                    prevSectionElement.focus();
                  }
                }
              } else {
                // Fallback: последовательная навигация
                const prevLink = allMenuLinks[globalIndex - 1] || allMenuLinks[allMenuLinks.length - 1];
                if (prevLink) prevLink.focus();
              }
            }
            // ArrowRight - переход к соответствующему элементу в следующей секции
            else if (e.key === 'ArrowRight') {
              e.preventDefault();
              e.stopPropagation();
              const nextSectionElement = getElementInAdjacentSection(menuLink, 'right');
              if (nextSectionElement) {
                nextSectionElement.focus();
              }
            }
            // ArrowLeft - переход к соответствующему элементу в предыдущей секции
            else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              e.stopPropagation();
              const prevSectionElement = getElementInAdjacentSection(menuLink, 'left');
              if (prevSectionElement) {
                prevSectionElement.focus();
              }
            }
            // Tab - закрыть меню при выходе
            else if (e.key === 'Tab' && !e.shiftKey) {
              // Если это последний элемент, закрываем меню
              if (globalIndex === allMenuLinks.length - 1) {
                setTimeout(() => closeMenu(), 100);
              }
            }
          });
        });

        // Close on click outside
        document.addEventListener('click', (e) => {
          if (!e.target.closest('.nav-link') && !e.target.closest('.mega-menu')) {
            closeMenu();
          }
        });
      }
    });

    // Закрытие при клике вне меню
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.nav-link') && !e.target.closest('.mega-menu')) {
        document.querySelectorAll('.mega-menu').forEach(menu => {
          menu.classList.remove('active');
        });
        document.querySelectorAll('.nav-link').forEach(link => {
          link.classList.remove('active');
        });
      }
    });
  },

  // Активная ссылка в навигации
  activeNavLink() {
    const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
    const navLinks = document.querySelectorAll('#mainNav .nav-link');

    navLinks.forEach(link => {
      // Пропускаем телефон и другие не-ссылки
      if (link.getAttribute('href') && link.getAttribute('href').startsWith('#')) {
        return;
      }
      
      try {
        const linkHref = link.getAttribute('href');
        if (!linkHref) return;
        
        // Для относительных ссылок создаем полный путь
        const linkUrl = linkHref.startsWith('http') 
          ? new URL(linkHref) 
          : new URL(linkHref, window.location.href);
        
        const linkPath = linkUrl.pathname.replace(/\/$/, '') || '/';
        
        // Удаляем старый active класс и aria-current
        link.classList.remove('active');
        link.removeAttribute('aria-current');
        
        // Проверяем совпадение
        if (linkPath === currentPath || 
            (currentPath !== '/' && currentPath.startsWith(linkPath + '/')) ||
            (linkPath !== '/' && linkPath === currentPath)) {
          link.classList.add('active');
          link.setAttribute('aria-current', 'page'); // Добавляем aria-current для доступности
        }
      } catch (e) {
        // Игнорируем ошибки парсинга URL
        console.warn('Error parsing link URL:', link.getAttribute('href'), e);
      }
    });
  },

  // Липкий хедер
  stickyHeader() {
    const header = document.querySelector('.header');
    if (!header) return;

    let lastScroll = 0;
    const scrollHandler = utils.throttle(() => {
      const currentScroll = window.pageYOffset;

      if (currentScroll > 100) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }

      lastScroll = currentScroll;
    }, 100);

    window.addEventListener('scroll', scrollHandler);
  }
};

// === Forms ===
const Forms = {
  init() {
    this.formValidation();
    this.formSubmission();
    this.phoneMask();
  },

  // Валидация форм
  formValidation() {
    const forms = document.querySelectorAll('form[data-validate]');

    forms.forEach(form => {
      const inputs = form.querySelectorAll('input[required], textarea[required], select[required]');

      inputs.forEach(input => {
        // Валидация при потере фокуса
        input.addEventListener('blur', () => {
          this.validateField(input);
        });

        // Реал-тайм валидация при вводе
        input.addEventListener('input', () => {
          if (input.value.trim().length > 0) {
            this.validateField(input);
          } else {
            input.classList.remove('error', 'valid');
            const formGroup = input.closest('.form-group') || input.parentElement;
            const errorElement = formGroup.querySelector('.form-error');
            if (errorElement) {
              errorElement.remove();
            }
          }
        });
      });

      form.addEventListener('submit', (e) => {
        let isValid = true;

        inputs.forEach(input => {
          if (!this.validateField(input)) {
            isValid = false;
          }
        });

        if (!isValid) {
          e.preventDefault();
        }
      });
    });
  },

  validateField(field) {
    const value = field.value.trim();
    const type = field.type;
    let isValid = true;
    let errorMessage = '';

    // Проверка обязательности
    if (field.hasAttribute('required') && !value) {
      isValid = false;
      errorMessage = 'Это поле обязательно для заполнения';
    }

    // Проверка email
    if (type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        isValid = false;
        errorMessage = 'Введите корректный email адрес';
      }
    }

    // Проверка телефона
    if (type === 'tel' && value) {
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      if (!phoneRegex.test(value) || value.replace(/\D/g, '').length < 10) {
        isValid = false;
        errorMessage = 'Введите корректный номер телефона';
      }
    }

    // Отображение ошибки
    this.showFieldError(field, isValid, errorMessage);

    return isValid;
  },

  showFieldError(field, isValid, message) {
    const formGroup = field.closest('.form-group');
    if (!formGroup) return;

    let errorElement = formGroup.querySelector('.form-error');

    if (isValid) {
      field.classList.remove('error');
      if (errorElement) {
        errorElement.remove();
      }
    } else {
      field.classList.add('error');
      if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'form-error';
        formGroup.appendChild(errorElement);
      }
      errorElement.textContent = message;
    }
  },

  // Маска телефона
  phoneMask() {
    const phoneInputs = document.querySelectorAll('input[type="tel"]');

    phoneInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        
        if (value.startsWith('8')) {
          value = '7' + value.slice(1);
        }
        
        if (value.startsWith('7')) {
          let formatted = '+7';
          if (value.length > 1) formatted += ' (' + value.slice(1, 4);
          if (value.length >= 4) formatted += ') ' + value.slice(4, 7);
          if (value.length >= 7) formatted += '-' + value.slice(7, 9);
          if (value.length >= 9) formatted += '-' + value.slice(9, 11);
          
          e.target.value = formatted;
        }
      });
    });
  },

  // Отправка форм
  formSubmission() {
    const forms = document.querySelectorAll('form[data-submit]');

    forms.forEach(form => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton ? submitButton.textContent : '';
        
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = 'Отправка...';
        }

        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        try {
          // Здесь должна быть реальная отправка на сервер
          // Для демонстрации используем setTimeout
          await new Promise(resolve => setTimeout(resolve, 1500));

          this.showFormSuccess(form);
          
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalText;
          }

          form.reset();
        } catch (error) {
          console.error('Form submission error:', error);
          this.showFormError(form, 'Произошла ошибка. Попробуйте еще раз.');
          
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalText;
          }
        }
      });
    });
  },

  showFormSuccess(form) {
    const successMessage = document.createElement('div');
    successMessage.className = 'form-success';
    successMessage.style.cssText = 'padding: 1rem; background: #10B981; color: white; border-radius: 0.5rem; margin-top: 1rem;';
    successMessage.textContent = 'Спасибо! Ваша заявка успешно отправлена.';
    
    form.appendChild(successMessage);
    
    setTimeout(() => {
      successMessage.remove();
    }, 5000);
  },

  showFormError(form, message) {
    const errorMessage = document.createElement('div');
    errorMessage.className = 'form-error-message';
    errorMessage.style.cssText = 'padding: 1rem; background: #EF4444; color: white; border-radius: 0.5rem; margin-top: 1rem;';
    errorMessage.textContent = message;
    
    form.appendChild(errorMessage);
    
    setTimeout(() => {
      errorMessage.remove();
    }, 5000);
  }
};

// === Smooth Scroll ===
const SmoothScroll = {
  init() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#' && href.length > 1) {
          e.preventDefault();
          utils.smoothScrollTo(href, 100);
        }
      });
    });
    
    // Инициализация индикатора прокрутки в hero секции
    this.initHeroScrollIndicator();
  },
  
  // Индикатор прокрутки в hero секции
  initHeroScrollIndicator() {
    const scrollIndicator = document.querySelector('.hero-scroll-indicator');
    if (!scrollIndicator) return;
    
    // Плавная прокрутка при клике
    scrollIndicator.addEventListener('click', (e) => {
      e.preventDefault();
      const target = scrollIndicator.getAttribute('href');
      if (target && target !== '#') {
        utils.smoothScrollTo(target, 100);
      }
    });
    
    // Скрытие индикатора при прокрутке вниз
    const handleScroll = utils.throttle(() => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const heroHeight = document.querySelector('.hero')?.offsetHeight || 0;
      
      if (scrollTop > heroHeight * 0.5) {
        scrollIndicator.style.opacity = '0';
        scrollIndicator.style.pointerEvents = 'none';
      } else {
        scrollIndicator.style.opacity = '';
        scrollIndicator.style.pointerEvents = '';
      }
    }, 100);
    
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Проверка начального состояния
  }
};

// === Lazy Loading Images ===
const LazyLoad = {
  init() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.add('loaded');
            observer.unobserve(img);
          }
        });
      });

      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    } else {
      // Fallback для старых браузеров
      document.querySelectorAll('img[data-src]').forEach(img => {
        img.src = img.dataset.src;
      });
    }
  }
};

// === Initialize on DOM Ready ===
document.addEventListener('DOMContentLoaded', () => {
  Navigation.init();
  Forms.init();
  SmoothScroll.init();
  LazyLoad.init();

  // Анимация появления элементов при прокрутке
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.service-card, .card, .section').forEach(el => {
    observer.observe(el);
  });
});

// Добавляем CSS для анимации
const dynamicStyle = document.createElement('style');
dynamicStyle.textContent = `
  .service-card,
  .card,
  .section {
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.6s ease, transform 0.6s ease;
  }
  
  .service-card.fade-in,
  .card.fade-in,
  .section.fade-in {
    opacity: 1;
    transform: translateY(0);
  }
  
  .header.scrolled {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }
  
  .form-input.error,
  .form-textarea.error,
  .form-select.error {
    border-color: #EF4444;
  }
`;
document.head.appendChild(dynamicStyle);

