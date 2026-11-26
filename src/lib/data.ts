// Build-time access to the generated data files. Everything is typed loosely on
// purpose: the JSON is produced by scripts/build-data.mjs and validated there.

import { readFile } from 'node:fs/promises';
import { CATEGORY_IDS, maintenanceState } from './categories.mjs';
import { CATEGORY_COPY, STATE_COPY } from './site';

export interface ToolFacts {
  slug: string;
  fullName: string;
  name: string;
  url: string;
  homepage: string | null;
  category: string;
  tagline: string;
  note: string | null;
  featured: boolean;
  verified: boolean;
  source: string;
  firstSeen: string;
  volume: number;
  language: string | null;
  topics: string[];
  stars: number;
  forks: number;
  openIssues: number;
  pushedAt: string;
  createdAt: string;
  license: string | null;
  state: 'live' | 'busy' | 'dormant' | 'stale' | 'archived';
}

export interface SiteMeta {
  updatedAt: string;
  total: number;
  verified: number;
  byCategory: Record<string, number>;
  byState: Record<string, number>;
}

let cache: ToolFacts[] | null = null;

export async function getTools(): Promise<ToolFacts[]> {
  if (!cache) {
    cache = JSON.parse(await readFile(new URL('../../data/tools.json', import.meta.url), 'utf8'));
  }
  return cache!;
}

export async function getMeta(): Promise<SiteMeta> {
  return JSON.parse(await readFile(new URL('../../data/meta.json', import.meta.url), 'utf8'));
}

export function categoryLabel(id: string): string {
  return CATEGORY_COPY[id as keyof typeof CATEGORY_COPY]?.label ?? id;
}

export function categoryBlurb(id: string): string {
  return CATEGORY_COPY[id as keyof typeof CATEGORY_COPY]?.blurb ?? '';
}

export function stateLabel(state: ToolFacts['state']): string {
  return STATE_COPY[state]?.label ?? state;
}

export function stateHint(state: ToolFacts['state']): string {
  return STATE_COPY[state]?.hint ?? '';
}

/** Days since the last push, as of the build. */
export function daysSincePush(tool: ToolFacts, now = Date.now()): number {
  return Math.max(0, Math.floor((now - new Date(tool.pushedAt).getTime()) / 86_400_000));
}

export function yearsSince(iso: string, now = Date.now()): number {
  return (now - new Date(iso).getTime()) / (365.25 * 86_400_000);
}

/**
 * A rough "is this still a thing" score used for the front-page shortlist.
 * Stars earn trust logarithmically, recency decays, and a dead project is
 * demoted regardless of its star count.
 */
export function rank(tool: ToolFacts, now = Date.now()): number {
  const starScore = Math.log10(Math.max(10, tool.stars));
  const recency = Math.exp(-daysSincePush(tool, now) / 540);
  const penalty = tool.state === 'archived' ? 0.35 : tool.state === 'stale' ? 0.6 : 1;
  return starScore * recency * penalty;
}

export function byStars(a: ToolFacts, b: ToolFacts): number {
  return b.stars - a.stars;
}

export function byRecent(a: ToolFacts, b: ToolFacts): number {
  return b.pushedAt.localeCompare(a.pushedAt);
}

export function byFirstSeen(a: ToolFacts, b: ToolFacts): number {
  return b.firstSeen.localeCompare(a.firstSeen) || b.volume - a.volume;
}

/** Categories in display order, each with its published tools. */
export async function groupedByCategory() {
  const tools = await getTools();
  return CATEGORY_IDS.map((id) => ({
    id,
    label: categoryLabel(id),
    blurb: categoryBlurb(id),
    tools: tools.filter((t) => t.category === id),
  })).filter((group) => group.tools.length > 0);
}

export { maintenanceState };
