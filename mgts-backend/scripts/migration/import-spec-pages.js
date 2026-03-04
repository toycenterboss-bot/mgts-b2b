/**
 * Import page-analysis *_spec.json into Strapi Pages via REST API.
 *
 * Usage:
 *   node import-spec-pages.js --slug about_mgts --template TPL_DeepNav
 *   node import-spec-pages.js --slugs about_mgts,mgts_values
 *   node import-spec-pages.js --dry-run --slug about_mgts
 *
 * Env:
 *   STRAPI_URL (default http://localhost:1337)
 *   STRAPI_API_TOKEN (required for write unless --dry-run)
 *   MGTS_PAGE_ANALYSIS_DIR (default branches/2026-01-22)
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN || '';
const IMAGES_BASE = process.env.MGTS_IMAGES_BASE || 'https://business.mgts.ru';
const IMAGES_CACHE_PATH = path.join(__dirname, '../../temp/spec-images-cache.json');
const DEFAULT_DIR = path.join(
  __dirname,
  '../../data/page-analysis-llm/branches/2026-01-22'
);

const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.findIndex((arg) => arg === name);
  return idx >= 0 ? args[idx + 1] : null;
};

const dryRun = args.includes('--dry-run');
const specDir = getArg('--dir') || process.env.MGTS_PAGE_ANALYSIS_DIR || DEFAULT_DIR;
const slugArg = getArg('--slug');
const slugsArg = getArg('--slugs');
const templateArg = getArg('--template');
const onlySectionsArg = getArg('--only-sections');
const onlySections = onlySectionsArg
  ? new Set(
      onlySectionsArg
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    )
  : null;

const imagesCache = (() => {
  try {
    if (fs.existsSync(IMAGES_CACHE_PATH)) {
      return JSON.parse(fs.readFileSync(IMAGES_CACHE_PATH, 'utf-8')) || {};
    }
  } catch (err) {
    console.warn(`⚠️  Не удалось прочитать кеш картинок: ${err.message}`);
  }
  return {};
})();

if (!dryRun && !API_TOKEN) {
  console.error('\n❌ STRAPI_API_TOKEN не установлен. Используйте --dry-run или задайте токен.\n');
  process.exit(1);
}

function requestJson(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, STRAPI_URL);
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          const ok = res.statusCode && res.statusCode >= 200 && res.statusCode < 300;
          if (!ok) {
            return reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 500)}`));
          }
          try {
            resolve(data ? JSON.parse(data) : {});
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function toRichText(text) {
  if (!text) return '';
  const lines = String(text).replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let paragraph = [];
  let listType = null;
  let listItems = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(`<p>${paragraph.join('<br/>')}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!listItems.length) return;
    const tag = listType === 'ol' ? 'ol' : 'ul';
    blocks.push(`<${tag}>${listItems.map((item) => `<li>${item}</li>`).join('')}</${tag}>`);
    listItems = [];
    listType = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const orderedMatch = trimmed.match(/^\d+[\).]\s+(.+)$/);
    if (orderedMatch) {
      flushParagraph();
      if (listType && listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(orderedMatch[1].trim());
      continue;
    }

    const unorderedMatch = trimmed.match(/^[-•–—]\s+(.+)$/);
    if (unorderedMatch) {
      flushParagraph();
      if (listType && listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(unorderedMatch[1].trim());
      continue;
    }

    if (listType) flushList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  return blocks.join('\n');
}

function slugifyKey(input) {
  const cleaned = String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned;
}

function joinTextParts(...parts) {
  return parts
    .map((part) => (part ? String(part).trim() : ''))
    .filter(Boolean)
    .join('\n');
}

function normalizeFileHref(href) {
  const raw = String(href || '').trim();
  if (!raw) return '';
  if (/^(https?:)?\/\//i.test(raw)) return raw;
  if (raw.startsWith('/')) return raw;
  return `/${raw}`;
}

function toColumnKey(value) {
  const base = String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '');
  return base || 'col';
}

function buildTariffTable(section) {
  const table = section?.table;
  const rawHeaders =
    Array.isArray(table?.headers) && table.headers.length
      ? table.headers
      : table?.rows && table.rows.length
        ? Object.keys(table.rows[0])
        : [];
  if (!rawHeaders.length) return null;

  const usedKeys = new Map();
  const columns = rawHeaders.map((name) => {
    const baseKey = toColumnKey(name);
    const count = (usedKeys.get(baseKey) || 0) + 1;
    usedKeys.set(baseKey, count);
    const key = count > 1 ? `${baseKey}_${count}` : baseKey;
    return { name, key };
  });

  const rows = Array.isArray(table?.rows)
    ? table.rows.map((row) => {
        const mapped = {};
        rawHeaders.forEach((header, idx) => {
          const columnKey = columns[idx].key;
          mapped[columnKey] = row && row[header] !== undefined ? String(row[header]) : '';
        });
        return mapped;
      })
    : [];

  const rawTitle = section?.title ? String(section.title).trim() : '';
  const rawDescription = table?.description ? String(table.description).trim() : '';
  let title = rawTitle;
  if (!title || /тариф/iu.test(title)) {
    let cleaned = rawDescription
      .replace(/^Таблица\s+стоимости\s+/iu, '')
      .replace(/^Таблица\s+/iu, '')
      .replace(/^Стоимость\s+/iu, '')
      .trim();
    if (cleaned) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      title = cleaned;
    }
  }

  const description = joinTextParts(section?.subtitle, section?.text);

  return {
    __component: 'page.tariff-table',
    title,
    description: description || rawDescription || '',
    columns,
    rows,
  };
}

function buildSectionTable(section) {
  const table = section?.table;
  const rawHeaders =
    Array.isArray(table?.headers) && table.headers.length
      ? table.headers
      : table?.rows && table.rows.length
        ? Object.keys(table.rows[0])
        : [];
  if (!rawHeaders.length) return null;

  const tableRows = Array.isArray(table?.rows) ? table.rows : [];
  const tableData = [
    rawHeaders.map((h) => String(h ?? "")),
    ...tableRows.map((row) => rawHeaders.map((h) => (row ? row[h] : ""))),
  ];

  const description = joinTextParts(section?.subtitle, section?.text);

  return {
    __component: 'page.section-table',
    title: section?.title || '',
    description: description || table?.description || '',
    tableData,
  };
}

function buildServiceFAQ(section) {
  const itemsSource = Array.isArray(section?.accordionItems)
    ? section.accordionItems
    : Array.isArray(section?.items)
      ? section.items
      : Array.isArray(section?.cards)
        ? section.cards.map((card) => ({
            title: card.title,
            content: card.text || card.description || '',
          }))
        : [];

  const renderFileLinks = (fileLinks) => {
    const links = Array.isArray(fileLinks) ? fileLinks : [];
    if (!links.length) return '';
    const items = links
      .map((link) => {
        const href = normalizeFileHref(link?.href || '');
        if (!href) return '';
        const labelBase = link?.text || link?.fileName || '';
        const typePart = link?.type ? `(${String(link.type).toUpperCase()})` : '';
        const sizePart = link?.size ? String(link.size) : '';
        const label = [labelBase, typePart, sizePart].filter(Boolean).join(' ').trim() || href;
        return `<li><a href="${href}" target="_blank" rel="noopener">${label}</a></li>`;
      })
      .filter(Boolean);
    if (!items.length) return '';
    return `<ul>\n${items.join('\n')}\n</ul>`;
  };

  const items = itemsSource
    .map((item) => {
      const question = item?.title || item?.question || '';
      const contentText =
        typeof item?.content === 'string'
          ? item.content
          : item?.content?.text || item?.answer || '';
      const fileLinks =
        Array.isArray(item?.content?.fileLinks)
          ? item.content.fileLinks
          : Array.isArray(item?.fileLinks)
            ? item.fileLinks
            : [];
      const answerParts = [toRichText(contentText), renderFileLinks(fileLinks)].filter(Boolean);
      return {
        question,
        answer: answerParts.join('\n'),
      };
    })
    .filter((item) => item.question || item.answer);

  if (!items.length && !section?.title) return null;

  return {
    __component: 'page.service-faq',
    title: section?.title || 'Часто задаваемые вопросы',
    items,
  };
}

function buildServiceFAQFromElements(section) {
  const elements = Array.isArray(section?.elements) ? section.elements : [];
  const accordionEl = elements.find((el) => el && el.type === 'accordion');
  if (!accordionEl || !Array.isArray(accordionEl.items)) return null;
  return buildServiceFAQ({
    title: accordionEl.title || section?.title || 'Часто задаваемые вопросы',
    items: accordionEl.items,
  });
}

function normalizeImageUrl(src) {
  if (!src) return '';
  const s = String(src).trim();
  if (!s) return '';
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  const pathPart = s.startsWith('/') ? s : `/${s}`;
  return `${IMAGES_BASE}${pathPart}`;
}

function resolveImageId(src) {
  if (!src) return null;
  const url = normalizeImageUrl(src);
  if (imagesCache[url]) return imagesCache[url];
  if (url.includes('/storage/images/')) {
    const alt = url.replace('/storage/images/', '/images/');
    if (imagesCache[alt]) return imagesCache[alt];
  }
  return null;
}

function buildHero(section) {
  if (!section || !section.title) return null;
  const heroImage = Array.isArray(section.images) ? section.images[0] : null;
  const backgroundImage = heroImage ? resolveImageId(heroImage.src) : null;
  const ctaButtons = Array.isArray(section.elements)
    ? section.elements
        .filter((el) => el && el.type === 'button' && el.text && el.href)
        .map((el) => ({
          text: el.text,
          href: el.href,
          style: el.style || 'primary',
        }))
    : [];
  return {
    title: section.title,
    subtitle: section.subtitle || section.text || '',
    ...(backgroundImage ? { backgroundImage } : {}),
    ctaButtons,
  };
}

function buildSectionCards(section, options = {}) {
  const cards = Array.isArray(section.cards) ? section.cards : [];
  if (!cards.length) return null;
  const cardType = options.cardType || 'info';
  const images = Array.isArray(options.images) ? options.images : [];
  return {
    __component: 'page.section-cards',
    title: section.title || '',
    subtitle: section.subtitle || section.text || '',
    cards: cards.map((card, idx) => {
      const imageId = images[idx] ? resolveImageId(images[idx].src) : null;
      return {
        title: card.title || card.label || card.value || `Карточка ${idx + 1}`,
        subtitle: card.subtitle || card.text || card.description || '',
        description: card.description || '',
        link:
          typeof card.link === 'string'
            ? card.link
            : card.link && typeof card.link === 'object' && typeof card.link.href === 'string'
              ? card.link.href
              : card.href || '',
        ...(imageId ? { image: imageId } : {}),
        cardType,
      };
    }),
  };
}

function buildSectionFromLinks(section) {
  const links = section?.links?.internalLinks || [];
  if (!links.length) return null;
  return {
    __component: 'page.section-cards',
    title: section.title || section.subtitle || 'Навигация',
    cards: links.map((link, idx) => ({
      title: link.text || `Ссылка ${idx + 1}`,
      description: link.purpose || '',
      link: link.href || '',
      cardType: 'navigation',
    })),
  };
}

function buildDocumentsTable(section) {
  const files = Array.isArray(section?.links?.fileLinks)
    ? section.links.fileLinks
    : [];
  if (!files.length) return null;
  const tableData = [
    ['Документ', 'Описание', 'Файл'],
    ...files.map((file) => [
      file?.text || file?.fileName || 'Документ',
      file?.purpose || '',
      {
        text: file?.text || 'Скачать',
        href: normalizeFileHref(file?.href || ''),
        isExternal: true,
        download: true,
      },
    ]),
  ];
  return {
    __component: 'page.section-table',
    title: section?.title || 'Документы',
    description: joinTextParts(section?.text, section?.subtitle),
    tableData,
  };
}

function linksToHtml(links = []) {
  const items = links
    .map((link) => {
      const href = normalizeFileHref(link?.href || '');
      const text = link?.text || link?.fileName || href || 'Документ';
      if (!href) return '';
      return `<li><a href="${href}" target="_blank" rel="noreferrer">${text}</a></li>`;
    })
    .filter(Boolean);
  if (!items.length) return '';
  return `<ul>${items.join('')}</ul>`;
}

function buildDocumentTabsFromSection(section) {
  const tabs = Array.isArray(section?.tabs) ? section.tabs : [];
  if (!tabs.length) return null;

  const mapTab = (tab, idx, nameOverride = '') => {
    const content = tab?.content || {};
    const nestedTabs = Array.isArray(content?.tabs)
      ? content.tabs
      : Array.isArray(tab?.tabs)
      ? tab.tabs
      : [];
    const textHtml = toRichText(joinTextParts(content?.title, content?.text));
    const linksHtml = linksToHtml(content?.links?.fileLinks || []);
    const html = [textHtml, linksHtml].filter(Boolean).join('\n');
    const name = nameOverride || tab?.title || `Таб ${idx + 1}`;
    const mapped = {
      name,
      content: html || toRichText(content?.title || ''),
      order: idx,
      filterKey: slugifyKey(name || `tab-${idx + 1}`),
    };
    if (nestedTabs.length) {
      mapped.children = nestedTabs.map((child, childIdx) => mapTab(child, childIdx));
    }
    return mapped;
  };

  const mappedTabs = [];
  const parentIndex = new Map();
  const normalizeTitle = (value) => String(value || '').trim();
  const splitTitle = (value) =>
    normalizeTitle(value)
      .split(/\s*>\s*/)
      .map((part) => part.trim())
      .filter(Boolean);

  tabs.forEach((tab, idx) => {
    const title = normalizeTitle(tab?.title);
    const parts = splitTitle(title);
    if (parts.length >= 2) {
      const parentName = parts[0];
      const childName = parts.slice(1).join(' > ');
      let parent = parentIndex.get(parentName);
      if (!parent) {
        parent = {
          name: parentName,
          content: '',
          order: mappedTabs.length,
          filterKey: slugifyKey(parentName || `tab-${mappedTabs.length + 1}`),
          children: [],
        };
        parentIndex.set(parentName, parent);
        mappedTabs.push(parent);
      }
      parent.children = parent.children || [];
      parent.children.push(mapTab(tab, idx, childName));
      return;
    }

    const mapped = mapTab(tab, idx, title);
    const existing = parentIndex.get(mapped.name);
    if (existing) {
      existing.content = mapped.content;
      if (!existing.filterKey) existing.filterKey = mapped.filterKey;
      return;
    }
    parentIndex.set(mapped.name, mapped);
    mappedTabs.push(mapped);
  });

  let defaultTab = 0;
  const activeIdx = tabs.findIndex((tab) => tab?.isActive);
  if (activeIdx >= 0) {
    const activeTitle = normalizeTitle(tabs[activeIdx]?.title);
    const activeParts = splitTitle(activeTitle);
    const activeParent = activeParts[0] || activeTitle;
    const parentPos = mappedTabs.findIndex((tab) => tab?.name === activeParent);
    if (parentPos >= 0) defaultTab = parentPos;
  }
  return {
    __component: 'page.document-tabs',
    title: section?.title || '',
    tabs: mappedTabs,
    defaultTab,
  };
}

function hasTabFileLinks(section) {
  const tabs = Array.isArray(section?.tabs) ? section.tabs : [];
  return tabs.some((tab) => {
    const links = tab?.content?.links;
    return Array.isArray(links?.fileLinks) && links.fileLinks.length > 0;
  });
}

function buildDocumentTabsFromFilesList(section) {
  const files = Array.isArray(section?.links?.fileLinks)
    ? section.links.fileLinks
    : [];
  if (!files.length) return null;
  const html = linksToHtml(files);
  return {
    __component: 'page.document-tabs',
    title: section?.title || 'Документы',
    tabs: [
      {
        name: section?.title || 'Документы',
        content: html,
        order: 0,
      },
    ],
    defaultTab: 0,
  };
}

function buildSectionText(section) {
  const content = toRichText(section.text || section.description || '');
  if (!content && !section.title) return null;
  return {
    __component: 'page.section-text',
    title: section.title || '',
    content,
  };
}

function buildHistoryTimeline(section) {
  const tabs = Array.isArray(section.tabs) ? section.tabs : [];
  if (!tabs.length || !section.title) return null;
  const periods = tabs.map((tab, idx) => ({
    period: tab.title || `Период ${idx + 1}`,
    title: tab.content?.title || '',
    content: toRichText(tab.content?.text || ''),
    order: idx,
  }));
  const defaultPeriod = Math.max(
    0,
    tabs.findIndex((tab) => tab.isActive)
  );
  const images = Array.isArray(section.images) ? section.images : [];
  const heroImg = images[0] || null;
  const heroId = heroImg ? resolveImageId(heroImg.src) : null;
  if (heroId && periods[defaultPeriod]) {
    periods[defaultPeriod].image = heroId;
    periods[defaultPeriod].imageDescription = heroImg.description || heroImg.alt || '';
  }
  return {
    __component: 'page.history-timeline',
    title: section.title,
    periods,
    defaultPeriod: defaultPeriod >= 0 ? defaultPeriod : 0,
  };
}

function buildImageCarousel(section) {
  const images = Array.isArray(section.images) ? section.images : [];
  if (!images.length) return null;
  const cards = Array.isArray(section.cards) ? section.cards : [];
  const items = images
    .map((img, idx) => {
      const imageId = resolveImageId(img.src);
      if (!imageId) return null;
      const card = cards[idx] || {};
      return {
        title: card.title || img.alt || `Изображение ${idx + 1}`,
        description: card.text || img.description || '',
        image: imageId,
        order: idx,
      };
    })
    .filter(Boolean);
  if (!items.length) return null;
  return {
    __component: 'page.image-carousel',
    title: section.title || '',
    subtitle: section.subtitle || section.text || '',
    items,
  };
}

function buildImageSwitcher(section) {
  const images = Array.isArray(section.images) ? section.images : [];
  if (!images.length) return null;
  const cards = Array.isArray(section.cards) ? section.cards : [];
  const items = images
    .map((img, idx) => {
      const imageId = resolveImageId(img.src);
      if (!imageId) return null;
      const card = cards[idx] || {};
      return {
        title: card.title || img.alt || `Слайд ${idx + 1}`,
        description: card.text || img.description || '',
        image: imageId,
        order: idx,
      };
    })
    .filter(Boolean);
  if (!items.length) return null;
  return {
    __component: 'page.image-switcher',
    title: section.title || '',
    items,
    defaultImage: 0,
  };
}

function buildAddressesMap(section) {
  const tabs = Array.isArray(section?.tabs) ? section.tabs : [];
  const markers = tabs.map((tab, idx) => ({
    title: tab?.title || `Адрес ${idx + 1}`,
    description: tab?.content?.text || '',
    address: tab?.title || '',
  }));
  const mapUrl = Array.isArray(section?.links?.externalLinks)
    ? section.links.externalLinks
        .map((link) => String(link?.href || '').trim())
        .find((href) => href.includes('yandex.ru/maps'))
    : '';
  if (!markers.length && !section?.title && !section?.text) return null;
  return {
    __component: 'page.section-map',
    title: section?.title || '',
    description: section?.text || '',
    mapType: 'yandex',
    mapUrl: mapUrl || '',
    markers,
  };
}
function buildHowToConnect(section) {
  const elements = Array.isArray(section.elements) ? section.elements : [];
  const steps = elements.filter((el) => el && el.type === 'step');
  if (!steps.length) return null;
  const images = Array.isArray(section.images) ? section.images : [];
  const mapped = steps.map((s, idx) => {
    const imageId = images[idx] ? resolveImageId(images[idx].src) : null;
    return {
      stepNumber: s.stepNumber || idx + 1,
      title: s.title || `Шаг ${idx + 1}`,
      description: s.text || '',
      ...(imageId ? { image: imageId } : {}),
    };
  });
  return {
    __component: 'page.how-to-connect',
    title: section.title || '',
    description: section.text || '',
    steps: mapped,
  };
}

function buildProcedureAdmissionSteps(stepsSection, modalSection) {
  const elements = Array.isArray(stepsSection?.elements) ? stepsSection.elements : [];
  const steps = elements.filter((el) => el && el.type === 'step');
  if (!steps.length) return null;
  const cards = Array.isArray(modalSection?.cards) ? modalSection.cards : [];
  const cardMap = new Map(cards.map((c) => [Number(c.stepIndex), c]));
  const mapped = steps.map((s, idx) => {
    const stepIndex = Number(s.index || idx + 1);
    const rawTitle = String(s.title || '').trim();
    const cleanTitle = rawTitle.replace(/^\s*\d+\s*/g, '').trim() || rawTitle;
    const modal = cardMap.get(stepIndex);
    return {
      stepNumber: stepIndex || idx + 1,
      title: cleanTitle || `Шаг ${idx + 1}`,
      description: '',
      modalHtml: modal?.html || toRichText(modal?.text || ''),
    };
  });
  return {
    __component: 'page.how-to-connect',
    title: stepsSection?.title || '',
    description: stepsSection?.text || '',
    steps: mapped,
  };
}

function resolveFormType(section) {
  if (section === 'government') return 'government-request';
  if (section === 'business') return 'business-request';
  if (section === 'operators') return 'operators-request';
  if (section === 'partners') return 'partners-request';
  if (section === 'developers') return 'developers-request';
  return 'general-request';
}

function buildServiceOrderForm(section, options = {}) {
  const title = section?.title ? String(section.title).trim() : '';
  const subtitle = joinTextParts(section?.subtitle, section?.text);
  const button = Array.isArray(section?.elements)
    ? section.elements.find((el) => el && el.type === 'button' && el.text)
    : null;
  if (!title && !subtitle && !button) return null;
  return {
    __component: 'page.service-order-form',
    isVisible: true,
    title: title || 'Обсудим ваш проект',
    subtitle: subtitle || '',
    buttonText: button?.text || 'Отправить заявку',
    formType: resolveFormType(options.section),
    section: options.section || 'other',
  };
}

function buildFormSection(section) {
  const title = section?.title ? String(section.title).trim() : '';
  const subtitle = joinTextParts(section?.subtitle, section?.description);
  const elements = Array.isArray(section?.elements) ? section.elements : [];
  const fields = elements.filter((el) => el && el.type && el.type !== 'button');
  const button = elements.find((el) => el && el.type === 'button' && el.text);
  if (!title && !subtitle && !fields.length && !button) return null;

  const links = Array.isArray(section?.links?.internalLinks) ? section.links.internalLinks : [];
  const firstLink = links.find((l) => l && l.text && l.href);
  const disclaimerText = joinTextParts(section?.text);
  const linkHtml =
    firstLink && firstLink.href
      ? ` <a href="${normalizeFileHref(firstLink.href)}">${String(firstLink.text || '').trim()}</a>`
      : '';
  const disclaimerHtml = disclaimerText ? toRichText(`${disclaimerText}${linkHtml}`) : '';

  return {
    __component: 'page.form-section',
    title: title || '',
    subtitle: subtitle || '',
    submitText: button?.text || '',
    disclaimerHtml,
    elements: fields.map((el) => {
      const rawType = String(el.type || 'input').toLowerCase();
      const hasOptions = Array.isArray(el.options) && el.options.length > 0;
      const type =
        rawType === 'question'
          ? (hasOptions ? 'select' : 'textarea')
          : rawType;
      const description = el.description || '';
      const match = String(description).match(/(\d+)/);
      const maxLength = el.maxLength || (match ? parseInt(match[1], 10) : undefined);
      return ({
      type: type || 'input',
      label: el.label || '',
      placeholder: el.placeholder || '',
      options: Array.isArray(el.options) ? el.options : null,
      optional: !!el.optional,
      description,
      accept: el.accept || '',
      dragDrop: !!el.dragDrop,
      text: el.text || '',
      ...(maxLength ? { maxLength } : {}),
    });
    }),
  };
}

function buildSectionsFromSpec(spec, options = {}) {
  const sections = [];
  const sectionFilter = options.onlySections || null;
  const template = options.template || inferTemplate(spec?.page?.slug, spec?.page?.pathname || '');
  const skipTypes = new Set(['breadcrumbs', 'sidebar-menu']);
  if (template === 'TPL_DeepNav' && !sectionFilter) {
    skipTypes.add('sidebar');
  }
  const sectionContext = options.section || inferSection(spec?.page?.pathname || '');
  const sectionHeader =
    template === 'TPL_Segment_Landing'
      ? (spec?.sections || []).find((section) => section?.type === 'section-header')
      : null;
  let hero = null;

  const modalCardsSection = (spec.sections || []).find((s) => s?.type === 'modal-cards') || null;

  for (const section of spec.sections || []) {
    if (skipTypes.has(section.type)) continue;
    if (template === 'TPL_Segment_Landing' && section?.type === 'section-header') continue;
    if (sectionFilter && !sectionFilter.has(section.type)) continue;

    if (section.type === 'hero' && !hero) {
      const heroHasFiles = Array.isArray(section?.links?.fileLinks) && section.links.fileLinks.length;
      hero = buildHero(section);
      if (hero && sectionHeader) {
        hero.title = sectionHeader.title || hero.title;
        hero.subtitle = sectionHeader.text || sectionHeader.subtitle || hero.subtitle;
      }
      if (heroHasFiles) {
        const docs = buildDocumentsTable(section);
        if (docs) sections.push(docs);
      } else if (section.text && template === 'TPL_DeepNav' && !sectionFilter) {
        const heroText = buildSectionText({
          title: '',
          text: section.text,
        });
        if (heroText) sections.push(heroText);
      }
      if (hero) continue;
    }

    if (section.type === 'content' && Array.isArray(section?.elements) && section.elements.length) {
      const faqFromElements = buildServiceFAQFromElements(section);
      if (faqFromElements) sections.push(faqFromElements);
      const textSection = buildSectionText(section);
      if (textSection) sections.push(textSection);
      continue;
    }

    if (section.type === 'content' && section.table) {
      const sectionTable = buildSectionTable(section);
      if (sectionTable) sections.push(sectionTable);
      if (Array.isArray(section?.links?.fileLinks) && section.links.fileLinks.length) {
        const docs = buildDocumentsTable(section);
        if (docs) sections.push(docs);
      }
      continue;
    }

    if (section.type === 'history-tabs') {
      const history = buildHistoryTimeline(section);
      if (history) sections.push(history);
      continue;
    }

    if (section.type === 'projects-slider' || section.type === 'images') {
      const carousel = buildImageCarousel(section);
      if (carousel) sections.push(carousel);
      continue;
    }

    if (section.type === 'slider') {
      const switcher = buildImageSwitcher(section);
      if (switcher) sections.push(switcher);
      continue;
    }

    if (section.type === 'addresses-map') {
      const mapSection = buildAddressesMap(section);
      if (mapSection) sections.push(mapSection);
      continue;
    }

    if (section.type === 'step-by-step-guide') {
      const howTo = buildHowToConnect(section);
      if (howTo) sections.push(howTo);
      continue;
    }

    if (section.type === 'steps') {
      const howTo =
        modalCardsSection
          ? buildProcedureAdmissionSteps(section, modalCardsSection)
          : buildHowToConnect(section);
      if (howTo) sections.push(howTo);
      continue;
    }

    if (section.type === 'process' && section.table) {
      const sectionTable = buildSectionTable(section);
      if (sectionTable) sections.push(sectionTable);
      continue;
    }

    if (section.type === 'tariffs' && section.table) {
      const tariffTable = buildTariffTable(section);
      if (tariffTable) sections.push(tariffTable);
      continue;
    }

    if (section.type === 'accordion') {
      const faq = buildServiceFAQ(section);
      if (faq) sections.push(faq);
      continue;
    }

    if (
      spec?.page?.slug === 'forms_doc' &&
      section.type === 'header' &&
      Array.isArray(section?.tabs) &&
      section.tabs.length
    ) {
      const docTabs = buildDocumentTabsFromSection({ ...section, title: '' });
      if (docTabs) sections.push(docTabs);
    }

    if (section.type === 'tabs-section' || section.type === 'year-filter-tabs') {
      const docTabs = buildDocumentTabsFromSection(section);
      if (docTabs) sections.push(docTabs);
      continue;
    }

    if (section.type === 'tabs' && hasTabFileLinks(section)) {
      const docTabs = buildDocumentTabsFromSection(section);
      if (docTabs) sections.push(docTabs);
      continue;
    }

    if (section.type === 'files-list') {
      const docTabs = buildDocumentTabsFromFilesList(section);
      if (docTabs) sections.push(docTabs);
      continue;
    }

    if (section.type === 'documents') {
      const docs = buildDocumentsTable(section);
      if (docs) sections.push(docs);
      continue;
    }

    if (section.type === 'content' && Array.isArray(section?.links?.fileLinks) && section.links.fileLinks.length) {
      const docs = buildDocumentsTable(section);
      if (docs) sections.push(docs);
      continue;
    }

    if (section.type === 'form') {
      const formSection = buildFormSection(section);
      if (formSection) sections.push(formSection);
      continue;
    }

    if (section.type === 'request-form' || section.type === 'contact-form' || section.type === 'cta-form') {
      const orderForm = buildServiceOrderForm(section, { section: sectionContext });
      if (orderForm) sections.push(orderForm);
      continue;
    }

    const linkSection = buildSectionFromLinks(section);
    if (linkSection) {
      sections.push(linkSection);
      continue;
    }

    const cardsSection = buildSectionCards(section, { images: section.images });
    if (cardsSection) {
      sections.push(cardsSection);
      continue;
    }

    const textSection = buildSectionText(section);
    if (textSection) sections.push(textSection);
  }

  return { sections, hero };
}

function inferSection(pathname) {
  if (!pathname) return 'other';
  if (pathname === '/' || pathname === '/home') return 'home';
  if (pathname.startsWith('/business')) return 'business';
  if (pathname.startsWith('/operators')) return 'operators';
  if (pathname.startsWith('/government')) return 'government';
  if (pathname.startsWith('/partners')) return 'partners';
  if (pathname.startsWith('/developers')) return 'developers';
  if (
    pathname.startsWith('/about_mgts') ||
    pathname.startsWith('/about') ||
    pathname.startsWith('/mgts_') ||
    pathname.includes('mgts')
  ) {
    return 'about_mgts';
  }
  if (pathname.startsWith('/news')) return 'news';
  return 'other';
}

function inferTemplate(slug, pathname) {
  if (slug === 'home') return 'TPL_Home';
  if (slug === 'news') return 'TPL_News_List';
  if (slug === 'contact_details') return 'TPL_Contact_Hub';
  if (slug === 'documents' || pathname?.includes('/documents')) return 'TPL_Doc_Page';
  if (slug && slug.includes('scenario')) return 'TPL_Scenario';
  if (slug === 'virtual_ate' || pathname === '/virtual_ate') return 'TPL_Service';
  if (slug && slug.includes('access_internet')) return 'TPL_Service';
  if (pathname === '/developers') return 'TPL_Segment_Landing';
  if (pathname?.endsWith('/developers/all_services')) return 'TPL_Segment_Landing';
  if (pathname?.startsWith('/developers/')) return 'TPL_Service';
  if (pathname === '/operators') return 'TPL_Segment_Landing';
  if (pathname?.endsWith('/operators/all_services')) return 'TPL_Segment_Landing';
  if (pathname?.endsWith('/operators/contact_for_operators')) return 'TPL_Form_Page';
  if (pathname?.startsWith('/operators/')) return 'TPL_Service';
  if (pathname === '/government') return 'TPL_Segment_Landing';
  if (pathname?.endsWith('/government/all_services')) return 'TPL_Segment_Landing';
  if (pathname?.startsWith('/government/')) return 'TPL_Service';
  if (pathname === '/business') return 'TPL_Segment_Landing';
  if (pathname?.endsWith('/business/all_services')) return 'TPL_Segment_Landing';
  if (pathname?.startsWith('/business/')) return 'TPL_Service';
  if (pathname === '/partners') return 'TPL_Segment_Landing';
  if (pathname?.endsWith('/partners/all_services')) return 'TPL_Segment_Landing';
  if (pathname?.endsWith('/partners/creating_work_order')) return 'TPL_Form_Page';
  if (['developers', 'operators', 'government', 'partners', 'business'].includes(slug)) {
    return 'TPL_Segment_Landing';
  }
  if (pathname && pathname.startsWith('/about')) return 'TPL_DeepNav';
  return 'TPL_DeepNav';
}

function buildPagePayload(spec) {
  const slug = spec?.page?.slug;
  const pathname = spec?.page?.pathname || '';
  const template = templateArg || inferTemplate(slug, pathname);
  const title =
    spec?.metadata?.title ||
    spec?.sections?.find((section) => section.type === 'hero')?.title ||
    slug;

  const section = inferSection(pathname);
  const { sections, hero } = buildSectionsFromSpec(spec, { template, section });

  const payload = {
    slug,
    title,
    template,
    section,
    originalUrl: spec?.page?.url || '',
    metaDescription: spec?.metadata?.description || '',
    metaKeywords: spec?.metadata?.keywords || '',
    hero,
    sections,
    publishedAt: new Date().toISOString(),
  };

  return payload;
}

function stripComponentIds(value) {
  if (Array.isArray(value)) {
    return value.map((item) => stripComponentIds(item));
  }
  if (value && typeof value === 'object') {
    const next = {};
    Object.entries(value).forEach(([key, val]) => {
      if (key === 'id') return;
      next[key] = stripComponentIds(val);
    });
    return next;
  }
  return value;
}

function loadSpec(slug) {
  const filePath = path.join(specDir, `${slug}_spec.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Spec file not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

async function upsertPage(payload) {
  const slug = payload.slug;
  const find = await requestJson(
    'GET',
    `/api/pages?filters[slug][$eq]=${encodeURIComponent(slug)}&pagination[limit]=1&populate=sections`
  );
  const existing = Array.isArray(find?.data) ? find.data[0] : null;

  if (existing?.id || existing?.documentId) {
    const targetId = existing?.documentId || existing?.id;
    console.log(`↺ Обновление страницы: ${slug}`);
    if (onlySections) {
      const existingSections = existing?.sections || [];
      const newSections = payload.sections || [];
      const byComponent = new Map();
      const remaining = new Set();
      newSections.forEach((section, idx) => {
        if (!section?.__component) return;
        const bucket = byComponent.get(section.__component) || [];
        bucket.push({ section, idx });
        byComponent.set(section.__component, bucket);
        remaining.add(idx);
      });

      const merged = [];
      for (const section of existingSections) {
        const component = section?.__component;
        const bucket = component ? byComponent.get(component) : null;
        if (bucket && bucket.length) {
          const next = bucket.shift();
          merged.push(next.section);
          remaining.delete(next.idx);
        } else {
          merged.push(section);
        }
      }

      newSections.forEach((section, idx) => {
        if (remaining.has(idx)) merged.push(section);
      });

      return requestJson('PUT', `/api/pages/${targetId}`, {
        data: { sections: stripComponentIds(merged) },
      });
    }
    return requestJson('PUT', `/api/pages/${targetId}`, { data: payload });
  }

  console.log(`＋ Создание страницы: ${slug}`);
  return requestJson('POST', '/api/pages', { data: payload });
}

async function run() {
  const slugs = [];
  if (slugArg) slugs.push(slugArg);
  if (slugsArg) slugs.push(...slugsArg.split(',').map((s) => s.trim()).filter(Boolean));

  if (!slugs.length) {
    console.error('Укажите --slug или --slugs для импорта.');
    process.exit(1);
  }

  console.log(`\n📦 Импорт spec из: ${specDir}`);
  console.log(`🔎 Страницы: ${slugs.join(', ')}\n`);

  for (const slug of slugs) {
    const spec = loadSpec(slug);
    const payload = buildPagePayload(spec);
    if (onlySections) {
      const { sections } = buildSectionsFromSpec(spec, { onlySections });
      payload.sections = sections;
    }
    if (dryRun) {
      console.log(`\n— ${slug} (dry-run)`);
      console.log(JSON.stringify(payload, null, 2));
      continue;
    }
    await upsertPage(payload);
  }
}

run().catch((err) => {
  const msg = err?.stack || err?.message || String(err);
  console.error(`\n❌ Ошибка: ${msg}\n`);
  process.exit(1);
});
