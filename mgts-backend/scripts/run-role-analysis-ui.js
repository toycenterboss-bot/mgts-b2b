const fs = require('fs');
const path = require('path');
const readline = require('readline');

const BASE_DIR = path.join(__dirname, '..', 'temp', 'page-analysis-llm');
const OUT_DIR = path.join(BASE_DIR, 'role-analysis-ui');

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

const JSON_SCHEMA = `{
  "role": "b2b_sales | marketing | creative | uiux | infosec | seo_llm | hr",
  "scope": "site | block | batch | page",
  "context": {
    "block_name": "",
    "batch_id": "",
    "pages": []
  },
  "scores": {
    "overall": 0,
    "criteria": [
      { "id": "goal_clarity", "score": 0, "notes": "" },
      { "id": "segment_fit", "score": 0, "notes": "" },
      { "id": "content_completeness", "score": 0, "notes": "" },
      { "id": "proof_points", "score": 0, "notes": "" },
      { "id": "journey_clarity", "score": 0, "notes": "" },
      { "id": "cta_access", "score": 0, "notes": "" }
    ],
    "role_criteria": []
  },
  "insights": [],
  "risks": [],
  "requirements": [],
  "quick_wins": [],
  "journey_recommendation": {
    "decision": "keep | improve | replace",
    "rationale": "",
    "proposed_changes": []
  },
  "evidence": [
    { "page": "", "section": "", "quote": "" }
  ]
}`;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

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
  return ['Критерии оценки:', ...criteria.map(item => `- ${item}`)].join('\n');
}

function readPageMeta(slug) {
  const file = path.join(BASE_DIR, `${slug}_spec.json`);
  if (!fs.existsSync(file)) return { slug };
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return {
      slug: data.page?.slug || slug,
      url: data.page?.url || '',
      title: data.metadata?.title || ''
    };
  } catch {
    return { slug };
  }
}

function buildPrompt(roleKey, batch) {
  const pages = (batch.slugs || []).map(readPageMeta);
  const salesSummaryPath = path.join(BASE_DIR, 'role-analysis-ui', 'b2b_sales', 'summary.json');
  const marketingSummaryPath = path.join(BASE_DIR, 'role-analysis-ui', 'marketing', 'summary.json');
  const creativeSummaryPath = path.join(BASE_DIR, 'role-analysis-ui', 'creative', 'summary.json');
  let salesContext = '';
  if (roleKey === 'marketing' && fs.existsSync(salesSummaryPath)) {
    try {
      const summary = JSON.parse(fs.readFileSync(salesSummaryPath, 'utf-8'));
      const batchSummary = summary.batchSummaries?.[batch.id] || null;
      const payload = batchSummary || summary;
      salesContext = [
        '',
        'Контекст B2B Sales (summary):',
        JSON.stringify(payload, null, 2)
      ].join('\n');
    } catch {
      salesContext = '';
    }
  }
  let creativeContext = '';
  if (roleKey === 'creative') {
    const contextParts = [];
    if (fs.existsSync(salesSummaryPath)) {
      try {
        const summary = JSON.parse(fs.readFileSync(salesSummaryPath, 'utf-8'));
        contextParts.push('B2B Sales summary:', JSON.stringify(summary, null, 2));
      } catch {}
    }
    if (fs.existsSync(marketingSummaryPath)) {
      try {
        const summary = JSON.parse(fs.readFileSync(marketingSummaryPath, 'utf-8'));
        contextParts.push('Marketing summary:', JSON.stringify(summary, null, 2));
      } catch {}
    }
    try {
      const resultFiles = [];
      const salesDir = path.join(BASE_DIR, 'role-analysis-ui', 'b2b_sales');
      const marketingDir = path.join(BASE_DIR, 'role-analysis-ui', 'marketing');
      if (fs.existsSync(salesDir)) {
        fs.readdirSync(salesDir).filter(name => name.startsWith('batch_') && name.endsWith('.json'))
          .forEach(name => resultFiles.push(path.join(salesDir, name)));
      }
      if (fs.existsSync(marketingDir)) {
        fs.readdirSync(marketingDir).filter(name => name.startsWith('batch_') && name.endsWith('.json'))
          .forEach(name => resultFiles.push(path.join(marketingDir, name)));
      }
      if (resultFiles.length) {
        contextParts.push('Файлы результатов Sales/Marketing:', resultFiles.join('\n'));
      }
    } catch {}
    if (contextParts.length) {
      creativeContext = ['','Контекст предыдущих ролей:', ...contextParts].join('\n');
    }
  }
  let uiuxContext = '';
  if (roleKey === 'uiux') {
    const contextParts = [];
    const summaries = [
      { label: 'B2B Sales summary', path: salesSummaryPath },
      { label: 'Marketing summary', path: marketingSummaryPath },
      { label: 'Creative summary', path: creativeSummaryPath }
    ];
    summaries.forEach(item => {
      if (!fs.existsSync(item.path)) return;
      try {
        const summary = JSON.parse(fs.readFileSync(item.path, 'utf-8'));
        contextParts.push(`${item.label}:`, JSON.stringify(summary, null, 2));
      } catch {}
    });
    try {
      const resultFiles = [];
      ['b2b_sales', 'marketing', 'creative'].forEach(role => {
        const dir = path.join(BASE_DIR, 'role-analysis-ui', role);
        if (!fs.existsSync(dir)) return;
        fs.readdirSync(dir).filter(name => name.startsWith('batch_') && name.endsWith('.json'))
          .forEach(name => resultFiles.push(path.join(dir, name)));
      });
      if (resultFiles.length) {
        contextParts.push('Файлы результатов предыдущих ролей:', resultFiles.join('\n'));
      }
    } catch {}
    if (contextParts.length) {
      uiuxContext = ['','Контекст предыдущих ролей:', ...contextParts].join('\n');
    }
  }
  const rolePurpose = {
    b2b_sales: 'Оценивает коммерческую эффективность пути клиента, структуру предложения и конверсионные точки.',
    marketing: 'Оценивает позиционирование, сегментацию и доказательства доверия.',
    creative: 'Оценивает образ бренда, тональность и визуальные метафоры high‑tech.',
    uiux: 'Оценивает UX‑флоу, навигацию, доступность и читаемость интерфейса.',
    infosec: 'Оценивает риски ИБ, обработку ПДн, формы и политики.',
    seo_llm: 'Оценивает семантику, структуру заголовков и пригодность для SEO/LLM‑поиска.',
    hr: 'Оценивает employer branding и сценарии найма.'
  };
  return [
    `Роль: ${roleKey}`,
    `Задача роли: ${rolePurpose[roleKey] || ''}`,
    'Цель: зафиксировать baseline текущего сайта и сформировать требования для улучшений.',
    `Scope: batch`,
    `Batch: ${batch.id} ${batch.name}`,
    '',
    buildJourneyContext(),
    '',
    buildRoleCriteria(roleKey),
    '',
    'Список страниц в батче:',
    pages.map(page => `${page.slug} | ${page.title || ''} | ${page.url || ''}`).join('\n'),
    '',
    'Требования к формату ответа:',
    '1) Ответ строго JSON по схеме ниже.',
    '2) Для requirements и quick_wins — поля what/why/impact/effort/owner/acceptance_criteria с метриками.',
    '3) Оценки 1–10 для всех критериев.',
    salesContext,
    creativeContext,
    uiuxContext,
    '',
    JSON_SCHEMA
  ].join('\n');
}

function collectFiles(batch, roleKey) {
  const files = [];
  const includeImages = process.env.UPLOAD_IMAGES === '1' || roleKey === 'creative' || roleKey === 'uiux';
  (batch.extraFiles || []).forEach(file => {
    const filePath = path.join(BASE_DIR, file);
    if (fs.existsSync(filePath)) files.push(filePath);
  });
  (batch.slugs || []).forEach(slug => {
    const spec = path.join(BASE_DIR, `${slug}_spec.json`);
    if (fs.existsSync(spec)) files.push(spec);
    if (includeImages) {
      const screenshot = path.join(BASE_DIR, `${slug}_screenshot.png`);
      if (fs.existsSync(screenshot)) files.push(screenshot);
    }
  });
  return files;
}

async function readMultilineInput(promptLabel) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log(promptLabel);
  console.log('Вставь JSON ответ и заверши строкой: END_JSON');
  const lines = [];
  return new Promise((resolve) => {
    rl.on('line', (line) => {
      if (line.trim() === 'END_JSON') {
        rl.close();
        resolve(lines.join('\n'));
      } else {
        lines.push(line);
      }
    });
  });
}

async function main() {
  ensureDir(OUT_DIR);
  const roleKey = (process.argv.find(arg => arg.startsWith('--role=')) || '')
    .replace('--role=', '') || process.env.ROLE_FILTER || '';
  if (!roleKey || !ROLE_BATCHES[roleKey]) {
    console.error('Укажи роль через --role=... или ROLE_FILTER. Доступные роли:', Object.keys(ROLE_BATCHES).join(', '));
    process.exit(1);
  }
  const batchId = (process.argv.find(arg => arg.startsWith('--batch=')) || '')
    .replace('--batch=', '') || process.env.BATCH_ID || '';

  const roleDir = path.join(OUT_DIR, roleKey);
  ensureDir(roleDir);
  const promptDir = path.join(roleDir, '_prompts');
  ensureDir(promptDir);

  const batches = ROLE_BATCHES[roleKey].filter(batch => !batchId || batch.id === batchId);
  for (const batch of batches) {
    const prompt = buildPrompt(roleKey, batch);
    const promptPath = path.join(promptDir, `batch_${batch.id}_${batch.name}.txt`);
    fs.writeFileSync(promptPath, prompt);
    const files = collectFiles(batch, roleKey);
    const filesPath = path.join(promptDir, `batch_${batch.id}_${batch.name}_files.txt`);
    fs.writeFileSync(filesPath, files.join('\n'));

    console.log('\n==============================');
    console.log(`Батч ${batch.id} ${batch.name}`);
    console.log(`Промпт: ${promptPath}`);
    console.log(`Файлы для загрузки: ${filesPath}`);
    console.log('Открой Perplexity UI и загрузите файлы, затем вставь промпт.');

    const response = await readMultilineInput('После получения ответа в UI:');
    const outPath = path.join(roleDir, `batch_${batch.id}_${batch.name}.json`);
    fs.writeFileSync(outPath, response);
    console.log(`✅ Ответ сохранен: ${outPath}`);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
