/* ============================================================
   Micro-interactions: decoding text, magnetic buttons, 3D tilt.
   All guard against reduced-motion / touch where appropriate.
   ============================================================ */

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Decoding / scramble text ----------
   Reveals an element's final text by cycling through glyphs,
   locking characters left-to-right. Runs once when scrolled in. */
export function initScramble() {
  const chars = '01<>[]{}/\\=+*#—λΣΦ▚▞░▒█';
  const els = [...document.querySelectorAll('[data-scramble]')];
  if (!els.length) return;

  const run = (el) => {
    const final = el.dataset.text ?? el.textContent;
    el.dataset.text = final;
    if (reduced) {
      el.textContent = final;
      return;
    }
    const total = final.length;
    let frame = 0;
    const speed = 1.6; // chars locked per frame-ish
    const tick = () => {
      const locked = Math.floor(frame / 2);
      let out = '';
      for (let i = 0; i < total; i++) {
        if (final[i] === ' ') { out += ' '; continue; }
        if (i < locked) out += final[i];
        else out += chars[(Math.random() * chars.length) | 0];
      }
      el.textContent = out;
      frame += speed;
      if (locked <= total) requestAnimationFrame(tick);
      else el.textContent = final;
    };
    tick();
  };

  const io = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          run(e.target);
          obs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.5 }
  );
  els.forEach((el) => io.observe(el));

  // safety net for renderers where IO never fires
  addEventListener('load', () =>
    setTimeout(() => els.forEach((el) => el.textContent === '' || el.dataset.text === undefined ? run(el) : (el.textContent = el.dataset.text)), 900)
  );
}

/* ---------- Magnetic buttons ---------- */
export function initMagnetic() {
  if (reduced || !window.matchMedia('(pointer: fine)').matches) return;
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const strength = Number(el.dataset.magnetic) || 0.35;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.transform = '';
    });
  });
}

/* ---------- 3D tilt on cards ---------- */
export function initTilt() {
  if (reduced || !window.matchMedia('(pointer: fine)').matches) return;
  const MAX = 8; // degrees
  document.querySelectorAll('[data-tilt]').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform =
        `perspective(900px) rotateY(${px * MAX}deg) rotateX(${-py * MAX}deg) translateY(-4px)`;
      // feed the spotlight glow that already reads --mx/--my
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.transform = '';
    });
  });
}
