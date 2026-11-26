#!/usr/bin/env node
// Flatten every crawled volume into work/items.json, carrying the curated
// kind and category maps from data/.
//
// Only two kinds become site entries: `tool` (an app you install or open) and
// `library` (a dependency you import). Everything else — resource lists, books,
// models, datasets — is labelled for the record but never published.
//
// data/labels.json:       { "<full_name>": "<kind>" }
// data/category-map.json: { "<full_name>": "<category>" } for every kind=tool item

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const VOLUME_DIR = 'work/volumes';
const LABELS = 'data/labels.json';
const CATEGORIES = 'data/category-map.json';
const OUT = 'work/items.json';
const SITE_KINDS = new Set(['tool', 'library']);

const readJson = async (p, fallback) => {
  try {
    return JSON.parse(await readFile(p, 'utf8'));
  } catch {
    return fallback;
  }
};

async function main() {
  await mkdir('work', { recursive: true });
  const labels = await readJson(LABELS, {});
  const categoryMap = await readJson(CATEGORIES, {});
  const files = (await readdir(VOLUME_DIR)).filter((f) => /^v\d+\.json$/.test(f));
  if (!files.length) throw new Error(`no volumes in ${VOLUME_DIR}; run scripts/crawl-hellogithub.mjs`);

  const items = new Map();
  const unclassified = new Set();

  for (const file of files) {
    const volume = await readJson(join(VOLUME_DIR, file), null);
    const volumeNo = Number(file.slice(1, -5));
    for (const group of volume.data) {
      for (const item of group.items) {
        const kind = labels[item.full_name];
        if (!SITE_KINDS.has(kind)) continue;

        const existing = items.get(item.full_name);
        // A project can reappear in a later volume; keep the freshest stars/publish date.
        if (existing && existing.volume > volumeNo) continue;

        // A library has no domain (it is a dependency, not an app); everything
        // else takes the curated domain from data/category-map.json.
        const category = kind === 'library' ? 'library' : categoryMap[item.full_name];
        if (!category) unclassified.add(item.full_name);

        items.set(item.full_name, {
          full_name: item.full_name,
          name: item.name,
          url: item.github_url,
          kind,
          category: category ?? null,
          langCategory: group.category_name,
          description: (item.description || '').trim(),
          descriptionEn: (item.description_en || '').trim(),
          image: item.image_path || '',
          stars: item.stars,
          forks: item.forks,
          volume: volumeNo,
          publishedAt: (volume.publish_at || '').slice(0, 10),
        });
      }
    }
  }

  const list = [...items.values()].sort((a, b) => a.full_name.localeCompare(b.full_name));
  await writeFile(OUT, JSON.stringify(list, null, 0));

  const byKind = list.reduce((acc, i) => ((acc[i.kind] = (acc[i.kind] || 0) + 1), acc), {});
  console.log(`items ${list.length} ${JSON.stringify(byKind)} -> ${OUT}`);
  if (unclassified.size) {
    console.error(`${unclassified.size} tool(s) have no category in ${CATEGORIES}:`);
    console.error(`  ${[...unclassified].slice(0, 20).join('\n  ')}`);
    process.exitCode = 1;
  }
}

main();
