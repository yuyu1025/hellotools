// Single source of truth for categories and the maintenance model.
// Every tool in data/tools.json must use one of these ids.

export const CATEGORIES = [
  {
    id: 'devtools',
    label: 'Dev Tools',
    blurb: "The instruments a programmer touches every day: editors, terminals, git UIs, API clients, linters, package tooling.",
  },
  {
    id: 'ai',
    label: 'AI',
    blurb: 'Local model runners, chat front-ends, image and speech pipelines, agent frameworks you actually run.',
  },
  {
    id: 'media',
    label: 'Media',
    blurb: 'Players, editors, converters, recorders and streamers for audio, video and images.',
  },
  {
    id: 'network',
    label: 'Network',
    blurb: 'Proxies, tunnels, scanners, sniffers, downloaders and anything else that moves bytes across a wire.',
  },
  {
    id: 'privacy',
    label: 'Privacy',
    blurb: 'Self-hosted personal cloud, password vaults, encrypted notes and anti-tracking.'
  },
  {
    id: 'data',
    label: 'Data',
    blurb: 'Databases, dashboards, query tools, notebooks and everything that makes rows legible.',
  },
  {
    id: 'productivity',
    label: 'Productivity',
    blurb: 'Notes, docs, tasks, mail, calendars, translation and reference managers.',
  },
  {
    id: 'desktop',
    label: 'Desktop',
    blurb: 'Window managers, launchers, file managers and system utilities outside the developer lane.',
  },
  {
    id: 'sysops',
    label: 'SysOps',
    blurb: 'Deployment, monitoring, containers, CI and self-hosted infrastructure.',
  },
  {
    id: 'web',
    label: 'Web',
    blurb: 'Platforms you open in a browser: forums, CMS, admin panels, pastebins and multiplayer tools.',
  },
  {
    id: 'hardware',
    label: 'Hardware',
    blurb: 'Firmware, flashing, embedded tooling, IoT bridges and keyboard or printer firmware.',
  },
  {
    id: 'fun',
    label: 'Fun',
    blurb: 'Terminal toys, screensavers, demos and generative art. Useless on purpose.',
  },
  {
    id: 'library',
    label: 'Library',
    blurb: 'Code you import instead of run: SDKs, frameworks, parsers and language tooling.',
  },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

// Maintenance health, derived only from GitHub facts so it can never go stale
// by hand. Order matters: the first matching rule wins.
export const STALE_DAYS = 365;
export const DORMANT_DAYS = 180;
export const DEAD_ISSUES = 400;

export const STATE_META = {
  live: { label: 'Live', tone: 'good', blurb: 'Recent commits, open issues under control.' },
  busy: { label: 'Busy', tone: 'warn', blurb: 'Active, but the issue tracker is piling up.' },
  dormant: { label: 'Dormant', tone: 'warn', blurb: 'No commits in six months.' },
  stale: { label: 'Stale', tone: 'bad', blurb: 'No commits in a year.' },
  archived: { label: 'Archived', tone: 'bad', blurb: 'The maintainer archived the repository.' },
};

export function maintenanceState(facts, now = Date.now()) {
  if (facts.archived) return 'archived';
  const days = Math.floor((now - new Date(facts.pushedAt).getTime()) / 86_400_000);
  if (days > STALE_DAYS) return 'stale';
  if (days > DORMANT_DAYS) return 'dormant';
  if (facts.openIssues > DEAD_ISSUES) return 'busy';
  return 'live';
}
