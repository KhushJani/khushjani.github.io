/* ============================================================
   Living knowledge graph — the signature background.
   Every node is a REAL entity from Khush's career (tools,
   platforms, companies, projects) grouped by domain.

   Interaction: the cursor is a gravity well. Nearby skill nodes
   are drawn into a stable "halo" ring around it (damped spring,
   so they settle instead of vibrating), connect to the cursor
   and each other, and reveal their labels — you gather your
   skills into a little constellation and drag it around.
   Canvas 2D, so it runs everywhere.
   ============================================================ */

const ENTITIES = [
  { t: 'PwC', c: 'org', hub: 1 }, { t: 'BrainyBeam', c: 'org', hub: 1 }, { t: 'Ecubix', c: 'org', hub: 1 },
  { t: 'Bascom Bridge', c: 'org', hub: 1 }, { t: 'Concordia', c: 'org', hub: 1 },
  { t: 'Kafka Streaming', c: 'proj', hub: 1 }, { t: 'Uber Analytics', c: 'proj', hub: 1 },
  { t: 'Reddit ETL', c: 'proj', hub: 1 }, { t: 'Football ETL', c: 'proj', hub: 1 },
  { t: 'Cell Segmentation', c: 'proj', hub: 1 }, { t: 'Kidney DL', c: 'proj', hub: 1 },
  { t: 'Image Captioning', c: 'proj', hub: 1 }, { t: 'GenAI Support', c: 'proj', hub: 1 },
  { t: 'AWS', c: 'cloud' }, { t: 'Azure', c: 'cloud' }, { t: 'GCP', c: 'cloud' },
  { t: 'Databricks', c: 'cloud' }, { t: 'Kubernetes', c: 'cloud' }, { t: 'Docker', c: 'cloud' },
  { t: 'Terraform', c: 'cloud' }, { t: 'Jenkins', c: 'cloud' },
  { t: 'Kafka', c: 'data' }, { t: 'Spark', c: 'data' }, { t: 'PySpark', c: 'data' }, { t: 'Airflow', c: 'data' },
  { t: 'Snowflake', c: 'data' }, { t: 'BigQuery', c: 'data' }, { t: 'Redshift', c: 'data' },
  { t: 'Hadoop', c: 'data' }, { t: 'Flink', c: 'data' }, { t: 'AWS Glue', c: 'data' },
  { t: 'Athena', c: 'data' }, { t: 'Celery', c: 'data' }, { t: 'Mage', c: 'data' },
  { t: 'PyTorch', c: 'ai' }, { t: 'TensorFlow', c: 'ai' }, { t: 'Keras', c: 'ai' },
  { t: 'Scikit-Learn', c: 'ai' }, { t: 'YOLOv8', c: 'ai' }, { t: 'CNN', c: 'ai' },
  { t: 'LSTM', c: 'ai' }, { t: 'Transformers', c: 'ai' }, { t: 'BERT', c: 'ai' },
  { t: 'LLMs', c: 'ai' }, { t: 'MLflow', c: 'ai' }, { t: 'DVC', c: 'ai' },
  { t: 'OpenCV', c: 'ai' }, { t: 'Vertex AI', c: 'ai' }, { t: 'LangGraph', c: 'ai' }, { t: 'RAG', c: 'ai' }, { t: 'Agentic AI', c: 'ai' },
  { t: 'Python', c: 'lang' }, { t: 'SQL', c: 'lang' }, { t: 'R', c: 'lang' },
  { t: 'C++', c: 'lang' }, { t: 'Java', c: 'lang' },
];

const CAT = {
  org: '255,235,200', proj: '255,198,107', cloud: '245,165,36',
  data: '255,198,107', ai: '232,135,30', lang: '255,220,168',
};
const LIGHT_NODE = '176,110,20';

// interaction tuning
const CAPTURE = 215;   // cursor influence radius
const SPRING = 0.045;  // looser pull, so gathered skills are easy to leave behind
const FRICTION = 0.82; // velocity damping (kills the vibration)

export function initNetwork(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.classList.add('gl-bg--fallback'); return; }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const isLight = () => document.documentElement.dataset.theme === 'light';

  let W = 0, H = 0, nodes = [], packets = [];
  const mouse = { x: -9999, y: -9999, active: false };
  const rand = (a, b) => a + Math.random() * (b - a);
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const build = () => {
    W = window.innerWidth || document.documentElement.clientWidth;
    H = window.innerHeight || document.documentElement.clientHeight;
    canvas.width = Math.max(1, Math.floor(W * dpr));
    canvas.height = Math.max(1, Math.floor(H * dpr));
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.max(34, Math.min(70, Math.round((W * H) / 30000)));
    const pool = shuffle(ENTITIES.slice());
    nodes = Array.from({ length: count }, (_, i) => {
      const e = pool[i % pool.length];
      return {
        x: rand(0, W), y: rand(0, H),
        dx: rand(-0.14, 0.14), dy: rand(-0.14, 0.14), // free drift
        vx: 0, vy: 0,                                  // spring velocity
        restR: rand(58, 112),                          // halo distance
        ang: rand(0, Math.PI * 2),
        r: e.hub ? rand(2.6, 3.6) : rand(1.1, 2.2),
        t: e.t, c: e.c, hub: !!e.hub, cap: 0,
      };
    });
    packets = [];
  };

  const LINK = 172, LINK2 = LINK * LINK;

  const spawnPacket = () => {
    if (packets.length > 16 || nodes.length < 2) return;
    const a = nodes[(Math.random() * nodes.length) | 0];
    let best = null, bestD = LINK2;
    for (const b of nodes) {
      if (b === a) continue;
      const d = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
      if (d < bestD && Math.random() < 0.35) { best = b; bestD = d; }
    }
    if (best) packets.push({ a, b: best, t: 0, speed: rand(0.004, 0.01) });
  };

  const step = () => {
    const light = isLight();
    const nodeCol = (n) => (light ? LIGHT_NODE : CAT[n.c] || '245,165,36');
    const edgeCol = light ? '176,110,20' : '245,165,36';
    const packetCol = light ? '201,122,22' : '255,214,120';
    const cx = mouse.x, cy = mouse.y;
    ctx.clearRect(0, 0, W, H);

    // ---- update positions ----
    for (const n of nodes) {
      const dx = n.x - cx, dy = n.y - cy;
      const dist = Math.hypot(dx, dy);
      if (mouse.active && dist < CAPTURE) {
        // damped spring toward a rest point on the halo ring
        let ux, uy;
        if (dist > 0.5) { ux = dx / dist; uy = dy / dist; }
        else { ux = Math.cos(n.ang); uy = Math.sin(n.ang); }
        const tx = cx + ux * n.restR, ty = cy + uy * n.restR;
        n.vx = (n.vx + (tx - n.x) * SPRING) * FRICTION;
        n.vy = (n.vy + (ty - n.y) * SPRING) * FRICTION;
        n.x += n.vx; n.y += n.vy;
        n.cap = Math.min(1, n.cap + 0.08);
      } else {
        // free: coast away with leftover momentum, easing back to gentle
        // drift — so gathered skills release quickly and float off.
        n.vx += (n.dx - n.vx) * 0.06;
        n.vy += (n.dy - n.vy) * 0.06;
        n.x += n.vx; n.y += n.vy;
        n.cap = Math.max(0, n.cap - 0.12);
        if (n.x < -30) n.x = W + 30; else if (n.x > W + 30) n.x = -30;
        if (n.y < -30) n.y = H + 30; else if (n.y > H + 30) n.y = -30;
      }
    }

    // ---- ambient edges ----
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
        if (d2 < LINK2) {
          const alpha = (1 - d2 / LINK2) * (a.c === b.c ? 0.6 : 0.3);
          ctx.strokeStyle = `rgba(${edgeCol},${alpha})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }

    // ---- cursor hub: glow + spokes to captured nodes ----
    if (mouse.active) {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 180);
      g.addColorStop(0, `rgba(${light ? '176,110,20' : '245,165,36'},${light ? 0.05 : 0.08})`);
      g.addColorStop(1, 'rgba(245,165,36,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - 180, cy - 180, 360, 360);

      for (const n of nodes) {
        if (n.cap <= 0.01) continue;
        ctx.strokeStyle = `rgba(${edgeCol},${n.cap * 0.45})`;
        ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(n.x, n.y); ctx.stroke();
      }
      ctx.fillStyle = `rgba(${light ? '176,110,20' : '255,214,120'},0.9)`;
      ctx.beginPath(); ctx.arc(cx, cy, 2.6, 0, Math.PI * 2); ctx.fill();
    }

    // ---- nodes ----
    for (const n of nodes) {
      ctx.fillStyle = `rgba(${nodeCol(n)},${n.hub ? 0.95 : 0.8})`;
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
      if (n.cap > 0.05) {
        ctx.strokeStyle = `rgba(${nodeCol(n)},${n.cap * 0.55})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 5, 0, Math.PI * 2); ctx.stroke();
      }
    }

    // ---- labels for captured nodes (with shadow for legibility) ----
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 5;
    for (const n of nodes) {
      if (n.cap <= 0.15) continue;
      ctx.font = `${n.hub ? 600 : 400} 11.5px "IBM Plex Mono", ui-monospace, monospace`;
      ctx.fillStyle = `rgba(${light ? '60,45,12' : '255,236,205'},${n.cap * 0.96})`;
      ctx.fillText(n.t, n.x + n.r + 8, n.y);
    }
    ctx.shadowBlur = 0;

    // ---- packets ----
    if (Math.random() < 0.13) spawnPacket();
    for (let k = packets.length - 1; k >= 0; k--) {
      const pk = packets[k];
      pk.t += pk.speed;
      if (pk.t >= 1) { packets.splice(k, 1); continue; }
      const x = pk.a.x + (pk.b.x - pk.a.x) * pk.t;
      const y = pk.a.y + (pk.b.y - pk.a.y) * pk.t;
      ctx.fillStyle = `rgba(${packetCol},0.95)`;
      ctx.beginPath(); ctx.arc(x, y, 1.9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(${packetCol},0.22)`;
      ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
    }
  };

  let raf, running = true;
  const loop = () => { if (!running) return; step(); raf = requestAnimationFrame(loop); };

  build();
  if (reduced) step(); else raf = requestAnimationFrame(loop);

  window.addEventListener('resize', build);
  window.addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; }, { passive: true });
  window.addEventListener('pointerout', () => (mouse.active = false));
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running && !reduced) raf = requestAnimationFrame(loop);
    else cancelAnimationFrame(raf);
  });

  console.info('[network-bg] knowledge graph running with', nodes.length, 'real entities');
}
