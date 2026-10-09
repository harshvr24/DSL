// All scroll choreography. One IntersectionObserver handles the one-shot reveals (cheap,
// nothing measured up front); GSAP ScrollTrigger is kept for the five things that follow
// the scrollbar: the hero parting at the horizon, the globe's 24-hour scrub, the stack
// opening, the sideways timeline and the camera of the live sky.
// With reduced motion none of the animation runs and the page is static.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { sun } from './sun';
import type { Sky, SkyState } from './sky';

gsap.registerPlugin(ScrollTrigger, SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

const html = document.documentElement;
const params = new URLSearchParams(location.search);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const HEADER = 57;
const $ = <T extends HTMLElement>(s: string, root: ParentNode = document) => root.querySelector<T>(s);
const $$ = <T extends HTMLElement>(s: string, root: ParentNode = document) => Array.from(root.querySelectorAll<T>(s));
const idle = (fn: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1200 }) : setTimeout(fn, 60));

// ---------------------------------------------------------------- one-shot reveals
// Elements start hidden in CSS (html.js [data-reveal] …) and get `.is-in` here; GSAP animates
// *from* the hidden state so the end state is plain CSS.
type Enter = (el: HTMLElement) => void;
const enters = new Map<Element, Enter>();
const io = new IntersectionObserver((entries) => {
  const plain: HTMLElement[] = [];
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    io.unobserve(e.target);
    const fn = enters.get(e.target);
    if (fn) { enters.delete(e.target); fn(e.target as HTMLElement); } else plain.push(e.target as HTMLElement);
  }
  if (plain.length) {
    plain.forEach((el) => el.classList.add('is-in'));
    gsap.from(plain, { opacity: 0, y: 26, duration: 0.95, ease: 'power3.out', stagger: 0.07, clearProps: 'all' });
  }
}, { rootMargin: '0px 0px -7% 0px' });
const onEnter = (el: Element | null, fn: Enter) => { if (el) { enters.set(el, fn); io.observe(el); } };

function initReveals() {
  $$('[data-reveal]').forEach((el) => io.observe(el));

  // headings: split into lines only when they arrive, then let each line rise through its mask
  $$('[data-split]').forEach((el) => onEnter(el, () => {
    document.fonts.ready.then(() => {
      SplitText.create(el, {
        type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true, aria: 'none',
        onSplit(self) {
          el.classList.add('is-in');
          return gsap.from(self.lines, { yPercent: 112, duration: 1.1, ease: 'power4.out', stagger: 0.09 });
        },
      });
    });
  }));

  $$('[data-opener]').forEach((op) => onEnter(op, () => {
    op.classList.add('is-in');
    gsap.from($('.opener-rule', op), { scaleX: 0, duration: 1.35, ease: 'power3.inOut' });
    gsap.from($$('.opener-num, .opener-title, .opener-meta', op), { opacity: 0, y: 10, duration: 0.7, stagger: 0.08, delay: 0.3, ease: 'power2.out', clearProps: 'all' });
  }));

  // comparison: the two columns arrive from their own sides
  $$('.cmp-row').forEach((row) => onEnter(row, () => {
    row.classList.add('is-in');
    gsap.from($$('[data-cmp="on"]', row), { x: -36, opacity: 0, duration: 0.9, ease: 'power3.out', clearProps: 'all' });
    gsap.from($$('[data-cmp="off"]', row), { x: 36, opacity: 0, duration: 0.9, ease: 'power3.out', clearProps: 'all' });
  }));

  onEnter($('[data-shapes]'), (shapes) => {
    shapes.classList.add('is-in');
    gsap.from($$('.shape-on [data-unit]', shapes), { y: -26, opacity: 0, duration: 0.6, ease: 'back.out(1.6)', stagger: 0.12, clearProps: 'all' });
    gsap.from($$('.shape-off [data-unit]', shapes), { y: 26, opacity: 0, duration: 0.6, ease: 'back.out(1.6)', stagger: 0.06, delay: 0.2, clearProps: 'all' });
  });

  onEnter($('[data-globe]'), (g) => {
    g.classList.add('is-in');
    gsap.from(g, { scale: 0.86, opacity: 0, duration: 1.3, ease: 'power3.out', clearProps: 'all' });
  });

  onEnter($('[data-footer-rule]'), () => {
    const mark = $('[data-footer-mark]');
    if (mark) { mark.classList.add('is-in'); gsap.from(mark, { yPercent: 108, duration: 1.4, ease: 'power4.out', clearProps: 'all' }); }
  });
}

// ---------------------------------------------------------------- stack (state changes run in both modes)
function initStack(animate: boolean) {
  const fig = $('[data-stack]');
  if (!fig) return;
  const plates = $$('[data-plate]', fig);
  const rows = $$('[data-cap]');
  let current = -1;
  const setActive = (i: number) => {
    if (i === current) return;
    current = i;
    fig.classList.toggle('has-active', i >= 0);
    plates.forEach((p, k) => p.classList.toggle('is-active', k === i));
    rows.forEach((r, k) => r.classList.toggle('is-active', k === i));
  };
  // a thin band across the middle of the viewport decides which row is "the one being read"
  const band = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const i = rows.indexOf(e.target as HTMLElement);
      if (e.isIntersecting) setActive(i); else if (current === i) setActive(-1);
    }
  }, { rootMargin: '-48% 0px -51% 0px' });
  rows.forEach((row, i) => {
    band.observe(row);
    row.addEventListener('pointerenter', () => setActive(i));
    row.addEventListener('focusin', () => setActive(i));
  });
  if (animate) {
    const gap = getComputedStyle(fig).getPropertyValue('--gap').trim() || '44px';
    gsap.fromTo(fig, { '--gap': '4px' }, { '--gap': gap, ease: 'none', scrollTrigger: { trigger: fig, start: 'top 96%', end: 'top 30%', scrub: 0.6 } });
  }
}

// ---------------------------------------------------------------- hero: the two lines part from the horizon
function initHero() {
  const hero = $('[data-hero]');
  if (!hero) return;
  gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } })
    .to('[data-hero-line="up"]', { yPercent: -30 }, 0)
    .to('[data-hero-line="down"]', { yPercent: 38 }, 0)
    .to('[data-hero-fade]', { autoAlpha: 0, duration: 0.55 }, 0);
}

// ---------------------------------------------------------------- follow the sun: pin + 24 h scrub
function initSun() {
  if (!sun) return;
  const { track, stage } = sun;
  const size = () => {
    html.classList.add('sun-pin');
    const fits = window.innerHeight >= 560 && stage.scrollHeight <= stage.clientHeight + 4;
    html.classList.toggle('sun-pin', fits);
  };
  size();
  ScrollTrigger.addEventListener('refreshInit', size);
  const apply = (self: ScrollTrigger) => { if (html.classList.contains('sun-pin')) sun!.setProgress(self.progress); };
  ScrollTrigger.create({ trigger: track, start: () => `top top+=${HEADER}`, end: 'bottom bottom', scrub: true, onUpdate: apply, onRefresh: apply });
}

// ---------------------------------------------------------------- engagement: vertical scroll moves the timeline sideways
function initTimeline() {
  const mm = gsap.matchMedia();
  mm.add('(min-width: 1000px) and (min-height: 600px)', () => {
    const pin = $('[data-eng-pin]'), track = $('[data-tl]'), fill = $('[data-tl-fill]');
    if (!pin || !track || !fill) return;
    const steps = $$('[data-tl-step]', track);
    html.classList.add('eng-pin');
    if (pin.offsetHeight > window.innerHeight - HEADER) { html.classList.remove('eng-pin'); return; }

    const travel = () => Math.max(0, track.scrollWidth - window.innerWidth);
    // a marker travels from the first node to the last as the block scrolls; the line fills up to it
    const mark = (self?: ScrollTrigger) => {
      const p = self ? self.progress : 0;
      const r = track.getBoundingClientRect();
      const g = parseFloat(getComputedStyle(track).paddingLeft) || 0;
      const lastEnd = steps[steps.length - 1].offsetLeft - travel();
      const x = g + p * (lastEnd - g) + 6;
      gsap.set(fill, { scaleX: gsap.utils.clamp(0, 1, (x - r.left - g) / (r.width - 2 * g)) });
      steps.forEach((s) => s.classList.toggle('is-done', s.getBoundingClientRect().left <= x));
    };
    const tween = gsap.to(track, {
      x: () => -travel(), ease: 'none',
      scrollTrigger: {
        trigger: pin, start: () => `top top+=${HEADER}`, end: () => `+=${travel()}`,
        pin: true, scrub: 0.5, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: mark, onRefresh: mark,
      },
    });
    return () => {
      tween.scrollTrigger?.kill(); tween.kill();
      html.classList.remove('eng-pin');
      gsap.set([track, fill], { clearProps: 'all' });
      steps.forEach((s) => s.classList.remove('is-done'));
    };
  });
}

// ---------------------------------------------------------------- the sky
async function initSky() {
  const mode = params.get('sky');
  const force = mode === 'force';
  if (mode === 'off' || (!force && (reduce || (navigator as any).connection?.saveData))) return;
  const canvas = $<HTMLCanvasElement>('[data-sky]');
  if (!canvas) return;

  const { createSky, heroSky, TAN_FOV } = await import('./sky');
  const mobile = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
  let sky: Sky | null = await createSky(canvas, { force, mobile });
  if (!sky) return;
  const S = sky.state;

  // Keyframes: [scroll position in px, what the sky is doing there]. Rebuilt whenever layout changes.
  const horizon = $('[data-horizon]'), footRule = $('[data-footer-rule]');
  const proxy = { t: 0 };
  let tl: gsap.core.Timeline | null = null;
  let line0 = 0, maxScroll = 1;
  const pageY = (el: Element | null) => (el ? el.getBoundingClientRect().top + window.scrollY : 0);

  const build = () => {
    tl?.kill();
    const vh = window.innerHeight;
    maxScroll = Math.max(1, ScrollTrigger.maxScroll(window));
    line0 = pageY(horizon);
    const y = (id: string) => Math.min(maxScroll, pageY(document.getElementById(id)));
    const sunEnd = y('sun') + ($('[data-sun]')?.offsetHeight ?? 0) - vh;
    // where the horizon must sit so the cloud deck meets the footer rule at the very end
    const endNdc = footRule ? 1 - (2 * (pageY(footRule) - maxScroll)) / vh : -0.1;
    const field = { camY: -1, deckY: -0.6, deckH: 3.6, near: 1, step: 0.2, pitch: 0.04 };

    const K: [number, Partial<SkyState>][] = [
      [0, { ...heroSky }],
      [vh * 0.6, { camY: 3.5, cover: 0.16, pitch: -0.5 }],                                               // tipping over the edge
      [y('what') - vh * 0.1, { camY: 0.35, pitch: -0.52, cover: 0.2, wash: 0.34 }],                      // into the deck
      [y('what') + vh * 0.7, { ...field, cover: -0.16, wash: 0.42, yaw: 0.16, sunAz: 0.9, sunEl: 0.12, blue: 0.42, orange: 0.5 }],
      [y('sun') + vh * 0.5, { cover: -0.75, wash: 0.36, yaw: -0.08, blue: 0.5, orange: 0.52 }],          // clouds part for the globe
      [sunEnd, { cover: -0.75, yaw: -0.2 }],
      [y('model') + vh * 0.3, { cover: -0.14, wash: 0.46, yaw: -0.36, sunAz: -0.5, blue: 0.5, orange: 0.42 }],
      [y('team') + vh * 0.3, { cover: -0.24, wash: 0.48, yaw: -0.1, sunAz: -0.2 }],
      [y('capabilities') + vh * 0.3, { cover: -0.16, wash: 0.48, yaw: 0.3, sunAz: 0.7, orange: 0.5 }],
      [y('working') + vh * 0.3, { cover: -0.22, wash: 0.5, yaw: 0.08, sunAz: 0.4 }],
      [y('engagement') + vh * 0.2, { cover: -0.46, wash: 0.46, yaw: -0.2, sunAz: -0.3, blue: 0.52 }],
      [y('faq') + vh * 0.3, { cover: -0.14, wash: 0.46, yaw: 0.0, sunAz: -0.5 }],
      [y('contact') - vh * 0.2, { camY: 0.3, deckY: 0, deckH: 1.25, near: 0, step: 0.09, cover: 0.18, wash: 0.42, pitch: -0.3, sunAz: -0.62, sunEl: 0.07, orange: 0.4 }],   // climbing back through
      [y('contact') + vh * 0.6, { camY: 4.2, step: 0.07, cover: 0.12, wash: 0.3, pitch: -0.12, blue: 0.5, orange: 0.44 }],
      [maxScroll, { camY: 5.0, wash: 0.08, orange: 0.58, pitch: -Math.atan(endNdc * TAN_FOV) }],
    ];

    tl = gsap.timeline({ paused: true });
    let prev = 0, state = { ...heroSky } as SkyState;
    for (let i = 1; i < K.length; i++) {
      const at = Math.max(prev + 1, Math.min(maxScroll, K[i][0]));
      const next = { ...state, ...K[i][1] };
      // explicit from/to so scrubbing to any point is exact, whatever order tweens first render in
      tl.fromTo(S, { ...state }, { ...next, duration: at - prev, ease: 'sine.inOut', immediateRender: false }, prev);
      prev = at; state = next;
    }
  };
  build();
  ScrollTrigger.addEventListener('refresh', build);
  gsap.to(proxy, { t: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.9 } });
  window.addEventListener('resize', () => sky?.resize());

  // pointer leans the camera a little (desktop)
  const lean = { x: 0, y: 0 };
  if (!mobile) {
    const lx = gsap.quickTo(lean, 'x', { duration: 1.6, ease: 'power2.out' }), ly = gsap.quickTo(lean, 'y', { duration: 1.6, ease: 'power2.out' });
    window.addEventListener('pointermove', (e) => { lx(e.clientX / window.innerWidth - 0.5); ly(e.clientY / window.innerHeight - 0.5); }, { passive: true });
  }

  const fixedT = params.has('t') ? parseFloat(params.get('t')!) : null;
  const fpsEl = params.get('debug') === 'fps' ? document.body.appendChild(Object.assign(document.createElement('div'), { style: 'position:fixed;left:8px;bottom:8px;z-index:99;font:11px monospace;background:#000;color:#fff;padding:3px 6px' })) : null;
  const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const t0 = performance.now();
  let last = 0, lastScroll = -1, activeUntil = 0, shown = false, slow = 0, frames = 0, acc = 0;
  let cap30 = mobile, fastN = 0, fastSum = 0;

  const frame = () => {
    if (!sky || document.hidden) return;
    const now = performance.now();
    const sy = window.scrollY;
    if (sy !== lastScroll) { activeUntil = now + 1400; lastScroll = sy; }
    // full rate while the page is moving (if the GPU keeps up); 30 fps when only the clouds drift
    const fast = !cap30 && now < activeUntil && sky.tier !== 'low';
    const dt = now - last;
    if (dt < (fast ? 0 : 31)) return;
    last = now;
    if (fast && dt < 200) { fastN++; fastSum += dt; if (fastN >= 60) { if (fastSum / fastN > 21) cap30 = true; fastN = 0; fastSum = 0; } }

    tl?.time(proxy.t * maxScroll);
    S.travel = proxy.t * maxScroll * 0.0034;
    // in the hero the 3D horizon is glued to the ink line; further down the timeline takes over
    const tlPitch = S.pitch, tlYaw = S.yaw;
    const ndc = 1 - (2 * (line0 - sy)) / window.innerHeight;
    const w = smooth(0.85, 1.25, ndc);
    S.pitch = (1 - w) * -Math.atan(Math.min(ndc, 1.3) * TAN_FOV) + w * tlPitch - lean.y * 0.03;
    S.yaw = tlYaw + lean.x * 0.07;
    sky.render(fixedT ?? (now - t0) / 1000);
    S.pitch = tlPitch; S.yaw = tlYaw;

    if (!shown) { shown = true; html.classList.add('sky-on'); }

    // keep an eye on frame time: step down a tier, or hand back to the static backdrop
    if (dt < 400) { frames++; acc += dt; if (dt > 52) slow++; }
    if (frames >= 50) {
      if (fpsEl) fpsEl.textContent = `${Math.round(1000 / (acc / frames))} fps · ${sky.tier}${cap30 ? ' · cap30' : ''} · ${canvas.width}×${canvas.height} · bench ${sky.benchMs.toFixed(1)}ms`;
      if (!force && slow > 30) {
        if (sky.tier !== 'low') sky.setTier(sky.tier === 'high' ? 'mid' : 'low');
        else { html.classList.remove('sky-on'); gsap.ticker.remove(frame); sky.destroy(); sky = null; }
      }
      frames = 0; slow = 0; acc = 0;
    }
  };
  gsap.ticker.add(frame);
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); html.classList.remove('sky-on'); gsap.ticker.remove(frame); sky = null; });
}

// ---------------------------------------------------------------- go
// Work is spread over idle slots so no single task holds the main thread for long.
if (reduce) {
  html.classList.add('motion-ready', 'no-motion');
  initStack(false);
} else {
  initReveals();
  html.classList.add('motion-ready');
  idle(() => { initHero(); initSun(); });
  idle(() => initStack(true));
  idle(() => {
    initTimeline();
    // pinned blocks add height above later sections: if the page was opened at an anchor, go back to it
    if (location.hash.length > 1) document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'instant' as ScrollBehavior });
  });
}
const startSky = () => idle(() => setTimeout(initSky, 150));
if (document.readyState === 'complete') startSky(); else window.addEventListener('load', startSky, { once: true });
