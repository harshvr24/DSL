// The live sky: volumetric clouds raymarched in one fragment shader (WebGL2, no libraries).
// Clouds are a slab of fbm noise; the sun side is lit orange, the shadow side blue, the
// sky is white, so the picture never gets darker than the two brand colours.
// motion.ts animates `state` with GSAP and calls render() from its ticker.

export interface SkyState {
  camY: number;    // camera altitude (deck centre is deckY)
  pitch: number;   // radians, negative looks down
  yaw: number;     // radians
  travel: number;  // distance flown forward
  deckY: number;   // cloud slab centre
  deckH: number;   // cloud slab half-thickness
  cover: number;   // -1 clear … 0.3 overcast
  near: number;    // 0..1: fade out cloud close to the camera (keeps text sections calm)
  step: number;    // minimum march step
  wash: number;    // 0..1: mix the whole picture towards white
  sunAz: number;   // radians, 0 = straight ahead, positive = right
  sunEl: number;   // radians above the horizon
  blue: number;    // amount of blue light in the open sky
  orange: number;  // amount of orange light round the sun
}

export const heroSky: SkyState = {
  camY: 5.0, pitch: -0.06, yaw: 0, travel: 0,
  deckY: 0, deckH: 1.3, cover: 0.12, near: 0, step: 0.07, wash: 0,
  sunAz: 0.62, sunEl: 0.07, blue: 0.5, orange: 0.62,
};

export const TAN_FOV = Math.tan((48 * Math.PI) / 360); // vertical field of view 48°

const VERT = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform sampler2D uNoise;
uniform float uTime;
uniform vec3 uCam;
uniform vec2 uRot;
uniform float uTanFov;
uniform vec2 uDeck;
uniform float uCover;
uniform float uNear;
uniform float uStep;
uniform float uWash;
uniform vec3 uSun;
uniform vec2 uAmt;
uniform int uSteps;
out vec4 frag;

const vec3 BLUE = vec3(0.373, 0.471, 0.941);
const vec3 ORANGE = vec3(0.980, 0.314, 0.078);
const vec3 BLUEDIR = vec3(-0.5494, 0.6193, 0.5609);

// value noise from a 256² texture whose G channel is R shifted by (37,17): one fetch per sample
float noise(vec3 x) {
  vec3 p = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  vec2 uv = (p.xy + vec2(37.0, 17.0) * p.z) + f.xy;
  vec2 rg = textureLod(uNoise, (uv + 0.5) / 256.0, 0.0).yx;
  return mix(rg.x, rg.y, f.z) * 2.0 - 1.0;
}

vec3 warp(vec3 p) { return p * 0.55 + vec3(0.05, 0.0, 0.09) * uTime; }

float shape(vec3 p, float f) {
  float h = (p.y - uDeck.x) / uDeck.y;
  h = h < 0.0 ? h * 1.7 : h;                       // flat bases, billowing tops
  return clamp(uCover + 1.75 * f - 1.6 * h * h, 0.0, 1.0);
}

float densLo(vec3 p) {
  vec3 q = warp(p);
  float f = 0.5 * noise(q); q *= 2.02;
  f += 0.25 * noise(q);
  return shape(p, f);
}

// open sky: white, a blue lobe high on one side, orange round the sun and lying along the horizon
vec3 skyCol(vec3 rd) {
  float b = pow(clamp(dot(rd, BLUEDIR) * 0.5 + 0.5, 0.0, 1.0), 7.0);
  float sd = clamp(dot(rd, uSun) * 0.5 + 0.5, 0.0, 1.0);
  float o = pow(sd, 16.0) + 0.3 * exp(-abs(rd.y) * 7.0) * pow(sd, 4.0);
  vec3 c = vec3(1.0);
  c = mix(c, BLUE, b * uAmt.x);
  c = mix(c, ORANGE, clamp(o * uAmt.y, 0.0, 0.9));
  return c;
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - uRes) / uRes.y;
  float cp = cos(uRot.x), sp = sin(uRot.x), cyw = cos(uRot.y), syw = sin(uRot.y);
  vec3 fw = vec3(syw * cp, sp, cyw * cp);
  vec3 rt = vec3(cyw, 0.0, -syw);
  vec3 up = cross(fw, rt);
  vec3 rd = normalize(fw + uTanFov * (uv.x * rt + uv.y * up));
  vec3 ro = uCam;

  vec3 sky = skyCol(rd);
  vec4 sum = vec4(0.0);
  vec4 nz = textureLod(uNoise, gl_FragCoord.xy / 256.0, 0.0);

  // march only where the ray is inside the cloud slab
  float yMin = uDeck.x - uDeck.y * 0.82, yMax = uDeck.x + uDeck.y * 1.12;
  float ry = abs(rd.y) < 1e-4 ? 1e-4 : rd.y;
  float ta = (yMin - ro.y) / ry, tb = (yMax - ro.y) / ry;
  float tn = max(min(ta, tb), 0.0), tf = min(max(ta, tb), 60.0);

  if (tf > tn) {
    float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    float t = tn + max(uStep, 0.045 * tn) * ign;
    vec3 shadow = mix(BLUE, vec3(1.0), 0.12);
    vec3 sunc = mix(ORANGE, vec3(1.0), 0.30);
    for (int i = 0; i < uSteps; i++) {
      vec3 pos = ro + t * rd;
      float dt = max(uStep, 0.045 * t);
      float lod = 1.0 - smoothstep(9.0, 26.0, t);                 // far cloud needs no fine detail
      vec3 q = warp(pos);
      float f2 = 0.5 * noise(q); q *= 2.02;
      f2 += 0.25 * noise(q);
      float f4 = f2;
      if (lod > 0.01) { q *= 2.03; f4 += 0.125 * noise(q) * lod; q *= 2.01; f4 += 0.0625 * noise(q) * lod; }
      float den = shape(pos, f4) * mix(1.0, smoothstep(0.5, 3.2, t), uNear);
      if (den > 0.01) {
        // sun: how much less cloud lies towards it
        float dif = clamp((shape(pos, f2) - densLo(pos + 0.5 * uSun)) / 0.4, 0.0, 1.0);
        float top = clamp((pos.y - uDeck.x) / uDeck.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 c = mix(shadow, vec3(1.0), smoothstep(0.25, 0.95, top));          // blue in the valleys, white on top
        c = mix(c, sunc, dif * 0.85 * (1.0 - 0.45 * top));                      // the low sun warms the flanks
        c = mix(c, shadow * 0.96, den * 0.35 * (1.0 - dif) * (1.0 - top));      // dense unlit cores
        c = mix(c, sky, 1.0 - exp(-0.0012 * t * t));                            // aerial fade into the sky
        float a = clamp(den * dt * 1.7, 0.0, 1.0) * (1.0 - sum.a);
        sum.rgb += c * a;
        sum.a += a;
      }
      t += dt;
      if (t > tf || sum.a > 0.985) break;
    }
  }

  vec3 col = sky * (1.0 - sum.a) + sum.rgb;
  col = mix(col, vec3(1.0), uWash);
  col += (nz.a - 0.5) * (1.5 / 255.0);   // dither: no banding in the soft gradients
  frag = vec4(col, 1.0);
}`;

export interface Sky {
  state: SkyState;
  tier: Tier;
  /** draw one frame; `time` in seconds */
  render(time: number): void;
  resize(force?: boolean): void;
  setTier(t: Tier): void;
  benchMs: number;
  destroy(): void;
}

const TIERS = {
  high: { steps: 44, scale: 0.5, maxPx: 480000 },
  mid: { steps: 32, scale: 0.42, maxPx: 320000 },
  low: { steps: 26, scale: 0.36, maxPx: 230000 },
};
export type Tier = keyof typeof TIERS;

function makeNoise(): Uint8Array {
  // deterministic PRNG so stills are repeatable
  let s = 0x9e3779b9;
  const rnd = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const N = 256, d = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) { d[i * 4] = rnd() * 256; d[i * 4 + 2] = rnd() * 256; d[i * 4 + 3] = rnd() * 256; }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    d[(y * N + x) * 4 + 1] = d[(((y - 17 + N) % N) * N + ((x - 37 + N) % N)) * 4];
  }
  return d;
}

/** Resolves to null when the sky should not run here (no WebGL2, software renderer, too slow). */
export async function createSky(canvas: HTMLCanvasElement, opts: { force?: boolean; mobile?: boolean } = {}): Promise<Sky | null> {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'default', preserveDrawingBuffer: false });
  if (!gl) return null;
  if (gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)?.precision === 0) return null;
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
  if (!opts.force && /swiftshader|llvmpipe|software|basic render/i.test(renderer)) return null;

  const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs); gl.attachShader(prog, fs);
  gl.bindAttribLocation(prog, 0, 'p');
  gl.linkProgram(prog);

  // compile off the main thread where the driver allows it
  const par = gl.getExtension('KHR_parallel_shader_compile');
  await new Promise<void>((res) => {
    const check = () => (!par || gl.getProgramParameter(prog, par.COMPLETION_STATUS_KHR) ? res() : setTimeout(check, 40));
    check();
  });
  if (gl.isContextLost() || !gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('[sky] shader failed', gl.getProgramInfoLog(prog), gl.getShaderInfoLog(fs));
    return null;
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, makeNoise());
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

  const U = (n: string) => gl.getUniformLocation(prog, n);
  const u = {
    res: U('uRes'), noise: U('uNoise'), time: U('uTime'), cam: U('uCam'), rot: U('uRot'), fov: U('uTanFov'),
    deck: U('uDeck'), cover: U('uCover'), near: U('uNear'), step: U('uStep'), wash: U('uWash'), sun: U('uSun'), amt: U('uAmt'), steps: U('uSteps'),
  };
  gl.uniform1i(u.noise, 0);
  gl.uniform1f(u.fov, TAN_FOV);

  const state: SkyState = { ...heroSky };
  let tier: Tier = 'low';
  let vw = 0, vh = 0;

  const resize = (force = false) => {
    const w = window.innerWidth, h = window.innerHeight;
    // phones resize constantly as the address bar slides; only follow real changes
    if (!force && w === vw && Math.abs(h - vh) < 140) return;
    vw = w; vh = h;
    const T = TIERS[tier];
    const scale = Math.min(opts.mobile ? 0.46 : T.scale, Math.sqrt(T.maxPx / (w * h)));
    canvas.width = Math.max(2, Math.round(w * scale));
    canvas.height = Math.max(2, Math.round(h * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(u.res, canvas.width, canvas.height);
    gl.uniform1i(u.steps, T.steps);
  };

  const render = (time: number) => {
    const s = state;
    gl.uniform1f(u.time, time);
    gl.uniform3f(u.cam, 0, s.camY, s.travel);
    gl.uniform2f(u.rot, s.pitch, s.yaw);
    gl.uniform2f(u.deck, s.deckY, s.deckH);
    gl.uniform1f(u.cover, s.cover);
    gl.uniform1f(u.near, s.near);
    gl.uniform1f(u.step, s.step);
    gl.uniform1f(u.wash, s.wash);
    const ce = Math.cos(s.sunEl);
    gl.uniform3f(u.sun, Math.sin(s.sunAz) * ce, Math.sin(s.sunEl), Math.cos(s.sunAz) * ce);
    gl.uniform2f(u.amt, s.blue, s.orange);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  resize(true);

  // Benchmark at the low tier before committing to anything. A GPU fence is polled instead of
  // reading pixels back, so the main thread never waits on the graphics card.
  const timed = (n: number) => new Promise<number>((res) => {
    const t0 = performance.now();
    for (let i = 0; i < n; i++) render(i * 0.5);
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const st = sync ? gl.clientWaitSync(sync, 0, 0) : gl.CONDITION_SATISFIED;
      if (st === gl.TIMEOUT_EXPIRED && performance.now() - t0 < 4000) return void setTimeout(poll, 4);
      if (sync) gl.deleteSync(sync);
      res(performance.now() - t0);
    };
    setTimeout(poll, 4);
  });
  await timed(1);                    // first draw: lets the driver finish compiling
  const ms = (await timed(3)) / 3;
  if (gl.isContextLost()) return null;
  if (!opts.force && ms > 30) { gl.getExtension('WEBGL_lose_context')?.loseContext(); return null; }
  // cost scales with pixels × steps: high ≈ 3.3× low, mid ≈ 1.7× low. Aim for ≤ 12 ms a frame.
  if (!opts.mobile) { tier = ms * 3.3 <= 12 ? 'high' : ms * 1.7 <= 12 ? 'mid' : 'low'; resize(true); }

  return {
    state, render, resize, benchMs: ms,
    get tier() { return tier; },
    setTier(t) { if (t !== tier) { tier = t; resize(true); } },
    destroy() { gl.getExtension('WEBGL_lose_context')?.loseContext(); },
  };
}
