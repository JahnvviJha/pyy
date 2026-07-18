/**
 * ═══════════════════════════════════════════════════════════════════
 *  THE MAN WHO NEVER STOPPED WALKING
 *  A Cinematic Birthday Tribute
 * ═══════════════════════════════════════════════════════════════════
 *  Premium scroll-driven storytelling experience.
 *  Dependencies: GSAP + ScrollTrigger (loaded via CDN in HTML)
 *  Author: Crafted with love
 * ═══════════════════════════════════════════════════════════════════
 */

;(function () {
  'use strict';

  /* ─────────────────────────────────────────────
   *  CONSTANTS & ASSET REGISTRY
   * ───────────────────────────────────────────── */

  const ASSETS = {
    walkingCharacter: './assets/Gemini_Generated_Image_uysqrpuysqrpuysq.png',
    standingCharacter: './assets/Gemini_Generated_Image_ef60hcef60hcef60 (1).png',
    nightScene: './assets/Gemini_Generated_Image_mpa2xzmpa2xzmpa2.png',
    sunsetScene: './assets/Gemini_Generated_Image_2n0t772n0t772n0t.png',
    treeScene: './assets/Gemini_Generated_Image_ulzkj0ulzkj0ulzk.png',
    celebrationScene: './assets/Gemini_Generated_Image_ci1atpci1atpci1a.png',
    walkingVideo: './assets/make_the_character_a_bit_young.mp4',
  };

  const CHAPTER_NAMES = [
    'The Beginning',
    'The Journey',
    'The Crossroads',
    'The Sacrifices',
    'What He Built',
    'The Roots',
    'The Reveal',
    'Happy Birthday',
  ];

  const CHAPTER_IDS = [
    'chapter-intro',
    'chapter-journey',
    'chapter-choices',
    'chapter-sacrifices',
    'chapter-built',
    'chapter-roots',
    'chapter-reveal',
    'chapter-finale',
  ];

  /* ─────────────────────────────────────────────
   *  APPLICATION STATE
   * ───────────────────────────────────────────── */

  const state = {
    currentChapter: 0,
    isLoaded: false,
    audioEnabled: false,
    audioContext: null,
    gainNode: null,
    oscillators: [],
    activeCanvases: {},          // canvasId → animFrameId
    particleSystemsInited: {},   // chapterId → boolean
    chapterVisible: {},          // chapterId → boolean
    resizeTimer: null,
    scrollTicking: false,
  };

  /* ═══════════════════════════════════════════════════════════════
   *  1. LOADING SYSTEM
   * ═══════════════════════════════════════════════════════════════ */

  /**
   * Preload every image asset; update .loading-progress bar.
   * Returns a Promise that resolves when all images are ready.
   */
  function preloadAssets() {
    return new Promise((resolve) => {
      const imageSrcs = [
        ASSETS.walkingCharacter,
        ASSETS.standingCharacter,
        ASSETS.nightScene,
        ASSETS.sunsetScene,
        ASSETS.treeScene,
        ASSETS.celebrationScene,
      ];

      const total = imageSrcs.length;
      let loaded = 0;
      const progressBar = document.querySelector('.loading-bar');
      const progressText = document.querySelector('.loading-progress');

      if (total === 0) { resolve(); return; }

      imageSrcs.forEach((src) => {
        const img = new Image();
        img.onload = img.onerror = () => {
          loaded++;
          const pct = Math.round((loaded / total) * 100);
          if (progressBar) progressBar.style.width = pct + '%';
          if (progressText) progressText.textContent = pct + '%';
          if (loaded === total) resolve();
        };
        img.src = src;
      });
    });
  }

  /**
   * Fade out the loading screen overlay.
   */
  function hideLoadingScreen() {
    const screen = document.querySelector('.loading-screen');
    if (!screen) return;

    if (typeof gsap !== 'undefined') {
      gsap.to(screen, {
        opacity: 0,
        duration: 1,
        ease: 'power2.inOut',
        onComplete: () => {
          screen.style.display = 'none';
          state.isLoaded = true;
        },
      });
    } else {
      // Fallback without GSAP
      screen.classList.add('hidden');
      setTimeout(() => {
        screen.style.display = 'none';
        state.isLoaded = true;
      }, 800);
    }
  }

  /* ═══════════════════════════════════════════════════════════════
   *  2. AUDIO SYSTEM — Warm Ambient Tone
   * ═══════════════════════════════════════════════════════════════ */

  function initAudio() {
    const btn = document.querySelector('.audio-toggle');
    if (!btn) return;

    btn.addEventListener('click', toggleAudio);
  }

  /** Build the oscillator stack (called once on first unmute). */
  function createAmbientTone() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    state.audioContext = ctx;

    // Master gain
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    state.gainNode = master;

    // Warm pad: stacked sine waves at harmonic intervals
    const freqs = [110, 164.81, 220, 329.63]; // A2, E3, A3, E4
    const volumes = [0.08, 0.05, 0.04, 0.02];

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = volumes[i];

      // Slow detune shimmer
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.value = 0.15 + i * 0.05;
      lfoGain.gain.value = 1.5;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.detune);
      lfo.start();

      osc.connect(gain);
      gain.connect(master);
      osc.start();

      state.oscillators.push(osc, lfo);
    });
  }

  /** Toggle mute / unmute with smooth ramp. */
  function toggleAudio() {
    const btn = document.querySelector('.audio-toggle');
    if (!state.audioContext) {
      createAmbientTone();
    }

    state.audioEnabled = !state.audioEnabled;

    if (state.audioContext.state === 'suspended') {
      state.audioContext.resume();
    }

    const target = state.audioEnabled ? 1 : 0;
    state.gainNode.gain.cancelScheduledValues(state.audioContext.currentTime);
    state.gainNode.gain.linearRampToValueAtTime(
      target,
      state.audioContext.currentTime + 0.5
    );

    // Visual feedback – toggle SVG icons
    if (btn) {
      const onIcon = btn.querySelector('.audio-on');
      const offIcon = btn.querySelector('.audio-off');
      if (onIcon) onIcon.style.display = state.audioEnabled ? 'block' : 'none';
      if (offIcon) offIcon.style.display = state.audioEnabled ? 'none' : 'block';
      btn.classList.toggle('active', state.audioEnabled);
    }
  }

  /* ═══════════════════════════════════════════════════════════════
   *  3. CHAPTER NAVIGATION SYSTEM
   * ═══════════════════════════════════════════════════════════════ */

  function initNavigation() {
    const chapters = document.querySelectorAll('.chapter');
    const dots = document.querySelectorAll('.chapter-nav .nav-dot');

    // IntersectionObserver to track current chapter
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Array.from(chapters).indexOf(entry.target);
            if (idx !== -1) {
              state.currentChapter = idx;
              updateNavDots(idx, dots);
              document.title = CHAPTER_NAMES[idx]
                ? `${CHAPTER_NAMES[idx]} — The Man Who Never Stopped Walking`
                : 'The Man Who Never Stopped Walking';

              // Mark chapter as visible for particle systems
              const id = entry.target.id || CHAPTER_IDS[idx];
              state.chapterVisible[id] = true;
            }
          } else {
            const id = entry.target.id || '';
            state.chapterVisible[id] = false;
          }
        });
      },
      { threshold: 0.5 }
    );

    chapters.forEach((ch) => observer.observe(ch));

    // Dot click → smooth scroll
    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => {
        if (chapters[i]) {
          chapters[i].scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  function updateNavDots(activeIdx, dots) {
    dots.forEach((d, i) => {
      d.classList.toggle('active', i === activeIdx);
    });
  }

  /* ═══════════════════════════════════════════════════════════════
   *  4. SCROLL ANIMATION SYSTEM
   * ═══════════════════════════════════════════════════════════════ */

  function initScrollAnimations() {
    const selectors = '.fade-in-up, .fade-in-left, .fade-in-right, .scale-in';
    const elements = document.querySelectorAll(selectors);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;

            // Check for stagger on parent container
            const stagger = el.closest('[data-stagger]');
            if (stagger && !stagger.dataset._staggerApplied) {
              stagger.dataset._staggerApplied = 'true';
              const children = stagger.querySelectorAll(selectors);
              children.forEach((child, i) => {
                setTimeout(() => child.classList.add('visible'), i * 150);
              });
            } else if (!stagger) {
              el.classList.add('visible');
            }

            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.2 }
    );

    elements.forEach((el) => observer.observe(el));
  }

  /* ═══════════════════════════════════════════════════════════════
   *  5. PARTICLE SYSTEMS
   * ═══════════════════════════════════════════════════════════════ */

  /* ── 5-A  Helper: create a canvas overlay inside a chapter ──── */

  function createCanvasOverlay(chapterId) {
    const chapter = document.getElementById(chapterId);
    if (!chapter) return null;

    let canvas = chapter.querySelector('canvas.particle-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.classList.add('particle-canvas');
      canvas.style.cssText =
        'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2;';
      chapter.style.position = chapter.style.position || 'relative';
      chapter.appendChild(canvas);
    }

    function resize() {
      canvas.width = chapter.offsetWidth;
      canvas.height = chapter.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    return canvas;
  }

  /* ── 5-B  FIREFLY SYSTEM (chapter-sacrifices) ───────────────── */

  function initFireflies() {
    if (state.particleSystemsInited['chapter-sacrifices']) return;
    state.particleSystemsInited['chapter-sacrifices'] = true;

    const canvas = createCanvasOverlay('chapter-sacrifices');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const COUNT = 40;
    const fireflies = [];

    for (let i = 0; i < COUNT; i++) {
      fireflies.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        baseX: Math.random() * canvas.width,
        baseY: Math.random() * canvas.height,
        radius: 1.5 + Math.random() * 2.5,
        phase: Math.random() * Math.PI * 2,
        speed: 0.005 + Math.random() * 0.01,
        driftX: 30 + Math.random() * 60,
        driftY: 20 + Math.random() * 40,
        alpha: 0,
        alphaSpeed: 0.008 + Math.random() * 0.015,
        hue: 40 + Math.random() * 20, // warm yellow-amber
      });
    }

    function animate() {
      if (!state.chapterVisible['chapter-sacrifices']) {
        state.activeCanvases['fireflies'] = requestAnimationFrame(animate);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      fireflies.forEach((f) => {
        f.phase += f.speed;
        f.x = f.baseX + Math.sin(f.phase) * f.driftX;
        f.y = f.baseY + Math.cos(f.phase * 0.7) * f.driftY;
        f.alpha = 0.3 + Math.abs(Math.sin(f.phase * f.alphaSpeed * 60)) * 0.7;

        // Glow
        const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius * 4);
        grad.addColorStop(0, `hsla(${f.hue}, 100%, 75%, ${f.alpha})`);
        grad.addColorStop(0.4, `hsla(${f.hue}, 100%, 60%, ${f.alpha * 0.4})`);
        grad.addColorStop(1, `hsla(${f.hue}, 100%, 50%, 0)`);

        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius * 4, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${f.hue}, 100%, 85%, ${f.alpha})`;
        ctx.fill();
      });

      state.activeCanvases['fireflies'] = requestAnimationFrame(animate);
    }

    animate();
  }

  /* ── 5-C  PETAL SHOWER (DOM-based, for chapter-built & chapter-reveal) ── */

  function initPetalShower(chapterId) {
    const key = 'petals-' + chapterId;
    if (state.particleSystemsInited[key]) return;
    state.particleSystemsInited[key] = true;

    const chapter = document.getElementById(chapterId);
    if (!chapter) return;

    const PETAL_COUNT = 25;
    const colors = [
      'rgba(255,182,193,0.85)',  // pink
      'rgba(255,105,135,0.75)',  // rose
      'rgba(255,255,255,0.8)',   // white
      'rgba(255,223,140,0.7)',   // light gold
      'rgba(255,160,180,0.8)',   // soft rose
    ];

    for (let i = 0; i < PETAL_COUNT; i++) {
      const petal = document.createElement('div');
      petal.classList.add('petal');

      const size = 8 + Math.random() * 8;
      const startX = Math.random() * 100;
      const duration = 4 + Math.random() * 4;
      const delay = Math.random() * 6;
      const rotation = Math.random() * 360;
      const drift = -30 + Math.random() * 60;
      const color = colors[Math.floor(Math.random() * colors.length)];

      petal.style.cssText = `
        position: absolute;
        top: -20px;
        left: ${startX}%;
        width: ${size}px;
        height: ${size * 0.7}px;
        background: ${color};
        border-radius: 50% 0 50% 0;
        pointer-events: none;
        z-index: 3;
        opacity: 0;
        animation: petalFall ${duration}s ${delay}s ease-in-out infinite;
        transform: rotate(${rotation}deg);
        --drift: ${drift}px;
      `;

      chapter.appendChild(petal);
    }

    // Inject keyframes once
    if (!document.getElementById('petal-keyframes')) {
      const style = document.createElement('style');
      style.id = 'petal-keyframes';
      style.textContent = `
        @keyframes petalFall {
          0%   { opacity: 0; transform: translateY(0) translateX(0) rotate(0deg); }
          10%  { opacity: 1; }
          90%  { opacity: 0.8; }
          100% { opacity: 0; transform: translateY(100vh) translateX(var(--drift, 20px)) rotate(720deg); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /* ── 5-D  GOLDEN DUST (chapter-roots) ───────────────────────── */

  function initGoldenDust() {
    if (state.particleSystemsInited['chapter-roots']) return;
    state.particleSystemsInited['chapter-roots'] = true;

    const canvas = createCanvasOverlay('chapter-roots');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const COUNT = 70;
    const particles = [];

    function reset(p) {
      p.x = Math.random() * canvas.width;
      p.y = canvas.height * 0.6 + Math.random() * canvas.height * 0.4;
      p.radius = 0.8 + Math.random() * 2;
      p.speedY = -(0.2 + Math.random() * 0.6);
      p.speedX = -0.3 + Math.random() * 0.6;
      p.alpha = 0;
      p.maxAlpha = 0.4 + Math.random() * 0.6;
      p.life = 0;
      p.maxLife = 120 + Math.random() * 180;
      p.hue = 42 + Math.random() * 15; // gold range
    }

    for (let i = 0; i < COUNT; i++) {
      const p = {};
      reset(p);
      p.life = Math.random() * p.maxLife; // stagger start
      particles.push(p);
    }

    function animate() {
      if (!state.chapterVisible['chapter-roots']) {
        state.activeCanvases['goldenDust'] = requestAnimationFrame(animate);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.life++;
        if (p.life > p.maxLife) reset(p);

        p.x += p.speedX + Math.sin(p.life * 0.03) * 0.3;
        p.y += p.speedY;

        // Fade in / out
        const progress = p.life / p.maxLife;
        if (progress < 0.2) p.alpha = p.maxAlpha * (progress / 0.2);
        else if (progress > 0.8) p.alpha = p.maxAlpha * (1 - (progress - 0.8) / 0.2);
        else p.alpha = p.maxAlpha;

        // Twinkle
        const twinkle = 0.6 + Math.sin(p.life * 0.15) * 0.4;

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3);
        grad.addColorStop(0, `hsla(${p.hue}, 90%, 65%, ${p.alpha * twinkle})`);
        grad.addColorStop(1, `hsla(${p.hue}, 90%, 65%, 0)`);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 100%, 80%, ${p.alpha * twinkle})`;
        ctx.fill();
      });

      state.activeCanvases['goldenDust'] = requestAnimationFrame(animate);
    }

    animate();
  }

  /* ── 5-E  CONFETTI SYSTEM (chapter-finale) ──────────────────── */

  let confettiCanvas, confettiCtx, confettiPieces;

  function initConfetti() {
    if (state.particleSystemsInited['confetti']) return;
    state.particleSystemsInited['confetti'] = true;

    confettiCanvas = createCanvasOverlay('chapter-finale');
    if (!confettiCanvas) return;
    confettiCtx = confettiCanvas.getContext('2d');
    confettiPieces = [];

    function animate() {
      if (!state.chapterVisible['chapter-finale'] || confettiPieces.length === 0) {
        // Still keep the loop alive but skip drawing
        state.activeCanvases['confetti'] = requestAnimationFrame(animate);
        return;
      }

      confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

      for (let i = confettiPieces.length - 1; i >= 0; i--) {
        const c = confettiPieces[i];

        c.x += c.vx;
        c.y += c.vy;
        c.vy += c.gravity;
        c.vx *= c.drag;
        c.vy *= c.drag;
        c.rotation += c.rotSpeed;
        c.alpha -= 0.002;

        if (c.y > confettiCanvas.height + 20 || c.alpha <= 0) {
          confettiPieces.splice(i, 1);
          continue;
        }

        confettiCtx.save();
        confettiCtx.translate(c.x, c.y);
        confettiCtx.rotate(c.rotation);
        confettiCtx.globalAlpha = Math.max(0, c.alpha);
        confettiCtx.fillStyle = c.color;
        confettiCtx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
        confettiCtx.restore();
      }

      state.activeCanvases['confetti'] = requestAnimationFrame(animate);
    }

    animate();
  }

  /** Burst a batch of confetti from the top. */
  function burstConfetti(count) {
    if (!confettiCanvas) initConfetti();
    if (!confettiCanvas) return;

    const colors = [
      '#FFD700', '#FF4444', '#FF69B4', '#FFFFFF',
      '#4488FF', '#FF8C00', '#00DDAA', '#FF1493',
    ];

    for (let i = 0; i < (count || 120); i++) {
      confettiPieces.push({
        x: Math.random() * confettiCanvas.width,
        y: -10 - Math.random() * 40,
        w: 4 + Math.random() * 6,
        h: 6 + Math.random() * 10,
        vx: -3 + Math.random() * 6,
        vy: 2 + Math.random() * 4,
        gravity: 0.06 + Math.random() * 0.04,
        drag: 0.99,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: -0.1 + Math.random() * 0.2,
        alpha: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  /* ── 5-F  FIREWORK SYSTEM (chapter-finale) ─────────────────── */

  let fireworkCanvas, fireworkCtx, rockets, sparks;

  function initFireworks() {
    if (state.particleSystemsInited['fireworks']) return;
    state.particleSystemsInited['fireworks'] = true;

    const chapter = document.getElementById('chapter-finale');
    if (!chapter) return;

    // Reuse confetti canvas or create new
    fireworkCanvas = chapter.querySelector('canvas.fireworks-canvas');
    if (!fireworkCanvas) {
      fireworkCanvas = document.createElement('canvas');
      fireworkCanvas.classList.add('firework-canvas');
      fireworkCanvas.style.cssText =
        'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:4;';
      chapter.appendChild(fireworkCanvas);
    }

    function resize() {
      fireworkCanvas.width = chapter.offsetWidth;
      fireworkCanvas.height = chapter.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    fireworkCtx = fireworkCanvas.getContext('2d');
    rockets = [];
    sparks = [];

    function animate() {
      if (!state.chapterVisible['chapter-finale']) {
        state.activeCanvases['fireworks'] = requestAnimationFrame(animate);
        return;
      }

      fireworkCtx.globalCompositeOperation = 'destination-out';
      fireworkCtx.fillStyle = 'rgba(0,0,0,0.15)';
      fireworkCtx.fillRect(0, 0, fireworkCanvas.width, fireworkCanvas.height);
      fireworkCtx.globalCompositeOperation = 'lighter';

      // Update rockets
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.x += r.vx;
        r.y += r.vy;
        r.vy += 0.03; // slight gravity on ascent
        r.trail.push({ x: r.x, y: r.y, alpha: 1 });
        if (r.trail.length > 12) r.trail.shift();

        // Draw trail
        r.trail.forEach((t, ti) => {
          t.alpha -= 0.08;
          if (t.alpha <= 0) return;
          fireworkCtx.beginPath();
          fireworkCtx.arc(t.x, t.y, 2, 0, Math.PI * 2);
          fireworkCtx.fillStyle = `rgba(255,220,150,${t.alpha})`;
          fireworkCtx.fill();
        });

        // Explode when velocity slows enough
        if (r.vy >= -1) {
          explodeFirework(r.x, r.y, r.color);
          rockets.splice(i, 1);
        }
      }

      // Update sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.04; // gravity
        s.vx *= 0.98;
        s.vy *= 0.98;
        s.alpha -= 0.012;

        if (s.alpha <= 0) {
          sparks.splice(i, 1);
          continue;
        }

        fireworkCtx.beginPath();
        fireworkCtx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        fireworkCtx.fillStyle = `rgba(${s.r},${s.g},${s.b},${s.alpha})`;
        fireworkCtx.fill();
      }

      state.activeCanvases['fireworks'] = requestAnimationFrame(animate);
    }

    animate();
  }

  /** Spawn a rocket from bottom center area. */
  function launchFirework() {
    if (!fireworkCanvas) return;
    const colors = [
      { r: 255, g: 215, b: 0 },    // gold
      { r: 255, g: 230, b: 200 },   // warm white
      { r: 255, g: 105, b: 180 },   // pink
      { r: 255, g: 160, b: 100 },   // peach
      { r: 200, g: 200, b: 255 },   // light blue
    ];
    const c = colors[Math.floor(Math.random() * colors.length)];

    rockets.push({
      x: fireworkCanvas.width * (0.2 + Math.random() * 0.6),
      y: fireworkCanvas.height,
      vx: -1 + Math.random() * 2,
      vy: -(6 + Math.random() * 4),
      color: c,
      trail: [],
    });
  }

  /** Create sparks at explosion point. */
  function explodeFirework(x, y, color) {
    const count = 30 + Math.floor(Math.random() * 30);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
      const speed = 1.5 + Math.random() * 3.5;
      sparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 1 + Math.random() * 2,
        alpha: 1,
        r: color.r,
        g: color.g,
        b: color.b,
      });
    }
  }

  /** Launch a staggered volley of fireworks. */
  function launchFireworkVolley() {
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      setTimeout(() => launchFirework(), i * 600 + Math.random() * 400);
    }
  }

  /* ═══════════════════════════════════════════════════════════════
   *  PARTICLE SYSTEMS — LAZY INIT MANAGER
   * ═══════════════════════════════════════════════════════════════ */

  function initParticleSystems() {
    // Observe chapters and lazy-init their particle systems
    const chapterEls = document.querySelectorAll('.chapter');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.id;

          switch (id) {
            case 'chapter-sacrifices':
              initFireflies();
              break;
            case 'chapter-built':
              initPetalShower('chapter-built');
              break;
            case 'chapter-roots':
              initGoldenDust();
              break;
            case 'chapter-reveal':
              initPetalShower('chapter-reveal');
              break;
            case 'chapter-finale':
              initConfetti();
              initFireworks();
              break;
          }
        });
      },
      { threshold: 0.1 }
    );

    chapterEls.forEach((ch) => observer.observe(ch));
  }

  /* ═══════════════════════════════════════════════════════════════
   *  6. CHAPTER-SPECIFIC ANIMATIONS
   * ═══════════════════════════════════════════════════════════════ */

  /* ── 6-1  CHAPTER 1 — INTRO ────────────────────────────────── */

  function initChapter1() {
    const chapter = document.getElementById('chapter-intro');
    if (!chapter) return;

    // ── Stars background ──
    createStars(chapter, 80);

    // ── Cinematic title reveal (line by line) ──
    const titleLines = chapter.querySelectorAll('.title-line');
    if (titleLines.length) {
      titleLines.forEach((line, i) => {
        gsap.fromTo(
          line,
          { opacity: 0, y: 25, filter: 'blur(4px)' },
          {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 1.2,
            delay: 0.8 + i * 0.6,
            ease: 'power3.out',
            onComplete: () => line.classList.add('visible'),
          }
        );
      });
    }

    // ── Subtitle fade-in after title ──
    const subtitle = chapter.querySelector('.intro-subtitle');
    if (subtitle) {
      gsap.fromTo(
        subtitle,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 1.2, delay: 3.2, ease: 'power2.out' }
      );
    }

    // ── Intro character fade-in ──
    const introChar = chapter.querySelector('.intro-character');
    if (introChar) {
      gsap.fromTo(
        introChar,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 1, delay: 3.8, ease: 'power2.out' }
      );
    }

    // ── Begin Journey button pulse ──
    const btn = chapter.querySelector('.begin-btn');
    if (btn) {
      gsap.fromTo(
        btn,
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 1, delay: 4.5, ease: 'back.out(1.5)' }
      );

      // Gentle pulse loop
      gsap.to(btn, {
        scale: 1.05,
        boxShadow: '0 0 30px rgba(255,215,0,0.5)',
        duration: 1.2,
        repeat: -1,
        yoyo: true,
        delay: 5.5,
        ease: 'sine.inOut',
      });

      btn.addEventListener('click', () => {
        const next = document.getElementById('chapter-journey');
        if (next) next.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }

  /** Create twinkling stars inside a container. */
  function createStars(container, count) {
    // Inject star keyframes once
    if (!document.getElementById('star-keyframes')) {
      const style = document.createElement('style');
      style.id = 'star-keyframes';
      style.textContent = `
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50%      { opacity: 1;   transform: scale(1.2); }
        }
      `;
      document.head.appendChild(style);
    }

    for (let i = 0; i < count; i++) {
      const star = document.createElement('div');
      const size = 1 + Math.random() * 3;
      star.style.cssText = `
        position: absolute;
        top: ${Math.random() * 100}%;
        left: ${Math.random() * 100}%;
        width: ${size}px;
        height: ${size}px;
        background: #FFF;
        border-radius: 50%;
        pointer-events: none;
        z-index: 1;
        opacity: 0.3;
        animation: twinkle ${2 + Math.random() * 4}s ${Math.random() * 3}s ease-in-out infinite;
        box-shadow: 0 0 ${size * 2}px rgba(255,215,0,0.4);
      `;
      container.appendChild(star);
    }
  }

  /** Animate text content letter by letter. */
  function animateTextLetterByLetter(el, opts) {
    const text = el.textContent;
    el.textContent = '';
    el.style.visibility = 'visible';

    const spans = [];
    for (let i = 0; i < text.length; i++) {
      const span = document.createElement('span');
      span.textContent = text[i] === ' ' ? '\u00A0' : text[i];
      span.style.cssText = `
        display: inline-block;
        opacity: 0;
        transform: translateY(20px);
        ${opts.glow ? 'text-shadow: 0 0 0px rgba(255,215,0,0);' : ''}
      `;
      el.appendChild(span);
      spans.push(span);
    }

    gsap.to(spans, {
      opacity: 1,
      y: 0,
      textShadow: opts.glow ? '0 0 20px rgba(255,215,0,0.6)' : 'none',
      duration: 0.5,
      stagger: opts.stagger || 0.05,
      delay: opts.delay || 0,
      ease: 'power2.out',
    });
  }

  /* ── 6-2  CHAPTER 2 — JOURNEY ──────────────────────────────── */

  function initChapter2() {
    const chapter = document.getElementById('chapter-journey');
    if (!chapter) return;

    // ── Play walking video ──
    const video = chapter.querySelector('video');
    if (video) {
      video.muted = true;
      video.loop = true;
      video.playsInline = true;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) video.play().catch(() => {});
            else video.pause();
          });
        },
        { threshold: 0.3 }
      );
      observer.observe(chapter);
    }

    // ── Typewriter effect on text elements ──
    const textEls = chapter.querySelectorAll('.typewriter, .story-text');
    textEls.forEach((el, idx) => {
      initTypewriter(el, 1.5 + idx * 2);
    });

    // ── Moving path lines at bottom ──
    createMovingPath(chapter);
  }

  /** Typewriter effect using GSAP. */
  function initTypewriter(el, delay) {
    const text = el.textContent;
    el.textContent = '';
    el.style.visibility = 'visible';
    el.style.borderRight = '2px solid rgba(255,215,0,0.8)';

    let charIdx = 0;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.unobserve(el);
          setTimeout(() => {
            const interval = setInterval(() => {
              if (charIdx < text.length) {
                el.textContent += text[charIdx];
                charIdx++;
              } else {
                clearInterval(interval);
                gsap.to(el, {
                  borderColor: 'transparent',
                  duration: 0.5,
                  repeat: 3,
                  yoyo: true,
                  delay: 0.5,
                  onComplete: () => { el.style.borderRight = 'none'; },
                });
              }
            }, 45);
          }, delay * 1000);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
  }

  /** Create animated path/road lines at the bottom of a chapter. */
  function createMovingPath(chapter) {
    if (!document.getElementById('path-keyframes')) {
      const style = document.createElement('style');
      style.id = 'path-keyframes';
      style.textContent = `
        @keyframes pathMove {
          0%   { transform: translateX(-100%); opacity: 0; }
          20%  { opacity: 0.6; }
          80%  { opacity: 0.6; }
          100% { transform: translateX(100vw); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    const pathContainer = document.createElement('div');
    pathContainer.style.cssText =
      'position:absolute;bottom:8%;left:0;width:100%;height:4px;overflow:hidden;pointer-events:none;z-index:2;';
    chapter.appendChild(pathContainer);

    for (let i = 0; i < 5; i++) {
      const line = document.createElement('div');
      line.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        width: ${40 + Math.random() * 60}px;
        height: 2px;
        background: rgba(255,215,0,0.3);
        border-radius: 1px;
        animation: pathMove ${3 + Math.random() * 3}s ${i * 0.8}s linear infinite;
      `;
      pathContainer.appendChild(line);
    }
  }

  /* ── 6-3  CHAPTER 3 — CHOICES / CROSSROADS ─────────────────── */

  function initChapter3() {
    const chapter = document.getElementById('chapter-choices');
    if (!chapter) return;

    const paths = chapter.querySelectorAll('.choice-path');

    if (paths.length >= 2) {
      // Animate paths diverging from center
      gsap.set(paths, { opacity: 0, x: 0 });

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            observer.unobserve(chapter);

            gsap.to(paths[0], {
              opacity: 1,
              x: 0,
              duration: 1.2,
              delay: 0.5,
              ease: 'power3.out',
            });
            gsap.to(paths[1], {
              opacity: 1,
              x: 0,
              duration: 1.2,
              delay: 0.8,
              ease: 'power3.out',
            });
          }
        },
        { threshold: 0.4 }
      );
      observer.observe(chapter);

      // Interactive tap/click to reveal text
      paths.forEach((path) => {
        const card = path.querySelector('.choice-card');
        const detail = path.querySelector('.choice-detail');
        const tapHint = path.querySelector('.tap-hint');
        if (!card) return;

        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
          // Add glow to selected card
          chapter.querySelectorAll('.choice-card').forEach((c) => c.classList.remove('revealed'));
          card.classList.add('revealed');

          // Reveal the hidden detail text
          if (detail) {
            detail.style.display = 'block';
            gsap.fromTo(
              detail,
              { opacity: 0, y: 15 },
              { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }
            );
          }

          // Hide tap hint
          if (tapHint) {
            gsap.to(tapHint, { opacity: 0, duration: 0.3 });
          }
        });
      });
    }

    // Character sprite at fork
    const sprite = chapter.querySelector('.character-sprite, .fork-character');
    if (sprite) {
      gsap.fromTo(
        sprite,
        { opacity: 0, scale: 0.8 },
        {
          opacity: 1,
          scale: 1,
          duration: 1.5,
          delay: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: chapter,
            start: 'top center',
            toggleActions: 'play none none reverse',
          },
        }
      );
    }

    // Text stagger
    const texts = chapter.querySelectorAll('.fade-in-up');
    texts.forEach((t, i) => {
      gsap.fromTo(
        t,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          delay: 1.2 + i * 0.3,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: chapter,
            start: 'top center',
            toggleActions: 'play none none reverse',
          },
        }
      );
    });
  }

  /* ── 6-4  CHAPTER 4 — SACRIFICES ───────────────────────────── */

  function initChapter4() {
    const chapter = document.getElementById('chapter-sacrifices');
    if (!chapter) return;

    // ── Moon glow effect ──
    const moon = chapter.querySelector('.moon, .moon-glow');
    if (moon) {
      gsap.to(moon, {
        boxShadow: '0 0 60px rgba(200,220,255,0.6), 0 0 120px rgba(200,220,255,0.3)',
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }

    // ── Night scene image parallax ──
    const sceneImg = chapter.querySelector('.scene-image, .chapter-image, img');
    if (sceneImg && typeof ScrollTrigger !== 'undefined') {
      gsap.to(sceneImg, {
        y: -40,
        ease: 'none',
        scrollTrigger: {
          trigger: chapter,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1,
        },
      });
    }

    // ── Quote text line by line ──
    const lines = chapter.querySelectorAll('.quote-line, .story-line, blockquote p');
    lines.forEach((line, i) => {
      gsap.fromTo(
        line,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          delay: 0.8 + i * 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: chapter,
            start: 'top center',
            toggleActions: 'play none none reverse',
          },
        }
      );
    });
  }

  /* ── 6-5  CHAPTER 5 — WHAT HE BUILT ───────────────────────── */

  function initChapter5() {
    const chapter = document.getElementById('chapter-built');
    if (!chapter) return;

    // ── Image parallax ──
    const sceneImg = chapter.querySelector('.scene-image, .chapter-image, img');
    if (sceneImg && typeof ScrollTrigger !== 'undefined') {
      gsap.to(sceneImg, {
        y: -50,
        ease: 'none',
        scrollTrigger: {
          trigger: chapter,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1,
        },
      });
    }

    // ── Window light glow overlays ──
    const windowLights = chapter.querySelectorAll('.window-light');
    windowLights.forEach((w) => {
      gsap.to(w, {
        opacity: 0.9,
        boxShadow: '0 0 25px rgba(255,200,100,0.7)',
        duration: 2 + Math.random() * 2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    });

    // ── Text with warm glow ──
    const texts = chapter.querySelectorAll('.warm-text, .story-text, p');
    texts.forEach((t, i) => {
      gsap.fromTo(
        t,
        { opacity: 0, y: 20, textShadow: '0 0 0px rgba(255,200,50,0)' },
        {
          opacity: 1,
          y: 0,
          textShadow: '0 0 15px rgba(255,200,50,0.3)',
          duration: 1,
          delay: 0.5 + i * 0.4,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: chapter,
            start: 'top center',
            toggleActions: 'play none none reverse',
          },
        }
      );
    });
  }

  /* ── 6-6  CHAPTER 6 — ROOTS ────────────────────────────────── */

  function initChapter6() {
    const chapter = document.getElementById('chapter-roots');
    if (!chapter) return;

    // ── Falling leaves (DOM-based) ──
    createFallingLeaves(chapter);

    // ── Light rays (CSS pseudo-elements) ──
    createLightRays(chapter);

    // ── Root glow pulse ──
    const rootGlow = chapter.querySelector('.root-glow, .roots');
    if (rootGlow) {
      gsap.to(rootGlow, {
        boxShadow: '0 0 40px rgba(255,200,50,0.5), 0 0 80px rgba(255,180,0,0.2)',
        duration: 2.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }

    // ── Scene image parallax ──
    const sceneImg = chapter.querySelector('.scene-image, .chapter-image, img');
    if (sceneImg && typeof ScrollTrigger !== 'undefined') {
      gsap.to(sceneImg, {
        y: -30,
        ease: 'none',
        scrollTrigger: {
          trigger: chapter,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1,
        },
      });
    }

    // ── Text animation ──
    const texts = chapter.querySelectorAll('.story-text, .roots-text, p');
    texts.forEach((t, i) => {
      gsap.fromTo(
        t,
        { opacity: 0, y: 25 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          delay: 0.6 + i * 0.5,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: chapter,
            start: 'top center',
            toggleActions: 'play none none reverse',
          },
        }
      );
    });
  }

  /** Falling golden/amber leaves. */
  function createFallingLeaves(container) {
    if (!document.getElementById('leaf-keyframes')) {
      const style = document.createElement('style');
      style.id = 'leaf-keyframes';
      style.textContent = `
        @keyframes leafFall {
          0%   { transform: translateY(-5vh) rotate(0deg) translateX(0); opacity: 0; }
          10%  { opacity: 0.8; }
          50%  { transform: translateY(50vh) rotate(180deg) translateX(var(--leaf-drift)); opacity: 0.7; }
          100% { transform: translateY(105vh) rotate(360deg) translateX(calc(var(--leaf-drift) * -0.5)); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    const LEAF_COUNT = 15;
    const colors = [
      'rgba(218,165,32,0.8)',  // goldenrod
      'rgba(255,140,0,0.7)',   // dark orange
      'rgba(184,134,11,0.75)', // dark goldenrod
      'rgba(205,92,0,0.6)',    // amber-brown
      'rgba(255,200,50,0.7)',  // bright gold
    ];

    for (let i = 0; i < LEAF_COUNT; i++) {
      const leaf = document.createElement('div');
      const size = 10 + Math.random() * 14;
      const drift = -40 + Math.random() * 80;
      const color = colors[Math.floor(Math.random() * colors.length)];

      leaf.style.cssText = `
        position: absolute;
        top: -20px;
        left: ${Math.random() * 100}%;
        width: ${size}px;
        height: ${size * 0.65}px;
        background: ${color};
        border-radius: 0 50% 50% 50%;
        pointer-events: none;
        z-index: 3;
        --leaf-drift: ${drift}px;
        animation: leafFall ${6 + Math.random() * 6}s ${Math.random() * 8}s ease-in-out infinite;
      `;
      container.appendChild(leaf);
    }
  }

  /** Diagonal light rays effect. */
  function createLightRays(container) {
    const raysContainer = document.createElement('div');
    raysContainer.style.cssText = `
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none;
      z-index: 1;
      overflow: hidden;
    `;

    for (let i = 0; i < 3; i++) {
      const ray = document.createElement('div');
      const width = 60 + Math.random() * 100;
      ray.style.cssText = `
        position: absolute;
        top: -20%;
        left: ${20 + i * 25}%;
        width: ${width}px;
        height: 140%;
        background: linear-gradient(180deg, rgba(255,215,0,0.08), rgba(255,215,0,0.02), transparent);
        transform: rotate(${15 + i * 5}deg);
        transform-origin: top center;
        opacity: 0.5;
      `;
      raysContainer.appendChild(ray);

      // Slow sway
      gsap.to(ray, {
        rotation: `+=${6}`,
        opacity: 0.3,
        duration: 6 + i * 2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }

    container.appendChild(raysContainer);
  }

  /* ── 6-7  CHAPTER 7 — THE REVEAL ───────────────────────────── */

  function initChapter7() {
    const chapter = document.getElementById('chapter-reveal');
    if (!chapter) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.unobserve(chapter);
          playRevealSequence(chapter);
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(chapter);
  }

  function playRevealSequence(chapter) {
    const tl = gsap.timeline();

    // ── Dramatic dark overlay ──
    const overlay = chapter.querySelector('.reveal-darkness');
    if (overlay) {
      tl.fromTo(overlay, { opacity: 1 }, { opacity: 0, duration: 2, delay: 1 });
    }

    // ── Celebration image reveal with scale + blur ──
    const img = chapter.querySelector('.reveal-photo');
    if (img) {
      tl.fromTo(
        img,
        { scale: 1.3, filter: 'blur(15px)', opacity: 0 },
        { scale: 1, filter: 'blur(0px)', opacity: 1, duration: 2, ease: 'power3.out' },
        '-=1.5'
      );
    }

    // ── Golden frame materializes ──
    const frame = chapter.querySelector('.golden-frame, .frame');
    if (frame) {
      tl.fromTo(
        frame,
        { opacity: 0, scale: 1.1, borderColor: 'rgba(255,215,0,0)' },
        {
          opacity: 1,
          scale: 1,
          borderColor: 'rgba(255,215,0,0.8)',
          duration: 1.5,
          ease: 'power2.out',
        },
        '-=1'
      );
    }

    // ── "The Real Hero" shimmer text ──
    const heroText = chapter.querySelector('.hero-text, .reveal-title, h2');
    if (heroText) {
      tl.fromTo(
        heroText,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 1.2, ease: 'power2.out' },
        '-=0.5'
      );

      // Shimmer effect
      if (!document.getElementById('shimmer-keyframes')) {
        const style = document.createElement('style');
        style.id = 'shimmer-keyframes';
        style.textContent = `
          @keyframes textShimmer {
            0%   { background-position: -200% center; }
            100% { background-position: 200% center; }
          }
          .shimmer-text {
            background: linear-gradient(90deg, #FFD700, #FFF, #FFD700, #FFF, #FFD700);
            background-size: 200% auto;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: textShimmer 3s linear infinite;
          }
        `;
        document.head.appendChild(style);
      }
      heroText.classList.add('shimmer-text');
    }

    // ── Standing character overlay ──
    const standingChar = chapter.querySelector('.standing-character');
    if (standingChar) {
      tl.fromTo(
        standingChar,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 1.5, ease: 'power2.out' },
        '-=0.8'
      );
    }

    // ── Emotional subtext ──
    const subTexts = chapter.querySelectorAll('.reveal-text, .emotional-text, p');
    subTexts.forEach((t, i) => {
      tl.fromTo(
        t,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 1, ease: 'power2.out' },
        `-=${0.6}`
      );
    });
  }

  /* ── 6-8  CHAPTER 8 — FINALE / HAPPY BIRTHDAY ─────────────── */

  function initChapter8() {
    const chapter = document.getElementById('chapter-finale');
    if (!chapter) return;

    let finaleTriggered = false;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !finaleTriggered) {
          finaleTriggered = true;
          playFinaleSequence(chapter);
        }
      },
      { threshold: 0.35 }
    );
    observer.observe(chapter);

    // Interactive: tap anywhere for more confetti/fireworks
    chapter.addEventListener('click', () => {
      burstConfetti(60);
      if (fireworkCanvas) launchFirework();
    });
  }

  function playFinaleSequence(chapter) {
    const tl = gsap.timeline();

    // ── Birthday cake animation ──
    const cake = chapter.querySelector('.finale-cake');
    if (cake) {
      tl.fromTo(
        cake,
        { opacity: 0, scale: 0.5, rotation: -10 },
        { opacity: 1, scale: 1, rotation: 0, duration: 1.2, ease: 'back.out(1.7)' }
      );

      // Candle flicker
      const candle = chapter.querySelector('.candle-flame, .flame');
      if (candle) {
        gsap.to(candle, {
          scaleX: 0.85,
          scaleY: 1.1,
          opacity: 0.8,
          duration: 0.15,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      }
    }

    // ── Confetti bursts in waves ──
    tl.call(() => burstConfetti(100), null, '+=0.5');
    tl.call(() => burstConfetti(80), null, '+=1.5');
    tl.call(() => burstConfetti(60), null, '+=2');

    // ── Fireworks volley ──
    tl.call(() => launchFireworkVolley(), null, '+=0.5');
    tl.call(() => launchFireworkVolley(), null, '+=3');

    // ── Final message lines with emotional pacing ──
    const messages = [
      'You spent your life making sure our wishes came true.',
      'You never stopped walking.',
      'You never stopped caring.',
      'You never stopped being there.',
      'Thank you for everything.',
    ];

    const messageContainer = chapter.querySelector('.finale-message') || chapter;
    const messageEls = messageContainer.querySelectorAll('.finale-line');

    // Use existing elements if available, otherwise create them
    if (messageEls.length >= messages.length) {
      messageEls.forEach((el, i) => {
        tl.fromTo(
          el,
          { opacity: 0, y: 25 },
          { opacity: 1, y: 0, duration: 1.2, ease: 'power2.out' },
          `+=${i === 0 ? 1 : 1.4}`
        );
      });
    }

    // ── Big birthday text ──
    const bigText = chapter.querySelector('.finale-birthday');
    if (bigText) {
      tl.fromTo(
        bigText,
        { opacity: 0, scale: 0.6, y: 30 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 1.5,
          ease: 'elastic.out(1, 0.5)',
        },
        '+=1'
      );

      // More confetti & fireworks on big reveal
      tl.call(() => {
        burstConfetti(150);
        launchFireworkVolley();
      });
    }

    // ── Heart pulse ──
    const heart = chapter.querySelector('.birthday-heart');
    if (heart) {
      tl.fromTo(
        heart,
        { opacity: 0, scale: 0 },
        { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(2)' },
        '-=0.5'
      );
      gsap.to(heart, {
        scale: 1.2,
        duration: 0.5,
        repeat: -1,
        yoyo: true,
        delay: tl.duration() + 0.5,
        ease: 'sine.inOut',
      });
    }

    // ── Restart button ──
    const restart = chapter.querySelector('.restart-btn');
    if (restart) {
      tl.fromTo(
        restart,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 1, ease: 'power2.out' },
        '+=2'
      );

      restart.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // Reset finale flag after scroll
        setTimeout(() => {
          const ch = document.getElementById('chapter-finale');
          if (ch) {
            ch.querySelectorAll('.finale-line, .finale-birthday, .birthday-heart, .restart-btn, .finale-cake, .tap-celebration').forEach((el) => {
              gsap.set(el, { clearProps: 'all' });
            });
          }
        }, 1500);
      });
    }

    // Show tap celebration hint
    const tapHint = chapter.querySelector('.tap-celebration');
    if (tapHint) {
      tl.call(() => tapHint.classList.add('visible'), null, '+=1');
    }
  }

  /* ═══════════════════════════════════════════════════════════════
   *  7. PARALLAX SYSTEM
   * ═══════════════════════════════════════════════════════════════ */

  function initParallax() {
    const elements = document.querySelectorAll('[data-parallax]');
    if (elements.length === 0) return;

    // Use GSAP ScrollTrigger if available, otherwise manual
    if (typeof ScrollTrigger !== 'undefined') {
      elements.forEach((el) => {
        const speed = parseFloat(el.dataset.speed || el.dataset.parallax || 0.3);
        gsap.to(el, {
          y: () => -speed * 120,
          ease: 'none',
          scrollTrigger: {
            trigger: el.closest('.chapter') || el,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
          },
        });
      });
    } else {
      // Fallback: manual scroll-based parallax
      function onScroll() {
        if (state.scrollTicking) return;
        state.scrollTicking = true;

        requestAnimationFrame(() => {
          const scrollY = window.pageYOffset;
          elements.forEach((el) => {
            const speed = parseFloat(el.dataset.speed || el.dataset.parallax || 0.3);
            const rect = el.getBoundingClientRect();
            const offset = (rect.top + scrollY - window.innerHeight / 2) * speed;
            el.style.transform = `translateY(${-offset * 0.3}px)`;
          });
          state.scrollTicking = false;
        });
      }

      window.addEventListener('scroll', onScroll, { passive: true });
    }
  }

  /* ═══════════════════════════════════════════════════════════════
   *  8. INTERACTIVE MOMENTS
   * ═══════════════════════════════════════════════════════════════ */

  function initInteractions() {
    // ── Swipe hint on mobile ──
    createSwipeHint();

    // ── Chapter 1: Begin Journey (handled in initChapter1) ──
    // ── Chapter 3: Path selection (handled in initChapter3) ──
    // ── Chapter 8: Tap for confetti (handled in initChapter8) ──
  }

  /** Show a subtle swipe-up hint on mobile. */
  function createSwipeHint() {
    if (window.innerWidth > 768) return;

    if (!document.getElementById('swipe-keyframes')) {
      const style = document.createElement('style');
      style.id = 'swipe-keyframes';
      style.textContent = `
        @keyframes swipeUp {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50%      { transform: translateY(-12px); opacity: 1; }
        }
        .swipe-hint {
          position: fixed;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 100;
          color: rgba(255,255,255,0.6);
          font-size: 13px;
          letter-spacing: 1px;
          text-align: center;
          pointer-events: none;
          animation: swipeUp 2s ease-in-out infinite;
          transition: opacity 0.5s;
        }
        .swipe-hint .arrow { font-size: 18px; display: block; margin-bottom: 4px; }
      `;
      document.head.appendChild(style);
    }

    const hint = document.createElement('div');
    hint.classList.add('swipe-hint');
    hint.innerHTML = '<span class="arrow">↑</span>Swipe to explore';
    document.body.appendChild(hint);

    // Hide after first scroll
    const hideHint = () => {
      gsap.to(hint, {
        opacity: 0,
        duration: 0.5,
        onComplete: () => hint.remove(),
      });
      window.removeEventListener('scroll', hideHint);
    };

    window.addEventListener('scroll', hideHint, { once: true, passive: true });
  }

  /* ═══════════════════════════════════════════════════════════════
   *  9. PERFORMANCE & RESIZE
   * ═══════════════════════════════════════════════════════════════ */

  function initPerformance() {
    // ── Debounced resize handler ──
    window.addEventListener('resize', () => {
      clearTimeout(state.resizeTimer);
      state.resizeTimer = setTimeout(() => {
        // Resize all canvases
        document.querySelectorAll('canvas.particle-canvas, canvas.firework-canvas').forEach((c) => {
          const parent = c.parentElement;
          if (parent) {
            c.width = parent.offsetWidth;
            c.height = parent.offsetHeight;
          }
        });

        // Re-trigger GSAP ScrollTrigger refresh
        if (typeof ScrollTrigger !== 'undefined') {
          ScrollTrigger.refresh();
        }
      }, 250);
    });

    // ── Pause canvas when tab is hidden ──
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Cancel all animation frames
        Object.keys(state.activeCanvases).forEach((key) => {
          cancelAnimationFrame(state.activeCanvases[key]);
        });
      }
      // They will restart on their own when chapters become visible again
    });
  }

  /* ═══════════════════════════════════════════════════════════════
   *  10. CHAPTER ANIMATION MASTER INIT
   * ═══════════════════════════════════════════════════════════════ */

  function initChapterAnimations() {
    initChapter1();
    initChapter2();
    initChapter3();
    initChapter4();
    initChapter5();
    initChapter6();
    initChapter7();
    initChapter8();
  }

  /* ═══════════════════════════════════════════════════════════════
   *  GSAP ScrollTrigger REGISTRATION
   * ═══════════════════════════════════════════════════════════════ */

  function registerGSAPPlugins() {
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
    }
  }

  /* ═══════════════════════════════════════════════════════════════
   *  MASTER INIT — DOMContentLoaded
   * ═══════════════════════════════════════════════════════════════ */

  document.addEventListener('DOMContentLoaded', () => {
    // Register GSAP plugins first
    registerGSAPPlugins();

    // Safety timeout — if assets take too long, proceed anyway
    const safetyTimer = setTimeout(() => {
      hideLoadingScreen();
      bootApp();
    }, 8000);

    // Preload → Hide loading → Init everything
    preloadAssets().then(() => {
      clearTimeout(safetyTimer);
      hideLoadingScreen();

      // Stagger init slightly so UI doesn't choke
      setTimeout(bootApp, 300);
    });
  });

  function bootApp() {
    try {
      initNavigation();
      initScrollAnimations();
      initParallax();
      initParticleSystems();
      initChapterAnimations();
      initAudio();
      initInteractions();
      initPerformance();

      // Show chapter navigation
      const nav = document.querySelector('.chapter-nav');
      if (nav) nav.classList.add('visible');

      console.log(
        '%c✨ The Man Who Never Stopped Walking — Ready',
        'color: #FFD700; font-size: 14px; font-weight: bold;'
      );
    } catch (e) {
      console.error('Init error:', e);
      // Ensure content is still visible even on error
      document.querySelectorAll('.fade-in-up, .fade-in-left, .fade-in-right, .scale-in').forEach(
        (el) => el.classList.add('visible')
      );
    }
  }
})();
