/*
 * Hero animation options for review. Each scene is plain Canvas 2D, needs no
 * library, and animates on its own (no pointer interaction). The existing
 * "voice ring" option is still drawn by scene.js on its own canvas.
 */
(function () {
  const canvas = document.querySelector('[data-options-canvas]');
  const voiceCanvas = document.querySelector('canvas[data-scene="voice"]');
  const buttons = document.querySelectorAll('[data-option]');
  const caption = document.querySelector('[data-option-caption]');
  const ctx = canvas.getContext('2d');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const GOLD = '201, 166, 107';
  const PALE = '244, 230, 190';
  const ROSE = '226, 128, 156';

  const CAPTIONS = {
    voice: 'Voice ring: a faceted gem inside a gold waveform. "Amplifying voices", made literal.',
    clash: 'The clash: proposition and opposition take turns; each argument arcs across the floor and lands as a rebuttal.',
    chamber: 'The chamber: a parliamentary hemicycle that lights each bench in British Parliamentary speaking order.',
    scales: 'The scales: arguments land on a balance that tips as the debate is weighed, as an adjudicator would.',
    case: 'Case & rebuttal: each side builds claim, reasons and evidence; then rebuttals cross the centre.',
  };

  const SCENES = { clash: createClash, chamber: createChamber, scales: createScales, case: createCase };

  const view = { w: 0, h: 0, dpr: 1, cx: 0, cy: 0, s: 0 };
  let draw = null;
  let start = 0;
  let last = 0;
  let frameId = 0;

  function resize() {
    const { clientWidth: width, clientHeight: height } = canvas;
    if (!width || !height) return;
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * view.dpr);
    canvas.height = Math.round(height * view.dpr);
    view.w = canvas.width;
    view.h = canvas.height;
    // Wide: right of the headline. Narrow: above the copy, like the voice ring.
    const isWide = width / height > 1.15;
    view.s = isWide ? Math.min(view.h * 0.8, view.w * 0.5) : Math.min(view.w * 0.95, view.h * 0.46);
    view.cx = isWide ? view.w * 0.7 : view.w / 2;
    view.cy = isWide ? view.h * 0.47 : view.h * 0.25;
  }

  function select(name) {
    buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.option === name)));
    caption.textContent = CAPTIONS[name];
    const isVoice = name === 'voice';
    voiceCanvas.hidden = !isVoice;
    canvas.hidden = isVoice;
    cancelAnimationFrame(frameId);
    frameId = 0;
    if (isVoice) return;

    draw = SCENES[name]();
    resize();
    start = last = performance.now();
    if (prefersReducedMotion) {
      renderAt(5000);
      return;
    }
    frameId = requestAnimationFrame(loop);
    const url = new URL(window.location.href);
    url.searchParams.set('option', name);
    history.replaceState(null, '', url);
  }

  function renderAt(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    ctx.clearRect(0, 0, view.w, view.h);
    draw(Math.max(0, (now - start) / 1000), Math.max(0, dt));
  }

  function loop(now) {
    renderAt(now);
    frameId = requestAnimationFrame(loop);
  }

  new ResizeObserver(resize).observe(canvas);
  buttons.forEach((button) => button.addEventListener('click', () => select(button.dataset.option)));
  const requested = new URLSearchParams(window.location.search).get('option');
  select(CAPTIONS[requested] ? requested : 'clash');

  /* ---------- Option: the clash ---------- */

  function createClash() {
    const TURN = 4.2;
    return (t) => {
      const { cx, cy, s } = view;
      const left = [cx - 0.4 * s, cy];
      const right = [cx + 0.4 * s, cy];
      const turn = Math.floor(t / TURN);
      const local = t - turn * TURN;
      const isLeftTurn = turn % 2 === 0;
      const ramp = smoothstep(Math.min(local / 0.6, 1)) * smoothstep(Math.min((TURN - local) / 0.6, 1));

      line([cx, cy - 0.3 * s], [cx, cy + 0.3 * s], rgba(PALE, 0.16), view.dpr);
      diamond(cx, cy - 0.32 * s, 0.012 * s, rgba(GOLD, 0.7));
      diamond(cx, cy + 0.32 * s, 0.012 * s, rgba(GOLD, 0.7));

      drawWave(left, 1, isLeftTurn ? ramp : 0.1, GOLD, t);
      drawWave(right, -1, isLeftTurn ? 0.1 : ramp, ROSE, t + 3);

      const from = isLeftTurn ? left : right;
      const to = isLeftTurn ? right : left;
      const colour = isLeftTurn ? GOLD : ROSE;
      for (let k = 0; k < 3; k++) {
        const p = (local - 0.5 - k * 1.0) / 1.5;
        if (p < 0) continue;
        const bend = (k % 2 ? 1 : -1) * 0.42 * s;
        const control = [cx, cy + bend];
        if (p <= 1) {
          drawComet(from, control, to, easeInOut(p), colour);
          if (Math.abs(p - 0.5) < 0.09) spark(bezier(from, control, to, 0.5), (0.09 - Math.abs(p - 0.5)) / 0.09, colour);
        } else if (p < 1.5) {
          const q = (p - 1) / 0.5;
          ring(to, 0.05 * s + q * 0.09 * s, rgba(colour, 0.6 * (1 - q)), 1.5 * view.dpr);
        }
      }

      drawSpeaker(left, GOLD, isLeftTurn ? ramp : 0, 'PROPOSITION', t);
      drawSpeaker(right, ROSE, isLeftTurn ? 0 : ramp, 'OPPOSITION', t + 1);
    };
  }

  function drawWave(origin, direction, amplitude, colour, t) {
    const { s } = view;
    const count = 40;
    ctx.lineWidth = Math.max(view.dpr, 0.0055 * s);
    ctx.lineCap = 'round';
    for (let i = 0; i < count; i++) {
      const u = i / count;
      const x = origin[0] + direction * (0.075 * s + u * 0.3 * s);
      const syllable = Math.abs(Math.sin(i * 0.9 + t * 7) * Math.cos(i * 0.37 - t * 3.1));
      const half = s * (0.01 + 0.15 * amplitude * (1 - u * 0.75) * syllable);
      ctx.strokeStyle = rgba(colour, 0.3 + 0.6 * amplitude * (1 - u * 0.5));
      ctx.beginPath();
      ctx.moveTo(x, origin[1] - half);
      ctx.lineTo(x, origin[1] + half);
      ctx.stroke();
    }
  }

  function drawSpeaker(point, colour, activity, label, t) {
    const { s } = view;
    const radius = 0.045 * s;
    const halo = radius * (1.35 + 0.25 * activity * (0.5 + 0.5 * Math.sin(t * 6)));
    ring(point, halo, rgba(colour, 0.15 + 0.35 * activity), view.dpr);
    ctx.fillStyle = rgba(colour, 0.12 + 0.18 * activity);
    ctx.beginPath();
    ctx.arc(point[0], point[1], radius, 0, Math.PI * 2);
    ctx.fill();
    ring(point, radius, rgba(colour, 0.9), 1.2 * view.dpr);
    ctx.fillStyle = rgba(colour, 1);
    ctx.beginPath();
    ctx.arc(point[0], point[1], radius * 0.28, 0, Math.PI * 2);
    ctx.fill();
    label && text(label, point[0], point[1] + radius * 2.6, 0.019 * s, rgba(colour, 0.55 + 0.45 * activity));
  }

  function drawComet(from, control, to, p, colour) {
    const { s } = view;
    for (let i = 14; i >= 0; i--) {
      const q = p - i * 0.012;
      if (q < 0) continue;
      const point = bezier(from, control, to, q);
      ctx.fillStyle = rgba(i === 0 ? PALE : colour, (1 - i / 15) * 0.9);
      ctx.beginPath();
      ctx.arc(point[0], point[1], 0.009 * s * (1 - i / 18), 0, Math.PI * 2);
      ctx.fill();
    }
    const head = bezier(from, control, to, p);
    glow(head, 0.05 * s, PALE, 0.35);
  }

  /* ---------- Option: the chamber ---------- */

  function createChamber() {
    const SPEECHES = [
      ['OG', 'Prime Minister', 'Opening Government'],
      ['OO', 'Leader of the Opposition', 'Opening Opposition'],
      ['OG', 'Deputy Prime Minister', 'Opening Government'],
      ['OO', 'Deputy Leader of the Opposition', 'Opening Opposition'],
      ['CG', 'Member of the Government', 'Closing Government'],
      ['CO', 'Member of the Opposition', 'Closing Opposition'],
      ['CG', 'Government Whip', 'Closing Government'],
      ['CO', 'Opposition Whip', 'Closing Opposition'],
    ];
    const SPEECH = 2.8;
    const ROWS = 7;

    return (t) => {
      const { cx, cy, s } = view;
      const centre = [cx, cy + 0.14 * s];
      const index = Math.floor(t / SPEECH) % SPEECHES.length;
      const local = t % SPEECH;
      const ramp = smoothstep(Math.min(local / 0.5, 1)) * smoothstep(Math.min((SPEECH - local) / 0.5, 1));
      const [activeBench, role, benchName] = SPEECHES[index];
      const isGovernment = activeBench[1] === 'G';

      for (let row = 0; row < ROWS; row++) {
        const radius = (0.2 + row * 0.052) * s;
        const count = Math.round((Math.PI * radius) / (0.04 * s));
        for (let j = 0; j < count; j++) {
          const angle = Math.PI + ((j + 0.5) / count) * Math.PI;
          if (Math.abs(angle - 1.5 * Math.PI) < 0.035) continue;
          const bench = (row < 3 ? 'O' : 'C') + (angle < 1.5 * Math.PI ? 'G' : 'O');
          const isLit = bench === activeBench;
          const twinkle = 0.5 + 0.5 * Math.sin(t * 2 + j * 1.7 + row * 2.3);
          ctx.fillStyle = isLit ? rgba(PALE, 0.35 + 0.65 * ramp) : rgba(GOLD, 0.16 + 0.1 * twinkle);
          ctx.beginPath();
          ctx.arc(centre[0] + Math.cos(angle) * radius, centre[1] + Math.sin(angle) * radius, (isLit ? 0.0085 : 0.007) * s, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const benchAngle = isGovernment ? 1.25 * Math.PI : 1.75 * Math.PI;
      const benchRadius = (0.2 + (activeBench[0] === 'O' ? 1 : 5) * 0.052) * s;
      const speaker = [centre[0] + Math.cos(benchAngle) * benchRadius, centre[1] + Math.sin(benchAngle) * benchRadius];
      for (let k = 0; k < 3; k++) {
        const phase = (local * 0.6 + k / 3) % 1;
        ring(speaker, 0.02 * s + phase * 0.2 * s, rgba(PALE, (1 - phase) * 0.45 * ramp), view.dpr);
      }
      glow(speaker, 0.06 * s, PALE, 0.4 * ramp);

      line([centre[0] - 0.06 * s, centre[1]], [centre[0] + 0.06 * s, centre[1]], rgba(GOLD, 0.8), 1.2 * view.dpr);
      diamond(centre[0], centre[1] - 0.025 * s, 0.012 * s, rgba(GOLD, 0.9));
      text(benchName.toUpperCase(), centre[0], centre[1] + 0.075 * s, 0.017 * s, rgba(GOLD, 0.85 * ramp));
      text(role, centre[0], centre[1] + 0.125 * s, 0.036 * s, rgba(PALE, ramp), true);
    };
  }

  /* ---------- Option: the scales ---------- */

  function createScales() {
    const WEIGHTS = [1, 1.3, 0.9, 1.2, 1.1, 1.6, 0.8, 1.15];
    const DROP_EVERY = 1.25;
    const FALL = 0.7;
    const CYCLE = WEIGHTS.length * DROP_EVERY + 2.2;
    const state = { angle: 0, velocity: 0 };

    return (t, dt) => {
      const { cx, cy, s } = view;
      const local = t % CYCLE;
      const round = Math.floor(t / CYCLE);
      const fade = Math.min(1, (CYCLE - local) / 0.8);

      const stacks = [[], []];
      let falling = null;
      WEIGHTS.forEach((weight, k) => {
        // Alternate which side wins each round so neither side always takes it.
        const side = (k + round) % 2;
        const elapsed = local - k * DROP_EVERY;
        if (elapsed < 0) return;
        if (elapsed < FALL) falling = { side, weight, progress: elapsed / FALL };
        else stacks[side].push(weight);
      });
      const total = (side) => stacks[side].reduce((sum, w) => sum + w, 0);
      const target = fade < 1 ? 0 : clamp((total(1) - total(0)) * 0.11, -0.24, 0.24);

      // Damped spring so the beam settles like a real balance.
      const acceleration = (target - state.angle) * 28 - state.velocity * 5;
      state.velocity += acceleration * dt;
      state.angle += state.velocity * dt;

      const pivot = [cx, cy - 0.24 * s];
      const half = 0.36 * s;
      const cos = Math.cos(state.angle);
      const sin = Math.sin(state.angle);
      const ends = [
        [pivot[0] - half * cos, pivot[1] - half * sin],
        [pivot[0] + half * cos, pivot[1] + half * sin],
      ];

      line(pivot, [cx, cy + 0.26 * s], rgba(GOLD, 0.9), 0.008 * s);
      ctx.fillStyle = rgba(GOLD, 0.9);
      ctx.beginPath();
      ctx.ellipse(cx, cy + 0.27 * s, 0.12 * s, 0.022 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      line(ends[0], ends[1], rgba(GOLD, 1), 0.01 * s);
      ends.forEach((end) => diamond(end[0], end[1], 0.012 * s, rgba(PALE, 1)));
      ring(pivot, 0.025 * s, rgba(PALE, 0.9), 1.4 * view.dpr);
      diamond(pivot[0], pivot[1] - 0.05 * s, 0.016 * s, rgba(GOLD, 1));

      ends.forEach((end, side) => {
        const colour = side === 0 ? GOLD : ROSE;
        const pan = [end[0], end[1] + 0.26 * s];
        line(end, [pan[0] - 0.1 * s, pan[1]], rgba(GOLD, 0.55), view.dpr);
        line(end, [pan[0] + 0.1 * s, pan[1]], rgba(GOLD, 0.55), view.dpr);

        stacks[side].forEach((weight, i) => coin([pan[0], pan[1] - 0.012 * s - i * 0.026 * s], weight, colour, fade));

        ctx.strokeStyle = rgba(GOLD, 0.95);
        ctx.lineWidth = 0.006 * s;
        ctx.beginPath();
        ctx.ellipse(pan[0], pan[1], 0.11 * s, 0.035 * s, 0, 0, Math.PI);
        ctx.stroke();
        line([pan[0] - 0.11 * s, pan[1]], [pan[0] + 0.11 * s, pan[1]], rgba(GOLD, 0.95), 0.004 * s);

        text(side === 0 ? 'PROPOSITION' : 'OPPOSITION', pan[0], pan[1] + 0.09 * s, 0.018 * s, rgba(colour, 0.85));

        if (falling && falling.side === side) {
          const landing = pan[1] - 0.012 * s - stacks[side].length * 0.026 * s;
          const y = landing - 0.5 * s * (1 - falling.progress * falling.progress);
          coin([pan[0], y], falling.weight, colour, Math.min(1, falling.progress * 3));
        }
      });
    };
  }

  function coin(point, weight, colour, alpha) {
    const { s } = view;
    const width = 0.055 * s * (0.8 + weight * 0.2);
    ctx.fillStyle = rgba(colour, 0.35 * alpha);
    ctx.beginPath();
    ctx.ellipse(point[0], point[1] + 0.006 * s, width, 0.016 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(colour, 0.95 * alpha);
    ctx.beginPath();
    ctx.ellipse(point[0], point[1], width, 0.016 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(PALE, 0.6 * alpha);
    ctx.lineWidth = view.dpr;
    ctx.stroke();
  }

  /* ---------- Option: case & rebuttal ---------- */

  function createCase() {
    const CYCLE = 12;
    const REASONS = [-0.22, 0, 0.22];

    // Positions in units of the stage size, for the proposition (left) side.
    const root = [-0.44, 0];
    const reasons = REASONS.map((v) => [-0.25, v]);
    const evidence = REASONS.flatMap((v) => [[-0.09, v - 0.065], [-0.09, v + 0.065]]);
    const REBUTTALS = [[0, 1], [3, 2], [5, 4]];

    return (t) => {
      const { cx, cy, s } = view;
      const local = t % CYCLE;
      const fade = Math.min(1, (CYCLE - local) / 0.9);
      const at = ([u, v], mirror) => [cx + (mirror ? -u : u) * s, cy + v * s];

      [false, true].forEach((mirror) => {
        const colour = mirror ? ROSE : GOLD;
        const offset = mirror ? 3 : 0;
        const rootPoint = at(root, mirror);
        const branch = clamp((local - offset) / 1.2, 0, 1);
        const leaf = clamp((local - offset - 1.2) / 1.4, 0, 1);
        if (local < offset) return;

        reasons.forEach((reason, i) => {
          const point = at(reason, mirror);
          growLine(rootPoint, point, branch, rgba(colour, 0.6 * fade));
          [evidence[i * 2], evidence[i * 2 + 1]].forEach((item) => growLine(point, at(item, mirror), leaf, rgba(colour, 0.45 * fade)));
        });
        node(rootPoint, 0.03 * s, colour, fade);
        reasons.forEach((reason) => branch === 1 && node(at(reason, mirror), 0.017 * s, colour, fade));
        evidence.forEach((item) => leaf === 1 && node(at(item, mirror), 0.01 * s, colour, fade));
        text(mirror ? 'OPPOSITION' : 'PROPOSITION', rootPoint[0], rootPoint[1] - 0.07 * s, 0.018 * s, rgba(colour, 0.85 * fade));
        text('claim', rootPoint[0], rootPoint[1] + 0.07 * s, 0.022 * s, rgba(PALE, 0.7 * fade), true);
      });

      REBUTTALS.forEach(([from, to], k) => {
        const p = clamp((local - 6.2 - k * 0.8) / 1.1, 0, 1);
        if (p === 0) return;
        const start = at(evidence[from], true);
        const end = at(evidence[to], false);
        const control = [cx, (start[1] + end[1]) / 2 + (k - 1) * 0.12 * s];
        ctx.strokeStyle = rgba(PALE, 0.75 * fade);
        ctx.lineWidth = 1.2 * view.dpr;
        ctx.setLineDash([4 * view.dpr, 5 * view.dpr]);
        ctx.beginPath();
        for (let i = 0; i <= 30 * p; i++) {
          const point = bezier(start, control, end, i / 30);
          i === 0 ? ctx.moveTo(point[0], point[1]) : ctx.lineTo(point[0], point[1]);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        if (p < 1) glow(bezier(start, control, end, p), 0.04 * s, PALE, 0.5 * fade);
        else spark(bezier(start, control, end, 0.5), 0.6 * fade * (0.6 + 0.4 * Math.sin(t * 5 + k)), PALE);
      });

      if (local > 9) text('rebuttal', cx, cy + 0.36 * s, 0.026 * s, rgba(PALE, 0.8 * fade * clamp(local - 9, 0, 1)), true);
    };
  }

  function growLine(from, to, progress, colour) {
    if (progress <= 0) return;
    line(from, [from[0] + (to[0] - from[0]) * progress, from[1] + (to[1] - from[1]) * progress], colour, 1.2 * view.dpr);
  }

  function node(point, radius, colour, alpha) {
    ctx.fillStyle = 'rgba(26, 6, 16, 1)';
    ctx.beginPath();
    ctx.arc(point[0], point[1], radius, 0, Math.PI * 2);
    ctx.fill();
    ring(point, radius, rgba(colour, 0.95 * alpha), 1.3 * view.dpr);
    ctx.fillStyle = rgba(colour, alpha);
    ctx.beginPath();
    ctx.arc(point[0], point[1], radius * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ---------- Drawing helpers ---------- */

  function line(a, b, colour, width) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }

  function ring(point, radius, colour, width) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(point[0], point[1], radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  function diamond(x, y, size, colour) {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size, y);
    ctx.closePath();
    ctx.fill();
  }

  function glow(point, radius, colour, alpha) {
    const gradient = ctx.createRadialGradient(point[0], point[1], 0, point[0], point[1], radius);
    gradient.addColorStop(0, rgba(colour, alpha));
    gradient.addColorStop(1, rgba(colour, 0));
    ctx.fillStyle = gradient;
    ctx.fillRect(point[0] - radius, point[1] - radius, radius * 2, radius * 2);
  }

  function spark(point, strength, colour) {
    const { s } = view;
    ctx.strokeStyle = rgba(colour, strength);
    ctx.lineWidth = 1.2 * view.dpr;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const inner = 0.012 * s;
      const outer = inner + 0.035 * s * strength;
      ctx.beginPath();
      ctx.moveTo(point[0] + Math.cos(angle) * inner, point[1] + Math.sin(angle) * inner);
      ctx.lineTo(point[0] + Math.cos(angle) * outer, point[1] + Math.sin(angle) * outer);
      ctx.stroke();
    }
    glow(point, 0.06 * s, PALE, 0.5 * strength);
  }

  function text(value, x, y, size, colour, isSerif) {
    ctx.fillStyle = colour;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = isSerif ? `italic 400 ${size}px "Cormorant Garamond", Georgia, serif` : `600 ${size}px Manrope, system-ui, sans-serif`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = isSerif ? '0px' : `${size * 0.22}px`;
    ctx.fillText(value, x, y);
  }

  function bezier(a, c, b, t) {
    const u = 1 - t;
    return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
  }

  function rgba(colour, alpha) { return `rgba(${colour}, ${clamp(alpha, 0, 1)})`; }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function smoothstep(x) { return x * x * (3 - 2 * x); }
  function easeInOut(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
})();
