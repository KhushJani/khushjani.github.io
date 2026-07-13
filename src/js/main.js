import '../styles/main.css';
import { initNetwork } from './network-bg.js';
import { initCursor } from './cursor.js';
import { initScramble, initMagnetic, initTilt } from './effects.js';

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------------------------------------------------
   Theme toggle (persisted) — the GL background reads the
   data-theme attribute directly and lerps its palette.
--------------------------------------------------------- */
(() => {
  const root = document.documentElement;
  const stored = localStorage.getItem('kj-theme');
  if (stored) root.setAttribute('data-theme', stored);
  $('#themeToggle')?.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('kj-theme', next);
  });
})();

/* ---------------------------------------------------------
   Nav: scrolled state, mobile menu, active-section link
--------------------------------------------------------- */
(() => {
  const nav = $('#nav');
  const burger = $('#navBurger');
  const mobile = $('#navMobile');

  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 12);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const closeMenu = () => {
    nav.classList.remove('is-open');
    burger?.setAttribute('aria-expanded', 'false');
  };
  burger?.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
  });
  mobile && $$('a', mobile).forEach((a) => a.addEventListener('click', closeMenu));

  const links = $$('.nav__links a');
  const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
  const sections = $$('main section[id]').filter((s) => map.has(s.id));
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          links.forEach((l) => l.classList.remove('is-active'));
          map.get(e.target.id)?.classList.add('is-active');
        }
      });
    },
    { rootMargin: '-45% 0px -50% 0px' }
  );
  sections.forEach((s) => spy.observe(s));
})();

/* ---------------------------------------------------------
   Scroll progress bar
--------------------------------------------------------- */
(() => {
  const bar = $('#scrollProgress');
  if (!bar) return;
  const update = () => {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${h > 0 ? window.scrollY / h : 0})`;
  };
  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
})();

/* ---------------------------------------------------------
   Reveal on scroll (+ safety net)
--------------------------------------------------------- */
(() => {
  const items = $$('.reveal');
  const reveal = (el) => el.classList.add('is-visible');
  if (prefersReduced || !('IntersectionObserver' in window)) {
    items.forEach(reveal);
    return;
  }
  const io = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          setTimeout(() => reveal(e.target), Number(e.target.dataset.delay || 0));
          obs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );
  items.forEach((el) => io.observe(el));
  window.addEventListener('load', () =>
    setTimeout(() => {
      if (!document.querySelector('.reveal.is-visible')) items.forEach(reveal);
    }, 700)
  );
})();

/* ---------------------------------------------------------
   Animated stat counters (+ safety net)
--------------------------------------------------------- */
(() => {
  const nums = $$('.stat__num');
  if (!nums.length) return;
  const animate = (el) => {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';
    const target = parseFloat(el.dataset.count || '0');
    const suffix = el.dataset.suffix || '';
    const isFloat = target % 1 !== 0;
    if (prefersReduced) {
      el.textContent = (isFloat ? target.toFixed(1) : target) + suffix;
      return;
    }
    const dur = 1500;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const val = target * (1 - Math.pow(1 - p, 3));
      el.textContent = (isFloat ? val.toFixed(1) : Math.round(val)) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          animate(e.target);
          obs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.6 }
  );
  nums.forEach((n) => io.observe(n));
  window.addEventListener('load', () => setTimeout(() => nums.forEach(animate), 800));
})();

/* ---------------------------------------------------------
   Project filtering
--------------------------------------------------------- */
(() => {
  const filters = $$('.filter');
  const projects = $$('.project');
  if (!filters.length) return;
  filters.forEach((btn) => {
    btn.addEventListener('click', () => {
      filters.forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const f = btn.dataset.filter;
      projects.forEach((p) => {
        p.classList.toggle('is-hidden', !(f === 'all' || p.dataset.cat === f));
      });
    });
  });
})();

/* ---------------------------------------------------------
   Marquee — duplicate track content for a seamless loop
--------------------------------------------------------- */
(() => {
  $$('.marquee__track').forEach((track) => {
    track.innerHTML += track.innerHTML;
  });
})();

/* ---------------------------------------------------------
   Ambient HUD — live Montréal clock + scroll telemetry.
   The "systems are live" credibility signal.
--------------------------------------------------------- */
(() => {
  const clock = $('#hudClock');
  const scroll = $('#hudScroll');
  if (clock) {
    const tick = () => {
      clock.textContent = new Date().toLocaleTimeString('en-CA', {
        timeZone: 'America/Toronto',
        hour12: false,
      });
    };
    tick();
    setInterval(tick, 1000);
  }
  if (scroll) {
    const upd = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      scroll.textContent =
        String(h > 0 ? Math.round((window.scrollY / h) * 100) : 0).padStart(2, '0') + '%';
    };
    upd();
    window.addEventListener('scroll', upd, { passive: true });
  }
  // fade the HUD out over the footer so it never overlaps content
  const footer = $('.footer');
  if (footer && 'IntersectionObserver' in window) {
    new IntersectionObserver(
      ([e]) => document.documentElement.classList.toggle('at-footer', e.isIntersecting)
    ).observe(footer);
  }
})();

/* ---------------------------------------------------------
   Architecture-diagram covers — generated from each project's
   stack as a mini data pipeline (nodes + edges + flowing packet).
--------------------------------------------------------- */
(() => {
  const SHORT = {
    'Azure Data Lake': 'Azure DL',
    'GitHub Actions': 'GH Actions',
    'Apache Druid': 'Druid',
    'Apache Spark': 'Spark',
  };
  const label = (t) => SHORT[t] || (t.length > 11 ? t.slice(0, 10) + '…' : t);

  const cover = (stack) => {
    const items = stack.slice(0, 4);
    const n = items.length;
    const w = 320, h = 116, padX = 40, y = 46;
    const gap = n > 1 ? (w - 2 * padX) / (n - 1) : 0;
    const xs = items.map((_, i) => padX + i * gap);
    let edges = '';
    for (let i = 0; i < n - 1; i++)
      edges += `<line x1="${xs[i]}" y1="${y}" x2="${xs[i + 1]}" y2="${y}" class="pc-edge"/>`;
    const nodesSvg = items
      .map(
        (t, i) =>
          `<g class="pc-node"><circle cx="${xs[i]}" cy="${y}" r="11" class="pc-ring"/><circle cx="${xs[i]}" cy="${y}" r="6.5"/><text x="${xs[i]}" y="${y + 27}" class="pc-label">${label(t)}</text></g>`
      )
      .join('');
    const dur = Math.max(2.4, n * 0.9);
    const packet = `<circle r="3.2" class="pc-packet"><animate attributeName="cx" values="${xs.join(';')}" dur="${dur}s" repeatCount="indefinite" calcMode="linear"/><animate attributeName="opacity" values="0;1;1;1;0" dur="${dur}s" repeatCount="indefinite"/></circle>`;
    return `<svg class="pc-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><defs><pattern id="pcgrid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" class="pc-grid"/></pattern></defs><rect width="${w}" height="${h}" fill="url(#pcgrid)"/>${edges}${nodesSvg}${packet}</svg>`;
  };

  $$('.project').forEach((card) => {
    const stack = $$('.project__stack li', card).map((li) => li.textContent.trim());
    if (!stack.length) return;
    const div = document.createElement('div');
    div.className = 'project__cover';
    div.innerHTML = cover(stack);
    card.prepend(div);
    // The cover already shows the stack as a pipeline, so drop the
    // redundant tool list beneath the description.
    card.querySelector('.project__stack')?.remove();
  });
})();

/* ---------------------------------------------------------
   Footer year
--------------------------------------------------------- */
$('#year') && ($('#year').textContent = new Date().getFullYear());

/* ---------------------------------------------------------
   Boot the visual layer
--------------------------------------------------------- */
initNetwork($('#gl'));
initCursor();
initScramble();
initMagnetic();
initTilt();
