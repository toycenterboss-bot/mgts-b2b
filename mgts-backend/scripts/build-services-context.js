const fs = require('fs');
const path = require('path');

const BASE_DIR = path.join(__dirname, '..', 'temp', 'page-analysis-llm');
const OUT_PATH = path.join(BASE_DIR, 'SERVICES_CONTEXT.json');

const SEGMENT_MATCHERS = [
  { key: 'business', label: 'Бизнесу', match: /business/i },
  { key: 'developers', label: 'Застройщикам', match: /(developer|development)/i },
  { key: 'government', label: 'Госзаказчикам', match: /government/i }
];

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

function buildDescriptionFromSpec(spec) {
  if (!spec) return '';
  const sections = Array.isArray(spec.sections) ? spec.sections : [];
  const textSection = sections.find(section => normalize(section.text).length > 0);
  if (textSection) return normalize(textSection.text).slice(0, 240);
  const titleSection = sections.find(section => normalize(section.title).length > 0);
  if (titleSection) return normalize(`${titleSection.title} ${titleSection.subtitle || ''}`).slice(0, 240);
  return normalize(spec.metadata?.title || '').slice(0, 240);
}

function mapHrefToSlug(href, pathnameToSlug) {
  if (!href) return '';
  let pathname = href;
  if (href.startsWith('http')) {
    try {
      pathname = new URL(href).pathname;
    } catch {
      pathname = href;
    }
  }
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return pathnameToSlug.get(normalized) || '';
}

function extractServicesFromSpec(spec, segment) {
  if (!spec) return [];
  const sections = Array.isArray(spec.sections) ? spec.sections : [];
  const items = [];
  sections.forEach(section => {
    const cards = Array.isArray(section.cards) ? section.cards : [];
    cards.forEach(card => {
      const link = card.link || {};
      const href = link.href || card.href || '';
      const title = normalize(card.title || link.text || card.label || card.value || '');
      if (!title && !href) return;
      items.push({
        title,
        href,
        sourceSegment: segment.key,
        sourceSegmentLabel: segment.label,
        sourcePageSlug: spec.page?.slug || '',
        sourceSection: normalize(section.title || section.type || '')
      });
    });

    const internalLinks = section.links?.internalLinks || [];
    internalLinks.forEach(link => {
      const href = link.href || '';
      const title = normalize(link.text || '');
      if (!title && !href) return;
      items.push({
        title,
        href,
        sourceSegment: segment.key,
        sourceSegmentLabel: segment.label,
        sourcePageSlug: spec.page?.slug || '',
        sourceSection: normalize(section.title || section.type || '')
      });
    });
  });
  return items;
}

function main() {
  const specFiles = fs.readdirSync(BASE_DIR).filter(file => file.endsWith('_spec.json'));
  const specBySlug = new Map();
  const pathnameToSlug = new Map();

  specFiles.forEach(file => {
    const data = readJson(path.join(BASE_DIR, file));
    if (!data) return;
    const slug = data.page?.slug || file.replace('_spec.json', '');
    specBySlug.set(slug, data);
    const pathname = data.page?.pathname;
    if (pathname) pathnameToSlug.set(pathname, slug);
  });

  const segments = {};
  SEGMENT_MATCHERS.forEach(segment => {
    segments[segment.key] = {
      label: segment.label,
      sourcePageSlugs: [],
      sourcePageUrls: [],
      services: []
    };
  });

  const dedupeMap = new Map();
  const makeKey = (service) => (service.slug || service.href || service.title || '').trim().toLowerCase();

  specBySlug.forEach(spec => {
    const slug = spec.page?.slug || '';
    if (slug.includes('all_services')) return;
    const fileMatch = SEGMENT_MATCHERS.find(segment => segment.match.test(slug));
    if (!fileMatch) return;

    const segment = segments[fileMatch.key];
    if (!segment.sourcePageSlugs.includes(slug)) segment.sourcePageSlugs.push(slug);
    if (spec.page?.url && !segment.sourcePageUrls.includes(spec.page.url)) {
      segment.sourcePageUrls.push(spec.page.url);
    }

    const services = extractServicesFromSpec(spec, fileMatch).map(service => {
      const serviceSlug = mapHrefToSlug(service.href, pathnameToSlug);
      const description = buildDescriptionFromSpec(specBySlug.get(serviceSlug));
      return {
        title: service.title,
        href: service.href,
        slug: serviceSlug,
        description,
        sourceSegment: service.sourceSegment,
        sourceSegmentLabel: service.sourceSegmentLabel,
        sourcePageSlug: service.sourcePageSlug,
        sourceSection: service.sourceSection
      };
    });

    segment.services.push(...services);

    services.forEach(service => {
      const key = makeKey(service);
      if (!key) return;
      if (!dedupeMap.has(key)) {
        dedupeMap.set(key, {
          title: service.title,
          href: service.href,
          slug: service.slug,
          description: service.description,
          segments: [],
          sourcePages: [],
          sourceSections: []
        });
      }
      const entry = dedupeMap.get(key);
      if (!entry.segments.includes(fileMatch.key)) entry.segments.push(fileMatch.key);
      if (service.sourcePageSlug && !entry.sourcePages.includes(service.sourcePageSlug)) {
        entry.sourcePages.push(service.sourcePageSlug);
      }
      if (service.sourceSection && !entry.sourceSections.includes(service.sourceSection)) {
        entry.sourceSections.push(service.sourceSection);
      }
      if (!entry.description && service.description) entry.description = service.description;
    });
  });

  Object.values(segments).forEach(segment => {
    const localMap = new Map();
    segment.services.forEach(service => {
      const key = makeKey(service);
      if (!key) return;
      if (!localMap.has(key)) {
        localMap.set(key, service);
        return;
      }
      const existing = localMap.get(key);
      if (!existing.description && service.description) existing.description = service.description;
      if (!existing.slug && service.slug) existing.slug = service.slug;
      if (!existing.href && service.href) existing.href = service.href;
    });
    segment.services = Array.from(localMap.values());
  });

  const output = {
    generatedAt: new Date().toISOString(),
    segments,
    dedupedServices: Array.from(dedupeMap.values()).sort((a, b) => a.title.localeCompare(b.title))
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));
  console.log(`✅ Services context saved: ${OUT_PATH}`);
}

main();
