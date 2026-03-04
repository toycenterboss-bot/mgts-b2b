/**
 * Linkify URLs/emails/phones inside FAQ (accordion) answers for a page.
 *
 * Usage:
 *   STRAPI_API_TOKEN=... node update-infoformen-accordion-links.js --slug infoformen
 *
 * Env:
 *   STRAPI_URL (default http://localhost:1337)
 */
const axios = require('axios');
const { JSDOM } = require('jsdom');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN || '';

const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.findIndex((arg) => arg === name);
  return idx >= 0 ? args[idx + 1] : null;
};

const slug = getArg('--slug') || 'infoformen';

if (!API_TOKEN) {
  console.error('\n❌ STRAPI_API_TOKEN не установлен.\n');
  process.exit(1);
}

const api = axios.create({
  baseURL: `${STRAPI_URL}/api`,
  headers: {
    Authorization: `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

function stripComponentIds(value) {
  if (Array.isArray(value)) return value.map(stripComponentIds);
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

function normalizeTel(raw) {
  const digits = String(raw || '').replace(/[^\d+]/g, '');
  if (!digits) return '';
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('8') && digits.length === 11) return `+7${digits.slice(1)}`;
  if (digits.startsWith('7') && digits.length === 11) return `+${digits}`;
  return digits;
}

function trimTrailingPunct(value) {
  const match = String(value || '').match(/^(.*?)([.,;:!?)]*)$/);
  if (!match) return { core: value, tail: '' };
  return { core: match[1], tail: match[2] };
}

function linkifyHtml(html) {
  if (!html || typeof html !== 'string') return html;
  const dom = new JSDOM(`<div id="root">${html}</div>`);
  const { document, Node, NodeFilter } = dom.window;
  const root = document.getElementById('root');
  if (!root) return html;

  const allowedLink = (href) => {
    const raw = String(href || '');
    if (!raw) return false;
    if (raw.startsWith('mailto:')) return true;
    if (raw.startsWith('tel:')) return /(?:\+7|8)\s*495/.test(raw);
    if (/^https?:\/\/www\./i.test(raw)) return true;
    return /\.(pdf|docx?|xlsx?|zip)(?:\?|#|$)/i.test(raw);
  };

  const unwrapDisallowedAnchors = () => {
    const anchors = Array.from(root.querySelectorAll('a[href]'));
    anchors.forEach((a) => {
      if (allowedLink(a.getAttribute('href'))) return;
      const text = document.createTextNode(a.textContent || '');
      a.replaceWith(text);
    });
  };

  unwrapDisallowedAnchors();

  const pattern = /(www\.[^\s<]+)|([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})|((?:\+7|8)\s*495[\d\s().-]*)/gi;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    if (!node.nodeValue || !node.nodeValue.trim()) continue;
    if (node.parentElement && node.parentElement.closest('a')) continue;
    textNodes.push(node);
  }

  textNodes.forEach((textNode) => {
    const text = textNode.nodeValue;
    let match;
    let lastIndex = 0;
    const frag = document.createDocumentFragment();
    pattern.lastIndex = 0;

    while ((match = pattern.exec(text))) {
      if (match.index > lastIndex) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }
      const urlMatch = match[1];
      const emailMatch = match[2];
      const phoneMatch = match[3];

      if (urlMatch) {
        const { core, tail } = trimTrailingPunct(urlMatch);
        const href = core.startsWith('http') ? core : `http://${core}`;
        const a = document.createElement('a');
        a.href = href;
        a.textContent = core;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        frag.appendChild(a);
        if (tail) frag.appendChild(document.createTextNode(tail));
      } else if (emailMatch) {
        const { core, tail } = trimTrailingPunct(emailMatch);
        const a = document.createElement('a');
        a.href = `mailto:${core}`;
        a.textContent = core;
        frag.appendChild(a);
        if (tail) frag.appendChild(document.createTextNode(tail));
      } else if (phoneMatch) {
        const { core, tail } = trimTrailingPunct(phoneMatch);
        const tel = normalizeTel(core);
        if (/(?:\+7|8)\s*495/.test(core) && tel) {
          const a = document.createElement('a');
          a.href = `tel:${tel}`;
          a.textContent = core;
          frag.appendChild(a);
        } else {
          frag.appendChild(document.createTextNode(core));
        }
        if (tail) frag.appendChild(document.createTextNode(tail));
      }

      lastIndex = pattern.lastIndex;
    }

    if (lastIndex < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    if (frag.childNodes.length > 0) {
      textNode.parentNode.replaceChild(frag, textNode);
    }
  });

  const normalizeNumberedLists = () => {
    const paragraphs = Array.from(root.querySelectorAll('p'));
    paragraphs.forEach((p) => {
      if (p.querySelector('ul, ol')) return;
      const raw = (p.innerHTML || '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/\r\n/g, '\n');
      const lines = raw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      if (!lines.length) return;
      const isNumbered = lines.every((line) => /^\d+\.\s+/.test(line));
      if (!isNumbered) return;
      const list = document.createElement('ul');
      lines.forEach((line) => {
        const li = document.createElement('li');
        li.textContent = line;
        list.appendChild(li);
      });
      p.replaceWith(list);
    });
  };

  const injectEmptyParagraphs = () => {
    const paragraphs = Array.from(root.querySelectorAll('p'));
    paragraphs.forEach((p) => {
      if (p.nextSibling && p.nextSibling.nodeType === Node.ELEMENT_NODE) {
        const nextEl = p.nextSibling;
        if (nextEl.tagName === 'P' && nextEl.innerHTML.trim() === '&nbsp;') {
          return;
        }
      }
      const spacer = document.createElement('p');
      spacer.innerHTML = '&nbsp;';
      p.after(spacer);
    });
  };

  normalizeNumberedLists();
  injectEmptyParagraphs();

  return root.innerHTML;
}

async function main() {
  const res = await api.get('/pages', {
    params: {
      'filters[slug][$eq]': slug,
      'populate[sections][populate]': '*',
    },
  });
  const page = Array.isArray(res.data?.data) ? res.data.data[0] : null;
  if (!page) {
    throw new Error(`Page not found: ${slug}`);
  }
  const pageId = page.documentId || page.id;
  const sections = Array.isArray(page.sections) ? page.sections : page.attributes?.sections || [];
  if (!sections.length) {
    console.warn(`⚠️  No sections found for ${slug}`);
    return;
  }

  let updatedCount = 0;
  sections.forEach((section) => {
    if (section?.__component !== 'page.service-faq') return;
    const items = Array.isArray(section.items) ? section.items : [];
    items.forEach((item) => {
      const before = String(item.answer || '');
      const after = linkifyHtml(before);
      if (after !== before) {
        item.answer = after;
        updatedCount += 1;
      }
    });
  });

  if (!updatedCount) {
    console.log('✅ Нет изменений: ссылки уже размечены.');
    return;
  }

  const payload = { data: { sections: stripComponentIds(sections) } };
  await api.put(`/pages/${pageId}`, payload);
  console.log(`✅ Обновлено FAQ-ответов: ${updatedCount}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('\n❌ Ошибка:', error.message);
    process.exit(1);
  });
}
