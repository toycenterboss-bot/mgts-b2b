const fs = require('fs');
const path = require('path');
const https = require('https');

const ROLES = [
  {
    key: 'marketing',
    title: 'Профессиональный маркетолог',
    focus: [
      'позиционирование и УТП',
      'структура воронки и конверсионные точки',
      'ясность сегментов (Застройщики/Операторы/Госзаказчики)',
      'доверие и доказательства'
    ]
  },
  {
    key: 'b2b_sales',
    title: 'Директор по B2B продажам',
    focus: [
      'лидогенерация и CTA',
      'структура предложения и пакетов',
      'контактные сценарии и квалификация',
      'возражения и SLA'
    ]
  },
  {
    key: 'uiux',
    title: 'UI/UX дизайнер',
    focus: [
      'навигируемость и UX‑флоу',
      'визуальная иерархия',
      'доступность и читаемость',
      'мобильные сценарии'
    ]
  },
  {
    key: 'creative',
    title: 'Креативный директор',
    focus: [
      'образ бренда и тональность',
      'визуальные метафоры high‑tech',
      'консистентность айдентики'
    ]
  },
  {
    key: 'infosec',
    title: 'Специалист по информационной безопасности',
    focus: [
      'обработка персональных данных',
      'безопасность форм и файлов',
      'доверие и соответствие требованиям'
    ]
  },
  {
    key: 'seo_llm',
    title: 'Специалист по SEO и LLM‑поиску',
    focus: [
      'структура заголовков и семантика',
      'сниппеты и ответы для LLM‑поиска',
      'внутренняя перелинковка',
      'скорость/доступность'
    ]
  },
  {
    key: 'hr',
    title: 'HR директор и руководитель рекрутмента',
    focus: [
      'работодательский бренд',
      'карьерные CTA и вакансии',
      'онбординг кандидата'
    ]
  }
];

const ROLE_ORDER = ['b2b_sales', 'marketing', 'creative', 'uiux', 'infosec', 'seo_llm', 'hr'];

function getRoleFilter() {
  const arg = process.argv.find(value => value.startsWith('--role='));
  if (arg) return arg.split('=')[1];
  return process.env.ROLE_FILTER || '';
}

const ROLE_BATCHES = {
  b2b_sales: [
    {
      id: '1',
      name: 'home_navigation_journey',
      extraFiles: [
        'HOME_MENU.json',
        'COLLECTION_TREE.md',
        'SERVICES_CONTEXT.json',
        'home_spec.json'
      ],
      slugs: []
    },
    {
      id: '2',
      name: 'services_unified_line',
      extraFiles: ['SERVICES_CONTEXT.json'],
      slugs: []
    },
    {
      id: '3',
      name: 'key_services_20',
      slugs: [
        'access_internet',
        'telephony',
        'mobile_connection',
        'virtual_ate',
        'video_surveillance_office',
        'digital_television',
        'computer_help',
        'security_alarm',
        'structured_cabling_networks',
        'local_computing_network',
        'external_communication',
        'network_operation',
        'automated_control_systems',
        'automated_system_monitoring_accounting',
        'access_control_systems',
        'introduction_security_tv_systems',
        'connecting_residential',
        'connecting_commercial',
        'connecting_construction',
        'developers_compensation_for_losses'
      ]
    },
    {
      id: '4',
      name: 'operators',
      slugs: [
        'operators',
        'operators_all_services',
        'operators_nondiscriminatory_access',
        'operinfo',
        'wca',
        'contact_for_operators'
      ]
    },
    {
      id: '5',
      name: 'partners',
      slugs: [
        'partners',
        'partner',
        'partners_creating_work_order',
        'partners_ramochnie_dogovori',
        'partners_feedback_form'
      ]
    },
    {
      id: '6',
      name: 'contacts_forms',
      slugs: [
        'computer_help',
        'contact_details',
        'contact_for_operators',
        'forms_doc',
        'infoformen',
        'partners_feedback_form',
        'single_hotline',
        'speakerphone'
      ]
    },
    {
      id: '7',
      name: 'documents_compliance_trust',
      slugs: [
        'corporate_documents',
        'documents',
        'mgts_compliance_policies',
        'data_processing'
      ]
    }
  ],
  marketing: [
    {
      id: '1',
      name: 'brand_positioning',
      slugs: ['home', 'about_mgts', 'mgts_values', 'general_director_message']
    },
    {
      id: '2',
      name: 'services_unified_line',
      extraFiles: ['SERVICES_CONTEXT.json'],
      slugs: []
    },
    {
      id: '3',
      name: 'key_services_20',
      slugs: [
        'access_internet',
        'telephony',
        'mobile_connection',
        'virtual_ate',
        'video_surveillance_office',
        'digital_television',
        'computer_help',
        'security_alarm',
        'structured_cabling_networks',
        'local_computing_network',
        'external_communication',
        'network_operation',
        'automated_control_systems',
        'automated_system_monitoring_accounting',
        'access_control_systems',
        'introduction_security_tv_systems',
        'connecting_residential',
        'connecting_commercial',
        'connecting_construction',
        'developers_compensation_for_losses'
      ]
    },
    {
      id: '4',
      name: 'operators',
      slugs: [
        'operators',
        'operators_all_services',
        'operators_nondiscriminatory_access',
        'operinfo',
        'wca',
        'contact_for_operators'
      ]
    },
    {
      id: '5',
      name: 'partners',
      slugs: [
        'partners',
        'partner',
        'partners_creating_work_order',
        'partners_ramochnie_dogovori',
        'partners_feedback_form'
      ]
    },
    {
      id: '6',
      name: 'trust_and_docs',
      slugs: [
        'corporate_documents',
        'decisions_meetings_shareholders',
        'stockholder_copies_document',
        'about_registrar'
      ]
    },
    {
      id: '7',
      name: 'contacts_forms',
      slugs: [
        'contact_details',
        'partners_feedback_form',
        'single_hotline',
        'speakerphone'
      ]
    }
  ],
  creative: [
    {
      id: '1',
      name: 'brand_core',
      slugs: ['home', 'about_mgts', 'mgts_values']
    },
    {
      id: '2',
      name: 'key_services_10_15',
      slugs: [
        'access_internet',
        'telephony',
        'virtual_ate',
        'video_surveillance_office',
        'structured_cabling_networks',
        'local_computing_network',
        'external_communication',
        'network_operation',
        'automated_control_systems',
        'access_control_systems',
        'connecting_residential',
        'connecting_commercial'
      ]
    }
  ],
  uiux: [
    {
      id: '1',
      name: 'navigation_tree',
      extraFiles: ['HOME_MENU.json', 'COLLECTION_TREE.md'],
      slugs: []
    },
    {
      id: '2',
      name: 'journey_key_services',
      slugs: [
        'home',
        'access_internet',
        'telephony',
        'mobile_connection',
        'virtual_ate',
        'video_surveillance_office',
        'structured_cabling_networks',
        'local_computing_network',
        'external_communication',
        'network_operation',
        'connecting_residential',
        'connecting_commercial'
      ]
    },
    {
      id: '3',
      name: 'forms_contacts',
      slugs: [
        'contact_details',
        'partners_feedback_form',
        'forms_doc',
        'single_hotline'
      ]
    },
    {
      id: '4',
      name: 'documents_content',
      slugs: [
        'corporate_documents',
        'data_processing',
        'mgts_compliance_policies'
      ]
    }
  ],
  infosec: [
    {
      id: '1',
      name: 'policies_and_pii',
      slugs: [
        'data_processing',
        'cookie_processing',
        'mgts_compliance_policies',
        'corporate_documents',
        'documents'
      ]
    },
    {
      id: '2',
      name: 'forms_and_requests',
      slugs: [
        'forms_doc',
        'partners_feedback_form',
        'contact_details'
      ]
    }
  ],
  seo_llm: [
    {
      id: '1',
      name: 'home_tree',
      slugs: ['home'],
      extraFiles: ['COLLECTION_TREE.md']
    },
    {
      id: '2',
      name: 'key_services_15_20',
      slugs: [
        'access_internet',
        'telephony',
        'mobile_connection',
        'virtual_ate',
        'video_surveillance_office',
        'digital_television',
        'computer_help',
        'security_alarm',
        'structured_cabling_networks',
        'local_computing_network',
        'external_communication',
        'network_operation',
        'automated_control_systems',
        'automated_system_monitoring_accounting',
        'access_control_systems'
      ]
    },
    {
      id: '3',
      name: 'docs_and_faq',
      slugs: [
        'corporate_documents',
        'data_processing',
        'mgts_compliance_policies',
        'forms_doc'
      ]
    }
  ],
  hr: [
    {
      id: '1',
      name: 'home_and_menu',
      slugs: ['home'],
      extraFiles: ['HOME_MENU.json']
    },
    {
      id: '2',
      name: 'careers_pages',
      slugs: []
    }
  ]
};

const ROLE_CONTEXT_INTENT = [
  'Услуги для сегментов "Госзаказчики", "Застройщики" и "Бизнес" по сути одинаковые,',
  'но подача и структура должны быть переосмыслены как единая линейка услуг для трёх аудиторий.'
].join(' ');

const ROLE_CRITERIA = {
  b2b_sales: [
    'четкость ценностного предложения',
    'логика продуктовой линейки и пакетов',
    'сценарии контакта и квалификации',
    'снятие возражений и доверие',
    'CTA и конверсионные точки'
  ],
  marketing: [
    'позиционирование и УТП',
    'сегментация аудиторий и месседжинг',
    'доказательства и социальные сигналы',
    'структура истории бренда',
    'конверсионные триггеры'
  ],
  uiux: [
    'последовательность пользовательских сценариев',
    'навигация и IA (information architecture)',
    'ясность CTA и доступность',
    'читабельность и визуальная иерархия',
    'мобильная пригодность'
  ],
  creative: [
    'тональность и эмоциональный эффект',
    'high‑tech визуальные метафоры',
    'консистентность айдентики',
    'уникальность и запоминаемость'
  ],
  infosec: [
    'обработка персональных данных',
    'безопасность форм и файлов',
    'соответствие требованиям и политикам'
  ],
  seo_llm: [
    'структура заголовков и семантика',
    'сниппеты и ответы для LLM‑поиска',
    'внутренняя перелинковка',
    'скорость/доступность'
  ],
  hr: [
    'работодательский бренд',
    'карьерные CTA и вакансии',
    'онбординг кандидата'
  ]
};

function buildJourneyContext() {
  return [
    'Текущая схема пути клиента к услуге:',
    '1) клиент определяет свой сегмент (Госзаказчики/Застройщики/Бизнес)',
    '2) выбирает пункт в главном меню',
    '3) в раскрытом меню выбирает категорию/услугу',
    '4) переходит на страницу услуги',
    '5) читает описание/переходит на уточняющие страницы',
    '6) отправляет заявку/звонит/оставляет контакт'
  ].join('\n');
}

function buildRoleCriteria(roleKey) {
  const criteria = ROLE_CRITERIA[roleKey] || [];
  if (!criteria.length) return '';
  return [
    'Критерии оценки:',
    ...criteria.map(item => `- ${item}`)
  ].join('\n');
}

const MODEL = process.env.PERPLEXITY_MODEL || 'sonar';

function getApiKeyFromContext() {
  try {
    const contextPath = path.join(__dirname, '..', '..', 'docs', 'project', 'CONTEXT.md');
    if (!fs.existsSync(contextPath)) return null;
    const contextContent = fs.readFileSync(contextPath, 'utf-8');

    const perplexityKeyMatch = contextContent.match(/pplx-[a-zA-Z0-9]+/);
    if (perplexityKeyMatch) return perplexityKeyMatch[0];

    const exportMatch = contextContent.match(/PERPLEXITY_API_KEY["']?\s*=\s*["']?([^"'\s]+)["']?/i);
    if (exportMatch) return exportMatch[1];
  } catch (error) {
    console.warn('⚠️  Не удалось прочитать CONTEXT.md:', error.message);
  }
  return null;
}

const API_KEY = process.env.PERPLEXITY_API_KEY || getApiKeyFromContext();

if (!API_KEY) {
  console.error('Missing PERPLEXITY_API_KEY env var.');
  process.exit(1);
}

const BASE_DIR = path.join(__dirname, '..', 'temp', 'page-analysis-llm');
const OUT_DIR = path.join(BASE_DIR, 'role-analysis');
const TREE_PATH = path.join(BASE_DIR, 'COLLECTION_TREE.md');

const GLOBAL_REQUIREMENTS = [
  'Сайт должен быть полностью новым и лучше по дизайну/UX.',
  'Фокус аудитории: 1) Застройщики, 2) Операторы, 3) Госзаказчики.',
  'Раздел "Найм" обязателен и должен быть виден с главной.',
  'Нужны поиск по сайту и встроенный AI‑чат.',
  'Контент и файлы берем из собранных данных старого сайта.',
  'Сайт работает с Strapi CMS.'
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function normalize(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function summarizeSection(section) {
  const title = normalize(section.title || '');
  const text = normalize(section.text || '');
  const type = section.type || '';
  return `${type}${title ? ` | ${title}` : ''}${text ? ` | ${text.slice(0, 200)}` : ''}`;
}

function buildPageSummary(spec) {
  const sections = spec.sections || [];
  const summary = sections.slice(0, 20).map(summarizeSection).filter(Boolean);
  return {
    slug: spec.page?.slug || '',
    url: spec.page?.url || '',
    screenshot: spec.page?.screenshot || '',
    title: spec.metadata?.title || '',
    sections: summary
  };
}

function readScreenshotData(screenshotPath) {
  if (!screenshotPath || !fs.existsSync(screenshotPath)) {
    return { path: screenshotPath || '', size: 0, embedded: false, data: '' };
  }
  const buffer = fs.readFileSync(screenshotPath);
  return { path: screenshotPath, size: buffer.length, embedded: false, data: '' };
}

function buildRequirementsBlock() {
  return GLOBAL_REQUIREMENTS.map(item => `- ${item}`).join('\n');
}

function readTreeMarkdown() {
  if (!fs.existsSync(TREE_PATH)) return '';
  return fs.readFileSync(TREE_PATH, 'utf-8');
}

function readTreeJson() {
  const jsonPath = path.join(BASE_DIR, 'COLLECTION_TREE.json');
  if (!fs.existsSync(jsonPath)) return '';
  return fs.readFileSync(jsonPath, 'utf-8');
}

function readFileTruncated(filePath, maxChars = 200000) {
  if (!filePath || !fs.existsSync(filePath)) return '';
  const content = fs.readFileSync(filePath, 'utf-8');
  if (content.length <= maxChars) return content;
  return `${content.slice(0, maxChars)}\n...TRUNCATED...`;
}

function log(message) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${message}`);
}

function logDetail(level, message) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${level}] ${message}`);
}

function ensurePromptDir(roleKey) {
  const dir = path.join(OUT_DIR, '_prompts', roleKey);
  ensureDir(dir);
  return dir;
}

function maybeSavePrompt(roleKey, slug, system, user, scope) {
  if (!process.env.SAVE_PROMPTS) return;
  const dir = ensurePromptDir(roleKey);
  const safeSlug = (slug || scope || 'site').replace(/[^\w.-]/g, '_');
  const filePath = path.join(dir, `${safeSlug}.txt`);
  const payload = [
    'SYSTEM PROMPT:',
    system,
    '',
    'USER PROMPT:',
    user
  ].join('\n');
  fs.writeFileSync(filePath, payload);
}

function callPerplexity(system, user, context = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: 0.2,
      max_tokens: 1200
    });

    const payloadBytes = Buffer.byteLength(payload);
    const startedAt = Date.now();
    logDetail('request', `scope=${context.scope || 'page'} role=${context.role || ''} slug=${context.slug || ''} bytes=${payloadBytes}`);

    const req = https.request(
      'https://api.perplexity.ai/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Length': Buffer.byteLength(payload)
        }
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          const elapsed = Date.now() - startedAt;
          if (res.statusCode && res.statusCode >= 300) {
            logDetail('error', `scope=${context.scope || 'page'} role=${context.role || ''} slug=${context.slug || ''} status=${res.statusCode} time_ms=${elapsed} body=${body.slice(0, 500)}`);
            return reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
          }
          try {
            const json = JSON.parse(body);
            const content = json?.choices?.[0]?.message?.content || '';
            logDetail('response', `scope=${context.scope || 'page'} role=${context.role || ''} slug=${context.slug || ''} time_ms=${elapsed} chars=${content.length}`);
            resolve(content);
          } catch (err) {
            logDetail('error', `scope=${context.scope || 'page'} role=${context.role || ''} slug=${context.slug || ''} parse_error=${err.message}`);
            reject(err);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function buildSystemPrompt(role, roleContext = '') {
  return [
    `Ты ${role.title}.`,
    `Сфокусируйся на: ${role.focus.join(', ')}.`,
    ROLE_CONTEXT_INTENT,
    roleContext,
    'Оцени клиентский путь от главной до конечной услуги и предложи: сохранить его, улучшить или заменить.',
    'Дай конкретные выводы и требования для нового сайта.',
    'Формат ответа: JSON с ключами: insights, risks, requirements, quick_wins.'
  ].join(' ');
}

function buildUserPromptSite(pages, roleKey) {
  const pageList = pages.map(p => `${p.slug} | ${p.title} | ${p.url}`).join('\n');
  const tree = readTreeMarkdown();
  const treeJson = readTreeJson();
  return [
    'Дай анализ сайта целиком на основе списка страниц.',
    'Сформируй требования для нового сайта и замечания.',
    '',
    'Общие требования к новому сайту:',
    buildRequirementsBlock(),
    '',
    buildJourneyContext(),
    '',
    buildRoleCriteria(roleKey),
    '',
    'Дерево страниц:',
    tree || '(дерево не найдено)',
    '',
    'Дерево страниц (JSON):',
    treeJson || '(json дерево не найдено)',
    '',
    'Страницы:',
    pageList
  ].join('\n');
}

function buildUserPromptPage(page, specJson, upstreamContext = '', roleKey = '') {
  const screenshot = readScreenshotData(page.screenshot);
  const maxJsonChars = Number(process.env.MAX_JSON_CHARS || 500000);
  const jsonPayload = specJson.length > maxJsonChars
    ? `${specJson.slice(0, maxJsonChars)}\n...TRUNCATED...`
    : specJson;

  const upstreamBlock = upstreamContext
    ? [
        '',
        'Контекст предыдущих ролей:',
        upstreamContext
      ].join('\n')
    : '';

  return [
    `Страница: ${page.slug}`,
    `URL: ${page.url}`,
    `Screenshot path: ${screenshot.path}`,
    `Screenshot size: ${screenshot.size}`,
    `Screenshot embedded: ${screenshot.embedded}`,
    screenshot.embedded ? `Screenshot base64: ${screenshot.data}` : 'Screenshot base64: (omitted; increase MAX_SCREENSHOT_BYTES to embed)',
    `Title: ${page.title}`,
    '',
    'Общие требования к новому сайту:',
    buildRequirementsBlock(),
    '',
    buildJourneyContext(),
    '',
    buildRoleCriteria(roleKey),
    '',
    'Краткая структура:',
    ...page.sections,
    '',
    'JSON собранного контента:',
    jsonPayload,
    upstreamBlock,
    '',
    'Дай анализ страницы и требования к новой реализации.'
  ].join('\n');
}

function buildUserPromptBatch(batch, pagesBySlug, specBySlug, roleKey, upstreamContext = '') {
  const maxJsonChars = Number(process.env.MAX_JSON_CHARS || 500000);
  const extraMaxChars = Number(process.env.MAX_EXTRA_CHARS || 150000);
  const rolePurpose = {
    b2b_sales: 'Оценивает коммерческую эффективность пути клиента, структуру предложения и конверсионные точки.',
    marketing: 'Оценивает позиционирование, сегментацию и доказательства доверия.',
    creative: 'Оценивает образ бренда, тональность и визуальные метафоры high‑tech.',
    uiux: 'Оценивает UX‑флоу, навигацию, доступность и читаемость интерфейса.',
    infosec: 'Оценивает риски ИБ, обработку ПДн, формы и политики.',
    seo_llm: 'Оценивает семантику, структуру заголовков и пригодность для SEO/LLM‑поиска.',
    hr: 'Оценивает employer branding и сценарии найма.'
  };
  const extraFiles = (batch.extraFiles || [])
    .map(file => {
      const filePath = path.join(BASE_DIR, file);
      const content = readFileTruncated(filePath, extraMaxChars);
      return content ? `\n--- ${file} ---\n${content}` : `\n--- ${file} ---\n(NOT FOUND)`;
    })
    .join('\n');

  const pages = (batch.slugs || [])
    .map(slug => {
      const page = pagesBySlug.get(slug);
      const spec = specBySlug.get(slug) || '{}';
      const jsonPayload = spec.length > maxJsonChars
        ? `${spec.slice(0, maxJsonChars)}\n...TRUNCATED...`
        : spec;
      return { slug, page, jsonPayload };
    });

  const summaries = pages
    .map(item => {
      if (!item.page) return `MISSING PAGE: ${item.slug}`;
      return `${item.page.slug} | ${item.page.title} | ${item.page.url}`;
    });

  const upstreamBlock = upstreamContext
    ? [
        '',
        'Контекст предыдущих ролей:',
        upstreamContext
      ].join('\n')
    : '';

  const pageBlocks = pages.map(item => {
    const page = item.page || {};
    return [
      `\n=== PAGE ${item.slug} ===`,
      `Title: ${page.title || ''}`,
      `URL: ${page.url || ''}`,
      `Screenshot: ${page.screenshot || ''}`,
      'JSON собранного контента:',
      item.jsonPayload
    ].join('\n');
  }).join('\n');

  return [
    `Батч: ${batch.id} ${batch.name}`,
    `Задача роли: ${rolePurpose[roleKey] || ''}`,
    'Цель: зафиксировать baseline текущего сайта и сформировать требования для улучшений.',
    '',
    'Общие требования к новому сайту:',
    buildRequirementsBlock(),
    '',
    buildJourneyContext(),
    '',
    buildRoleCriteria(roleKey),
    '',
    'Список страниц в батче:',
    summaries.join('\n'),
    '',
    extraFiles ? `Дополнительный контекст:${extraFiles}` : '',
    pageBlocks,
    upstreamBlock,
    '',
    'Дай анализ батча и требования к новой реализации.'
  ].filter(Boolean).join('\n');
}

function extractJsonBlock(text) {
  const match = text.match(/```json\s*([\s\S]+?)```/i);
  if (match) return match[1].trim();
  return text.trim();
}

function summarizeResponse(content, maxItems = 6) {
  const raw = extractJsonBlock(content);
  try {
    const parsed = JSON.parse(raw);
    const pick = (value) => Array.isArray(value) ? value.slice(0, maxItems) : (value ? [value] : []);
    const insights = pick(parsed.insights);
    const risks = pick(parsed.risks);
    const requirements = pick(parsed.requirements);
    const quickWins = pick(parsed.quick_wins || parsed.quickWins);
    return [
      insights.length ? `insights: ${insights.join(' | ')}` : '',
      risks.length ? `risks: ${risks.join(' | ')}` : '',
      requirements.length ? `requirements: ${requirements.join(' | ')}` : '',
      quickWins.length ? `quick_wins: ${quickWins.join(' | ')}` : ''
    ].filter(Boolean).join('\n');
  } catch {
    return raw.slice(0, 1500);
  }
}

async function main() {
  ensureDir(OUT_DIR);
  const specs = fs.readdirSync(BASE_DIR).filter(f => f.endsWith('_spec.json'));
  const pages = specs
    .map(file => readJson(path.join(BASE_DIR, file)))
    .filter(Boolean)
    .map(buildPageSummary);
  const totalPages = pages.length;
  log(`Found ${totalPages} pages to analyze.`);

  const specBySlug = new Map();
  specs.forEach(file => {
    const data = readJson(path.join(BASE_DIR, file));
    if (!data) return;
    const slug = data.page?.slug || file.replace('_spec.json', '');
    specBySlug.set(slug, JSON.stringify(data));
  });
  const pagesBySlug = new Map(pages.map(page => [page.slug, page]));

  const roleByKey = new Map(ROLES.map(role => [role.key, role]));
  const roleSummariesByPage = new Map();
  const roleSiteSummaries = new Map();
  const roleFilter = getRoleFilter();
  const batchMode = process.env.BATCH_MODE === '1' || Boolean(roleFilter);
  if (roleFilter) log(`Role filter enabled: ${roleFilter}`);

  for (const roleKey of ROLE_ORDER) {
    if (roleFilter && roleKey !== roleFilter) continue;
    const role = roleByKey.get(roleKey);
    if (!role) continue;
    const roleDir = path.join(OUT_DIR, role.key);
    ensureDir(roleDir);

    const system = buildSystemPrompt(role);
    log(`Role started: ${role.key}.`);

    const batches = ROLE_BATCHES[role.key] || [];

    if (batchMode && batches.length) {
      let batchIndex = 0;
      for (const batch of batches) {
        const outPath = path.join(roleDir, `batch_${batch.id}_${batch.name}.json`);
        if (fs.existsSync(outPath)) {
          batchIndex += 1;
          continue;
        }

        const upstreamContext = (() => {
          if (role.key === 'marketing') {
            const salesSummary = roleSiteSummaries.get('b2b_sales') || '';
            return salesSummary ? `b2b_sales:\n${salesSummary}` : '';
          }
          if (role.key === 'creative') {
            const salesSummary = roleSiteSummaries.get('b2b_sales') || '';
            const marketingSummary = roleSiteSummaries.get('marketing') || '';
            return [salesSummary ? `b2b_sales:\n${salesSummary}` : '', marketingSummary ? `marketing:\n${marketingSummary}` : '']
              .filter(Boolean)
              .join('\n');
          }
          if (role.key === 'uiux') {
            const creativeSummary = roleSiteSummaries.get('creative') || '';
            return creativeSummary ? `creative:\n${creativeSummary}` : '';
          }
          return '';
        })();

        log(`Role ${role.key}: batch ${batchIndex + 1}/${batches.length} ${batch.name}`);
        const user = buildUserPromptBatch(batch, pagesBySlug, specBySlug, role.key, upstreamContext);
        maybeSavePrompt(role.key, `batch_${batch.id}_${batch.name}`, system, user, 'batch');
        const content = await callPerplexity(system, user, { role: role.key, scope: 'batch', slug: batch.name });
        const summary = summarizeResponse(content);
        roleSiteSummaries.set(role.key, summary);
        const wrapped = {
          meta: {
            role: role.key,
            scope: 'batch',
            batchId: batch.id,
            batchName: batch.name,
            slugs: batch.slugs || [],
            extraFiles: batch.extraFiles || []
          },
          response: content,
          summary
        };
        fs.writeFileSync(outPath, JSON.stringify(wrapped, null, 2));
        batchIndex += 1;
      }
      log(`Role finished: ${role.key}.`);
      continue;
    }

    // Site-level analysis (fallback non-batch)
    const sitePath = path.join(roleDir, 'site.json');
    if (!fs.existsSync(sitePath)) {
      log(`Role ${role.key}: site analysis.`);
      const user = buildUserPromptSite(pages, role.key);
      maybeSavePrompt(role.key, 'site', system, user, 'site');
      const content = await callPerplexity(system, user, { role: role.key, scope: 'site' });
      const summary = summarizeResponse(content);
      roleSiteSummaries.set(role.key, summary);
      const wrapped = {
        meta: {
          role: role.key
        },
        response: content,
        summary
      };
      fs.writeFileSync(sitePath, JSON.stringify(wrapped, null, 2));
    }

    // Per-page analysis
    let pageIndex = 0;
    for (const page of pages) {
      const outPath = path.join(roleDir, `${page.slug}.json`);
      if (fs.existsSync(outPath)) {
        pageIndex += 1;
        continue;
      }
      const specJson = specBySlug.get(page.slug) || '{}';
      const maxJsonChars = Number(process.env.MAX_JSON_CHARS || 500000);
      const wasTruncated = specJson.length > maxJsonChars;
      const upstreamContext = (() => {
        if (role.key === 'marketing') {
          const salesSummary = roleSummariesByPage.get('b2b_sales')?.get(page.slug);
          return salesSummary ? `b2b_sales:\n${salesSummary}` : '';
        }
        if (role.key === 'creative') {
          const salesSummary = roleSummariesByPage.get('b2b_sales')?.get(page.slug);
          const marketingSummary = roleSummariesByPage.get('marketing')?.get(page.slug);
          return [salesSummary ? `b2b_sales:\n${salesSummary}` : '', marketingSummary ? `marketing:\n${marketingSummary}` : '']
            .filter(Boolean)
            .join('\n');
        }
        if (role.key === 'uiux') {
          const creativeSummary = roleSummariesByPage.get('creative')?.get(page.slug);
          return creativeSummary ? `creative:\n${creativeSummary}` : '';
        }
        return '';
      })();
      const user = buildUserPromptPage(page, specJson, upstreamContext, role.key);
      log(`Role ${role.key}: page ${pageIndex + 1}/${totalPages} ${page.slug}`);
      logDetail('page_meta', `role=${role.key} slug=${page.slug} json_chars=${specJson.length} truncated=${wasTruncated} screenshot=${page.screenshot || ''}`);
      maybeSavePrompt(role.key, page.slug, system, user, 'page');
      const content = await callPerplexity(system, user, { role: role.key, slug: page.slug, scope: 'page' });
      const summary = summarizeResponse(content);
      if (!roleSummariesByPage.has(role.key)) roleSummariesByPage.set(role.key, new Map());
      roleSummariesByPage.get(role.key).set(page.slug, summary);
      const wrapped = {
        meta: {
          role: role.key,
          slug: page.slug,
          url: page.url,
          jsonChars: specJson.length,
          maxJsonChars,
          truncated: wasTruncated,
          upstreamContext: upstreamContext ? true : false
        },
        response: content,
        summary
      };
      fs.writeFileSync(outPath, JSON.stringify(wrapped, null, 2));
      pageIndex += 1;
    }
    log(`Role finished: ${role.key}.`);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
