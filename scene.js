/*
 * Hero scene: a faceted oxblood gem ringed by a gold "voice" waveform —
 * the brand line "amplifying voices" made literal.
 *
 * Drawn with plain Canvas 2D and a few lines of 3D projection maths instead
 * of a WebGL library, so it paints on the first frame with nothing extra to
 * download. It animates on its own and does not follow the pointer.
 *
 * <canvas data-scene="voice"> renders the full waveform; data-scene="orb"
 * renders the quieter gem-and-orbits variant used on inner pages.
 */
(function () {
  const GOLD = [201, 166, 107];
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CAMERA_Z = 17;
  const HALF_FOV = (16 * Math.PI) / 180;
  const KEY_LIGHT = normalize([5, 7, 9]);
  const RIM_LIGHT = normalize([-8, -3, -2]);
  const BASE_TILT = -0.32;


  const GEM = createIcosphere(1.75);

  document.querySelectorAll('canvas[data-scene]').forEach((canvas) => {
    createScene(canvas, canvas.dataset.scene === 'voice');
  });

  function createScene(canvas, isVoice) {
    const context = canvas.getContext('2d');
    const dust = createDust(isVoice ? 700 : 450);
    const orbits = [0, 1, isVoice ? -1 : 2].filter((i) => i >= 0).map((i) => ({
      radius: 4.9 + i * 0.75,
      pivotX: Math.PI / 2 + (i - 1) * 0.42,
      pivotY: i * 0.6,
      speed: (0.06 + i * 0.035) * (i % 2 ? -1 : 1),
    }));

    const view = { width: 0, height: 0, focal: 0, offsetX: 0, offsetY: 0, scale: 1, dpr: 1 };

    function resize() {
      const { clientWidth: width, clientHeight: height } = canvas;
      if (!width || !height) return;
      view.dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * view.dpr);
      canvas.height = Math.round(height * view.dpr);
      view.width = canvas.width;
      view.height = canvas.height;
      view.focal = view.height / 2 / Math.tan(HALF_FOV);

      // Wide screens: sit right of the headline. Narrow: centre, above the copy.
      const isWide = width / height > 1.15;
      view.offsetX = isWide ? (isVoice ? 3.3 : 4.2) : 0;
      view.offsetY = isWide ? 0.4 : 3.6;
      view.scale = isWide ? 1 : 0.72;
    }

    // Local point -> world point, applying the group tilt, scale and stage offset.
    function toWorld(point, sway) {
      const tilted = rotateY(rotateX(point, BASE_TILT), sway);
      return [
        tilted[0] * view.scale + view.offsetX,
        tilted[1] * view.scale + view.offsetY,
        tilted[2] * view.scale,
      ];
    }

    function project(point) {
      const depth = CAMERA_Z - point[2];
      const ratio = view.focal / depth;
      return [view.width / 2 + point[0] * ratio, view.height / 2 - point[1] * ratio, ratio];
    }

    function render(t) {
      const ctx = context;
      ctx.clearRect(0, 0, view.width, view.height);
      const sway = Math.sin(t * 0.2) * 0.18;

      drawDust(ctx, t);

      const centre = project(toWorld([0, 0, 0], sway));
      const glow = ctx.createRadialGradient(centre[0], centre[1], 0, centre[0], centre[1], centre[2] * 3.4);
      glow.addColorStop(0, 'rgba(244, 230, 190, 0.10)');
      glow.addColorStop(1, 'rgba(244, 230, 190, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, view.width, view.height);

      const rings = collectRingStrokes(t, sway);
      rings.filter((stroke) => stroke.z < 0).forEach((stroke) => drawStroke(ctx, stroke));
      drawGem(ctx, t, sway);
      rings.filter((stroke) => stroke.z >= 0).forEach((stroke) => drawStroke(ctx, stroke));
    }

    function drawDust(ctx, t) {
      const spin = t * 0.02;
      const wobble = Math.sin(t * 0.1) * 0.05;
      ctx.fillStyle = 'rgba(244, 230, 190, 0.7)';
      for (const point of dust) {
        const world = rotateX(rotateY(point, spin), wobble);
        const screen = project([
          world[0] * view.scale + view.offsetX,
          world[1] * view.scale + view.offsetY,
          world[2] * view.scale,
        ]);
        const size = Math.max(view.dpr * 0.8, screen[2] * 0.016);
        ctx.fillRect(screen[0], screen[1], size, size);
      }
    }

    // Bars and orbit segments are split around the gem so each sits in front or behind it.
    function collectRingStrokes(t, sway) {
      const strokes = [];

      if (isVoice) {
        const count = 144;
        const radius = 3.15;
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          // Layered sines read as speech: a slow phrase envelope over quicker syllables.
          const phrase = 0.55 + 0.45 * Math.sin(t * 0.9 + angle * 2);
          const syllable = Math.abs(Math.sin(angle * 7 + t * 2.4) * Math.cos(angle * 3 - t * 1.3));
          const length = 0.18 + 1.35 * phrase * syllable;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          const inner = toWorld([cos * radius, sin * radius, 0], sway);
          const outer = toWorld([cos * (radius + length), sin * (radius + length), 0], sway);
          strokes.push({ from: inner, to: outer, z: inner[2], width: 0.055, alpha: 0.95 });
        }
      }

      for (const orbit of orbits) {
        const segments = 120;
        const spin = t * orbit.speed;
        const place = (angle, radius) => {
          const local = [Math.cos(angle + spin) * radius, Math.sin(angle + spin) * radius, 0];
          return toWorld(rotateY(rotateX(local, orbit.pivotX), orbit.pivotY), sway);
        };
        for (let s = 0; s < segments; s++) {
          const from = place((s / segments) * Math.PI * 2, orbit.radius);
          const to = place(((s + 1) / segments) * Math.PI * 2, orbit.radius);
          strokes.push({ from, to, z: (from[2] + to[2]) / 2, width: 0.014, alpha: 0.8 });
        }
        const bead = place(0, orbit.radius);
        strokes.push({ from: bead, to: bead, z: bead[2], width: 0.16, alpha: 1, isBead: true });
      }

      return strokes;
    }

    function drawStroke(ctx, stroke) {
      const a = project(stroke.from);
      const b = project(stroke.to);
      const width = Math.max(view.dpr * 0.8, stroke.width * a[2]);
      // Farther strokes fade slightly, giving the ring its depth.
      const alpha = stroke.alpha * (0.6 + 0.4 * Math.min(1, Math.max(0, (stroke.z + 4) / 8)));
      ctx.strokeStyle = ctx.fillStyle = `rgba(${GOLD[0]}, ${GOLD[1]}, ${GOLD[2]}, ${alpha})`;
      if (stroke.isBead) {
        ctx.beginPath();
        ctx.arc(a[0], a[1], width / 2, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }

    function drawGem(ctx, t, sway) {
      const spinY = t * 0.18;
      const spinX = Math.sin(t * 0.3) * 0.15;
      const lift = Math.sin(t * 0.8) * 0.08;
      const vertices = GEM.vertices.map((v) => {
        const local = rotateX(rotateY(v, spinY), spinX);
        local[1] += lift;
        return toWorld(local, sway);
      });

      const faces = [];
      for (const [ia, ib, ic] of GEM.faces) {
        const a = vertices[ia];
        const b = vertices[ib];
        const c = vertices[ic];
        const normal = normalize(cross(subtract(b, a), subtract(c, a)));
        const centroid = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
        const toCamera = normalize([-centroid[0], -centroid[1], CAMERA_Z - centroid[2]]);
        if (dot(normal, toCamera) <= 0) continue;
        faces.push({ points: [a, b, c].map(project), z: centroid[2], color: shadeFace(normal, toCamera) });
      }
      faces.sort((x, y) => x.z - y.z);

      ctx.lineJoin = 'round';
      ctx.lineWidth = view.dpr * 0.8;
      ctx.strokeStyle = 'rgba(201, 166, 107, 0.55)';
      for (const face of faces) {
        const [p0, p1, p2] = face.points;
        ctx.beginPath();
        ctx.moveTo(p0[0], p0[1]);
        ctx.lineTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.closePath();
        ctx.fillStyle = face.color;
        ctx.fill();
        ctx.stroke();
      }
    }

    resize();
    new ResizeObserver(() => {
      resize();
      if (prefersReducedMotion) render(4);
    }).observe(canvas);

    if (prefersReducedMotion) {
      render(4);
      return;
    }

    const start = performance.now();
    let isVisible = true;
    let frameId = 0;

    function loop(now) {
      render((now - start) / 1000);
      frameId = isVisible ? requestAnimationFrame(loop) : 0;
    }

    // Stop drawing once the hero is scrolled away; resume on return.
    new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      if (isVisible && !frameId) frameId = requestAnimationFrame(loop);
    }).observe(canvas);

    frameId = requestAnimationFrame(loop);
  }

  // Oxblood body, gold-pale key highlight, rose rim light from behind-left.
  function shadeFace(normal, toCamera) {
    const key = Math.max(0, dot(normal, KEY_LIGHT));
    const rim = Math.max(0, dot(normal, RIM_LIGHT));
    const halfway = normalize([KEY_LIGHT[0] + toCamera[0], KEY_LIGHT[1] + toCamera[1], KEY_LIGHT[2] + toCamera[2]]);
    const specular = Math.pow(Math.max(0, dot(normal, halfway)), 36);
    const body = 0.38 + 1.05 * key;
    const r = 112 * body + 209 * 0.32 * rim + 244 * specular * 0.85;
    const g = 22 * body + 64 * 0.32 * rim + 226 * specular * 0.85;
    const b = 44 * body + 106 * 0.32 * rim + 190 * specular * 0.85;
    return `rgb(${Math.min(255, r | 0)}, ${Math.min(255, g | 0)}, ${Math.min(255, b | 0)})`;
  }

  // Icosahedron subdivided once: 80 faces, the same faceting as before.
  function createIcosphere(radius) {
    const p = (1 + Math.sqrt(5)) / 2;
    const vertices = [
      [-1, p, 0], [1, p, 0], [-1, -p, 0], [1, -p, 0],
      [0, -1, p], [0, 1, p], [0, -1, -p], [0, 1, -p],
      [p, 0, -1], [p, 0, 1], [-p, 0, -1], [-p, 0, 1],
    ].map((v) => scale(normalize(v), radius));
    const baseFaces = [
      [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
      [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
      [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
      [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
    ];
    const midpoints = new Map();
    const midpoint = (a, b) => {
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (!midpoints.has(key)) {
        const m = [(vertices[a][0] + vertices[b][0]) / 2, (vertices[a][1] + vertices[b][1]) / 2, (vertices[a][2] + vertices[b][2]) / 2];
        vertices.push(scale(normalize(m), radius));
        midpoints.set(key, vertices.length - 1);
      }
      return midpoints.get(key);
    };
    const faces = [];
    for (const [a, b, c] of baseFaces) {
      const ab = midpoint(a, b);
      const bc = midpoint(b, c);
      const ca = midpoint(c, a);
      faces.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    return { vertices, faces };
  }

  function createDust(count) {
    const points = [];
    for (let i = 0; i < count; i++) {
      const radius = 4 + Math.random() * 7;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      points.push([
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta) * 0.7,
        radius * Math.cos(phi),
      ]);
    }
    return points;
  }

  function rotateX([x, y, z], a) {
    const c = Math.cos(a);
    const s = Math.sin(a);
    return [x, y * c - z * s, y * s + z * c];
  }

  function rotateY([x, y, z], a) {
    const c = Math.cos(a);
    const s = Math.sin(a);
    return [x * c + z * s, y, -x * s + z * c];
  }

  function subtract(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function scale(v, s) { return [v[0] * s, v[1] * s, v[2] * s]; }
  function normalize(v) {
    const length = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / length, v[1] / length, v[2] / length];
  }
})();
