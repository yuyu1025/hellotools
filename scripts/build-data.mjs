#!/usr/bin/env node
// Merge work/tools.json (HelloGitHub + GitHub facts) with the editorial side
// (data/editorial.json, data/state.json) into the single file the site reads:
// data/tools.json.
//
// Field ownership:
//   tagline / note / featured  -> hand-written in data/editorial.json (never overwritten)
//   verified                   -> hand-maintained in data/state.json (tried and working)
//   stars / state / license …  -> derived from GitHub here, refreshed by CI
//
// Every slug must be unique and stable: it is the URL of the tool page.

import { readFile, writeFile } from 'node:fs/promises';
import { CATEGORY_IDS, maintenanceState } from '../src/lib/categories.mjs';

const readJson = async (path, fallback) => {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
};

const slugify = (fullName) =>
  fullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const cleanText = (text) =>
  (text || '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // markdown links -> label
    .replace(/[（(](?:英文|中文)[^）)]*[）)]/g, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1') // inline code -> plain text
    .replace(/\s+/g, ' ')
    .trim();

// The blurb HelloGitHub writes is a full paragraph, sometimes bilingual. The
// site is Chinese, so prefer the Chinese sentence; fall back to the English one
// only when there is no Chinese text at all.
function firstSentence(text) {
  const clean = cleanText(text);
  if (!clean) return '';
  const match = clean.split(/(?<=[。！？!?])\s*/)[0] || clean;
  return match.trim();
}

function taglineFrom(description, descriptionEn, repoDescription) {
  // HelloGitHub prefixes some entries with issue-editorial noise ("新！") that
  // means nothing once the blurb stands alone.
  const zh = firstSentence(description).replace(/^(新！|新增[：:]?|本期推荐[：:]?|推荐[：:]?)\s*/, '');
  const en = firstSentence(descriptionEn).replace(/^This (project|tool|repository) is /i, '');
  // A six-character blurb is a label, not a description; the GitHub repo
  // description is usually a better sentence than nothing.
  const fallback = cleanText(repoDescription);
  const source = zh.length >= 6 ? zh : en || fallback || zh;
  if (source.length <= 110) return source;
  const cut = source.slice(0, 110);
  const boundary = Math.max(cut.lastIndexOf('，'), cut.lastIndexOf('。'), cut.lastIndexOf(' '));
  return `${(boundary > 70 ? cut.slice(0, boundary) : cut).replace(/[,，;；:：]$/, '')}…`;
}

async function main() {
  const tools = await readJson('work/tools.json', null);
  if (!tools) throw new Error('work/tools.json missing; run scripts/enrich-github.mjs');
  const editorial = await readJson('data/editorial.json', {});
  const state = await readJson('data/state.json', { verified: [] });

  const errors = [];
  const seen = new Map();
  const curated = tools.filter((t) => editorial[t.full_name]?.drop !== true);

  const out = curated.map((tool) => {
    // The repo name alone collides (many repos are called "server" or "cli"),
    // so every slug carries its owner: "nextcloud-server", "httpie-cli".
    const slug = editorial[tool.full_name]?.slug || slugify(tool.full_name);
    if (seen.has(slug)) errors.push(`duplicate slug "${slug}": ${seen.get(slug)} and ${tool.full_name}`);
    seen.set(slug, tool.full_name);

    const own = editorial[tool.full_name] ?? {};
    const facts = tool.facts;
    const category = tool.kind === 'library' ? 'library' : tool.category;
    if (!CATEGORY_IDS.includes(category)) errors.push(`${tool.full_name}: bad category "${category}"`);

    return {
      slug,
      fullName: tool.full_name,
      name: own.name || tool.name,
      url: tool.url,
      homepage: facts.homepage || null,
      category,
      tagline: own.tagline || taglineFrom(tool.description, tool.descriptionEn, tool.facts?.description),
      note: own.note || null,
      featured: own.featured === true,
      verified: state.verified?.includes(tool.full_name) === true,
      source: 'hellogithub',
      firstSeen: tool.publishedAt,
      volume: tool.volume,
      language: facts.language,
      topics: facts.topics.slice(0, 6),
      stars: facts.stars,
      forks: facts.forks,
      openIssues: facts.openIssues,
      pushedAt: facts.pushedAt,
      createdAt: facts.createdAt,
      license: facts.license,
      state: maintenanceState(facts),
    };
  });

  out.sort((a, b) => Number(b.featured) - Number(a.featured) || b.stars - a.stars);
  await writeFile('data/tools.json', JSON.stringify(out, null, 0));

  const fresh = new Date().toISOString();
  await writeFile(
    'data/meta.json',
    JSON.stringify({
      updatedAt: fresh,
      total: out.length,
      verified: out.filter((t) => t.verified).length,
      byCategory: Object.fromEntries(
        CATEGORY_IDS.map((id) => [id, out.filter((t) => t.category === id).length]),
      ),
      byState: Object.fromEntries(
        ['live', 'busy', 'dormant', 'stale', 'archived'].map((s) => [s, out.filter((t) => t.state === s).length]),
      ),
    }) + '\n',
  );

  if (errors.length) {
    console.error(`\n${errors.length} data error(s):\n  ${errors.slice(0, 20).join('\n  ')}`);
    process.exitCode = 1;
    return;
  }
  console.log(`data/tools.json: ${out.length} tools, ${seen.size} slugs`);
}

main();
