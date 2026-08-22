/* ==========================================================================
   Simplex Noise Shader — animated background
   Fragment shader taken from Paper Shaders (paper-design/shaders,
   Apache-2.0) — the same source the 21st.dev component credits. Mounted on a
   fullscreen triangle in a plain WebGL2 context, no libraries.

   4-colour palette: #101010, #F5F5F5, #B0B0B0, #3A3A3A. Cursor-reactive push.
   Mounts on #simplex-bg. Pauses when the tab is hidden.
   ========================================================================== */
(function () {
  'use strict';

  var canvas = document.getElementById('simplex-bg');
  if (!canvas) return;

  function bail() { canvas.style.background = '#F5F5F5'; }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var gl = canvas.getContext('webgl2', {
    alpha: false, antialias: false, depth: false, stencil: false,
    powerPreference: 'low-power'
  });

  if (!gl) { bail(); return; }

  /* ---------------------------------------------------------------- */
  /* Shaders                                                          */
  /* ---------------------------------------------------------------- */

  var VERT = [
    '#version 300 es',
    'precision mediump float;',
    'in vec2 a_pos;',
    'uniform vec2 u_resolution;',
    'uniform float u_scale;',
    'uniform vec2 u_offset;',
    'out vec2 v_patternUV;',
    'void main() {',
    '  gl_Position = vec4(a_pos, 0.0, 1.0);',
    '  // Cover-fit pattern space: keep the noise isotropic at any aspect.',
    '  vec2 uv = a_pos * 0.5;',
    '  float aspect = u_resolution.x / max(u_resolution.y, 1.0);',
    '  uv.x *= aspect;',
    '  v_patternUV = (uv / max(u_scale, 0.001)) * 10.0 + u_offset;',
    '}'
  ].join('\n');

  // --- Paper Shaders: simplexNoise helper (Apache-2.0) ---
  var SIMPLEX = [
    'vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }',
    'float snoise(vec2 v) {',
    '  const vec4 C = vec4(0.211324865405187, 0.366025403784439,',
    '    -0.577350269189626, 0.024390243902439);',
    '  vec2 i = floor(v + dot(v, C.yy));',
    '  vec2 x0 = v - i + dot(i, C.xx);',
    '  vec2 i1;',
    '  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);',
    '  vec4 x12 = x0.xyxy + C.xxzz;',
    '  x12.xy -= i1;',
    '  i = mod(i, 289.0);',
    '  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))',
    '    + i.x + vec3(0.0, i1.x, 1.0));',
    '  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),',
    '      dot(x12.zw, x12.zw)), 0.0);',
    '  m = m * m;',
    '  m = m * m;',
    '  vec3 x = 2.0 * fract(p * C.www) - 1.0;',
    '  vec3 h = abs(x) - 0.5;',
    '  vec3 ox = floor(x + 0.5);',
    '  vec3 a0 = x - ox;',
    '  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);',
    '  vec3 g;',
    '  g.x = a0.x * x0.x + h.x * x0.y;',
    '  g.yz = a0.yz * x12.xz + h.yz * x12.yw;',
    '  return 130.0 * dot(m, g);',
    '}'
  ].join('\n');

  // --- Paper Shaders: simplexNoiseFragmentShader (Apache-2.0) ---
  var FRAG = [
    '#version 300 es',
    'precision mediump float;',
    '',
    'uniform float u_time;',
    'uniform vec4 u_colors[10];',
    'uniform float u_colorsCount;',
    'uniform float u_stepsPerColor;',
    'uniform float u_softness;',
    '',
    'in vec2 v_patternUV;',
    'out vec4 fragColor;',
    '',
    SIMPLEX,
    '',
    'float getNoise(vec2 uv, float t) {',
    '  float noise = .5 * snoise(uv - vec2(0., .3 * t));',
    '  noise += .5 * snoise(2. * uv + vec2(0., .32 * t));',
    '  return noise;',
    '}',
    '',
    'float steppedSmooth(float m, float steps, float softness) {',
    '  float stepT = floor(m * steps) / steps;',
    '  float f = m * steps - floor(m * steps);',
    '  float fw = steps * fwidth(m);',
    '  float smoothed = smoothstep(.5 - softness, min(1., .5 + softness + fw), f);',
    '  return stepT + smoothed / steps;',
    '}',
    '',
    'void main() {',
    '  vec2 shape_uv = v_patternUV;',
    '  shape_uv *= .1;',
    '',
    '  float t = .2 * u_time;',
    '',
    '  float shape = .5 + .5 * getNoise(shape_uv, t);',
    '',
    '  float mixer = (shape - .5 / u_colorsCount) * u_colorsCount;',
    '',
    '  float steps = max(1., u_stepsPerColor);',
    '',
    '  vec4 gradient = u_colors[0];',
    '  gradient.rgb *= gradient.a;',
    '  for (int i = 1; i < 10; i++) {',
    '    if (i >= int(u_colorsCount)) break;',
    '',
    '    float localM = clamp(mixer - float(i - 1), 0., 1.);',
    '    localM = steppedSmooth(localM, steps, .5 * u_softness);',
    '',
    '    vec4 c = u_colors[i];',
    '    c.rgb *= c.a;',
    '    gradient = mix(gradient, c, localM);',
    '  }',
    '',
    '  if ((mixer < 0.) || (mixer > (u_colorsCount - 1.))) {',
    '    float localM = mixer + 1.;',
    '    if (mixer > (u_colorsCount - 1.)) {',
    '      localM = mixer - (u_colorsCount - 1.);',
    '    }',
    '    localM = steppedSmooth(localM, steps, .5 * u_softness);',
    '    vec4 cFst = u_colors[0];',
    '    cFst.rgb *= cFst.a;',
    '    vec4 cLast = u_colors[int(u_colorsCount - 1.)];',
    '    cLast.rgb *= cLast.a;',
    '    gradient = mix(cLast, cFst, localM);',
    '  }',
    '',
    '  vec3 color = gradient.rgb;',
    '  float opacity = gradient.a;',
    '',
    '  color += 1. / 256. * (fract(sin(dot(.014 * gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453123) - .5);',
    '',
    '  fragColor = vec4(color, opacity);',
    '}'
  ].join('\n');

  /* ---------------------------------------------------------------- */
  /* Program                                                          */
  /* ---------------------------------------------------------------- */

  function compile(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error('simplex-bg:', gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  }

  var vs = compile(gl.VERTEX_SHADER, VERT);
  var fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) { bail(); return; }

  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('simplex-bg:', gl.getProgramInfoLog(prog));
    bail();
    return;
  }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var aPos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  var uTime    = gl.getUniformLocation(prog, 'u_time');
  var uColors  = gl.getUniformLocation(prog, 'u_colors[0]');
  var uCount   = gl.getUniformLocation(prog, 'u_colorsCount');
  var uSteps   = gl.getUniformLocation(prog, 'u_stepsPerColor');
  var uSoft    = gl.getUniformLocation(prog, 'u_softness');
  var uRes     = gl.getUniformLocation(prog, 'u_resolution');
  var uScale   = gl.getUniformLocation(prog, 'u_scale');
  var uOffset  = gl.getUniformLocation(prog, 'u_offset');

  /* ---- Palette: #101010, #F5F5F5, #B0B0B0, #3A3A3A ---------------- */
  var COLORS = new Float32Array([
    0.0627, 0.0627, 0.0627, 1,   // #101010
    0.9608, 0.9608, 0.9608, 1,   // #F5F5F5
    0.6902, 0.6902, 0.6902, 1,   // #B0B0B0
    0.2275, 0.2275, 0.2275, 1,   // #3A3A3A
    0, 0, 0, 1,  0, 0, 0, 1,  0, 0, 0, 1,
    0, 0, 0, 1,  0, 0, 0, 1,  0, 0, 0, 1
  ]);

  gl.uniform4fv(uColors, COLORS);
  gl.uniform1f(uCount, 4);
  gl.uniform1f(uSteps, 1);
  gl.uniform1f(uSoft, 1);
  gl.uniform1f(uScale, 1.15);

  /* ---------------------------------------------------------------- */
  /* Loop                                                             */
  /* ---------------------------------------------------------------- */

  var dpr = 1, w = 0, h = 0, frame = 0, start = performance.now();
  // Cursor push: the pointer nudges the pattern offset.
  var push = { x: 0, y: 0, tx: 0, ty: 0 };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var nw = Math.max(1, Math.round(window.innerWidth * dpr));
    var nh = Math.max(1, Math.round(window.innerHeight * dpr));
    if (nw === w && nh === h) return;
    w = canvas.width = nw;
    h = canvas.height = nh;
    gl.viewport(0, 0, w, h);
  }

  function frameDraw(now) {
    frame = 0;
    if (document.hidden) return;

    resize();

    push.x += (push.tx - push.x) * 0.06;
    push.y += (push.ty - push.y) * 0.06;

    gl.uniform2f(uRes, w, h);
    gl.uniform2f(uOffset, push.x, push.y);
    gl.uniform1f(uTime, ((now || performance.now()) - start) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (!reduceMotion) frame = requestAnimationFrame(frameDraw);
  }

  function play() { if (!frame && !document.hidden && !reduceMotion) frame = requestAnimationFrame(frameDraw); }
  function pause() { if (frame) { cancelAnimationFrame(frame); frame = 0; } }

  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    push.tx = (e.clientX / window.innerWidth - 0.5) * 1.6;
    push.ty = (e.clientY / window.innerHeight - 0.5) * 1.6;
  }, { passive: true });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pause(); else play();
  });

  window.addEventListener('resize', function () {
    resize();
    if (reduceMotion || !frame) frameDraw(performance.now());
  });

  resize();
  if (reduceMotion) frameDraw(performance.now()); else play();
})();
