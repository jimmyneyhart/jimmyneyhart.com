// Small build-time formatters. No locale surprises — fixed UTC output so the
// rendered HTML is deterministic across build machines.

const MONTHS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

/** "2026-06-19T..." → "19 JUN 2026" */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Two-digit ordinal: 1 → "01" */
export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** 12345 → "12,345" (deterministic, no locale dependency). */
export function fmtInt(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
