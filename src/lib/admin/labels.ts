// Shared presentation helpers for admin analytics surfaces (Analyse, Spillere).
// Tailwind colour utilities are intentional here (admin = shadcn + utilities).

export const DIFF_COLOR: Record<string, string> = { easy: 'bg-emerald-500', common: 'bg-sky-500', hard: 'bg-amber-500', all: 'bg-slate-400' }
export const MODE_COLOR: Record<string, string> = { photo: 'bg-violet-500', name: 'bg-rose-500', mixed: 'bg-teal-500' }
export const DEVICE_COLOR: Record<string, string> = { mobile: 'bg-sky-500', desktop: 'bg-violet-500', tablet: 'bg-amber-500' }

export function difficultyLabel(d: string): string {
  return { easy: 'Lette', common: 'Almindelige', hard: 'Svære', all: 'Alle' }[d] ?? d
}

export function modeLabel(m: string): string {
  return { photo: 'Foto', name: 'Navn', mixed: 'Blandet' }[m] ?? m
}

export function deviceLabel(d: string): string {
  return { mobile: 'Mobil', desktop: 'Computer', tablet: 'Tablet' }[d] ?? d
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return '—'
  const s = Math.round(ms / 1000)
  const m = Math.floor(s / 60)
  return m === 0 ? `${s}s` : `${m}m ${s % 60}s`
}

export function accuracyColor(pct: number): string {
  return pct < 30 ? 'text-red-600' : pct < 50 ? 'text-amber-600' : 'text-muted-foreground'
}

/** Display name for a player. Names were removed (#45) so most are anonymous —
 *  fall back to a stable short id so players are still distinguishable. */
export function playerLabel(guestName: string | null, guestId: string | null): string {
  return guestName || (guestId ? `Gæst ${guestId.slice(0, 6)}` : 'Anonym')
}

/** Short Danish relative time, e.g. "5 min siden", "3 t siden", "2 d siden". */
export function relativeTimeDa(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (min < 1) return 'lige nu'
  if (min < 60) return `${min} min siden`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `${hrs} t siden`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days} d siden`
  return `${Math.floor(days / 30)} mdr siden`
}
