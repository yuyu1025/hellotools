// Small formatting helpers shared by pages and components. All deterministic:
// they run at build time and never touch the browser.

export function formatStars(count: number): string {
  if (count >= 10_000) {
    const w = count / 10_000;
    return `${w >= 10 ? Math.round(w) : w.toFixed(1)} 万`;
  }
  if (count >= 1_000) {
    const k = count / 1_000;
    return `${k >= 10 ? Math.round(k) : k.toFixed(1)}k`;
  }
  return String(count);
}

export function formatDate(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, '.');
}

/** 2021-10 → 2021 年 10 月 */
export function formatMonth(iso: string): string {
  const [y, m] = iso.split('-');
  return `${y} 年 ${Number(m)} 月`;
}

export function relativeDays(days: number): string {
  if (days <= 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 30) return `${days} 天前`;
  if (days < 365) return `${Math.round(days / 30)} 个月前`;
  return `${(days / 365).toFixed(1)} 年前`;
}

export function truncate(text: string, max = 140): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).replace(/[,，、;；:：]$/, '')}…`;
}

export function licenseLabel(spdx: string | null): string {
  if (!spdx) return '未标注';
  if (spdx === 'NOASSERTION') return '自定义';
  return spdx;
}
