// Converts Natural Earth 110m land (via the world-atlas package) into a compact
// polyline file for the globe: public/data/land.json
// Run once: `node scripts/build-coastline.mjs`. The output is committed, so the
// site build does not depend on this script.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { mesh } from 'topojson-client';

const require = createRequire(import.meta.url);
const topo = JSON.parse(readFileSync(require.resolve('world-atlas/land-110m.json'), 'utf8'));
const lines = mesh(topo, topo.objects.land).coordinates;

// Split at artificial seams (antimeridian, south-pole cap) and quantise to 0.1°.
const out = [];
let points = 0;
for (const line of lines) {
  let cur = [];
  const flush = () => { if (cur.length >= 4) { out.push(cur); points += cur.length / 2; } cur = []; };
  for (let i = 0; i < line.length; i++) {
    const [lon, lat] = line[i];
    const prev = line[i - 1];
    const seam = prev && ((Math.abs(lon) > 179.9 && Math.abs(prev[0]) > 179.9) || (lat < -89 && prev[1] < -89));
    if (seam) { flush(); }
    cur.push(Math.round(lon * 10), Math.round(lat * 10));
  }
  flush();
}

// Delta-encode each line: [lon0, lat0, dlon, dlat, …] in tenths of a degree.
const enc = out.map((l) => {
  const d = [l[0], l[1]];
  for (let i = 2; i < l.length; i += 2) d.push(l[i] - l[i - 2], l[i + 1] - l[i - 1]);
  return d;
});

mkdirSync(new URL('../public/data/', import.meta.url), { recursive: true });
const file = new URL('../public/data/land.json', import.meta.url);
writeFileSync(file, JSON.stringify(enc));
console.log(`lines: ${enc.length}, points: ${points}, bytes: ${JSON.stringify(enc).length}`);
