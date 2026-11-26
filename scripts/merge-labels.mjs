#!/usr/bin/env node
// Sorts a classification result file into the pipeline's two committed maps,
// so a later re-run of the label pass cannot silently change a kind:
//   <result>.json  [ ["owner/repo", "<label>"], ... ]
//   - kind label   -> data/labels.json        { full_name: kind }
//   - category id  -> data/category-map.json  { full_name: category }  (kind=tool only)
//
// Usage: node scripts/merge-labels.mjs work/classify/part-0.json ...

import { readFile, writeFile } from 'node:fs/promises';
import { CATEGORY_IDS } from '../src/lib/categories.mjs';

const KINDS = new Set(['tool', 'library', 'resource', 'model', 'other']);
// legacy names from the first classification pass
const ALIASES = { lib: 'library', library: 'library', list: 'resource', book: 'resource' };
const labels = JSON.parse(await readFile('data/labels.json', 'utf8'));
const categories = JSON.parse(await readFile('data/category-map.json', 'utf8'));
const errors = [];

for (const path of process.argv.slice(2)) {
  const rows = JSON.parse(await readFile(path, 'utf8'));
  for (const row of rows) {
    const [fullName, label] = Array.isArray(row) ? row : [row.full_name, row.label];
    if (!fullName || typeof fullName !== 'string') {
      errors.push(`${path}: row without full_name`);
      continue;
    }
    const kind = ALIASES[label] ?? label;
    if (KINDS.has(kind)) labels[fullName] = kind;
    else if (CATEGORY_IDS.includes(label)) {
      categories[fullName] = label;
      labels[fullName] ??= 'tool';
    } else errors.push(`${path}: ${fullName} has unknown label "${label}"`);
  }
}

if (errors.length) {
  console.error(errors.slice(0, 20).join('\n'));
  process.exit(1);
}

const sorted = (obj) =>
  Object.fromEntries(Object.keys(obj).sort().map((k) => [k, obj[k]]));

await writeFile('data/labels.json', JSON.stringify(sorted(labels)));
await writeFile('data/category-map.json', JSON.stringify(sorted(categories)));
console.log(`labels ${Object.keys(labels).length}, categories ${Object.keys(categories).length}`);
