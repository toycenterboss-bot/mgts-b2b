/**
 * Компоненты для страниц услуг
 * - Таблицы тарифов
 * - FAQ аккордеон
 * - Формы заказа
 */

(function() {
  'use strict';

  // === FAQ Аккордеон ===
  function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
      const question = item.querySelector('.faq-question');
      if (!question) return;
      
      question.addEventListener('click', function() {
        const isActive = item.classList.contains('faq-item--active');
        
        // Закрываем все остальные элементы
        faqItems.forEach(otherItem => {
          if (otherItem !== item) {
            otherItem.classList.remove('faq-item--active');
            const otherAnswer = otherItem.querySelector('.faq-answer');
            if (otherAnswer) {
              otherAnswer.setAttribute('aria-expanded', 'false');
            }
          }
        });
        
        // Переключаем текущий элемент
        if (isActive) {
          item.classList.remove('faq-item--active');
          const answer = item.querySelector('.faq-answer');
          if (answer) {
            answer.setAttribute('aria-expanded', 'false');
          }
        } else {
          item.classList.add('faq-item--active');
          const answer = item.querySelector('.faq-answer');
          if (answer) {
            answer.setAttribute('aria-expanded', 'true');
          }
        }
      });
      
      // Клавиатурная навигация
      question.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          question.click();
        }
      });
      
      // Инициализация ARIA атрибутов
      const answer = item.querySelector('.faq-answer');
      if (answer) {
        question.setAttribute('aria-expanded', 'false');
        question.setAttribute('aria-controls', `faq-answer-${Array.from(faqItems).indexOf(item)}`);
        answer.id = `faq-answer-${Array.from(faqItems).indexOf(item)}`;
        answer.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // === Валидация формы заказа ===
  function initOrderForm() {
    const orderForms = document.querySelectorAll('.order-form');
    
    orderForms.forEach(form => {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Получаем все обязательные поля
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;
        
        // Валидация полей
        requiredFields.forEach(field => {
          if (!field.value.trim()) {
            isValid = false;
            field.classList.add('error');
            field.setAttribute('aria-invalid', 'true');
          } else {
            field.classList.remove('error');
            field.setAttribute('aria-invalid', 'false');
          }
        });
        
        // Валидация email
        const emailField = form.querySelector('input[type="email"]');
        if (emailField && emailField.value) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(emailField.value)) {
            isValid = false;
            emailField.classList.add('error');
            emailField.setAttribute('aria-invalid', 'true');
          }
        }
        
        // Валидация телефона
        const phoneField = form.querySelector('input[type="tel"]');
        if (phoneField && phoneField.value) {
          const phoneRegex = /^[\d\s\-\+\(\)]+$/;
          if (!phoneRegex.test(phoneField.value) || phoneField.value.replace(/\D/g, '').length < 10) {
            isValid = false;
            phoneField.classList.add('error');
            phoneField.setAttribute('aria-invalid', 'true');
          }
        }
        
        if (isValid) {
          // Показываем сообщение об успехе
          const successMessage = form.querySelector('.order-form__success');
          const errorMessage = form.querySelector('.order-form__error');
          
          if (errorMessage) {
            errorMessage.classList.remove('order-form__error--visible');
          }
          
          if (successMessage) {
            successMessage.classList.add('order-form__success--visible');
            form.reset();
            
            // Скрываем сообщение через 5 секунд
            setTimeout(() => {
              successMessage.classList.remove('order-form__success--visible');
            }, 5000);
          }
          
          // Здесь можно добавить отправку данных на сервер
          console.log('Форма отправлена:', new FormData(form));
        } else {
          // Показываем сообщение об ошибке
          const errorMessage = form.querySelector('.order-form__error');
          if (errorMessage) {
            errorMessage.textContent = 'Пожалуйста, заполните все обязательные поля корректно.';
            errorMessage.classList.add('order-form__error--visible');
          }
        }
      });
      
      // Убираем класс error при вводе
      const inputs = form.querySelectorAll('input, textarea, select');
      inputs.forEach(input => {
        input.addEventListener('input', function() {
          this.classList.remove('error');
          this.setAttribute('aria-invalid', 'false');
        });
      });
    });
  }

  // === Инициализация всех компонентов ===
  function init() {
    initFAQ();
    initOrderForm();
  }

  // Инициализация при загрузке DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Экспорт для использования в других скриптах
  window.ServiceComponents = {
    initFAQ,
    initOrderForm,
    init
  };

})();



