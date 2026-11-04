/*
 * Hero scene: a faceted white lectern with a silver microphone, ringed by a
 * silver "voice" waveform: a speaker finding their voice, made literal.
 *
 * Drawn with plain Canvas 2D and a few lines of 3D projection maths instead
 * of a WebGL library, so it paints on the first frame with nothing extra to
 * download. It animates on its own and does not follow the pointer.
 *
 * <canvas data-scene="voice"> renders the full waveform; data-scene="orb"
 * renders a quieter lectern-and-orbits variant. A data-photo image takes the
 * lectern's place, drawn between the back and front of the rings so the
 * orbits and their beads pass both behind and in front of it.
 */
(function () {
  const SILVER = [228, 236, 246];
  const GOLD = [216, 176, 98];
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CAMERA_Z = 17;
  const HALF_FOV = (16 * Math.PI) / 180;
  const KEY_LIGHT = normalize([5, 7, 9]);
  const RIM_LIGHT = normalize([-8, -3, -2]);
  const BASE_TILT = -0.32;
  const LECTERN_TILT = 0.5;
  const PHOTO_WIDTH = 6.9;


  const WHITE_BASE = [182, 190, 204];
  const GREY_BASE = [118, 130, 150];
  const NAVY_BASE = [16, 44, 92];
  const RED_BASE = [176, 26, 38];
  const SILVER_BASE = [158, 166, 180];
  const GRILLE_BASE = [46, 36, 42];
  const LECTERN = createLectern();

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

    const view = { width: 0, height: 0, centerY: 0, focal: 0, offsetX: 0, offsetY: 0, scale: 1, dpr: 1 };
    let photo = null;
    if (canvas.dataset.photo) {
      const image = new Image();
      image.onload = () => {
        photo = featherEdges(image);
        if (prefersReducedMotion) render(4);
      };
      image.src = canvas.dataset.photo;
    }

    function resize() {
      const { clientWidth: width, clientHeight: height } = canvas;
      if (!width || !height) return;
      view.dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * view.dpr);
      canvas.height = Math.round(height * view.dpr);
      view.width = canvas.width;
      view.height = canvas.height;

      // Wide screens: sit right of the headline. Narrow: centre, above the copy.
      // Judged on the visible part of the canvas, since a tall hero can run past the screen.
      const isWide = width / Math.min(height, window.innerHeight) > 1.15;
      // Size and centre by the screen rather than the hero, whose height varies with
      // each page's copy, so the scene sits identically on every page.
      const stageHeight = Math.min(height, window.innerHeight);
      view.centerY = (stageHeight * view.dpr) / 2;
      view.focal = (stageHeight * 0.9 * view.dpr) / 2 / Math.tan(HALF_FOV);
      view.offsetY = isWide ? 0.4 : 2.6;
      view.offsetX = 0;
      view.scale = 0.72;
      if (isWide) fitBesideCopy(width, stageHeight);
    }

    // Fills the space between the hero copy and the hero's right edge: the photo grows
    // to that width (as far as the screen height allows) and is centred in it, so neither
    // a short laptop screen nor a wide monitor leaves an empty band beside it.
    function fitBesideCopy(width, stageHeight) {
      const pxPerUnit = view.focal / view.dpr / CAMERA_Z;
      const content = canvas.parentElement.querySelector('.hero__content');
      if (!content) {
        view.offsetX = 3.6;
        view.scale = 1;
        return;
      }
      const left = canvas.getBoundingClientRect().left;
      const right = content.getBoundingClientRect().right - left - parseFloat(getComputedStyle(content).paddingRight);
      const copy = content.querySelectorAll('.hero__title .line > span, .hero__lede, .btn-row > *');
      const copyRight = Math.max(...[...copy].map((el) => el.getBoundingClientRect().right - left));
      // The waveform reaches about 0.675 photo-widths from the centre, the photo 0.5:
      // keep the waveform clear of the copy and the photo inside the right edge.
      const space = right - copyRight - 16;
      // On big screens the photo is capped at about a third of the width, so the copy keeps equal weight.
      const photoWidth = Math.min(space / 1.175, stageHeight * 0.72, Math.max(500, width * 0.36));
      const centre = Math.max(copyRight + 16 + 0.675 * photoWidth, (copyRight + right) / 2);
      view.scale = Math.max(0.5, photoWidth / (PHOTO_WIDTH * pxPerUnit));
      view.offsetX = (centre - width / 2) / pxPerUnit;
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
      return [view.width / 2 + point[0] * ratio, view.centerY - point[1] * ratio, ratio];
    }

    function render(t) {
      const ctx = context;
      ctx.clearRect(0, 0, view.width, view.height);
      const sway = Math.sin(t * 0.2) * 0.18;

      drawDust(ctx, t);

      const centre = project(toWorld([0, 0, 0], sway));
      const glow = ctx.createRadialGradient(centre[0], centre[1], 0, centre[0], centre[1], centre[2] * 3.4);
      glow.addColorStop(0, 'rgba(232, 240, 250, 0.10)');
      glow.addColorStop(1, 'rgba(232, 240, 250, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, view.width, view.height);

      const rings = collectRingStrokes(t, sway);
      rings.filter((stroke) => stroke.z < 0).forEach((stroke) => drawStroke(ctx, stroke));
      if (photo) drawPhoto(ctx, centre);
      else if (!canvas.dataset.photo) drawGem(ctx, t, sway);
      rings.filter((stroke) => stroke.z >= 0).forEach((stroke) => drawStroke(ctx, stroke));
    }

    // Sized so the photo's own neon ring sits just inside the waveform bars.
    function drawPhoto(ctx, centre) {
      const width = PHOTO_WIDTH * centre[2] * view.scale;
      const height = (width * photo.height) / photo.width;
      ctx.drawImage(photo, centre[0] - width / 2, centre[1] - height / 2, width, height);
    }

    function drawDust(ctx, t) {
      const spin = t * 0.02;
      const wobble = Math.sin(t * 0.1) * 0.05;
      ctx.fillStyle = 'rgba(232, 240, 250, 0.7)';
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

    // Bars and orbit segments are split around the lectern so each sits in front or behind it.
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
        for (const angle of [0, Math.PI]) {
          const bead = place(angle, orbit.radius);
          strokes.push({ from: bead, to: bead, z: bead[2], width: 0.16, alpha: 1, isBead: true });
        }
      }

      return strokes;
    }

    function drawStroke(ctx, stroke) {
      const a = project(stroke.from);
      const b = project(stroke.to);
      const width = Math.max(view.dpr * 0.8, stroke.width * a[2]);
      // Farther strokes fade slightly, giving the ring its depth.
      const alpha = stroke.alpha * (0.6 + 0.4 * Math.min(1, Math.max(0, (stroke.z + 4) / 8)));
      const colour = stroke.isBead ? GOLD : SILVER;
      ctx.strokeStyle = ctx.fillStyle = `rgba(${colour[0]}, ${colour[1]}, ${colour[2]}, ${alpha})`;
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
      // Sway around a slight three-quarter view rather than spin, so the front plaque stays in sight.
      const spinY = -0.2 + Math.sin(t * 0.3) * 0.32;
      const lift = Math.sin(t * 0.8) * 0.08;
      const vertices = LECTERN.vertices.map((v) => {
        // Tip the lectern against the ring's tilt so it is seen from the front and a little above.
        const local = rotateX(rotateY(v, spinY), LECTERN_TILT);
        local[1] += lift;
        return toWorld(local, sway);
      });

      const faces = [];
      for (const { indices, base } of LECTERN.faces) {
        const points = indices.map((i) => vertices[i]);
        const [a, b, c] = points;
        const normal = normalize(cross(subtract(b, a), subtract(c, a)));
        const centroid = [0, 1, 2].map((k) => points.reduce((sum, p) => sum + p[k], 0) / points.length);
        const toCamera = normalize([-centroid[0], -centroid[1], CAMERA_Z - centroid[2]]);
        if (dot(normal, toCamera) <= 0) continue;
        faces.push({ points: points.map(project), z: centroid[2], color: shadeFace(normal, toCamera, base), isGrille: base === GRILLE_BASE });
      }
      faces.sort((x, y) => x.z - y.z);

      ctx.lineJoin = 'round';
      ctx.lineWidth = view.dpr * 0.8;
      for (const face of faces) {
        ctx.beginPath();
        face.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        ctx.fillStyle = face.color;
        ctx.strokeStyle = face.isGrille ? 'rgba(228, 236, 246, 0.6)' : face.color;
        ctx.fill();
        ctx.stroke();
      }
    }

    resize();
    // The copy's width depends on the web fonts, so measure again once they arrive.
    document.fonts?.ready.then(() => {
      resize();
      if (prefersReducedMotion) render(4);
    });
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

  // Fades the photo's square edges to transparent so its starfield melts into the hero's.
  function featherEdges(image) {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    ctx.globalCompositeOperation = 'destination-in';
    for (const [x1, y1] of [[canvas.width, 0], [0, canvas.height]]) {
      const fade = ctx.createLinearGradient(0, 0, x1, y1);
      fade.addColorStop(0, 'rgba(0, 0, 0, 0)');
      fade.addColorStop(0.12, 'rgba(0, 0, 0, 1)');
      fade.addColorStop(0.88, 'rgba(0, 0, 0, 1)');
      fade.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = fade;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    return canvas;
  }

  // Base colour lit by a white key highlight and a pale blue rim light from behind-left.
  function shadeFace(normal, toCamera, base) {
    const key = Math.max(0, dot(normal, KEY_LIGHT));
    const rim = Math.max(0, dot(normal, RIM_LIGHT));
    const halfway = normalize([KEY_LIGHT[0] + toCamera[0], KEY_LIGHT[1] + toCamera[1], KEY_LIGHT[2] + toCamera[2]]);
    const specular = Math.pow(Math.max(0, dot(normal, halfway)), 36);
    const body = 0.38 + 1.05 * key;
    // Lower than the old gem's 0.85: the lectern's large flat panels catch the whole highlight at once.
    const r = base[0] * body + 120 * 0.32 * rim + 240 * specular * 0.4;
    const g = base[1] * body + 170 * 0.32 * rim + 242 * specular * 0.4;
    const b = base[2] * body + 235 * 0.32 * rim + 248 * specular * 0.4;
    return `rgb(${Math.min(255, r | 0)}, ${Math.min(255, g | 0)}, ${Math.min(255, b | 0)})`;
  }

  // A lectern assembled from convex solids, plus a silver gooseneck microphone.
  // Units match the old gem (radius 1.75), so it sits inside the 3.15 waveform ring.
  function createLectern() {
    const vertices = [];
    const faces = [];
    const BOX_FACES = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];

    // Each face is wound so its normal points away from the solid's centre,
    // which the back-face test in drawGem relies on.
    function addSolid(points, faceList, base) {
      const offset = vertices.length;
      const centre = [0, 1, 2].map((k) => points.reduce((sum, p) => sum + p[k], 0) / points.length);
      vertices.push(...points);
      for (const face of faceList) {
        const [a, b, c] = face.map((i) => points[i]);
        const faceCentre = [0, 1, 2].map((k) => face.reduce((sum, i) => sum + points[i][k], 0) / face.length);
        const isOutward = dot(cross(subtract(b, a), subtract(c, a)), subtract(faceCentre, centre)) > 0;
        faces.push({ indices: (isOutward ? face : [...face].reverse()).map((i) => i + offset), base });
      }
    }

    // Rectangle at height y with half-widths hx, hz, centred on (cx, cz); listed so bottom and top line up.
    const rect = (y, hx, hz, cx = 0, cz = 0) => [[cx - hx, y, cz + hz], [cx + hx, y, cz + hz], [cx + hx, y, cz - hz], [cx - hx, y, cz - hz]];
    const box = (bottom, top, base = WHITE_BASE) => addSolid([...bottom, ...top], BOX_FACES, base);

    // A round tube through [centre, tangent, radius] rings, built one convex section
    // at a time so the outward-facing test in addSolid holds along a curve.
    function tube(rings, base, sides = 10) {
      const circles = rings.map(([p, t, r]) => {
        const u = normalize(cross(t, [1, 0, 0]));
        const v = cross(normalize(t), u);
        return Array.from({ length: sides }, (_, k) => {
          const a = (k / sides) * Math.PI * 2;
          return [0, 1, 2].map((j) => p[j] + (u[j] * Math.cos(a) + v[j] * Math.sin(a)) * r);
        });
      });
      const ring = [...Array(sides).keys()];
      for (let i = 0; i < circles.length - 1; i++) {
        const sidesList = ring.map((k) => [k, (k + 1) % sides, sides + (k + 1) % sides, sides + k]);
        addSolid([...circles[i], ...circles[i + 1]], [ring, ring.map((k) => sides + k), ...sidesList], base);
      }
    }

    // Octagon at height y: a rectangle of half-widths hx, hz with its corners chamfered by c.
    const chamfer = (y, hx, hz, c, cz = 0) => [
      [-hx + c, y, cz + hz], [hx - c, y, cz + hz], [hx, y, cz + hz - c], [hx, y, cz - hz + c],
      [hx - c, y, cz - hz], [-hx + c, y, cz - hz], [-hx, y, cz - hz + c], [-hx, y, cz + hz - c],
    ];
    const prism = (bottom, top, base = WHITE_BASE) => {
      const n = bottom.length;
      const ring = [...Array(n).keys()];
      addSolid([...bottom, ...top], [ring, ring.map((i) => n + i), ...ring.map((i) => [i, (i + 1) % n, n + (i + 1) % n, n + i])], base);
    };

    // The audience is at +z; the speaker stands behind at -z.
    prism(chamfer(-1.85, 0.95, 0.68, 0.08), chamfer(-1.72, 0.95, 0.68, 0.08), GREY_BASE); // plinth
    prism(chamfer(-1.72, 0.82, 0.58, 0.07), chamfer(-1.64, 0.8, 0.56, 0.07), GREY_BASE);  // step
    prism(chamfer(-1.64, 0.66, 0.44, 0.1), chamfer(0.6, 0.8, 0.52, 0.1));                         // body, flaring upward
    prism(chamfer(0.6, 0.86, 0.57, 0.1), chamfer(0.68, 0.86, 0.57, 0.1), NAVY_BASE);                 // navy trim band
    const slope = (p) => [p[0], 1.0 + p[2] * 0.3, p[2]];                                            // reading top, falling to the speaker
    prism(chamfer(0.68, 0.95, 0.66, 0.1), chamfer(0, 0.95, 0.66, 0.1).map(slope));
    box(rect(0.79, 0.8, 0.025, 0, -0.6), rect(0.9, 0.8, 0.025, 0, -0.6), NAVY_BASE);                 // book ledge
    // Raised front panel following the body's flare, carrying a red ring medallion.
    box(rect(-1.3, 0.48, 0.012, 0, 0.464), rect(0.35, 0.58, 0.012, 0, 0.523), GREY_BASE);
    // Centred on the panel and standing well proud of it, so the depth sort draws it in front.
    tube([[[0, -0.48, 0.49], [0, 0, 1], 0.26], [[0, -0.48, 0.57], [0, 0, 1], 0.26]], RED_BASE, 28);
    tube([[[0, -0.48, 0.57], [0, 0, 1], 0.19], [[0, -0.48, 0.6], [0, 0, 1], 0.19]], WHITE_BASE, 28);

    // Microphone: a round mounting flange, a curved gooseneck, a silver handle and a dark mesh grille.
    tube([[[0.55, 0.86, -0.38], [0, 1, 0], 0.08], [[0.55, 0.93, -0.38], [0, 1, 0], 0.065]], SILVER_BASE);
    const neckStart = [0.55, 0.93, -0.38];
    const neckBend = [0.57, 1.5, -0.38];
    const neckEnd = [0.44, 1.66, -0.55];
    const curve = Array.from({ length: 9 }, (_, i) => {
      const t = i / 8;
      const point = [0, 1, 2].map((k) => (1 - t) ** 2 * neckStart[k] + 2 * (1 - t) * t * neckBend[k] + t ** 2 * neckEnd[k]);
      const tangent = [0, 1, 2].map((k) => 2 * (1 - t) * (neckBend[k] - neckStart[k]) + 2 * t * (neckEnd[k] - neckBend[k]));
      return [point, tangent, 0.03];
    });
    tube(curve, SILVER_BASE);
    const aim = normalize(subtract(neckEnd, neckBend));
    const along = (distance) => [0, 1, 2].map((k) => neckEnd[k] + aim[k] * distance);
    tube([[along(0), aim, 0.04], [along(0.22), aim, 0.06]], SILVER_BASE);                // handle
    tube([[along(0.22), aim, 0.07], [along(0.26), aim, 0.07]], SILVER_BASE);              // collar
    const grille = createIcosphere(0.105);
    const grilleCentre = along(0.35);
    addSolid(grille.vertices.map((p) => [0, 1, 2].map((k) => p[k] + grilleCentre[k])), grille.faces, GRILLE_BASE);

    // Centre the whole lectern on the origin so it spins in place.
    const midY = (-1.85 + 1.95) / 2;
    return { vertices: vertices.map(([x, y, z]) => [x, y - midY, z]), faces };
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
