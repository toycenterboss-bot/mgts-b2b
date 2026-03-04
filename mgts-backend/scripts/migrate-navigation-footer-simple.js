/**
 * Упрощенный скрипт миграции для JSON полей
 * Использование: node scripts/migrate-navigation-footer-simple.js
 */

const axios = require('axios');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

const api = axios.create({
  baseURL: `${STRAPI_URL}/api`,
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function migrateNavigation() {
  try {
    const navigationData = {
      logoAlt: 'МГТС',
      phone: '+78002500250',
      phoneDisplay: '8 800 250-0-250',
      mainMenuItems: [],
      megaMenus: []
    };

    console.log('[Migration] Creating/updating Navigation...');
    await api.put('/navigation', { data: navigationData });
    console.log('[Migration] ✅ Navigation created/updated');
    return true;
  } catch (error) {
    console.error('[Migration] ❌ Error:', error.response?.data || error.message);
    return false;
  }
}

async function migrateFooter() {
  try {
    const footerData = {
      copyright: '© 2025 МГТС. Все права защищены.'
    };

    console.log('[Migration] Creating/updating Footer...');
    await api.put('/footer', { data: footerData });
    console.log('[Migration] ✅ Footer created/updated');
    return true;
  } catch (error) {
    console.error('[Migration] ❌ Error:', error.response?.data || error.message);
    return false;
  }
}

async function main() {
  console.log('[Migration] Starting simplified migration...\n');
  const navSuccess = await migrateNavigation();
  console.log('');
  const footerSuccess = await migrateFooter();
  
  console.log('\n[Migration] Completed!');
  console.log(`  Navigation: ${navSuccess ? '✅' : '❌'}`);
  console.log(`  Footer: ${footerSuccess ? '✅' : '❌'}`);
  
  if (navSuccess && footerSuccess) {
    console.log('\n✅ Migration successful!');
    console.log('📝 Next: Fill Navigation and Footer data via admin panel');
    console.log('   http://localhost:1337/admin');
  }
}

main().catch(console.error);
