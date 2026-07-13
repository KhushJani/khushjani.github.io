/* ============================================================
   Custom cursor — a precise dot plus a smoothly-trailing ring
   that swells over interactive elements. Disabled on touch /
   coarse pointers, where it would only get in the way.
   ============================================================ */

export function initCursor() {
  const fine = window.matchMedia('(pointer: fine)').matches;
  if (!fine) return;

  const ring = document.getElementById('cursor');
  const dot = document.getElementById('cursorDot');
  if (!ring || !dot) return;

  document.documentElement.classList.add('has-cursor');

  const pos = { x: innerWidth / 2, y: innerHeight / 2 };
  const ringPos = { ...pos };

  addEventListener(
    'pointermove',
    (e) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      dot.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      if (!shown) show();
    },
    { passive: true }
  );

  let shown = false;
  const show = () => {
    shown = true;
    ring.style.opacity = '1';
    dot.style.opacity = '1';
  };
  addEventListener('pointerdown', () => ring.classList.add('is-down'));
  addEventListener('pointerup', () => ring.classList.remove('is-down'));
  addEventListener('mouseleave', () => {
    ring.style.opacity = '0';
    dot.style.opacity = '0';
    shown = false;
  });

  // grow over interactive targets
  const interactive = 'a, button, [data-magnetic], [data-tilt], input, .filter';
  addEventListener('pointerover', (e) => {
    if (e.target.closest(interactive)) ring.classList.add('is-active');
  });
  addEventListener('pointerout', (e) => {
    if (e.target.closest(interactive)) ring.classList.remove('is-active');
  });

  const loop = () => {
    ringPos.x += (pos.x - ringPos.x) * 0.18;
    ringPos.y += (pos.y - ringPos.y) * 0.18;
    ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
