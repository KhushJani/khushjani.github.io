/* ============================================================
   Living background — a hand-written WebGL fragment shader.
   Domain-warped fractal noise creates a slow, flowing "liquid
   data" field. Palette lerps between dark/light themes; the
   flow drifts toward the cursor. Degrades silently to the CSS
   fallback gradient if WebGL is unavailable.
   ============================================================ */

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;

uniform vec2  u_res;
uniform float u_time;
uniform vec2  u_mouse;   // 0..1
uniform vec3  u_bg;
uniform vec3  u_c1;
uniform vec3  u_c2;
uniform vec3  u_c3;
uniform float u_intensity;

float hash(vec2 p){
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

float noise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p){
  float v = 0.0;
  float amp = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++){
    v += amp * noise(p);
    p = m * p;
    amp *= 0.5;
  }
  return v;
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  vec2 p = uv;
  p.x *= u_res.x / u_res.y;

  float t = u_time * 0.045;
  vec2 mo = (u_mouse - 0.5) * 0.35;

  // domain warping — layered fbm feeding into itself
  vec2 q = vec2(fbm(p + vec2(0.0, t) + mo),
                fbm(p + vec2(5.2, 1.3) - vec2(0.0, t)));
  vec2 r = vec2(fbm(p + 3.6 * q + vec2(1.7, 9.2) + 0.15 * t),
                fbm(p + 3.6 * q + vec2(8.3, 2.8) - 0.126 * t));
  float f = fbm(p + 3.6 * r);

  // colour pooling
  vec3 col = u_bg;
  col = mix(col, u_c1, clamp(smoothstep(0.0, 0.7, f) * 1.1, 0.0, 1.0));
  col = mix(col, u_c2, smoothstep(0.35, 0.95, r.x));
  col = mix(col, u_c3, smoothstep(0.45, 1.05, q.y));

  // keep it restrained so foreground text stays legible
  col = mix(u_bg, col, u_intensity);

  // gentle vignette
  float vig = smoothstep(1.15, 0.25, length(uv - 0.5));
  col *= mix(0.82, 1.0, vig);

  // filmic dither to avoid banding
  float g = hash(gl_FragCoord.xy + fract(u_time));
  col += (g - 0.5) * 0.02;

  gl_FragColor = vec4(col, 1.0);
}
`;

const PALETTES = {
  dark: {
    bg: [0.039, 0.047, 0.063],
    c1: [0.37, 0.92, 0.83],
    c2: [0.49, 0.61, 1.0],
    c3: [0.75, 0.52, 0.99],
    intensity: 0.55,
  },
  light: {
    bg: [0.965, 0.969, 0.98],
    c1: [0.05, 0.58, 0.53],
    c2: [0.31, 0.42, 1.0],
    c3: [0.58, 0.2, 0.92],
    intensity: 0.4,
  },
};

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error('[gl-background] shader compile failed:', gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export function initBackground(canvas) {
  if (!canvas) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let gl;
  try {
    gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' })
      || canvas.getContext('experimental-webgl');
  } catch (e) {
    gl = null;
  }
  if (!gl) {
    console.warn('[gl-background] WebGL unavailable — using CSS fallback.');
    canvas.classList.add('gl-bg--fallback');
    return;
  }

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) {
    canvas.classList.add('gl-bg--fallback');
    return;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('[gl-background] program link failed:', gl.getProgramInfoLog(prog));
    canvas.classList.add('gl-bg--fallback');
    return;
  }
  gl.useProgram(prog);

  // fullscreen triangle
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = {
    res: gl.getUniformLocation(prog, 'u_res'),
    time: gl.getUniformLocation(prog, 'u_time'),
    mouse: gl.getUniformLocation(prog, 'u_mouse'),
    bg: gl.getUniformLocation(prog, 'u_bg'),
    c1: gl.getUniformLocation(prog, 'u_c1'),
    c2: gl.getUniformLocation(prog, 'u_c2'),
    c3: gl.getUniformLocation(prog, 'u_c3'),
    intensity: gl.getUniformLocation(prog, 'u_intensity'),
  };

  // Render at reduced resolution — it's a soft background, so this is
  // invisible but dramatically cheaper.
  const QUALITY = 0.6;
  const resize = () => {
    const w = Math.max(1, Math.floor(window.innerWidth * QUALITY));
    const h = Math.max(1, Math.floor(window.innerHeight * QUALITY));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(U.res, canvas.width, canvas.height);
  };
  window.addEventListener('resize', resize);
  resize();

  // smoothed mouse + smoothed palette
  const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
  window.addEventListener(
    'pointermove',
    (e) => {
      mouse.tx = e.clientX / window.innerWidth;
      mouse.ty = 1 - e.clientY / window.innerHeight;
    },
    { passive: true }
  );

  const cur = { bg: [...PALETTES.dark.bg], c1: [...PALETTES.dark.c1], c2: [...PALETTES.dark.c2], c3: [...PALETTES.dark.c3], intensity: PALETTES.dark.intensity };
  const lerp = (a, b, n) => a + (b - a) * n;
  const lerpArr = (a, b, n) => a.forEach((_, i) => (a[i] = lerp(a[i], b[i], n)));

  let raf;
  let running = true;
  const start = performance.now();

  const frame = (now) => {
    if (!running) return;
    const target = PALETTES[document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'];
    lerpArr(cur.bg, target.bg, 0.05);
    lerpArr(cur.c1, target.c1, 0.05);
    lerpArr(cur.c2, target.c2, 0.05);
    lerpArr(cur.c3, target.c3, 0.05);
    cur.intensity = lerp(cur.intensity, target.intensity, 0.05);

    mouse.x = lerp(mouse.x, mouse.tx, 0.04);
    mouse.y = lerp(mouse.y, mouse.ty, 0.04);

    gl.uniform1f(U.time, reduced ? 0 : (now - start) / 1000);
    gl.uniform2f(U.mouse, mouse.x, mouse.y);
    gl.uniform3fv(U.bg, cur.bg);
    gl.uniform3fv(U.c1, cur.c1);
    gl.uniform3fv(U.c2, cur.c2);
    gl.uniform3fv(U.c3, cur.c3);
    gl.uniform1f(U.intensity, cur.intensity);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // When motion is reduced we only need to redraw on theme/mouse change,
    // but a slow rAF keeps the palette lerp smooth and is negligible.
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  // pause when tab hidden (saves battery, avoids runaway time)
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) raf = requestAnimationFrame(frame);
    else cancelAnimationFrame(raf);
  });

  console.info('[gl-background] shader running.');
}
