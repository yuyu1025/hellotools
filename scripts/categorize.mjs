#!/usr/bin/env node
// Produce work/categories.json: { "<full_name>": "<category id>" }.
//
// The category of each non-library tool comes from a classification pass
// (journaled as data/category-map.json). This script validates that map against
// work/items.json and reports anything unclassified or invalid — it never
// guesses, because a wrong bucket is worse than no bucket.

import { readFile, writeFile } from 'node:fs/promises';
import { CATEGORY_IDS } from '../src/lib/categories.mjs';

const readJson = async (path, fallback) => {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
};

async function main() {
  const items = await readJson('work/items.json', null);
  if (!items) throw new Error('work/items.json missing; run scripts/collect.mjs');
  const map = await readJson('data/category-map.json', {});

  const bad = [];
  const missing = [];
  for (const item of items) {
    if (item.kind !== 'tool') continue;
    const category = map[item.full_name];
    if (!category) missing.push(item.full_name);
    else if (!CATEGORY_IDS.includes(category)) bad.push(`${item.full_name}: ${category}`);
  }

  await writeFile('work/categories.json', JSON.stringify(map));
  console.log(`category map: ${Object.keys(map).length} entries, ${missing.length} tool(s) unclassified`);
  if (bad.length) console.error(`invalid category:\n  ${bad.slice(0, 20).join('\n  ')}`);
  if (missing.length) {
    console.error(`unclassified (first 20):\n  ${missing.slice(0, 20).join('\n  ')}`);
    process.exitCode = 1;
  }
}

main();
