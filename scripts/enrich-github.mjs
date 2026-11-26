#!/usr/bin/env node
// Refresh the live GitHub facts for every tool/library in work/items.json.
//
// The result lives in data/facts.json and is committed: it is the only place
// the site's stars / issues / push dates come from, and a fresh checkout has
// nothing else to go on.
//
// Rate limits are the whole design constraint here. A GitHub Actions
// GITHUB_TOKEN gets 1,000 requests per hour per repository, and we have ~3,400
// repos, so a naive sweep cannot fit in one run. Two things make it fit:
//
//   1. Conditional requests. Every fetch carries the ETag from the previous
//      run; unchanged repos answer 304, which GitHub does not charge against
//      the rate limit. On a normal day almost nothing changed.
//   2. A hard budget. Only charged responses (200 / 404) count, and the sweep
//      stops at ENRICH_BUDGET (default 850) or when x-ratelimit-remaining runs
//      low. Repos are visited oldest-checked first, so a truncated run still
//      rotates through the whole catalogue instead of starving the tail.
//
// Requires GH_TOKEN, GITHUB_TOKEN, or a logged-in gh CLI.

import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const TTL_HOURS = Number(process.env.FACTS_TTL_HOURS ?? 20);
const BUDGET = Number(process.env.ENRICH_BUDGET ?? 850);
const REMAINING_FLOOR = Number(process.env.ENRICH_REMAINING_FLOOR ?? 60);
const CONCURRENCY = Number(process.env.ENRICH_CONCURRENCY ?? 4);
const FACTS = 'data/facts.json';

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

const readJson = async (path, fallback) => {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
};

const now = Date.now();
const stale = (entry) =>
  !entry || !entry.checkedAt || now - new Date(entry.checkedAt).getTime() > TTL_HOURS * 3600_000;

const factsOf = (r) => ({
  stars: r.stargazers_count,
  forks: r.forks_count,
  openIssues: r.open_issues_count,
  pushedAt: r.pushed_at,
  createdAt: r.created_at,
  archived: r.archived,
  license: r.license?.spdx_id ?? null,
  language: r.language ?? null,
  homepage: r.homepage || null,
  topics: r.topics ?? [],
  description: r.description ?? null,
});

async function main() {
  const items = await readJson('work/items.json', null);
  if (!items) throw new Error('work/items.json missing; run scripts/collect.mjs');
  const store = await readJson(FACTS, { updatedAt: null, repos: {} });
  const repos = store.repos ?? {};

  const wanted = items
    .filter((i) => i.kind === 'tool' || i.kind === 'library')
    .map((i) => i.full_name);

  // Oldest first, so a budget-capped run spreads the refresh evenly.
  const queue = wanted
    .filter((name) => stale(repos[name]))
    .sort((a, b) => String(repos[a]?.checkedAt ?? '').localeCompare(String(repos[b]?.checkedAt ?? '')));

  let cursor = 0;
  let charged = 0;
  let remaining = Infinity;
  let stop = null;
  const failures = [];

  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (cursor < queue.length) {
      if (stop) return;
      if (charged >= BUDGET) {
        stop = 'budget';
        return;
      }
      if (remaining < REMAINING_FLOOR) {
        stop = 'remaining';
        return;
      }

      const fullName = queue[cursor++];
      const prev = repos[fullName];
      const headers = {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        'user-agent': 'hellotools-bot/1.0',
      };
      if (prev?.etag) headers['if-none-match'] = prev.etag;

      try {
        const res = await fetch(`https://api.github.com/repos/${fullName}`, { headers });
        const left = Number(res.headers.get('x-ratelimit-remaining'));
        if (Number.isFinite(left)) remaining = Math.min(remaining, left);

        if (res.status === 304) {
          repos[fullName] = { ...prev, checkedAt: new Date().toISOString() };
          continue;
        }
        charged += 1;
        // 404 deleted, 410 gone, 451 blocked (DMCA / legal takedown) — all of
        // them mean the repo cannot be linked to any more.
        if (res.status === 404 || res.status === 410 || res.status === 451) {
          repos[fullName] = { gone: true, status: res.status, checkedAt: new Date().toISOString() };
          continue;
        }
        if (res.status === 403 || res.status === 429) {
          const reset = Number(res.headers.get('x-ratelimit-reset') || 0) * 1000;
          throw new Error(
            `rate limited on ${fullName}; resets ${new Date(reset || now + 60_000).toISOString()}`,
          );
        }
        if (!res.ok) throw new Error(`${fullName}: HTTP ${res.status}`);

        const r = await res.json();
        repos[fullName] = {
          ...factsOf(r),
          etag: res.headers.get('etag') ?? null,
          checkedAt: new Date().toISOString(),
        };
      } catch (err) {
        failures.push(err.message);
        if (/rate limited/.test(err.message)) stop = 'rate limited';
      }
    }
  });
  await Promise.all(workers);

  // Drop repos that left the catalogue (removed from HelloGitHub / editorial).
  const keep = new Set(wanted);
  for (const name of Object.keys(repos)) if (!keep.has(name)) delete repos[name];

  await writeFile(
    FACTS,
    `${JSON.stringify({ updatedAt: new Date().toISOString(), repos }, null, 0)}\n`,
  );

  const live = Object.values(repos).filter((r) => !r.gone).length;
  console.log(
    `facts: ${live} live / ${wanted.length} wanted, ${queue.length} due, ` +
      `${charged} charged requests, stopped by ${stop ?? 'queue end'}`,
  );
  if (failures.length) {
    console.error(`${failures.length} failure(s):\n  ${failures.slice(0, 10).join('\n  ')}`);
    process.exitCode = 1;
  } else if (stop !== 'budget' && queue.length > cursor) {
    // Truncated without hitting the budget means something aborted the sweep.
    console.error(`sweep stopped early (${stop}) with ${queue.length - cursor} repos unchecked`);
    process.exitCode = 1;
  }
}

main();
