#!/usr/bin/env node
// Enrich every tool/library in work/items.json with live GitHub facts.
// Requires GH_TOKEN (or a logged-in `gh auth token`) — 2500+ repos on the
// unauthenticated API would hit the 60 req/h ceiling.
//
// Cache: work/github/<owner>__<repo>.json, refreshed when older than
// work/github/.meta.json's nextRefreshAt. Output: work/tools.json.

import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const TTL_HOURS = 12;
const CONCURRENCY = Number(process.env.ENRICH_CONCURRENCY ?? 4);
const DIR = 'work/github';
const META = join(DIR, '.meta.json');

const token =
  process.env.GH_TOKEN ||
  process.env.GITHUB_TOKEN ||
  (() => {
    try {
      return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim();
    } catch {
      return '';
    }
  })();

if (!token) throw new Error('need GH_TOKEN, GITHUB_TOKEN, or a logged-in gh CLI');

const now = Date.now();
const readJson = async (p, fallback) => {
  try {
    return JSON.parse(await readFile(p, 'utf8'));
  } catch {
    return fallback;
  }
};

const cacheName = (fullName) => join(DIR, `${fullName.replace('/', '__')}.json`);

async function fetchRepo(fullName) {
  const path = cacheName(fullName);
  const cached = await readJson(path, null);
  if (cached && now - new Date(cached.fetchedAt).getTime() < TTL_HOURS * 3600_000) return cached;

  const res = await fetch(`https://api.github.com/repos/${fullName}`, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'hellotools-bot/1.0',
    },
  });

  if (res.status === 404) {
    const gone = { full_name: fullName, gone: true, fetchedAt: new Date().toISOString() };
    await writeFile(path, JSON.stringify(gone));
    return gone;
  }
  if (res.status === 403 || res.status === 429) {
    const reset = Number(res.headers.get('x-ratelimit-reset') || 0) * 1000;
    throw new Error(`rate limited on ${fullName}; resets ${new Date(reset || now + 60_000).toISOString()}`);
  }
  if (!res.ok) throw new Error(`${fullName}: HTTP ${res.status}`);

  const r = await res.json();
  const facts = {
    full_name: fullName,
    fetchedAt: new Date().toISOString(),
    stars: r.stargazers_count,
    forks: r.forks_count,
    openIssues: r.open_issues_count,
    pushedAt: r.pushed_at,
    createdAt: r.created_at,
    archived: r.archived,
    disabled: r.disabled,
    license: r.license?.spdx_id ?? null,
    language: r.language ?? null,
    homepage: r.homepage || null,
    topics: r.topics ?? [],
    description: r.description ?? null,
    defaultBranch: r.default_branch,
  };
  await writeFile(path, JSON.stringify(facts));
  return facts;
}

async function main() {
  await mkdir(DIR, { recursive: true });
  const items = await readJson('work/items.json', null);
  if (!items) throw new Error('work/items.json missing; run scripts/collect.mjs');

  const pending = items.filter((i) => i.kind === 'tool' || i.kind === 'library');
  let cursor = 0;
  const failures = [];

  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (cursor < pending.length) {
      const item = pending[cursor++];
      try {
        await fetchRepo(item.full_name);
      } catch (err) {
        failures.push(err.message);
        if (/rate limited/.test(err.message)) cursor = pending.length;
      }
    }
  });
  await Promise.all(workers);

  const tools = [];
  for (const item of pending) {
    const facts = await readJson(cacheName(item.full_name), null);
    if (!facts || facts.gone || facts.disabled) continue;
    tools.push({
      ...item,
      facts: {
        stars: facts.stars,
        forks: facts.forks,
        openIssues: facts.openIssues,
        pushedAt: facts.pushedAt,
        createdAt: facts.createdAt,
        archived: facts.archived,
        license: facts.license,
        language: facts.language,
        homepage: facts.homepage,
        topics: facts.topics,
        // Last-resort blurb when HelloGitHub's paragraph is unusable.
        description: facts.description,
      },
    });
  }

  await writeFile('work/tools.json', JSON.stringify(tools, null, 0));
  await writeFile(
    META,
    JSON.stringify({ refreshedAt: new Date().toISOString(), count: tools.length, pending: pending.length }),
  );
  console.log(`enriched ${tools.length}/${pending.length} -> work/tools.json`);
  if (failures.length) {
    console.error(`${failures.length} failure(s):\n  ${failures.slice(0, 10).join('\n  ')}`);
    process.exitCode = 1;
  }
}

main();
