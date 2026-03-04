const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

function normalize(value) {
    return (value || '').replace(/\s+/g, ' ').trim();
}

function loadSidebarLinksFromSpec(outputDir, slug) {
    const filePath = path.join(outputDir, `${slug}_spec.json`);
    if (!fs.existsSync(filePath)) return [];
    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const sections = data.sections || [];
        const sidebar = sections.find(section => (
            section.type === 'sidebar' ||
            section.type === 'sidebar-menu' ||
            section.type === 'sidebar_menu'
        ));
        const links = sidebar?.links?.internalLinks || [];
        return links
            .map(link => ({
                text: normalize(link.text || ''),
                href: link.href || ''
            }))
            .filter(link => link.text || link.href);
    } catch {
        return [];
    }
}

async function main() {
    const outputDir = path.join(__dirname, '..', 'temp', 'page-analysis-llm');
    fs.mkdirSync(outputDir, { recursive: true });
    const url = 'https://business.mgts.ru';
    const verbose = process.env.MENU_DEBUG === '1';

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 }
    });

    try {
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.evaluate(() => {
            document.addEventListener('click', (event) => {
                const target = event.target;
                const guarded = target && target.closest && target.closest('[data-no-nav="1"]');
                if (guarded) {
                    event.preventDefault();
                }
            }, true);
        });

        const menu = await page.evaluate(() => {
            const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
            const isVisible = (el) => {
                const style = window.getComputedStyle(el);
                const rect = el.getBoundingClientRect();
                return style.visibility !== 'hidden' &&
                    style.display !== 'none' &&
                    rect.width > 0 &&
                    rect.height > 0;
            };

            const collectLinks = (root) => Array.from(root.querySelectorAll('a'))
                .filter(a => isVisible(a))
                .map(a => ({
                    text: normalize(a.textContent || ''),
                    href: a.getAttribute('href') || ''
                }))
                .filter(link => link.text || link.href);

            const header = document.querySelector('header, [role="banner"], .header, .site-header');
            const nav = header ? header.querySelector('nav') : document.querySelector('nav');
            const headerLinks = header ? collectLinks(header) : [];

            const blocks = [];
            if (nav) {
                const topRow = nav.querySelector('.nav-company-menu');
                if (topRow) {
                    blocks.push({
                        title: 'top_company_menu',
                        links: collectLinks(topRow)
                    });
                }

                const bottomRow = nav.querySelector('.nav-menu__bottom-row');
                if (bottomRow) {
                    blocks.push({
                        title: 'main_categories',
                        links: collectLinks(bottomRow)
                    });
                }

                const search = nav.querySelector('.nav-search');
                if (search) {
                    blocks.push({
                        title: 'search',
                        text: normalize(search.textContent || '')
                    });
                }
            }

            return {
                headerLinks,
                blocks
            };
        });

        const footer = await page.evaluate(() => {
            const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
            const isVisible = (el) => {
                const style = window.getComputedStyle(el);
                const rect = el.getBoundingClientRect();
                return style.visibility !== 'hidden' &&
                    style.display !== 'none' &&
                    rect.width > 0 &&
                    rect.height > 0;
            };
            const footerEl = document.querySelector('footer, .footer');
            if (!footerEl) return null;

            const collectLinks = (root) => Array.from(root.querySelectorAll('a'))
                .filter(a => isVisible(a))
                .map(a => ({
                    text: normalize(a.textContent || ''),
                    href: a.getAttribute('href') || ''
                }))
                .filter(link => link.text || link.href);

            const rowItems = Array.from(footerEl.querySelectorAll('.middle-footer-row .footer-menu-item'))
                .map(item => {
                    const text = normalize(item.textContent || '');
                    const href = item.getAttribute('href') || '';
                    return { text, href };
                })
                .filter(link => link.text || link.href);

            const columns = Array.from(footerEl.querySelectorAll('.top-footer__menu-columns .footer-menu-column, .footer-menu-column'))
                .map(col => {
                    const titleEl = col.querySelector('.footer-menu-column__title, .footer-menu-title, h3, h4');
                    const title = normalize(titleEl ? titleEl.textContent : '');
                    const links = collectLinks(col);
                    return { title, links };
                })
                .filter(col => col.title || col.links.length > 0);

            return {
                rowItems,
                columns,
                dropdownMenus: []
            };
        });

        const collectCompanyMenu = async () => {
            const companyLink = await page.$('.nav-company-menu__left-section a, .nav-company-menu a');
            if (!companyLink) return null;
            try {
                await page.evaluate(el => el.setAttribute('data-no-nav', '1'), companyLink);
                await companyLink.click();
            } catch {
                // ignore click failures
            }
            await new Promise(resolve => setTimeout(resolve, 400));

            const data = await page.evaluate(() => {
                const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
                const isVisible = (el) => {
                    const style = window.getComputedStyle(el);
                    const rect = el.getBoundingClientRect();
                    return style.visibility !== 'hidden' &&
                        style.display !== 'none' &&
                        rect.width > 0 &&
                        rect.height > 0;
                };
                const container = document.querySelector('.menu-list-container');
                if (!container) return { groups: [], items: [] };

                const items = Array.from(container.querySelectorAll('a.menu-url-item'))
                    .map(a => ({
                        text: normalize(a.textContent || ''),
                        href: a.getAttribute('href') || ''
                    }))
                    .filter(link => link.text || link.href);

                const groups = Array.from(container.querySelectorAll('.dropdown-submenu-list'))
                    .map(el => {
                        const titleEl = el.querySelector('.submenu-select-text');
                        const title = normalize(titleEl ? titleEl.textContent : '');
                        const links = Array.from(el.querySelectorAll('.submenu-list-container a'))
                            .map(a => ({
                                text: normalize(a.textContent || ''),
                                href: a.getAttribute('href') || ''
                            }))
                            .filter(link => link.text || link.href);
                        return { title, items: links };
                    })
                    .filter(group => group.title || group.items.length > 0);

                return { groups, items };
            });

            if (!data.items.length && !data.groups.length) return null;
            const groups = data.groups.map(group => ({
                title: group.title || '(без текста)',
                href: '',
                items: group.items || []
            }));
            const standalone = data.items;
            return {
                label: 'О компании',
                groups,
                items: standalone
            };
        };

        const collectCardsOnPage = async (targetPage) => targetPage.evaluate(() => {
            const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
            const isVisible = (el) => {
                const style = window.getComputedStyle(el);
                const rect = el.getBoundingClientRect();
                return style.visibility !== 'hidden' &&
                    style.display !== 'none' &&
                    rect.width > 0 &&
                    rect.height > 0;
            };
            const dropdown = document.querySelector('.menu-dropdown-block-wrapper');
            if (!dropdown || !isVisible(dropdown)) {
                return [];
            }
            return Array.from(dropdown.querySelectorAll('.info-container__cards-menu a'))
                .filter(a => isVisible(a))
                .map(a => ({
                    text: normalize(a.textContent || ''),
                    href: a.getAttribute('href') || ''
                }))
                .filter(link => link.text || link.href);
        });

        const collectLineMenusOnPage = async (targetPage) => {
            const lineItems = await targetPage.$$('.menu-dropdown-block-wrapper .info-container__cards-menu .line-menu .line-menu-item');
            const lineMenus = [];
            let prevKey = '';
            if (lineItems.length > 0) {
                for (let j = 0; j < lineItems.length; j += 1) {
                    const linesNow = await targetPage.$$('.menu-dropdown-block-wrapper .info-container__cards-menu .line-menu .line-menu-item');
                    const line = linesNow[j];
                    const lineText = normalize(await targetPage.evaluate(el => el.textContent || '', line));
                    try {
                        await line.click();
                    } catch {
                        // ignore click failures
                    }
                    await new Promise(resolve => setTimeout(resolve, 250));
                    const cards = await collectCardsOnPage(targetPage);
                    const key = JSON.stringify(cards);
                    if (!prevKey || key !== prevKey) {
                        prevKey = key;
                    }
                    lineMenus.push({
                        text: lineText || `(line_${j + 1})`,
                        cards
                    });
                }
            } else {
                const cards = await collectCardsOnPage(targetPage);
                lineMenus.push({
                    text: '(default)',
                    cards
                });
            }
            return lineMenus;
        };

        const collectFromLinkedPage = async (mainLabel, selectorMeta) => {
            if (!selectorMeta.href) return null;
            const target = selectorMeta.href.startsWith('http')
                ? selectorMeta.href
                : new URL(selectorMeta.href, url).toString();
            const targetPage = await browser.newPage();
            try {
                await targetPage.goto(target, { waitUntil: 'networkidle2', timeout: 30000 });
                const mainItems = await targetPage.$$('.nav-menu__bottom-row .menu-item.navbar-menu-item, .nav-menu__bottom-row .menu-item');
                let mainItem = null;
                for (const item of mainItems) {
                    const text = normalize(await targetPage.evaluate(el => el.textContent || '', item));
                    if (text.includes(mainLabel)) {
                        mainItem = item;
                        break;
                    }
                }
                if (mainItem) {
                    await mainItem.hover().catch(() => {});
                    await new Promise(resolve => setTimeout(resolve, 400));
                }
                const selectorHandles = await targetPage.$$('.menu-dropdown-block-wrapper .info-container__selectors .selector-item');
                for (const sel of selectorHandles) {
                    const href = await targetPage.evaluate(el => el.getAttribute('href') || '', sel);
                    const text = normalize(await targetPage.evaluate(el => el.textContent || '', sel));
                    if ((selectorMeta.href && href === selectorMeta.href) ||
                        (selectorMeta.text && text.includes(selectorMeta.text))) {
                        await sel.click().catch(() => {});
                        await new Promise(resolve => setTimeout(resolve, 300));
                        break;
                    }
                }
                const lineMenus = await collectLineMenusOnPage(targetPage);
                return lineMenus;
            } finally {
                await targetPage.close();
            }
        };

        const mainItems = await page.$$('.nav-menu__bottom-row .menu-item.navbar-menu-item, .nav-menu__bottom-row .menu-item');
        const mainMenu = [];
        for (const item of mainItems) {
            const label = normalize(await page.evaluate(el => el.textContent || '', item));
            const href = await page.evaluate(el => {
                const link = el.tagName === 'A' ? el : el.querySelector('a');
                return link ? (link.getAttribute('href') || '') : '';
            }, item);
            if (verbose) {
                console.log(`\n[MAIN] ${label || '(без текста)'} ${href || ''}`);
            }

            try {
                await item.hover();
            } catch {
                // ignore hover failures
            }
            await new Promise(resolve => setTimeout(resolve, 300));

            const collectCards = async () => collectCardsOnPage(page);

            const waitForCardsChange = async (prevKey) => {
                for (let attempt = 0; attempt < 6; attempt += 1) {
                    const cards = await collectCards();
                    const key = JSON.stringify(cards);
                    if (!prevKey || key !== prevKey) {
                        return { cards, key };
                    }
                    await new Promise(resolve => setTimeout(resolve, 120));
                }
                const cards = await collectCards();
                return { cards, key: JSON.stringify(cards) };
            };

            const getSelectorHandles = async () => page.$$('.menu-dropdown-block-wrapper .info-container__selectors .selector-item');
            const selectorGroups = [];

            const selectorHandles = await getSelectorHandles();
            if (selectorHandles.length > 0) {
                if (verbose) {
                    console.log(`[MAIN] selectors: ${selectorHandles.length}`);
                }
                let prevSelectorCardsKey = '';
                for (let i = 0; i < selectorHandles.length; i += 1) {
                    const selectorsNow = await getSelectorHandles();
                    const selector = selectorsNow[i];
                    try {
                        await page.evaluate(el => el.setAttribute('data-no-nav', '1'), selector);
                        await selector.hover();
                        await selector.click();
                        await page.evaluate(el => el.classList.add('force-active'), selector);
                    } catch {
                        // ignore click failures
                    }
                    await new Promise(resolve => setTimeout(resolve, 250));
                    await page.waitForFunction((index) => {
                        const nodes = Array.from(document.querySelectorAll('.menu-dropdown-block-wrapper .info-container__selectors .selector-item'));
                        const node = nodes[index];
                        if (!node) return false;
                        return node.classList.contains('active') || node.getAttribute('aria-selected') === 'true';
                    }, { timeout: 1500 }).catch(() => {});
                    const selectorCards = await waitForCardsChange(prevSelectorCardsKey);
                    prevSelectorCardsKey = selectorCards.key;
                    const selectorMeta = await page.evaluate(el => ({
                        text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
                        href: el.getAttribute('href') || ''
                    }), selector);
                    if (verbose) {
                        console.log(`[L2] ${selectorMeta.text || `(selector_${i + 1})`}`);
                    }

                    const getLineItems = async () => page.$$('.menu-dropdown-block-wrapper .info-container__cards-menu .line-menu .line-menu-item');
                    const lineItems = await getLineItems();
                    const lineMenus = [];
                    let prevCardsKey = '';
                    if (lineItems.length > 0) {
                        if (verbose) {
                            console.log(`[L2] line menus: ${lineItems.length}`);
                        }
                        for (let j = 0; j < lineItems.length; j += 1) {
                            const linesNow = await getLineItems();
                            const line = linesNow[j];
                            const lineText = normalize(await page.evaluate(el => el.textContent || '', line));
                            try {
                                await page.evaluate(el => el.setAttribute('data-no-nav', '1'), line);
                                await line.click();
                            } catch {
                                // ignore click failures
                            }
                            await new Promise(resolve => setTimeout(resolve, 250));
                            await page.waitForFunction((index) => {
                                const nodes = Array.from(document.querySelectorAll('.menu-dropdown-block-wrapper .info-container__cards-menu .line-menu .line-menu-item'));
                                const node = nodes[index];
                                if (!node) return false;
                                return node.classList.contains('active') || node.getAttribute('aria-selected') === 'true';
                            }, { timeout: 1500 }).catch(() => {});
                            const { cards, key } = await waitForCardsChange(prevCardsKey);
                            prevCardsKey = key;
                            if (verbose) {
                                const sample = cards.slice(0, 3).map(card => card.text).join(' | ');
                                console.log(`[L3] ${lineText || `(line_${j + 1})`} -> cards: ${cards.length} (${sample})`);
                            }
                            lineMenus.push({
                                text: lineText || `(line_${j + 1})`,
                                cards
                            });
                        }
                    } else {
                        const { cards } = await waitForCardsChange('');
                        if (verbose) {
                            const sample = cards.slice(0, 3).map(card => card.text).join(' | ');
                            console.log(`[L3] default -> cards: ${cards.length} (${sample})`);
                        }
                        lineMenus.push({
                            text: '(default)',
                            cards
                        });
                    }

                    const isStaticCards = lineMenus.length === 1 &&
                        lineMenus[0].text === '(default)' &&
                        prevSelectorCardsKey === selectorCards.key &&
                        selectorMeta.href;

                    if (isStaticCards) {
                        const linkedMenus = await collectFromLinkedPage(label, selectorMeta);
                        if (linkedMenus && linkedMenus.length) {
                            if (verbose) {
                                console.log(`[L2] fallback to linked page for ${selectorMeta.text || selectorMeta.href}`);
                            }
                            selectorGroups.push({
                                text: selectorMeta.text || `(selector_${i + 1})`,
                                href: selectorMeta.href || '',
                                lineMenus: linkedMenus
                            });
                            continue;
                        }
                    }

                    selectorGroups.push({
                        text: selectorMeta.text || `(selector_${i + 1})`,
                        href: selectorMeta.href || '',
                        lineMenus
                    });
                }
            }

            const fallbackCards = selectorHandles.length === 0 ? await collectCards() : [];

            mainMenu.push({
                label: label || '(без текста)',
                href,
                submenuGroups: fallbackCards.length ? [{
                    title: 'dropdown',
                    links: fallbackCards
                }] : [],
                submenuSelectors: selectorGroups
            });
        }

        menu.mainMenu = mainMenu;
        menu.companyMenu = await collectCompanyMenu();

        // Re-evaluate footer in mobile layout to access dropdown arrows.
        await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await new Promise(resolve => setTimeout(resolve, 500));
        const footerMobile = await page.evaluate(() => {
            const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
            const isVisible = (el) => {
                const style = window.getComputedStyle(el);
                const rect = el.getBoundingClientRect();
                return style.visibility !== 'hidden' &&
                    style.display !== 'none' &&
                    rect.width > 0 &&
                    rect.height > 0;
            };
            const footerEl = document.querySelector('footer, .footer');
            if (!footerEl) return null;

            const collectLinks = (root) => Array.from(root.querySelectorAll('a'))
                .filter(a => isVisible(a))
                .map(a => ({
                    text: normalize(a.textContent || ''),
                    href: a.getAttribute('href') || ''
                }))
                .filter(link => link.text || link.href);

            const rowItems = Array.from(footerEl.querySelectorAll('.middle-footer-row .footer-menu-item'))
                .map(item => ({
                    text: normalize(item.textContent || ''),
                    href: item.getAttribute('href') || ''
                }))
                .filter(link => link.text || link.href);

            const columns = Array.from(footerEl.querySelectorAll('.top-footer__menu-columns .footer-menu-column, .footer-menu-column'))
                .map(col => {
                    const titleEl = col.querySelector('.footer-menu-column__title, .footer-menu-title, h3, h4');
                    const title = normalize(titleEl ? titleEl.textContent : '');
                    const links = collectLinks(col);
                    return { title, links };
                })
                .filter(col => col.title || col.links.length > 0);

            return { rowItems, columns };
        });

        const mergedFooter = footer || {};
        if (footerMobile) {
            mergedFooter.rowItems = footerMobile.rowItems || mergedFooter.rowItems || [];
            // Keep desktop columns to avoid losing footer column data.
            mergedFooter.columns = (mergedFooter.columns && mergedFooter.columns.length)
                ? mergedFooter.columns
                : (footerMobile.columns || []);
        }

        menu.footer = Object.keys(mergedFooter).length ? mergedFooter : null;
        if (menu.footer) {
            const columnLinks = new Set(menu.footer.columns.flatMap(col => col.links.map(link => `${link.text}|${link.href}`)));
            const rowItems = menu.footer.rowItems || [];
            const dropdownItems = rowItems.filter(item => !item.href);

            const footerDropdowns = [];
            for (const item of dropdownItems) {
                if (!item.text) continue;
                await page.evaluate((title) => {
                    const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
                    const target = Array.from(document.querySelectorAll('.middle-footer-row .footer-menu-item'))
                        .find(el => normalize(el.textContent || '') === title);
                    const arrow = target?.querySelector('.menu-item__arrow');
                    arrow?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                }, item.text);
                await new Promise(resolve => setTimeout(resolve, 400));
                const links = await page.evaluate(() => {
                    const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
                    const container = document.querySelector('.dropdown-menu-list.footer-position');
                    if (!container) return [];
                    return Array.from(container.querySelectorAll('a'))
                        .map(a => ({
                            text: normalize(a.textContent || ''),
                            href: a.getAttribute('href') || ''
                        }))
                        .filter(link => link.text || link.href);
                });
                footerDropdowns.push({ title: item.text, links, groups: [] });
            }

            const dropdownLinks = new Set(footerDropdowns.flatMap(drop => drop.links.map(link => `${link.text}|${link.href}`)));
            const staticLinks = rowItems
                .filter(item => item.href)
                .filter(item => !columnLinks.has(`${item.text}|${item.href}`))
                .filter(item => !dropdownLinks.has(`${item.text}|${item.href}`));

            menu.footer.staticLinks = staticLinks;
            menu.footer.dropdownMenus = footerDropdowns;
            menu.footer.dropdownItems = dropdownItems;
        }

        const outJson = path.join(outputDir, 'HOME_MENU.json');
        fs.writeFileSync(outJson, JSON.stringify(menu, null, 2));

        const mdLines = ['# Главное меню (business.mgts.ru)', ''];
        mdLines.push('## Header Links');
        menu.headerLinks.forEach(link => {
            mdLines.push(`- ${link.text || '(без текста)'} — ${link.href}`);
        });
        mdLines.push('');
        mdLines.push('## Blocks');
        menu.blocks.forEach(block => {
            mdLines.push(`### ${block.title}`);
            if (block.links) {
                block.links.forEach(link => {
                    mdLines.push(`- ${link.text || '(без текста)'} — ${link.href}`);
                });
            } else if (block.text) {
                mdLines.push(`- ${block.text}`);
            }
            mdLines.push('');
        });

        mdLines.push('## Main Menu (with submenus)');
        menu.mainMenu.forEach(item => {
            mdLines.push(`- ${item.label} — ${item.href || ''}`);
            item.submenuGroups.forEach(group => {
                mdLines.push(`  - ${group.title}`);
                group.links.forEach(link => {
                    mdLines.push(`    - ${link.text || '(без текста)'} — ${link.href}`);
                });
            });
            item.submenuSelectors.forEach(selector => {
                mdLines.push(`  - ${selector.text || '(без текста)'} — ${selector.href || ''}`);
                selector.lineMenus.forEach(lineMenu => {
                    mdLines.push(`    - ${lineMenu.text || '(без текста)'}`
                    );
                    lineMenu.cards.forEach(card => {
                        mdLines.push(`      - ${card.text || '(без текста)'} — ${card.href}`);
                    });
                });
            });
        });

        if (menu.companyMenu) {
            mdLines.push('');
            mdLines.push('## Company Menu');
            mdLines.push(`- ${menu.companyMenu.label}`);
            menu.companyMenu.groups.forEach(group => {
                mdLines.push(`  - ${group.title} — ${group.href || ''}`);
                group.items.forEach(link => {
                    mdLines.push(`    - ${link.text || '(без текста)'} — ${link.href}`);
                });
            });
            menu.companyMenu.items.forEach(item => {
                mdLines.push(`  - ${item.text} — ${item.href}`);
            });
        }

        if (menu.footer) {
            mdLines.push('');
            mdLines.push('## Footer');
            mdLines.push('### Static Links');
            menu.footer.staticLinks.forEach(link => {
                mdLines.push(`- ${link.text || '(без текста)'} — ${link.href}`);
            });
            mdLines.push('');
            mdLines.push('### Columns');
            menu.footer.columns.forEach(col => {
                mdLines.push(`- ${col.title || '(без заголовка)'}`);
                col.links.forEach(link => {
                    mdLines.push(`  - ${link.text || '(без текста)'} — ${link.href}`);
                });
            });
            mdLines.push('');
            mdLines.push('### Dropdown Menus');
            menu.footer.dropdownMenus.forEach((group, index) => {
                mdLines.push(`- ${group.title || `group_${index + 1}`}`);
                group.links.forEach(link => {
                    mdLines.push(`  - ${link.text || '(без текста)'} — ${link.href}`);
                });
                group.groups.forEach(subgroup => {
                    mdLines.push(`  - ${subgroup.title || '(без заголовка)'}`);
                    subgroup.items.forEach(link => {
                        mdLines.push(`    - ${link.text || '(без текста)'} — ${link.href}`);
                    });
                });
            });
        }

        const outMd = path.join(outputDir, 'HOME_MENU.md');
        fs.writeFileSync(outMd, mdLines.join('\n'));

        console.log(`✅ Меню сохранено: ${outJson}`);
        console.log(`✅ Меню (md): ${outMd}`);
    } finally {
        await browser.close();
    }
}

main().catch(err => {
    console.error('❌ Ошибка:', err);
    process.exit(1);
});
