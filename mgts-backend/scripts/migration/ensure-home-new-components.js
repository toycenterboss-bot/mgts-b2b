/**
 * Ensure new home components exist with defaults.
 *
 * Usage:
 *   MGTS_DISABLE_PAGE_LIFECYCLES=1 node scripts/migration/run-ensure-home-new-components.js
 */

module.exports = async function ensureHomeNewComponents({ strapi }) {
  const slug = process.env.MGTS_HOME_DEMO_SLUG || "home";

  const normalizeIconValue = (value, fallbackName) => {
    if (typeof value === "string") {
      const raw = value.trim();
      return raw || fallbackName || "";
    }
    if (value && typeof value === "object") {
      const name =
        value.name ||
        value.key ||
        value.iconName ||
        value.iconSymbol ||
        (value.attributes && (value.attributes.name || value.attributes.key)) ||
        (value.data &&
          (value.data.name ||
            value.data.key ||
            (value.data.attributes && (value.data.attributes.name || value.data.attributes.key)))) ||
        "";
      const raw = typeof name === "string" ? name.trim() : "";
      return raw || fallbackName || "";
    }
    return fallbackName || "";
  };

  const normalizePerk = (perk) => {
    if (!perk) return perk;
    const icon = normalizeIconValue(perk.icon, "check_circle");
    return { ...perk, icon };
  };

  const pickIndustryIconFallback = (item) => {
    if (!item) return "";
    const tag = String(
      [item.tag, item.title, item.description].filter(Boolean).join(" ")
    ).toLowerCase();
    if (tag.includes("retail") || tag.includes("ритейл") || tag.includes("торгов")) return "shopping_cart";
    if (
      tag.includes("develop") ||
      tag.includes("девелоп") ||
      tag.includes("застрой") ||
      tag.includes("жк") ||
      tag.includes("недвиж")
    ) {
      return "apartment";
    }
    if (tag.includes("gov") || tag.includes("гос") || tag.includes("сектор")) return "account_balance";
    if (tag.includes("бизнес") || tag.includes("центр") || tag.includes("офис")) return "business";
    return "";
  };

  const normalizeHomeSection = (section) => {
    if (!section || !section.__component) return section;
    if (section.__component === "page.home-cooperation-cta") {
      const buttonIcon = normalizeIconValue(section.buttonIcon, "bolt");
      const next = { ...section, buttonIcon };
      if (Array.isArray(section.perks)) {
        next.perks = section.perks.map(normalizePerk);
      }
      return next;
    }
    if (section.__component === "page.home-industry-scenarios") {
      const next = { ...section };
      if (Array.isArray(section.items)) {
        next.items = section.items.map((item) => {
          if (!item) return item;
          const fallback = pickIndustryIconFallback(item);
          const icon = normalizeIconValue(item.icon, fallback);
          return { ...item, icon };
        });
      }
      return next;
    }
    if (section.__component === "page.home-private-zone") {
      const icon = normalizeIconValue(section.icon, "lock_open");
      return { ...section, icon };
    }
    return section;
  };

  const normalizeSections = (list) => list.map(normalizeHomeSection);

  const buildCooperationDefaults = () => ({
    __component: "page.home-cooperation-cta",
    title: "Трансформируйте бизнес сегодня",
    description:
      "Получите аудит вашей текущей сетевой инфраструктуры и персональное предложение по оптимизации затрат от экспертов МГТС.",
    buttonText: "Начать сотрудничество",
    buttonIcon: "bolt",
    buttonHref: "#",
    perks: [
      { icon: "check_circle", label: "Бесплатно" },
      { icon: "timer", label: "Ответ за 15 мин" },
    ],
  });

  const buildIndustryDefaults = () => ({
    __component: "page.home-industry-scenarios",
    title: "Отраслевые сценарии",
    items: [
      {
        tag: "FOR RETAIL",
        tagTone: "accent",
        title: "Умный Ритейл",
        description:
          "Аналитика потоков, тепловые карты и автоматизация касс с защитой данных покупателей.",
        buttonText: "ПОДРОБНЕЕ",
        buttonHref: "#",
        icon: "shopping_cart",
      },
      {
        tag: "FOR DEVELOPERS",
        tagTone: "primary",
        title: "Цифровой Девелопмент",
        description:
          "Единая цифровая среда ЖК: от умных шлагбаумов до автоматической диспетчеризации ресурсов.",
        buttonText: "ПОДРОБНЕЕ",
        buttonHref: "#",
        icon: "apartment",
      },
      {
        tag: "GOV SOLUTIONS",
        tagTone: "accent",
        title: "Госсектор 4.0",
        description:
          "Импортозамещение, суверенные облака и защита критически важной инфраструктуры.",
        buttonText: "ПОДРОБНЕЕ",
        buttonHref: "#",
        icon: "account_balance",
      },
    ],
  });

  const buildPrivateZoneDefaults = () => ({
    __component: "page.home-private-zone",
    title: "Приватная зона",
    description:
      "Для доступа к финансовым отчетам и персональным спецификациям требуется верификация через личный кабинет.",
    buttonText: "Войти в систему",
    buttonHref: "#",
    icon: "lock_open",
  });

  const pages = await strapi.db.query("api::page.page").findMany({
    where: { slug },
    limit: 1,
    populate: {
      sections: {
        populate: {
          items: {
            populate: {
              image: true,
              icon: {
                populate: {
                  preview: true,
                },
              },
            },
          },
          perks: true,
          cards: {
            populate: {
              image: true,
              backgroundImage: true,
              icon: {
                populate: {
                  preview: true,
                },
              },
              items: {
                populate: {
                  icon: {
                    populate: {
                      preview: true,
                    },
                  },
                },
              },
            },
          },
          vacancies: {
            populate: {
              meta: {
                populate: {
                  icon: {
                    populate: {
                      preview: true,
                    },
                  },
                },
              },
              tags: true,
            },
          },
          filters: true,
          tabs: true,
          files: {
            populate: {
              file: true,
            },
          },
          periods: {
            populate: {
              image: true,
            },
          },
          steps: {
            populate: {
              image: true,
            },
          },
          elements: true,
          icon: {
            populate: {
              preview: true,
            },
          },
          backgroundImage: true,
          socialLinks: {
            populate: {
              items: {
                populate: {
                  icon: {
                    populate: {
                      preview: true,
                    },
                  },
                },
              },
            },
          },
          portraitImage: true,
          video: true,
        },
      },
    },
  });

  if (!pages || pages.length === 0) {
    console.error(`❌ Страница с slug "${slug}" не найдена`);
    return;
  }

  const page = pages[0];
  let sections = Array.isArray(page.sections) ? page.sections.slice() : [];
  sections = normalizeSections(sections);
  const has = (comp) => sections.some((s) => s && s.__component === comp);

  if (!has("page.home-cooperation-cta")) {
    sections.push(buildCooperationDefaults());
  }

  if (!has("page.home-industry-scenarios")) {
    sections.push(buildIndustryDefaults());
  }

  if (!has("page.home-private-zone")) {
    sections.push(buildPrivateZoneDefaults());
  }

  await strapi.entityService.update("api::page.page", page.id, {
    data: { sections },
  });

  console.log(`✅ Updated home sections for slug=${slug}`);
};
