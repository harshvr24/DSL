// "Follow the sun": drives the 24-hour chart, the read-out and the globe from one
// value, minutes since local midnight. Scroll scrubs it when the stage is pinned
// (see motion.ts); the range input always works, with or without motion.
import { places, sunStates } from '../content';
import { IST, primaryOnshore, dayStartUTC, minuteOfDay, offsetMin, hm, cityOf } from './time';

type Globe = { setTime(ms: number, status: Record<string, boolean>): void; setLand(l: number[][]): void };

export interface SunController {
  /** 0..1 across the pinned track */
  setProgress(p: number): void;
  track: HTMLElement;
  stage: HTMLElement;
}

function init(): SunController | null {
  const root = document.querySelector<HTMLElement>('[data-sun]');
  const track = root?.querySelector<HTMLElement>('[data-sun-track]');
  const stage = root?.querySelector<HTMLElement>('[data-sun-stage]');
  const day = root?.querySelector<HTMLElement>('[data-day]');
  if (!root || !track || !stage || !day) return null;

  const primary = primaryOnshore(root.dataset.fallbackZone || 'America/New_York', root.dataset.fallbackLabel || 'Client');
  const start = dayStartUTC(primary.zone);
  const now = new Date();
  const city = cityOf(primary.zone);

  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel);
  const zoneEl = $('[data-sun-zone]'), timeEl = $('[data-sun-time]');
  const stateT = $('[data-sun-state-t]'), stateD = $('[data-sun-state-d]');
  const nowEl = $('[data-day-now]'), nowLabel = $('[data-day-now-label]');
  const range = $<HTMLInputElement>('[data-day-range]');
  const rows = places.map((p) => ({
    p,
    row: $(`[data-place="${p.id}"]`),
    time: $(`[data-place="${p.id}"] [data-place-time]`),
    status: $(`[data-place="${p.id}"] [data-place-status]`),
    label: $(`[data-label="${p.id}"] [data-label-time]`),
  }));
  if (zoneEl) zoneEl.textContent = primary.visitor ? `Your time · ${city}` : `Client time · ${primary.name}`;

  // ---- static part of the chart: the two working windows in the primary zone ----
  const shift = (offsetMin(IST, now) - offsetMin(primary.zone, now)) / 60;   // hours IST is ahead
  const onS = 9, onE = 18, offLen = 9;
  const offS = (((9.5 - shift) % 24) + 24) % 24;
  const pct = (h: number) => `${(h / 24) * 100}%`;
  const setBar = (sel: string, s: number, len: number) => {
    const el = day.querySelector<HTMLElement>(sel);
    if (el) { el.style.left = pct(s); el.style.width = pct(len); el.style.display = len > 0 ? 'block' : 'none'; }
  };
  setBar('[data-bar="on"]', onS, onE - onS);
  const wraps = offS + offLen > 24;
  setBar('[data-bar="off"]', offS, wraps ? 24 - offS : offLen);
  setBar('[data-bar="off2"]', 0, wraps ? offS + offLen - 24 : 0);
  const segs: [number, number][] = wraps ? [[offS, 24], [0, offS + offLen - 24]] : [[offS, offS + offLen]];
  let ov: [number, number] | null = null;
  for (const [s, e] of segs) { const lo = Math.max(s, onS), hi = Math.min(e, onE); if (hi > lo) ov = [lo, hi]; }
  const ovEl = day.querySelector<HTMLElement>('[data-overlap]');
  if (ovEl) { if (ov) { ovEl.style.left = pct(ov[0]); ovEl.style.width = pct(ov[1] - ov[0]); } else ovEl.style.display = 'none'; }
  const cap = day.querySelector('[data-day-cap]');
  if (cap) {
    const h = (x: number) => hm(x * 60);
    const ovTxt = ov ? `Overlap ${h(ov[0])}–${h(ov[1])}: stand-up and hand-over happen live.` : 'No natural overlap: the hand-over is written, and part of the squad shifts hours to meet.';
    cap.textContent = `24 hours in ${city} time. Above the line: onshore, ${h(onS)}–${h(onE)}. Below: Delhi, ${h(offS)}–${h(offS + offLen)} (09:30–18:30 IST). ${ovTxt}`;
  }

  // ---- the moving part ----
  let globe: Globe | null = null;
  let minutes = -1;
  let lastInput = 0;

  const setMinutes = (mRaw: number) => {
    const m = Math.max(0, Math.min(1439, Math.round(mRaw)));
    if (m === minutes) return;
    minutes = m;
    const utc = start + m * 60000;
    const d = new Date(utc);
    const working: Record<string, boolean> = {};

    for (const r of rows) {
      const lm = minuteOfDay(r.p.zone, d);
      const on = lm >= r.p.start && lm < r.p.end;
      working[r.p.id] = on;
      const t = hm(lm);
      if (r.time) r.time.textContent = t;
      if (r.label) r.label.textContent = t;
      if (r.status) r.status.textContent = on ? 'At work' : 'Off';
      r.row?.setAttribute('data-working', String(on));
    }

    const onshore = m >= onS * 60 && m < onE * 60;
    const key = onshore && working.in ? 'both' : onshore ? 'onshore' : working.in ? 'offshore' : 'none';
    if (stateT && stateT.dataset.key !== key) {
      stateT.dataset.key = key;
      stateT.textContent = sunStates[key].t;
      if (stateD) stateD.textContent = sunStates[key].d;
    }
    const t = hm(m);
    if (timeEl) timeEl.textContent = t;
    if (nowLabel) nowLabel.textContent = t;
    if (nowEl) nowEl.style.left = `${(m / 1440) * 100}%`;
    if (range) {
      if (performance.now() - lastInput > 250) range.value = String(m);
      range.setAttribute('aria-valuetext', `${t}. ${sunStates[key].t}`);
    }
    globe?.setTime(utc, working);
  };

  const pinned = () => document.documentElement.classList.contains('sun-pin');

  range?.addEventListener('input', () => {
    lastInput = performance.now();
    const m = +range.value;
    setMinutes(m);
    if (pinned()) {
      // keep scroll position as the single source of truth while the stage is pinned
      const top = track.getBoundingClientRect().top + window.scrollY;
      const span = track.offsetHeight - stage.offsetHeight;
      window.scrollTo({ top: top - (parseFloat(getComputedStyle(stage).top) || 0) + (m / 1439) * span, behavior: 'instant' as ScrollBehavior });
    }
  });

  // start on the real current time; a 30 s tick keeps it live until the visitor takes over
  setMinutes(minuteOfDay(primary.zone, now));
  const live = window.setInterval(() => {
    if (pinned() || lastInput) return window.clearInterval(live);
    setMinutes(minuteOfDay(primary.zone, new Date()));
  }, 30000);

  // the globe and its coastline load only when the section is close
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    const host = root.querySelector<HTMLElement>('[data-globe]');
    if (!host) return;
    import('./globe').then(({ createGlobe }) => {
      globe = createGlobe(host, places);
      const m = minutes; minutes = -1; setMinutes(m);
      fetch('/data/land.json').then((r) => r.json()).then((l) => globe?.setLand(l)).catch(() => {});
    });
  }, { rootMargin: '120% 0px' });
  io.observe(root);

  return {
    track, stage,
    setProgress(p: number) {
      if (performance.now() - lastInput < 250) return;
      setMinutes(p * 1439);
    },
  };
}

export const sun = init();
