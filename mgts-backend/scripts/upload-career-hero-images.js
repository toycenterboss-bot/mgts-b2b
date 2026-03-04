#!/usr/bin/env node
/**
 * Upload career hero images to Strapi media library and update page hero component
 */

const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
// Node.js 18+ has built-in fetch

const STRAPI_BASE = process.env.STRAPI_BASE || "http://localhost:1337";
const PAGE_DOCUMENT_ID = "aflgvzdkudsejdq6zrebcwiy"; // career page

const DESIGN_ROOT = path.resolve(__dirname, "../../design");
const IMAGES = [
  {
    file: "assets/images/external/7c0093946320.png",
    name: "career-hero-server-rack.png",
    alt: "Modern server rack with blue lighting and digital overlays",
    field: "backgroundImage",
  },
  {
    file: "assets/images/external/8f18f563d6b2.png",
    name: "career-hero-engineer-alexander.png",
    alt: "Professional male engineer in work safety gear",
    field: "image1",
  },
  {
    file: "assets/images/external/b4e4d0d17c1c.png",
    name: "career-hero-devops-maria.png",
    alt: "Young female IT specialist working on laptop",
    field: "image2",
  },
];

async function uploadImage(filePath, name) {
  const fullPath = path.join(DESIGN_ROOT, filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }

  const form = new FormData();
  form.append("files", fs.createReadStream(fullPath), {
    filename: name,
    contentType: "image/png",
  });
  form.append("fileInfo", JSON.stringify({ name, alternativeText: name }));

  console.log(`Uploading ${name}...`);
  const res = await fetch(`${STRAPI_BASE}/api/upload`, {
    method: "POST",
    body: form,
    headers: form.getHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  console.log(`  Uploaded: ID=${data[0].id}, URL=${data[0].url}`);
  return data[0];
}

async function getPage() {
  const res = await fetch(
    `${STRAPI_BASE}/api/pages/${PAGE_DOCUMENT_ID}?populate[hero][populate]=*`
  );
  if (!res.ok) throw new Error(`Failed to get page: ${res.status}`);
  const data = await res.json();
  return data.data;
}

async function updatePageHero(pageId, heroData) {
  const res = await fetch(`${STRAPI_BASE}/api/pages/${pageId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: { hero: heroData } }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to update page: ${res.status} ${text}`);
  }
  return res.json();
}

async function main() {
  console.log("=== Uploading Career Hero Images to Strapi ===\n");

  // Upload all images
  const uploadedImages = {};
  for (const img of IMAGES) {
    try {
      const result = await uploadImage(img.file, img.name);
      uploadedImages[img.field] = result;
    } catch (e) {
      console.error(`Error uploading ${img.name}:`, e.message);
    }
  }

  console.log("\n=== Updating Career Page Hero ===\n");

  // Get current page
  const page = await getPage();
  console.log(`Page: ${page.title} (template: ${page.template})`);

  // Build hero data
  const heroData = {
    title: "Строим будущее вместе: инженеры и IT-лидеры",
    subtitle: "Присоединяйтесь к команде, где традиции надежной инфраструктуры встречаются с прорывными технологиями завтрашнего дня. Мы создаем цифровой каркас города.",
  };
  
  // Set background image
  if (uploadedImages.backgroundImage) {
    heroData.backgroundImage = uploadedImages.backgroundImage.id;
  }

  // Add CTA buttons
  heroData.ctaButtons = [
    {
      text: "Смотреть вакансии",
      href: "#vacancies",
      style: "primary",
    },
    {
      text: "Узнать больше",
      href: "#values",
      style: "outline",
    },
  ];

  console.log("Hero data:", JSON.stringify(heroData, null, 2));

  // Update page
  const result = await updatePageHero(PAGE_DOCUMENT_ID, heroData);
  console.log("\n=== Done! Page updated successfully ===");
  
  // Print uploaded images info for reference
  console.log("\n=== Uploaded Images ===");
  for (const [field, img] of Object.entries(uploadedImages)) {
    console.log(`${field}: ${img.url}`);
  }
  
  return result;
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
