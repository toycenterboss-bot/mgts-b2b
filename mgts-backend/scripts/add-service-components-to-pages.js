/**
 * Скрипт для добавления компонентов услуг (тарифы, FAQ, формы) в контент страниц услуг в Strapi
 */

const fs = require('fs');
const path = require('path');

// Список страниц услуг с их slug
const servicePages = [
  { slug: 'business/internet/gpon', name: 'GPON для бизнеса' },
  { slug: 'business/internet/dedicated', name: 'Выделенный интернет' },
  { slug: 'business/internet/office', name: 'Офисный интернет' },
  { slug: 'business/telephony/fixed', name: 'Фиксированная телефония' },
  { slug: 'business/telephony/ip', name: 'IP-телефония' },
  { slug: 'business/telephony/vpbx', name: 'Виртуальная АТС' },
  { slug: 'business/telephony/mobile', name: 'Корпоративная мобильная связь' },
  { slug: 'business/security/video-surveillance', name: 'Видеонаблюдение' },
  { slug: 'business/security/access-control', name: 'Контроль доступа' },
  { slug: 'business/security/alarm', name: 'Охранная сигнализация' },
  { slug: 'business/cloud/storage', name: 'Облачное хранилище' },
  { slug: 'business/cloud/vps', name: 'Виртуальные серверы' },
  { slug: 'business/cloud/services', name: 'Облачные сервисы' },
  { slug: 'business/tv/iptv', name: 'IPTV для бизнеса' },
  { slug: 'business/tv/office', name: 'Корпоративное ТВ' }
];

// Примеры контента для компонентов
const exampleTariffs = {
  tariffs: [
    {
      title: 'Базовый',
      description: 'Для малого бизнеса',
      price: '1 500',
      pricePeriod: '/мес',
      isFeatured: false,
      badgeText: '',
      features: 'Скорость до 100 Мбит/с\nБезлимитный трафик\nТехническая поддержка 24/7\nСтатический IP адрес',
      buttonText: 'Выбрать тариф',
      buttonLink: '#order-form'
    },
    {
      title: 'Стандартный',
      description: 'Для среднего бизнеса',
      price: '3 000',
      pricePeriod: '/мес',
      isFeatured: true,
      badgeText: 'Популярный',
      features: 'Скорость до 500 Мбит/с\nБезлимитный трафик\nТехническая поддержка 24/7\nСтатический IP адрес\nПриоритетная поддержка',
      buttonText: 'Выбрать тариф',
      buttonLink: '#order-form'
    },
    {
      title: 'Премиум',
      description: 'Для крупного бизнеса',
      price: '5 000',
      pricePeriod: '/мес',
      isFeatured: false,
      badgeText: '',
      features: 'Скорость до 1 Гбит/с\nБезлимитный трафик\nТехническая поддержка 24/7\nСтатический IP адрес\nПриоритетная поддержка\nПерсональный менеджер',
      buttonText: 'Выбрать тариф',
      buttonLink: '#order-form'
    }
  ]
};

const exampleFAQ = {
  items: [
    {
      question: 'Как быстро можно подключить услугу?',
      answer: '<p>Подключение услуги занимает от 3 до 7 рабочих дней в зависимости от технических условий на вашем объекте. После подачи заявки с вами свяжется наш специалист для уточнения деталей и согласования времени подключения.</p>'
    },
    {
      question: 'Какие документы нужны для подключения?',
      answer: '<p>Для подключения услуги необходимы следующие документы:</p><ul><li>Паспорт руководителя или уполномоченного лица</li><li>Документы на право использования помещения (договор аренды или свидетельство о собственности)</li><li>Реквизиты организации (для юридических лиц)</li></ul>'
    },
    {
      question: 'Можно ли изменить тариф после подключения?',
      answer: '<p>Да, вы можете изменить тариф в любое время. Изменение тарифа вступает в силу со следующего расчетного периода. Для изменения тарифа обратитесь в службу поддержки или воспользуйтесь личным кабинетом.</p>'
    },
    {
      question: 'Какая гарантия качества предоставляется?',
      answer: '<p>Мы гарантируем соответствие заявленной скорости интернета и стабильность работы сети. В случае нарушения качества услуги мы компенсируем стоимость согласно условиям договора. Техническая поддержка работает круглосуточно.</p>'
    }
  ]
};

const exampleOrderForm = {
  title: 'Заказать услугу',
  subtitle: 'Оставьте заявку, и наш специалист свяжется с вами в течение 15 минут',
  formAction: '#',
  formMethod: 'POST'
};

// Генерируем HTML контент для добавления в Strapi
function generateServiceComponentsHTML() {
  let html = '';
  
  // Тарифы
  html += '<section class="service-tariffs">\n';
  html += '    <div class="container">\n';
  html += '        <h2>Тарифы и цены</h2>\n';
  html += '        <div class="tariffs-grid">\n';
  
  exampleTariffs.tariffs.forEach((tariff, index) => {
    html += `            <div class="tariff-card${tariff.isFeatured ? ' tariff-card--featured' : ''}">\n`;
    if (tariff.isFeatured && tariff.badgeText) {
      html += `                <div class="tariff-badge">${tariff.badgeText}</div>\n`;
    }
    html += '                <div class="tariff-card__header">\n';
    html += `                    <h3 class="tariff-card__title">${tariff.title}</h3>\n`;
    if (tariff.description) {
      html += `                    <p class="tariff-card__description">${tariff.description}</p>\n`;
    }
    html += '                    <div class="tariff-price">\n';
    html += `                        от <span class="tariff-price__amount">${tariff.price}</span> ₽\n`;
    html += `                        <span class="tariff-price__period">${tariff.pricePeriod}</span>\n`;
    html += '                    </div>\n';
    html += '                </div>\n';
    html += '                <ul class="tariff-features">\n';
    tariff.features.split('\n').forEach(feature => {
      if (feature.trim()) {
        html += `                    <li>${feature.trim()}</li>\n`;
      }
    });
    html += '                </ul>\n';
    html += '                <div class="tariff-card__footer">\n';
    html += `                    <button class="btn btn-primary btn-lg" onclick="document.getElementById('order-form').scrollIntoView({behavior: 'smooth'})">${tariff.buttonText}</button>\n`;
    html += '                </div>\n';
    html += '            </div>\n';
  });
  
  html += '        </div>\n';
  html += '    </div>\n';
  html += '</section>\n\n';
  
  // FAQ
  html += '<section class="service-faq">\n';
  html += '    <div class="container">\n';
  html += '        <h2>Часто задаваемые вопросы</h2>\n';
  html += '        <div class="faq-list">\n';
  
  exampleFAQ.items.forEach((item, index) => {
    html += `            <div class="faq-item">\n`;
    html += `                <button class="faq-question" type="button" aria-expanded="false" aria-controls="faq-answer-${index + 1}">\n`;
    html += `                    <span>${item.question}</span>\n`;
    html += '                    <span class="faq-icon" aria-hidden="true">\n';
    html += '                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n';
    html += '                            <path d="M6 9l6 6 6-6"></path>\n';
    html += '                        </svg>\n';
    html += '                    </span>\n';
    html += '                </button>\n';
    html += `                <div class="faq-answer" id="faq-answer-${index + 1}" aria-expanded="false">\n`;
    html += '                    <div class="faq-answer-content">\n';
    html += `                        ${item.answer}\n`;
    html += '                    </div>\n';
    html += '                </div>\n';
    html += '            </div>\n';
  });
  
  html += '        </div>\n';
  html += '    </div>\n';
  html += '</section>\n\n';
  
  // Форма заказа
  html += '<section class="service-order" id="order-form">\n';
  html += '    <div class="container">\n';
  html += `        <h2>${exampleOrderForm.title}</h2>\n`;
  html += `        <p>${exampleOrderForm.subtitle}</p>\n`;
  html += `        <form class="order-form" action="${exampleOrderForm.formAction}" method="${exampleOrderForm.formMethod}">\n`;
  html += '            <div class="order-form__group">\n';
  html += '                <label for="order-name" class="order-form__label">\n';
  html += '                    Ваше имя\n';
  html += '                    <span class="order-form__required" aria-label="обязательное поле">*</span>\n';
  html += '                </label>\n';
  html += '                <input type="text" id="order-name" name="name" class="order-form__input" required aria-required="true" aria-invalid="false" placeholder="Иван Иванов">\n';
  html += '            </div>\n';
  html += '            <div class="order-form__group">\n';
  html += '                <label for="order-phone" class="order-form__label">\n';
  html += '                    Телефон\n';
  html += '                    <span class="order-form__required" aria-label="обязательное поле">*</span>\n';
  html += '                </label>\n';
  html += '                <input type="tel" id="order-phone" name="phone" class="order-form__input" required aria-required="true" aria-invalid="false" placeholder="+7 (999) 123-45-67">\n';
  html += '            </div>\n';
  html += '            <div class="order-form__group">\n';
  html += '                <label for="order-email" class="order-form__label">\n';
  html += '                    Email\n';
  html += '                    <span class="order-form__required" aria-label="обязательное поле">*</span>\n';
  html += '                </label>\n';
  html += '                <input type="email" id="order-email" name="email" class="order-form__input" required aria-required="true" aria-invalid="false" placeholder="ivan@example.com">\n';
  html += '            </div>\n';
  html += '            <div class="order-form__group">\n';
  html += '                <label for="order-company" class="order-form__label">Название компании</label>\n';
  html += '                <input type="text" id="order-company" name="company" class="order-form__input" placeholder="ООО «Пример»">\n';
  html += '            </div>\n';
  html += '            <div class="order-form__group">\n';
  html += '                <label for="order-message" class="order-form__label">Сообщение</label>\n';
  html += '                <textarea id="order-message" name="message" class="order-form__textarea" rows="4" placeholder="Расскажите о ваших потребностях..."></textarea>\n';
  html += '            </div>\n';
  html += '            <div class="order-form__group">\n';
  html += '                <label class="order-form__label">\n';
  html += '                    <input type="checkbox" name="consent" required aria-required="true" style="margin-right: var(--spacing-xs);">\n';
  html += '                    Я согласен на обработку персональных данных\n';
  html += '                    <span class="order-form__required" aria-label="обязательное поле">*</span>\n';
  html += '                </label>\n';
  html += '            </div>\n';
  html += '            <button type="submit" class="btn btn-primary btn-lg order-form__submit">Отправить заявку</button>\n';
  html += '            <div class="order-form__success" role="alert" aria-live="polite">Спасибо! Ваша заявка принята. Мы свяжемся с вами в ближайшее время.</div>\n';
  html += '            <div class="order-form__error" role="alert" aria-live="assertive">Произошла ошибка. Пожалуйста, проверьте правильность заполнения полей.</div>\n';
  html += '        </form>\n';
  html += '    </div>\n';
  html += '</section>\n';
  
  return html;
}

// Сохраняем HTML для использования
const htmlContent = generateServiceComponentsHTML();
fs.writeFileSync('service-components-content.html', htmlContent, 'utf8');

console.log('='.repeat(70));
console.log('ГЕНЕРАЦИЯ КОНТЕНТА ДЛЯ СТРАНИЦ УСЛУГ');
console.log('='.repeat(70));
console.log(`\n✅ Создан файл: service-components-content.html`);
console.log(`\n📋 Список страниц услуг (${servicePages.length}):`);
servicePages.forEach((page, index) => {
  console.log(`   ${index + 1}. ${page.slug} - ${page.name}`);
});

console.log('\n📝 ИНСТРУКЦИЯ ПО ДОБАВЛЕНИЮ В STRAPI:');
console.log('   1. Откройте Strapi админ-панель: http://localhost:1337/admin');
console.log('   2. Перейдите в Content Manager → Pages');
console.log('   3. Для каждой страницы услуги:');
console.log('      - Откройте страницу для редактирования');
console.log('      - В поле "Content" (richtext) добавьте HTML из service-components-content.html');
console.log('      - Или используйте компоненты через Content-Type Builder');
console.log('   4. Опубликуйте страницы');

console.log('\n📄 Созданные компоненты Strapi:');
console.log('   ✅ page.service-tariffs');
console.log('   ✅ page.tariff-item');
console.log('   ✅ page.service-faq');
console.log('   ✅ page.faq-item');
console.log('   ✅ page.service-order-form');

console.log('\n' + '='.repeat(70));



