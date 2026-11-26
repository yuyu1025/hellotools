#!/usr/bin/env node
// Fetch every HelloGitHub monthly volume and keep only the raw item list.
// Output: work/volumes/v<N>.json  (raw pageProps.volume per volume, cached)

import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const OUT_DIR = 'work/volumes';
const FIRST = 1;
const LAST = Number(process.env.HG_LAST_VOLUME ?? 127);
const CONCURRENCY = 6;

const exists = (p) => access(p).then(() => true, () => false);

async function fetchVolume(n) {
  const path = join(OUT_DIR, `v${n}.json`);
  if (await exists(path)) return { n, cached: true };
  const res = await fetch(`https://hellogithub.com/periodical/volume/${n}`, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; hellotools-bot/1.0)' },
  });
  if (!res.ok) throw new Error(`volume ${n}: HTTP ${res.status}`);
  const html = await res.text();
  const m = html.match(/id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error(`volume ${n}: __NEXT_DATA__ not found`);
  const volume = JSON.parse(m[1]).props?.pageProps?.volume;
  if (!volume || !Array.isArray(volume.data)) throw new Error(`volume ${n}: empty payload`);
  await writeFile(path, JSON.stringify(volume));
  return { n, cached: false };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const volumes = [];
  for (let n = FIRST; n <= LAST; n++) volumes.push(n);

  let cursor = 0;
  const failures = [];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (cursor < volumes.length) {
      const n = volumes[cursor++];
      try {
        await fetchVolume(n);
      } catch (err) {
        failures.push(`${n}: ${err.message}`);
      }
    }
  });
  await Promise.all(workers);

  if (failures.length) {
    console.error(`${failures.length} volume(s) failed:\n  ${failures.join('\n  ')}`);
    process.exitCode = 1;
    return;
  }
  console.log(`crawled volumes ${FIRST}-${LAST}`);
}

main();
