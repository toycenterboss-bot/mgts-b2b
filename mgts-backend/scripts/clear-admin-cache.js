#!/usr/bin/env node
/**
 * Clear Strapi admin cache/build artifacts.
 */

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const targets = [".cache", "build"];

for (const t of targets) {
  const dir = path.join(root, t);
  if (!fs.existsSync(dir)) continue;
  try {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`removed ${dir}`);
  } catch (err) {
    console.warn(`failed to remove ${dir}:`, err.message || err);
  }
}
