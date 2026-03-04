/**
 * Анализ иерархии классов в HTML структуре
 * Определение правил вложенности классов
 */

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

if (!API_TOKEN) {
  console.error("\n❌ Ошибка: Необходимо установить STRAPI_API_TOKEN (Settings → API Tokens → Full access)");
  console.error("   Пример: export STRAPI_API_TOKEN="your_token_here"\n");
  process.exit(1);
}


/**
 * Получить все страницы из Strapi
 */
async function getAllPages() {
    const response = await fetch(`${STRAPI_URL}/api/pages?pagination[pageSize]=100&populate=*`, {
        headers: {
            'Authorization': `Bearer ${API_TOKEN}`,
            'Content-Type': 'application/json'
        }
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data || [];
}

/**
 * Найти родительский элемент с классом
 */
function findParentWithClass(element, className) {
    // Простой поиск в HTML строке
    const regex = new RegExp(`<([^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*)>([\\s\\S]*?)<div[^>]*class=["'][^"']*\\b${element.classes[0]}\\b`, 'i');
    return null; // Упрощенная версия
}

/**
 * Анализ иерархии классов
 */
function analyzeHierarchy(html) {
    const hierarchy = {
        card: { insideGrid: 0, insideGridItem: 0, standalone: 0, insideCardBody: 0 },
        gridItem: { insideGrid: 0, standalone: 0 },
        cardBody: { insideCard: 0, standalone: 0 },
        tariffCard: { insideTariffsGrid: 0, standalone: 0 },
        tariffCardHeader: { insideTariffCard: 0, standalone: 0 },
        tariffPrice: { insideTariffCardHeader: 0, insideTariffCard: 0, standalone: 0 },
        faqItem: { insideFaqList: 0, standalone: 0 },
        faqAnswer: { insideFaqItem: 0, standalone: 0 },
        faqAnswerContent: { insideFaqAnswer: 0, standalone: 0 }
    };
    
    // Найти все секции
    const sectionRegex = /<section[^>]*>([\s\S]*?)<\/section>/gi;
    let sectionMatch;
    
    while ((sectionMatch = sectionRegex.exec(html)) !== null) {
        const sectionContent = sectionMatch[1];
        
        // Найти container
        const containerMatch = sectionContent.match(/<div[^>]*class=["'][^"']*container[^"']*["'][^>]*>([\s\S]*?)<\/div>/is);
        
        if (containerMatch) {
            const containerContent = containerMatch[1];
            
            // Анализ card
            const cardRegex = /<div[^>]*class=["'][^"']*\bcard\b[^"']*["'][^>]*>/gi;
            let cardMatch;
            
            while ((cardMatch = cardRegex.exec(containerContent)) !== null) {
                const cardIndex = cardMatch.index;
                const beforeCard = containerContent.substring(0, cardIndex);
                
                // Проверить, находится ли card внутри grid
                const gridBefore = beforeCard.lastIndexOf('<div');
                const gridMatch = beforeCard.match(/<div[^>]*class=["'][^"']*\bgrid\b[^"']*["'][^>]*>/i);
                
                if (gridMatch) {
                    // Проверить, есть ли grid-item между grid и card
                    const afterGrid = containerContent.substring(gridMatch.index + gridMatch[0].length, cardIndex);
                    if (afterGrid.includes('grid-item')) {
                        hierarchy.card.insideGridItem++;
                    } else {
                        hierarchy.card.insideGrid++;
                    }
                } else {
                    // Проверить, есть ли card-body перед card
                    if (beforeCard.includes('card-body')) {
                        hierarchy.card.insideCardBody++;
                    } else {
                        hierarchy.card.standalone++;
                    }
                }
            }
            
            // Анализ grid-item
            const gridItemRegex = /<div[^>]*class=["'][^"']*\bgrid-item\b[^"']*["'][^>]*>/gi;
            let gridItemMatch;
            
            while ((gridItemMatch = gridItemRegex.exec(containerContent)) !== null) {
                const gridItemIndex = gridItemMatch.index;
                const beforeGridItem = containerContent.substring(0, gridItemIndex);
                
                if (beforeGridItem.match(/<div[^>]*class=["'][^"']*\bgrid\b[^"']*["'][^>]*>/i)) {
                    hierarchy.gridItem.insideGrid++;
                } else {
                    hierarchy.gridItem.standalone++;
                }
            }
            
            // Анализ card-body
            const cardBodyRegex = /<div[^>]*class=["'][^"']*\bcard-body\b[^"']*["'][^>]*>/gi;
            let cardBodyMatch;
            
            while ((cardBodyMatch = cardBodyRegex.exec(containerContent)) !== null) {
                const cardBodyIndex = cardBodyMatch.index;
                const beforeCardBody = containerContent.substring(0, cardBodyIndex);
                
                // Найти ближайший card перед card-body
                const cardBefore = beforeCardBody.lastIndexOf('<div');
                const cardMatchBefore = beforeCardBody.match(/<div[^>]*class=["'][^"']*\bcard\b[^"']*["'][^>]*>/i);
                
                if (cardMatchBefore) {
                    hierarchy.cardBody.insideCard++;
                } else {
                    hierarchy.cardBody.standalone++;
                }
            }
            
            // Анализ tariff-card
            const tariffCardRegex = /<div[^>]*class=["'][^"']*\btariff-card\b[^"']*["'][^>]*>/gi;
            let tariffCardMatch;
            
            while ((tariffCardMatch = tariffCardRegex.exec(containerContent)) !== null) {
                const tariffCardIndex = tariffCardMatch.index;
                const beforeTariffCard = containerContent.substring(0, tariffCardIndex);
                
                if (beforeTariffCard.match(/<div[^>]*class=["'][^"']*\btariffs-grid\b[^"']*["'][^>]*>/i)) {
                    hierarchy.tariffCard.insideTariffsGrid++;
                } else {
                    hierarchy.tariffCard.standalone++;
                }
            }
            
            // Анализ tariff-card__header
            const tariffHeaderRegex = /<div[^>]*class=["'][^"']*\btariff-card__header\b[^"']*["'][^>]*>/gi;
            let tariffHeaderMatch;
            
            while ((tariffHeaderMatch = tariffHeaderRegex.exec(containerContent)) !== null) {
                const tariffHeaderIndex = tariffHeaderMatch.index;
                const beforeTariffHeader = containerContent.substring(0, tariffHeaderIndex);
                
                // Найти ближайший tariff-card перед header
                const tariffCardBefore = beforeTariffHeader.match(/<div[^>]*class=["'][^"']*\btariff-card\b[^"']*["'][^>]*>/i);
                
                if (tariffCardBefore) {
                    hierarchy.tariffCardHeader.insideTariffCard++;
                } else {
                    hierarchy.tariffCardHeader.standalone++;
                }
            }
            
            // Анализ tariff-price
            const tariffPriceRegex = /<div[^>]*class=["'][^"']*\btariff-price\b[^"']*["'][^>]*>/gi;
            let tariffPriceMatch;
            
            while ((tariffPriceMatch = tariffPriceRegex.exec(containerContent)) !== null) {
                const tariffPriceIndex = tariffPriceMatch.index;
                const beforeTariffPrice = containerContent.substring(0, tariffPriceIndex);
                
                if (beforeTariffPrice.match(/<div[^>]*class=["'][^"']*\btariff-card__header\b[^"']*["'][^>]*>/i)) {
                    hierarchy.tariffPrice.insideTariffCardHeader++;
                } else if (beforeTariffPrice.match(/<div[^>]*class=["'][^"']*\btariff-card\b[^"']*["'][^>]*>/i)) {
                    hierarchy.tariffPrice.insideTariffCard++;
                } else {
                    hierarchy.tariffPrice.standalone++;
                }
            }
            
            // Анализ faq-item
            const faqItemRegex = /<div[^>]*class=["'][^"']*\bfaq-item\b[^"']*["'][^>]*>/gi;
            let faqItemMatch;
            
            while ((faqItemMatch = faqItemRegex.exec(containerContent)) !== null) {
                const faqItemIndex = faqItemMatch.index;
                const beforeFaqItem = containerContent.substring(0, faqItemIndex);
                
                if (beforeFaqItem.match(/<div[^>]*class=["'][^"']*\bfaq-list\b[^"']*["'][^>]*>/i)) {
                    hierarchy.faqItem.insideFaqList++;
                } else {
                    hierarchy.faqItem.standalone++;
                }
            }
            
            // Анализ faq-answer
            const faqAnswerRegex = /<div[^>]*class=["'][^"']*\bfaq-answer\b[^"']*["'][^>]*>/gi;
            let faqAnswerMatch;
            
            while ((faqAnswerMatch = faqAnswerRegex.exec(containerContent)) !== null) {
                const faqAnswerIndex = faqAnswerMatch.index;
                const beforeFaqAnswer = containerContent.substring(0, faqAnswerIndex);
                
                if (beforeFaqAnswer.match(/<div[^>]*class=["'][^"']*\bfaq-item\b[^"']*["'][^>]*>/i)) {
                    hierarchy.faqAnswer.insideFaqItem++;
                } else {
                    hierarchy.faqAnswer.standalone++;
                }
            }
            
            // Анализ faq-answer-content
            const faqAnswerContentRegex = /<div[^>]*class=["'][^"']*\bfaq-answer-content\b[^"']*["'][^>]*>/gi;
            let faqAnswerContentMatch;
            
            while ((faqAnswerContentMatch = faqAnswerContentRegex.exec(containerContent)) !== null) {
                const faqAnswerContentIndex = faqAnswerContentMatch.index;
                const beforeFaqAnswerContent = containerContent.substring(0, faqAnswerContentIndex);
                
                if (beforeFaqAnswerContent.match(/<div[^>]*class=["'][^"']*\bfaq-answer\b[^"']*["'][^>]*>/i)) {
                    hierarchy.faqAnswerContent.insideFaqAnswer++;
                } else {
                    hierarchy.faqAnswerContent.standalone++;
                }
            }
        }
    }
    
    return hierarchy;
}

/**
 * Основная функция
 */
async function analyzeAllHierarchies() {
    try {
        console.log('\n=== АНАЛИЗ ИЕРАРХИИ КЛАССОВ ===\n');
        
        console.log('Получение списка страниц из Strapi...');
        const pages = await getAllPages();
        console.log(`✅ Найдено страниц: ${pages.length}\n`);
        
        const totalHierarchy = {
            card: { insideGrid: 0, insideGridItem: 0, standalone: 0, insideCardBody: 0 },
            gridItem: { insideGrid: 0, standalone: 0 },
            cardBody: { insideCard: 0, standalone: 0 },
            tariffCard: { insideTariffsGrid: 0, standalone: 0 },
            tariffCardHeader: { insideTariffCard: 0, standalone: 0 },
            tariffPrice: { insideTariffCardHeader: 0, insideTariffCard: 0, standalone: 0 },
            faqItem: { insideFaqList: 0, standalone: 0 },
            faqAnswer: { insideFaqItem: 0, standalone: 0 },
            faqAnswerContent: { insideFaqAnswer: 0, standalone: 0 }
        };
        
        for (const page of pages) {
            const slug = page.attributes?.slug || page.slug;
            const content = page.attributes?.content || page.content || '';
            
            if (!content || content.trim().length < 50) {
                continue;
            }
            
            const hierarchy = analyzeHierarchy(content);
            
            // Суммировать результаты
            Object.keys(totalHierarchy).forEach(key => {
                Object.keys(totalHierarchy[key]).forEach(subKey => {
                    totalHierarchy[key][subKey] += hierarchy[key][subKey] || 0;
                });
            });
        }
        
        // Вывести результаты
        console.log('📊 РЕЗУЛЬТАТЫ АНАЛИЗА ИЕРАРХИИ:\n');
        
        console.log('🔹 .card');
        console.log(`   Внутри .grid: ${totalHierarchy.card.insideGrid}`);
        console.log(`   Внутри .grid-item: ${totalHierarchy.card.insideGridItem}`);
        console.log(`   Внутри .card-body: ${totalHierarchy.card.insideCardBody}`);
        console.log(`   Отдельно: ${totalHierarchy.card.standalone}`);
        const cardTotal = totalHierarchy.card.insideGrid + totalHierarchy.card.insideGridItem + totalHierarchy.card.standalone + totalHierarchy.card.insideCardBody;
        console.log(`   Всего: ${cardTotal}\n`);
        
        console.log('🔹 .grid-item');
        console.log(`   Внутри .grid: ${totalHierarchy.gridItem.insideGrid}`);
        console.log(`   Отдельно: ${totalHierarchy.gridItem.standalone}`);
        const gridItemTotal = totalHierarchy.gridItem.insideGrid + totalHierarchy.gridItem.standalone;
        console.log(`   Всего: ${gridItemTotal}\n`);
        
        console.log('🔹 .card-body');
        console.log(`   Внутри .card: ${totalHierarchy.cardBody.insideCard}`);
        console.log(`   Отдельно: ${totalHierarchy.cardBody.standalone}`);
        const cardBodyTotal = totalHierarchy.cardBody.insideCard + totalHierarchy.cardBody.standalone;
        console.log(`   Всего: ${cardBodyTotal}\n`);
        
        console.log('🔹 .tariff-card');
        console.log(`   Внутри .tariffs-grid: ${totalHierarchy.tariffCard.insideTariffsGrid}`);
        console.log(`   Отдельно: ${totalHierarchy.tariffCard.standalone}`);
        const tariffCardTotal = totalHierarchy.tariffCard.insideTariffsGrid + totalHierarchy.tariffCard.standalone;
        console.log(`   Всего: ${tariffCardTotal}\n`);
        
        console.log('🔹 .tariff-card__header');
        console.log(`   Внутри .tariff-card: ${totalHierarchy.tariffCardHeader.insideTariffCard}`);
        console.log(`   Отдельно: ${totalHierarchy.tariffCardHeader.standalone}`);
        const tariffHeaderTotal = totalHierarchy.tariffCardHeader.insideTariffCard + totalHierarchy.tariffCardHeader.standalone;
        console.log(`   Всего: ${tariffHeaderTotal}\n`);
        
        console.log('🔹 .tariff-price');
        console.log(`   Внутри .tariff-card__header: ${totalHierarchy.tariffPrice.insideTariffCardHeader}`);
        console.log(`   Внутри .tariff-card: ${totalHierarchy.tariffPrice.insideTariffCard}`);
        console.log(`   Отдельно: ${totalHierarchy.tariffPrice.standalone}`);
        const tariffPriceTotal = totalHierarchy.tariffPrice.insideTariffCardHeader + totalHierarchy.tariffPrice.insideTariffCard + totalHierarchy.tariffPrice.standalone;
        console.log(`   Всего: ${tariffPriceTotal}\n`);
        
        console.log('🔹 .faq-item');
        console.log(`   Внутри .faq-list: ${totalHierarchy.faqItem.insideFaqList}`);
        console.log(`   Отдельно: ${totalHierarchy.faqItem.standalone}`);
        const faqItemTotal = totalHierarchy.faqItem.insideFaqList + totalHierarchy.faqItem.standalone;
        console.log(`   Всего: ${faqItemTotal}\n`);
        
        console.log('🔹 .faq-answer');
        console.log(`   Внутри .faq-item: ${totalHierarchy.faqAnswer.insideFaqItem}`);
        console.log(`   Отдельно: ${totalHierarchy.faqAnswer.standalone}`);
        const faqAnswerTotal = totalHierarchy.faqAnswer.insideFaqItem + totalHierarchy.faqAnswer.standalone;
        console.log(`   Всего: ${faqAnswerTotal}\n`);
        
        console.log('🔹 .faq-answer-content');
        console.log(`   Внутри .faq-answer: ${totalHierarchy.faqAnswerContent.insideFaqAnswer}`);
        console.log(`   Отдельно: ${totalHierarchy.faqAnswerContent.standalone}`);
        const faqAnswerContentTotal = totalHierarchy.faqAnswerContent.insideFaqAnswer + totalHierarchy.faqAnswerContent.standalone;
        console.log(`   Всего: ${faqAnswerContentTotal}\n`);
        
        // Сохранить результаты
        const fs = require('fs');
        const path = require('path');
        const reportPath = path.join(__dirname, '../../class-hierarchy-report.json');
        
        fs.writeFileSync(reportPath, JSON.stringify(totalHierarchy, null, 2), 'utf8');
        console.log(`📄 Детальный отчет сохранен в: ${reportPath}\n`);
        
        return totalHierarchy;
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

analyzeAllHierarchies();


