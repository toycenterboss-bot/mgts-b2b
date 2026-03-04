#!/usr/bin/env node
/**
 * Update mega-menu CTA card settings in Strapi navigation single type.
 */

const STRAPI_BASE = process.env.STRAPI_BASE || "http://localhost:1337";

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

async function main() {
  const navRes = await fetchJson(`${STRAPI_BASE}/api/navigation`);
  const nav = navRes?.data;
  if (!nav) throw new Error("Navigation not found");

  const payload = {
    data: {
      megaMenuCta: {
        isVisible: true,
        title: "Нужна помощь в выборе?",
        description: "Наши эксперты подберут оптимальное решение под задачи вашего бизнеса.",
        buttonText: "Получить консультацию",
        buttonHref: "/contact",
        phoneText: "8 800 250 09 90",
        phoneIcon: "call",
        backgroundIcon: "cell_tower"
      }
    }
  };

  const updated = await fetchJson(`${STRAPI_BASE}/api/navigation`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  console.log("Updated megaMenuCta:", updated?.data?.megaMenuCta || null);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
