// Small time-zone helpers shared by the hero clocks, the 24-hour chart and the globe.
export const IST = 'Asia/Kolkata';

const fmts = new Map<string, Intl.DateTimeFormat>();
const partsFmt = (tz: string) => {
  let f = fmts.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    fmts.set(tz, f);
  }
  return f;
};

export interface ZoneParts { year: number; month: number; day: number; hour: number; minute: number; second: number }

export function zoneParts(tz: string, d: Date): ZoneParts {
  const p: Record<string, number> = {};
  for (const x of partsFmt(tz).formatToParts(d)) if (x.type !== 'literal') p[x.type] = +x.value;
  return p as unknown as ZoneParts;
}

/** Minutes the zone is ahead of UTC at instant `d`. */
export function offsetMin(tz: string, d: Date): number {
  const p = zoneParts(tz, d);
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUTC - Math.floor(d.getTime() / 1000) * 1000) / 60000);
}

/** Minutes since local midnight in `tz` at instant `d`. */
export function minuteOfDay(tz: string, d: Date): number {
  const p = zoneParts(tz, d);
  return p.hour * 60 + p.minute;
}

/** UTC milliseconds of 00:00 today (local date in `tz`). */
export function dayStartUTC(tz: string, now = new Date()): number {
  const p = zoneParts(tz, now);
  return Date.UTC(p.year, p.month - 1, p.day, 0, 0, 0) - offsetMin(tz, now) * 60000;
}

export const pad = (n: number) => String(n).padStart(2, '0');
export const hm = (mins: number) => {
  const m = ((Math.round(mins) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
};
export const fmtOffset = (m: number) => {
  const a = Math.abs(m);
  return `UTC${m < 0 ? '−' : '+'}${pad(Math.floor(a / 60))}:${pad(a % 60)}`;
};
export const cityOf = (tz: string) => tz.split('/').pop()!.replace(/_/g, ' ');

/** The visitor's zone, unless they are already on IST: then a configured onshore zone. */
export function primaryOnshore(fallbackZone: string, fallbackLabel: string) {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  if (zone === IST || zone === 'Asia/Calcutta') return { zone: fallbackZone, name: fallbackLabel, visitor: false };
  return { zone, name: 'Your time', visitor: true };
}
