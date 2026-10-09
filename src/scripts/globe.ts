// Line-drawn globe on Canvas 2D. The view is fixed to the sun: the dusk line holds
// still on screen and the Earth turns through it, as it does in reality.

const D2R = Math.PI / 180;
const INK = '14, 17, 22';
const BLUE = '95, 120, 240';
const ORANGE = '250, 80, 20';

type V3 = [number, number, number];
const ll = (lat: number, lon: number): V3 => {
  const a = lat * D2R, b = lon * D2R;
  return [Math.cos(a) * Math.cos(b), Math.cos(a) * Math.sin(b), Math.sin(a)];
};
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/** Sub-solar point (degrees) for a UTC instant. NOAA low-accuracy formulas; good to a fraction of a degree. */
export function sunPosition(ms: number) {
  const d = new Date(ms);
  const doy = Math.floor((ms - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86400000);
  const hours = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
  const g = (2 * Math.PI / 365) * (doy - 1 + (hours - 12) / 24);
  const eot = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const lon = -15 * (hours - 12 + eot / 60);
  return { lat: decl / D2R, lon: ((lon % 360) + 540) % 360 - 180 };
}

export interface GlobePlace { id: string; lat: number; lon: number; dx: number; dy: number }

export function createGlobe(root: HTMLElement, places: GlobePlace[]) {
  const canvas = root.querySelector<HTMLCanvasElement>('canvas')!;
  const ctx = canvas.getContext('2d')!;
  const labels = new Map<string, HTMLElement>();
  root.querySelectorAll<HTMLElement>('[data-label]').forEach((el) => labels.set(el.dataset.label!, el));
  const placeVec = places.map((p) => ll(p.lat, p.lon));

  // graticule every 15°: one meridian per hour of the day
  const grat: Float32Array[] = [];
  for (let lon = -180; lon < 180; lon += 15) { const a: number[] = []; for (let lat = -90; lat <= 90; lat += 3) a.push(...ll(lat, lon)); grat.push(new Float32Array(a)); }
  for (let lat = -75; lat <= 75; lat += 15) { const a: number[] = []; for (let lon = -180; lon <= 180; lon += 3) a.push(...ll(lat, lon)); grat.push(new Float32Array(a)); }
  let land: Float32Array[] = [];

  let size = 0, dpr = 1, R = 0, cx = 0, cy = 0;
  let utc = Date.now();
  let working: Record<string, boolean> = {};
  let queued = false;
  const dims = new Map<HTMLElement, [number, number]>();   // label sizes, measured once per layout
  const m = new Float32Array(9);           // rows: screen-right, screen-up, toward viewer (Earth-fixed → view)
  let sv: V3 = [-1, 0, 0];                 // sun direction in view space

  function setView() {
    const sun = sunPosition(utc);
    // camera sits 75° east of the sub-solar point, a little north of the equator:
    // the sun is to the left, the dusk line right of centre
    const c = ll(18, sun.lon + 75);
    const x = norm([-c[1], c[0], 0]);
    const y = cross(c, x);
    m.set([x[0], x[1], x[2], y[0], y[1], y[2], c[0], c[1], c[2]]);
    const s = ll(sun.lat, sun.lon);
    sv = [m[0] * s[0] + m[1] * s[1] + m[2] * s[2], m[3] * s[0] + m[4] * s[1] + m[5] * s[2], m[6] * s[0] + m[7] * s[1] + m[8] * s[2]];
  }
  const view = (v: V3): V3 => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];

  function strokeLines(lines: Float32Array[], front: boolean) {
    ctx.beginPath();
    for (const a of lines) {
      let pen = false;
      for (let i = 0; i < a.length; i += 3) {
        const x = a[i], y = a[i + 1], z = a[i + 2];
        if ((m[6] * x + m[7] * y + m[8] * z >= 0) === front) {
          const sx = cx + R * (m[0] * x + m[1] * y + m[2] * z), sy = cy - R * (m[3] * x + m[4] * y + m[5] * z);
          if (pen) ctx.lineTo(sx, sy); else { ctx.moveTo(sx, sy); pen = true; }
        } else pen = false;
      }
    }
    ctx.stroke();
  }

  function place(el: HTMLElement | undefined, x: number, y: number, dx: number, dy: number) {
    if (!el) return;
    const w = el.offsetWidth, h = el.offsetHeight;
    // keep labels inside the globe box so nothing is clipped at the viewport edge or under the header
    if (dx > 0 && x + dx + w > size) dx = -dx;
    else if (dx < 0 && x + dx - w < 0) dx = -dx;
    if (dy < 0 && y + dy - h < 0) dy = -dy;
    else if (dy > 0 && y + dy + h > size) dy = -dy;
    el.style.transform = `translate(${(x + dx).toFixed(1)}px, ${(y + dy).toFixed(1)}px) translate(${dx < 0 ? -100 : 0}%, ${dy < 0 ? -100 : 0}%)`;
    return [x + dx, y + dy] as const;
  }

  function draw() {
    queued = false;
    if (!size) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.lineJoin = 'round';

    const sl = Math.hypot(sv[0], sv[1]) || 1;
    const sx2 = sv[0] / sl, sy2 = sv[1] / sl;      // sun direction on screen (view y is up)

    // glass disc
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fill();

    // day side: blue light from the sun's side
    ctx.save();
    ctx.clip();
    let g = ctx.createLinearGradient(cx + R * sx2, cy - R * sy2, cx - R * sx2 * 0.4, cy + R * sy2 * 0.4);
    g.addColorStop(0, `rgba(${BLUE},0.42)`); g.addColorStop(1, `rgba(${BLUE},0.04)`);
    ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

    // night side: terminator arc + limb arc on the side away from the sun
    const a = norm(cross([0, 0, 1], sv));          // lies in the screen plane: the two limb points are ±a
    let b = cross(sv, a); if (b[2] < 0) b = [-b[0], -b[1], -b[2]];
    const tx = (t: number) => cx + R * (a[0] * Math.cos(t) + b[0] * Math.sin(t));
    const ty = (t: number) => cy - R * (a[1] * Math.cos(t) + b[1] * Math.sin(t));
    ctx.beginPath(); ctx.moveTo(tx(0), ty(0));
    for (let t = 0.04; t < Math.PI; t += 0.04) ctx.lineTo(tx(t), ty(t));
    ctx.lineTo(tx(Math.PI), ty(Math.PI));
    const a0 = Math.atan2(-a[1], -a[0]);
    const dir = (a[1] * -sx2 + -a[0] * -sy2) > 0 ? 1 : -1;   // sweep through the night side
    for (let t = 0.05; t < Math.PI; t += 0.05) ctx.lineTo(cx + R * Math.cos(a0 + dir * t), cy - R * Math.sin(a0 + dir * t));
    ctx.closePath();
    g = ctx.createLinearGradient(cx, cy, cx - R * sx2, cy + R * sy2);
    g.addColorStop(0, `rgba(${ORANGE},0.16)`); g.addColorStop(1, `rgba(${ORANGE},0.58)`);
    ctx.fillStyle = g; ctx.fill();
    ctx.restore();

    // far side, faint: the globe reads as glass
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(${INK},0.05)`; strokeLines(grat, false);
    ctx.strokeStyle = `rgba(${INK},0.11)`; strokeLines(land, false);
    // near side
    ctx.strokeStyle = `rgba(${INK},0.15)`; strokeLines(grat, true);
    ctx.strokeStyle = `rgba(${INK},0.72)`; ctx.lineWidth = 1.1; strokeLines(land, true);

    // dusk line: the horizon again
    ctx.beginPath(); ctx.moveTo(tx(0), ty(0));
    for (let t = 0.04; t < Math.PI; t += 0.04) ctx.lineTo(tx(t), ty(t));
    ctx.lineTo(tx(Math.PI), ty(Math.PI));
    ctx.strokeStyle = `rgb(${INK})`; ctx.lineWidth = 2.25; ctx.stroke();

    // limb
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.lineWidth = 1; ctx.strokeStyle = `rgb(${INK})`; ctx.stroke();

    // sun mark outside the limb
    const ux = cx + (R + 22) * sx2, uy = cy - (R + 22) * sy2;
    ctx.beginPath(); ctx.arc(ux, uy, 5, 0, Math.PI * 2); ctx.fillStyle = `rgb(${ORANGE})`; ctx.fill();
    ctx.beginPath();
    for (let i = 0; i < 8; i++) { const t = i * Math.PI / 4; ctx.moveTo(ux + Math.cos(t) * 8, uy + Math.sin(t) * 8); ctx.lineTo(ux + Math.cos(t) * 12, uy + Math.sin(t) * 12); }
    ctx.strokeStyle = `rgb(${ORANGE})`; ctx.lineWidth = 1.25; ctx.stroke();
    place(labels.get('sun'), ux, uy, sx2 < 0 ? 16 : -16, 16);
    // dusk-line note sits just outside the limb, at whichever end of the line is higher on screen
    const e = a[1] > 0 ? 1 : -1;
    place(labels.get('dusk'), cx + (R + 10) * a[0] * e, cy - (R + 10) * a[1] * e, 6, -6);

    // places: lay the labels out first (flip at the box edges, push apart if they collide), then draw
    const k = size < 380 ? 0.6 : 1;                 // tighter callouts on small globes
    const boxes = places.map((p, i) => {
      const v = view(placeVec[i]);
      const px = cx + R * v[0], py = cy - R * v[1];
      const el = labels.get(p.id);
      let wh = el ? dims.get(el) : undefined;
      if (el && !wh) { wh = [el.offsetWidth, el.offsetHeight]; dims.set(el, wh); }
      const [w, h] = wh ?? [0, 0];
      let dx = p.dx * k, dy = p.dy * k;
      if (dx > 0 && px + dx + w > size) dx = -dx; else if (dx < 0 && px + dx - w < 0) dx = -dx;
      if (dy < 0 && py + dy - h < 0) dy = -dy; else if (dy > 0 && py + dy + h > size) dy = -dy;
      return { p, el, px, py, w, h, far: v[2] < 0, left: dx < 0 ? px + dx - w : px + dx, top: dy < 0 ? py + dy - h : py + dy };
    });
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const A = boxes[i], B = boxes[j];
      if (A.left < B.left + B.w + 4 && B.left < A.left + A.w + 4 && A.top < B.top + B.h + 4 && B.top < A.top + A.h + 4) {
        B.top = B.top >= A.top ? A.top + A.h + 4 : A.top - B.h - 4;
      }
    }
    for (const B of boxes) {
      const on = !!working[B.p.id];
      if (B.el) {
        B.el.style.transform = `translate(${B.left.toFixed(1)}px, ${B.top.toFixed(1)}px)`;
        B.el.dataset.far = String(B.far); B.el.dataset.working = String(on);
      }
      ctx.globalAlpha = B.far ? 0.4 : 1;
      if (B.el) {
        // leader runs to the nearest point of the label box
        ctx.beginPath(); ctx.moveTo(B.px, B.py);
        ctx.lineTo(Math.min(Math.max(B.px, B.left), B.left + B.w), Math.min(Math.max(B.py, B.top), B.top + B.h));
        ctx.strokeStyle = `rgb(${INK})`; ctx.lineWidth = 1; ctx.stroke();
      }
      if (on) { ctx.beginPath(); ctx.arc(B.px, B.py, 9, 0, Math.PI * 2); ctx.strokeStyle = `rgb(${ORANGE})`; ctx.lineWidth = 1.5; ctx.stroke(); }
      ctx.beginPath(); ctx.arc(B.px, B.py, 4, 0, Math.PI * 2);
      ctx.fillStyle = on ? `rgb(${INK})` : '#fff'; ctx.fill();
      ctx.strokeStyle = `rgb(${INK})`; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  const request = () => { if (!queued) { queued = true; requestAnimationFrame(draw); } };

  function resize() {
    const s = Math.round(root.clientWidth);
    if (!s) return;
    size = s; dpr = Math.min(window.devicePixelRatio || 1, 2);
    dims.clear();
    canvas.width = Math.round(s * dpr); canvas.height = Math.round(s * dpr);
    cx = cy = s / 2; R = s / 2 - 38;
    request();
  }
  const ro = new ResizeObserver(resize); ro.observe(root);
  resize();

  return {
    setTime(ms: number, status: Record<string, boolean>) { utc = ms; working = status; setView(); request(); },
    /** lines: delta-encoded [lon0, lat0, dlon, dlat, …] in tenths of a degree */
    setLand(lines: number[][]) {
      land = lines.map((l) => {
        const out = new Float32Array((l.length / 2) * 3);
        let lon = 0, lat = 0;
        for (let i = 0, j = 0; i < l.length; i += 2, j += 3) {
          lon = i ? lon + l[i] : l[0]; lat = i ? lat + l[i + 1] : l[1];
          const v = ll(lat / 10, lon / 10); out[j] = v[0]; out[j + 1] = v[1]; out[j + 2] = v[2];
        }
        return out;
      });
      request();
    },
    destroy() { ro.disconnect(); },
  };
}
