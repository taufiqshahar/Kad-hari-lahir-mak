/* ==========================================================================
   Kad Hari Lahir Mak — script.js
   Vanilla JavaScript (ES6+), tiada kebergantungan luaran.

   Modul:
   - Effects    : kanvas tunggal untuk kelopak bunga, konfeti emas & hati
   - Toast      : mesej ringkas yang boleh dibaca pembaca skrin
   - Reveal     : pendedahan seksyen semasa menatal (IntersectionObserver)
   - Music      : main/jeda muzik — TIDAK sekali-kali dimainkan automatik
   - Gallery    : pemegang foto hilang (placeholder) + lightbox
   - Experience : buka sampul, dedah kad, ulang semula
   ========================================================================== */
(() => {
  'use strict';

  const CONFIG = Object.freeze({
    shareMessage:
      'Selamat Hari Lahir buat mak tersayang. Semoga Allah SWT sentiasa merahmati, melindungi dan memberkati kehidupan mak. ❤️',
    timing: Object.freeze({
      celebrate: 1100, // konfeti & kelopak selepas penutup sampul terbuka
      leave: 2500,     // sampul mula pudar
      leaveDuration: 850,
    }),
    swipeThreshold: 45,
    musicVolume: 0.6,
  });

  const root = document.documentElement;
  const body = document.body;
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const prefersReducedMotion = () => reducedMotionQuery.matches;
  const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, prefersReducedMotion() ? 0 : ms));
  const random = (min, max) => min + Math.random() * (max - min);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const pad2 = (n) => String(n).padStart(2, '0');

  /* ------------------------------------------------------------------------
     Effects — satu <canvas>, satu gelung rAF yang berhenti sendiri bila kosong
     ------------------------------------------------------------------------ */
  function createEffects(canvas) {
    const noop = () => {};
    const disabledApi = { burst: noop, hearts: noop, startAmbient: noop, stopAmbient: noop, clear: noop };
    const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
    if (!ctx) return disabledApi;

    const PETAL_COLOURS = ['#F3DFDF', '#EBC2C2', '#D9A6A7', '#FFFDF8', '#E9C9C4', '#F7E7E4'];
    const GOLD_COLOURS = ['#C6A46C', '#E6CF9E', '#F1DDAE', '#A88748', '#D9BC82'];
    const HEART_COLOURS = ['#D9A6A7', '#C98E93', '#E6CF9E', '#F3DFDF'];
    const MAX_PARTICLES = 260;

    let width = 0;
    let height = 0;
    let particles = [];
    let rafId = 0;
    let lastTime = 0;
    let ambient = false;
    let ambientClock = 0;

    const makeSprite = (size, draw) => {
      const sprite = document.createElement('canvas');
      sprite.width = sprite.height = size;
      const g = sprite.getContext('2d');
      g.translate(size / 2, size / 2);
      draw(g, size);
      return sprite;
    };

    const petalSprites = PETAL_COLOURS.map((colour) =>
      makeSprite(64, (g) => {
        g.beginPath();
        g.moveTo(0, 26);
        g.bezierCurveTo(-25, 14, -23, -21, -7, -25);
        g.quadraticCurveTo(0, -18, 7, -25);
        g.bezierCurveTo(23, -21, 25, 14, 0, 26);
        g.closePath();
        const gradient = g.createLinearGradient(0, -26, 0, 26);
        gradient.addColorStop(0, '#FFFFFF');
        gradient.addColorStop(0.55, colour);
        gradient.addColorStop(1, colour);
        g.fillStyle = gradient;
        g.fill();
        g.lineWidth = 1.2;
        g.strokeStyle = 'rgba(116, 74, 81, 0.22)';
        g.stroke();
        g.beginPath();
        g.moveTo(0, 20);
        g.quadraticCurveTo(3, 0, 0, -16);
        g.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        g.stroke();
      })
    );

    // Kelopak bunga sebenar (foto) — lembaran sprite mendatar, setiap sel segi empat sama.
    // Jika gagal dimuatkan, kelopak lukisan di atas kekal sebagai sandaran.
    const realPetals = new Image();
    realPetals.decoding = 'async';
    realPetals.addEventListener('load', () => {
      const cell = realPetals.naturalHeight;
      const count = Math.floor(realPetals.naturalWidth / cell);
      if (!cell || !count) return;
      const sprites = [];
      for (let i = 0; i < count; i += 1) {
        sprites.push(makeSprite(cell, (g) => g.drawImage(realPetals, i * cell, 0, cell, cell, -cell / 2, -cell / 2, cell, cell)));
      }
      petalSprites.splice(0, petalSprites.length, ...sprites);
    }, { once: true });
    if (!prefersReducedMotion()) realPetals.src = 'assets/flowers/petals.webp';

    const heartSprites = HEART_COLOURS.map((colour) =>
      makeSprite(64, (g) => {
        g.beginPath();
        g.moveTo(0, 22);
        g.bezierCurveTo(-30, 2, -24, -26, 0, -12);
        g.bezierCurveTo(24, -26, 30, 2, 0, 22);
        g.closePath();
        g.fillStyle = colour;
        g.fill();
        g.lineWidth = 1.5;
        g.strokeStyle = 'rgba(198, 164, 108, 0.9)';
        g.stroke();
      })
    );

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const scaleCount = (n) => Math.round(n * Math.min(1, Math.max(0.55, (width * height) / (1280 * 800))));

    const add = (particle) => {
      if (particles.length < MAX_PARTICLES) particles.push(particle);
    };

    const spawnPetal = (x, y, vx = random(-15, 15), vy = random(35, 80)) =>
      add({
        type: 'petal', x, y, vx, vy,
        size: random(14, 24),
        rot: random(0, Math.PI * 2),
        spin: random(-1.6, 1.6),
        flip: random(0, Math.PI * 2),
        flipSpeed: random(1.5, 3.5),
        sway: random(18, 46),
        swayFreq: random(0.6, 1.4),
        t: random(0, 10),
        sprite: pick(petalSprites),
        alpha: 1,
      });

    const spawnConfetti = (x, y) => {
      const angle = random(-Math.PI * 0.92, -Math.PI * 0.08);
      const speed = random(320, 760);
      add({
        type: 'confetti', x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        w: random(5, 9),
        h: random(8, 14),
        round: Math.random() < 0.28,
        rot: random(0, Math.PI * 2),
        spin: random(-8, 8),
        flip: random(0, Math.PI * 2),
        flipSpeed: random(6, 12),
        colour: pick(GOLD_COLOURS),
        alpha: 1,
      });
    };

    const spawnHeart = (x, y) =>
      add({
        type: 'heart', x, y,
        vx: random(-12, 12),
        vy: random(-95, -55),
        size: random(16, 30),
        sway: random(10, 26),
        swayFreq: random(0.8, 1.6),
        t: random(0, 10),
        life: 0,
        maxLife: random(4.5, 7),
        sprite: pick(heartSprites),
        alpha: 0,
      });

    const update = (dt) => {
      const gravity = 900;
      particles = particles.filter((p) => {
        if (p.type === 'confetti') {
          p.vx *= Math.pow(0.18, dt);
          p.vy = p.vy * Math.pow(0.35, dt) + gravity * dt * 0.55;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.rot += p.spin * dt;
          p.flip += p.flipSpeed * dt;
          return p.y < height + 30;
        }
        if (p.type === 'petal') {
          p.t += dt;
          p.vx *= Math.pow(0.4, dt);
          p.vy += (60 - p.vy) * Math.min(1, dt * 1.2);
          p.x += (p.vx + Math.sin(p.t * p.swayFreq) * p.sway) * dt;
          p.y += p.vy * dt;
          p.rot += p.spin * dt;
          p.flip += p.flipSpeed * dt;
          return p.y < height + 40 && p.x > -60 && p.x < width + 60;
        }
        // heart
        p.t += dt;
        p.life += dt;
        p.x += (p.vx + Math.sin(p.t * p.swayFreq) * p.sway) * dt;
        p.y += p.vy * dt;
        const fadeIn = Math.min(1, p.life / 0.6);
        const fadeOut = Math.max(0, 1 - Math.max(0, p.life - (p.maxLife - 1.4)) / 1.4);
        p.alpha = Math.min(fadeIn, fadeOut) * 0.9;
        return p.life < p.maxLife && p.y > -60;
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        ctx.save();
        ctx.translate(p.x, p.y);
        if (p.type === 'confetti') {
          ctx.rotate(p.rot);
          ctx.scale(1, Math.cos(p.flip));
          ctx.fillStyle = p.colour;
          if (p.round) {
            ctx.beginPath();
            ctx.arc(0, 0, p.w * 0.45, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          }
        } else if (p.type === 'petal') {
          ctx.rotate(p.rot);
          ctx.scale(Math.max(0.25, Math.abs(Math.cos(p.flip))), 1);
          ctx.globalAlpha = 0.92;
          ctx.drawImage(p.sprite, -p.size / 2, -p.size / 2, p.size, p.size);
        } else {
          ctx.globalAlpha = p.alpha;
          ctx.drawImage(p.sprite, -p.size / 2, -p.size / 2, p.size, p.size);
        }
        ctx.restore();
      }
    };

    const loop = (now) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000 || 0);
      lastTime = now;

      if (ambient) {
        ambientClock += dt;
        const interval = width < 600 ? 0.75 : 0.5;
        while (ambientClock > interval) {
          ambientClock -= interval;
          spawnPetal(random(-20, width + 20), -30);
        }
      }

      update(dt);
      draw();

      if (particles.length || ambient) {
        rafId = window.requestAnimationFrame(loop);
      } else {
        rafId = 0;
        ctx.clearRect(0, 0, width, height);
      }
    };

    const start = () => {
      if (rafId || document.hidden) return;
      lastTime = performance.now();
      rafId = window.requestAnimationFrame(loop);
    };

    const stop = () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = 0;
    };

    let resizeQueued = false;
    window.addEventListener('resize', () => {
      if (resizeQueued) return;
      resizeQueued = true;
      window.requestAnimationFrame(() => {
        resizeQueued = false;
        resize();
      });
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else if (particles.length || ambient) start();
    });

    resize();

    const enabled = () => !prefersReducedMotion();

    return {
      /** Letupan konfeti emas + kelopak bunga dari satu titik. */
      burst(x, y) {
        if (!enabled()) return;
        const confetti = scaleCount(110);
        for (let i = 0; i < confetti; i += 1) spawnConfetti(x, y);
        const petals = scaleCount(34);
        for (let i = 0; i < petals; i += 1) {
          const angle = random(-Math.PI, 0);
          const speed = random(80, 260);
          spawnPetal(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed);
        }
        for (let i = 0; i < scaleCount(18); i += 1) spawnPetal(random(0, width), random(-120, -20));
        start();
      },
      /** Hati terapung naik dari bawah skrin. */
      hearts(count = 14) {
        if (!enabled()) return;
        const n = scaleCount(count);
        for (let i = 0; i < n; i += 1) {
          spawnHeart(random(width * 0.1, width * 0.9), height + random(10, 160));
        }
        start();
      },
      startAmbient() {
        if (!enabled()) return;
        ambient = true;
        start();
      },
      stopAmbient() {
        ambient = false;
      },
      clear() {
        ambient = false;
        particles = [];
        stop();
        ctx.clearRect(0, 0, width, height);
      },
    };
  }

  /* ------------------------------------------------------------------------
     Toast
     ------------------------------------------------------------------------ */
  function createToast(element) {
    let timer = 0;
    return {
      show(message, duration = 3400) {
        if (!element) return;
        element.textContent = message;
        // Paksa reflow supaya peralihan dimainkan semula
        void element.offsetWidth;
        element.classList.add('is-visible');
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          element.classList.remove('is-visible');
          timer = window.setTimeout(() => { element.textContent = ''; }, 400);
        }, duration);
      },
    };
  }

  /* ------------------------------------------------------------------------
     Reveal — elemen muncul lembut apabila ditatal ke dalam pandangan
     ------------------------------------------------------------------------ */
  function createReveal(elements) {
    if (!('IntersectionObserver' in window)) {
      elements.forEach((el) => el.classList.add('is-visible'));
      return { reset() {} };
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('is-visible');
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );
    elements.forEach((el) => observer.observe(el));
    return {
      reset() {
        elements.forEach((el) => el.classList.remove('is-visible'));
      },
    };
  }

  /* ------------------------------------------------------------------------
     Music — hanya bermula selepas klik. Fail hilang tidak merosakkan laman.
     ------------------------------------------------------------------------ */
  function createMusic(audio, button, toast) {
    if (!audio || !button) return { pause() {} };

    let unavailable = false;
    audio.volume = CONFIG.musicVolume;

    const render = (playing) => {
      const label = playing ? 'Jeda muzik' : 'Mainkan muzik';
      button.classList.toggle('is-playing', playing);
      button.setAttribute('aria-pressed', String(playing));
      button.setAttribute('aria-label', label);
      button.title = label;
    };

    const markUnavailable = () => {
      if (unavailable) return;
      unavailable = true;
      button.classList.remove('is-loading');
      render(false);
      button.hidden = true; // sembunyikan kawalan supaya tiada butang "rosak" untuk mak
      console.info('[Kad] Fail muzik tidak ditemui: assets/birthday-music.mp3 — kawalan muzik disembunyikan.');
    };

    audio.addEventListener('error', markUnavailable);
    audio.addEventListener('playing', () => { button.classList.remove('is-loading'); render(true); });
    audio.addEventListener('pause', () => render(false));
    audio.addEventListener('ended', () => render(false));
    if (audio.error) markUnavailable();

    button.addEventListener('click', async () => {
      if (unavailable) {
        toast.show('Maaf, fail muzik belum ditambah.');
        return;
      }
      if (!audio.paused) {
        audio.pause();
        return;
      }
      button.classList.add('is-loading');
      try {
        await audio.play();
      } catch (error) {
        button.classList.remove('is-loading');
        if (error && error.name === 'NotAllowedError') {
          toast.show('Ketik butang muzik sekali lagi untuk memainkan lagu.');
        } else if (!unavailable) {
          markUnavailable();
          toast.show('Maaf, muzik tidak dapat dimainkan.');
        }
      }
    });

    render(false);
    return { pause: () => audio.pause() };
  }

  /* ------------------------------------------------------------------------
     Gallery — placeholder untuk foto hilang + lightbox (papan kekunci & leret)
     ------------------------------------------------------------------------ */
  function createGallery(triggers, dialog, toast) {
    const items = triggers.map((button, index) => {
      const img = $('.photo__img', button);
      return {
        button,
        img,
        src: img ? img.getAttribute('src') : '',
        alt: img ? img.alt : '',
        caption: button.dataset.caption || '',
        number: index + 1,
        missing: !img,
      };
    });

    const markMissing = (item) => {
      if (item.missing && item.button.classList.contains('is-missing')) return;
      item.missing = true;
      item.button.classList.add('is-missing');
    };

    items.forEach((item) => {
      if (!item.img) {
        markMissing(item);
        return;
      }
      item.img.addEventListener('error', () => markMissing(item), { once: true });
      // Ralat mungkin berlaku sebelum skrip dimuatkan
      if (item.img.complete && item.img.naturalWidth === 0 && item.img.currentSrc) markMissing(item);
    });

    const supportsDialog = !!dialog && typeof dialog.showModal === 'function';
    if (!dialog) {
      return { close() {} };
    }

    const imgEl = $('#lightboxImg', dialog);
    const placeholder = $('#lightboxPlaceholder', dialog);
    const placeholderNum = $('#lightboxPlaceholderNum', dialog);
    const counter = $('#lightboxCounter', dialog);
    const caption = $('#lightboxCaption', dialog);
    const total = items.length;

    let current = 0;
    let lastTrigger = null;
    let historyPushed = false;
    let touchStart = null;

    const isOpen = () => dialog.hasAttribute('open');

    const preload = (index) => {
      const item = items[(index + total) % total];
      if (item && !item.missing && item.src) {
        const image = new Image();
        image.decoding = 'async';
        image.src = item.src;
      }
    };

    const render = (index) => {
      current = (index + total) % total;
      const item = items[current];
      counter.textContent = `Foto ${item.number} dari ${total}`;
      caption.textContent = item.caption;

      if (item.missing || !item.src) {
        imgEl.hidden = true;
        imgEl.removeAttribute('src');
        placeholder.hidden = false;
        placeholderNum.textContent = pad2(item.number);
      } else {
        placeholder.hidden = true;
        imgEl.hidden = false;
        if (imgEl.getAttribute('src') !== item.src) {
          imgEl.classList.add('is-loading');
          imgEl.dataset.index = String(current);
          imgEl.alt = item.alt;
          imgEl.src = item.src;
          if (imgEl.complete && imgEl.naturalWidth > 0) imgEl.classList.remove('is-loading');
        }
      }
      preload(current + 1);
      preload(current - 1);
    };

    // Pendengar dipasang sekali sahaja (elak pendua)
    imgEl.addEventListener('load', () => imgEl.classList.remove('is-loading'));
    imgEl.addEventListener('error', () => {
      const index = Number(imgEl.dataset.index);
      if (Number.isInteger(index) && items[index]) {
        markMissing(items[index]);
        if (index === current) render(current);
      }
    });

    const show = () => {
      if (supportsDialog) dialog.showModal();
      else dialog.setAttribute('open', '');
      root.classList.add('is-locked');
    };

    const hide = () => {
      if (!isOpen()) return;
      if (supportsDialog) dialog.close();
      else dialog.removeAttribute('open');
    };

    const onClosed = () => {
      root.classList.remove('is-locked');
      if (lastTrigger) lastTrigger.focus({ preventScroll: true });
    };

    const open = (index, trigger) => {
      lastTrigger = trigger || null;
      render(index);
      if (!isOpen()) {
        show();
        try {
          window.history.pushState({ kadLightbox: true }, '');
          historyPushed = true;
        } catch (error) {
          historyPushed = false;
        }
      }
      $('.lightbox__close', dialog).focus({ preventScroll: true });
    };

    /** Tutup — melalui sejarah (butang "back" Android turut menutup lightbox). */
    const close = () => {
      if (!isOpen()) return;
      if (historyPushed) {
        historyPushed = false;
        window.history.back(); // popstate akan menutup dialog
      } else {
        hide();
      }
    };

    const next = () => render(current + 1);
    const prev = () => render(current - 1);

    triggers.forEach((button, index) => {
      button.addEventListener('click', () => open(index, button));
    });

    dialog.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]');
      if (action) {
        const name = action.dataset.action;
        if (name === 'close') close();
        else if (name === 'next') next();
        else if (name === 'prev') prev();
        return;
      }
      // Klik pada ruang kosong (bukan foto) menutup paparan
      if (!event.target.closest('.lightbox__img, .lightbox__placeholder, .lightbox__caption, .lightbox__counter')) close();
    });

    dialog.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') { event.preventDefault(); next(); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); prev(); }
      else if (event.key === 'Escape' && !supportsDialog) { event.preventDefault(); close(); }
    });

    // Escape (dialog asli) → laluan tutup yang sama
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      close();
    });

    dialog.addEventListener('close', onClosed);

    dialog.addEventListener('touchstart', (event) => {
      if (event.touches.length !== 1) { touchStart = null; return; }
      const t = event.touches[0];
      touchStart = { x: t.clientX, y: t.clientY, time: Date.now() };
    }, { passive: true });

    dialog.addEventListener('touchend', (event) => {
      if (!touchStart || event.changedTouches.length !== 1) return;
      const t = event.changedTouches[0];
      const dx = t.clientX - touchStart.x;
      const dy = t.clientY - touchStart.y;
      const quick = Date.now() - touchStart.time < 800;
      touchStart = null;
      if (quick && Math.abs(dx) > CONFIG.swipeThreshold && Math.abs(dx) > Math.abs(dy) * 1.3) {
        if (dx < 0) next();
        else prev();
      }
    }, { passive: true });

    window.addEventListener('popstate', () => {
      if (isOpen()) {
        historyPushed = false;
        hide();
        if (!supportsDialog) onClosed();
      }
    });

    if (!supportsDialog) {
      // Pelayar lama: pastikan fokus & kunci tatal dipulihkan
      const observer = new MutationObserver(() => { if (!isOpen()) onClosed(); });
      observer.observe(dialog, { attributes: true, attributeFilter: ['open'] });
    }

    return { close };
  }

  /* ------------------------------------------------------------------------
     WhatsApp
     ------------------------------------------------------------------------ */
  function initShare(link) {
    if (!link) return;
    const isWeb = /^https?:$/.test(window.location.protocol);
    const pageUrl = isWeb ? window.location.href.split('#')[0] : '';
    const text = pageUrl ? `${CONFIG.shareMessage}\n\n${pageUrl}` : CONFIG.shareMessage;
    link.href = `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  /* ------------------------------------------------------------------------
     Experience — buka sampul → sambutan → kad; ulang semula
     ------------------------------------------------------------------------ */
  function createExperience({ intro, envelope, openButton, replayButton, greetingTitle, finale, effects, reveal, gallery }) {
    let state = 'sealed'; // sealed | opening | open
    let finaleCelebrated = false;

    const seal = () => {
      body.classList.add('is-sealed');
      body.classList.remove('is-open');
      intro.hidden = false;
      intro.classList.remove('is-leaving');
      envelope.classList.remove('is-open');
      openButton.disabled = false;
      openButton.removeAttribute('aria-busy');
      state = 'sealed';
    };

    const open = async () => {
      if (state !== 'sealed') return;
      state = 'opening';
      openButton.disabled = true;
      openButton.setAttribute('aria-busy', 'true');
      effects.stopAmbient();
      envelope.classList.add('is-open');

      await wait(CONFIG.timing.celebrate);
      const rect = envelope.getBoundingClientRect();
      effects.burst(rect.left + rect.width / 2, rect.top + rect.height * 0.3);

      await wait(CONFIG.timing.leave - CONFIG.timing.celebrate);
      intro.classList.add('is-leaving');

      await wait(CONFIG.timing.leaveDuration);
      intro.hidden = true;
      body.classList.remove('is-sealed');
      body.classList.add('is-open');
      window.scrollTo(0, 0);
      greetingTitle.focus({ preventScroll: true });
      effects.hearts(10);
      state = 'open';
    };

    const replay = () => {
      gallery.close();
      effects.clear();
      reveal.reset();
      finaleCelebrated = false;
      seal();
      window.scrollTo(0, 0);
      openButton.focus({ preventScroll: true });
      effects.startAmbient();
    };

    openButton.addEventListener('click', open);
    envelope.addEventListener('click', open);
    if (replayButton) replayButton.addEventListener('click', replay);

    // Kelopak & hati di seksyen penutup
    if (finale && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver(([entry]) => {
        if (state !== 'open') return;
        if (entry.isIntersecting) {
          effects.startAmbient();
          if (!finaleCelebrated) {
            finaleCelebrated = true;
            effects.hearts(16);
          }
        } else {
          effects.stopAmbient();
        }
      }, { threshold: 0.2 });
      observer.observe(finale);
    }

    seal();
    effects.startAmbient();
  }

  /* ------------------------------------------------------------------------
     Init
     ------------------------------------------------------------------------ */
  function init() {
    root.classList.add('js');

    const toast = createToast($('#toast'));
    const effects = createEffects($('#fxCanvas'));
    const reveal = createReveal($$('.reveal'));
    createMusic($('#bgMusic'), $('#musicToggle'), toast);
    const gallery = createGallery($$('.photo'), $('#lightbox'), toast);
    initShare($('#shareWhatsApp'));

    const intro = $('#intro');
    const envelope = $('#envelope');
    const openButton = $('#openCard');
    const greetingTitle = $('#greeting-title');

    if (intro && envelope && openButton && greetingTitle) {
      createExperience({
        intro,
        envelope,
        openButton,
        replayButton: $('#replay'),
        greetingTitle,
        finale: $('#penutup'),
        effects,
        reveal,
        gallery,
      });
    }

    // Matikan kesan berterusan jika pengguna menukar tetapan pergerakan
    const onMotionChange = () => { if (prefersReducedMotion()) effects.clear(); };
    if (typeof reducedMotionQuery.addEventListener === 'function') reducedMotionQuery.addEventListener('change', onMotionChange);
    else if (typeof reducedMotionQuery.addListener === 'function') reducedMotionQuery.addListener(onMotionChange);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
