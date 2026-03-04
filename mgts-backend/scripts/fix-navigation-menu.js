const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;
const fetch = globalThis.fetch;

async function fixNavigationMenu() {
    console.log('=== ИСПРАВЛЕНИЕ ГЛАВНОГО МЕНЮ ===\n');
    
    // Получаем текущие данные навигации
    const getUrl = `${STRAPI_URL}/api/navigation?populate=*`;
    const getRes = await fetch(getUrl, {
        headers: {
            'Authorization': `Bearer ${API_TOKEN}`
        }
    });
    
    const currentData = await getRes.json();
    console.log('Текущие данные навигации получены');
    
    const navigation = currentData.data;
    
    // Обновляем servicesMenu - добавляем "Цифровое ТВ"
    const servicesMenu = navigation.megaMenus.find(m => m.id === 'servicesMenu');
    if (servicesMenu) {
        // Проверяем, есть ли уже секция "Цифровое ТВ"
        const tvSection = servicesMenu.sections.find(s => s.title === 'Цифровое ТВ' || s.titleHref === 'business/tv/index.html');
        if (!tvSection) {
            console.log('Добавляем секцию "Цифровое ТВ" в меню "Услуги"');
            servicesMenu.sections.push({
                title: 'Цифровое ТВ',
                titleHref: 'business/tv/index.html',
                description: null,
                links: [
                    { label: 'IPTV для бизнеса', href: 'business/tv/iptv/index.html', isExternal: false },
                    { label: 'Корпоративное ТВ', href: 'business/tv/office/index.html', isExternal: false }
                ]
            });
        } else {
            console.log('Секция "Цифровое ТВ" уже существует');
        }
    }
    
    // Обновляем segmentsMenu - добавляем "Госсектор"
    const segmentsMenu = navigation.megaMenus.find(m => m.id === 'segmentsMenu');
    if (segmentsMenu) {
        // Проверяем, есть ли уже секция "Госсектор"
        const govSection = segmentsMenu.sections.find(s => s.title === 'Госсектор' || s.titleHref === 'government/index.html');
        if (!govSection) {
            console.log('Добавляем секцию "Госсектор" в меню "Сегменты"');
            segmentsMenu.sections.push({
                title: 'Госсектор',
                titleHref: 'government/index.html',
                description: 'Решения для государственных организаций',
                links: [
                    { label: 'Госсектор', href: 'government/index.html', isExternal: false }
                ]
            });
        } else {
            console.log('Секция "Госсектор" уже существует');
        }
    }
    
    // Обновляем aboutMenu - добавляем "Корпоративное управление"
    const aboutMenu = navigation.megaMenus.find(m => m.id === 'aboutMenu');
    if (aboutMenu) {
        // Проверяем, есть ли уже секция "Корпоративное управление"
        const govSection = aboutMenu.sections.find(s => s.title === 'Корпоративное управление' || s.titleHref === 'about/governance/index.html');
        if (!govSection) {
            console.log('Добавляем секцию "Корпоративное управление" в меню "О компании"');
            aboutMenu.sections.push({
                title: 'Корпоративное управление',
                titleHref: 'about/governance/index.html',
                description: null,
                links: [
                    { label: 'Принципы корпоративного управления', href: 'about/governance/principles/index.html', isExternal: false },
                    { label: 'Корпоративные документы', href: 'about/governance/documents/index.html', isExternal: false },
                    { label: 'Решения собраний акционеров', href: 'about/governance/shareholders/index.html', isExternal: false },
                    { label: 'Раскрытие информации', href: 'about/governance/infoformen/index.html', isExternal: false },
                    { label: 'О регистраторе', href: 'about/governance/registrar/index.html', isExternal: false }
                ]
            });
        } else {
            console.log('Секция "Корпоративное управление" уже существует');
        }
    }
    
    // Обновляем навигацию в Strapi
    // Navigation - это Single Type, поэтому используем PUT без ID
    const updateUrl = `${STRAPI_URL}/api/navigation`;
    const updateData = {
        data: {
            mainMenuItems: navigation.mainMenuItems,
            megaMenus: navigation.megaMenus,
            phone: navigation.phone,
            phoneDisplay: navigation.phoneDisplay,
            logoAlt: navigation.logoAlt
        }
    };
    
    console.log('\nОбновляем навигацию в Strapi...');
    const updateRes = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${API_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
    });
    
    if (updateRes.ok) {
        const result = await updateRes.json();
        console.log('✅ Навигация успешно обновлена!');
        console.log('\nОбновленные секции:');
        console.log('- Цифровое ТВ добавлено в меню "Услуги"');
        console.log('- Госсектор добавлен в меню "Сегменты"');
        console.log('- Корпоративное управление добавлено в меню "О компании"');
    } else {
        const error = await updateRes.text();
        console.error('❌ Ошибка при обновлении навигации:', error);
    }
}

fixNavigationMenu().catch(console.error);

