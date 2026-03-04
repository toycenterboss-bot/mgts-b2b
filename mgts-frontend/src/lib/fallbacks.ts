export const applyPageFallbacks = (page: any) => {
  const hasHeroFields = Boolean(page?.heroTitle || page?.heroSubtitle);
  const hero = page?.hero || (hasHeroFields ? { title: page?.heroTitle, subtitle: page?.heroSubtitle } : null);
  const sections = Array.isArray(page?.sections) ? page.sections : [];

  return { hero, sections };
};
