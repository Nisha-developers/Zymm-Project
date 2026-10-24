import { useEffect, useRef } from "react";

// Per-state motion. react = how strongly the audio level drives the orb.
const CFG = {
  idle:       { speed: 0.35, glow: 0.55, react: 0 },
  listening:  { speed: 0.9,  glow: 0.8,  react: 1 },
  processing: { speed: 2.0,  glow: 1,    react: 0.3 },
  speaking:   { speed: 1.1,  glow: 0.9,  react: 1 },
  error:      { speed: 0.2,  glow: 0.35, react: 0 },
};

// [rx, ry, tilt°, spin seconds, opacity, stroke, front?]
const RINGS = [
  [94, 28, 0, 13, 0.95, 2.2, true], [94, 46, 36, 18, 0.7, 1.4, false],
  [94, 24, 70, 10, 0.9, 2, true], [94, 60, 108, 22, 0.5, 1.1, false],
  [94, 34, 146, 15, 0.8, 1.8, true], [94, 72, 18, 27, 0.4, 1, false],
  [94, 50, 92, 20, 0.85, 1.6, true],
];

function Rings({ front }) {
  return (
    <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
      {RINGS.filter((r) => r[6] === front).map(([rx, ry, tilt, dur, op, sw], i) => (
        <g key={i} className="zo-spin" style={{ "--d": `${dur}s`, transformOrigin: "100px 100px", transform: "scale(calc(1 + var(--bass, 0) * 0.07))" }}>
          <ellipse cx="100" cy="100" rx={rx} ry={ry} transform={`rotate(${tilt} 100 100)`}
            fill="none" stroke="#d9ffe6" strokeWidth={sw} opacity={op}
            style={{ filter: "drop-shadow(0 0 2.5px #00ff66)" }} />
        </g>
      ))}
    </svg>
  );
}

export default function ZymmOrb({ state = "idle", levelRef, bandsRef, size = 240 }) {
  const wrap = useRef(null), canvas = useRef(null), stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    const cv = canvas.current, ctx = cv.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = cv.height = size * dpr;
    ctx.scale(dpr, dpr);
    const R = size / 2, reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const spawn = (p, edge) => Object.assign(p, {
      a: Math.random() * 6.283, r: edge ? 0.95 : Math.random() * 0.95,
      w: (0.4 + Math.random() * 0.9) * (Math.random() < 0.5 ? -1 : 1),
      len: 0.08 + Math.random() * 0.35, o: 0.3 + Math.random() * 0.7, j: Math.random() * 9,
    });
    const P = Array.from({ length: 170 }, () => spawn({}, false)); // fixed pool, reused
    let raf, last = performance.now(), lvl = 0, visible = true;

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(cv);

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) { last = now; return; }
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      const c = CFG[stateRef.current] || CFG.idle, t = now / 1000;
      const spd = c.speed * (reduce ? 0.15 : 1);
      lvl += ((levelRef?.current || 0) * c.react - lvl) * 0.15;

      // breathing + audio scale, applied directly to the DOM (no React render)
      wrap.current.style.transform = `scale(${1 + Math.sin(t * 0.9) * 0.015 + lvl * 0.1})`;
      wrap.current.style.setProperty("--spd", spd);
      const bd = bandsRef?.current;
wrap.current.style.setProperty("--bass", (bd?.bass || 0) * c.react);
const n = Math.floor(90 + (bd?.high || 0) * c.react * 80);

      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.beginPath(); ctx.arc(R, R, R - 2, 0, 6.283); ctx.clip();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      for (let k = 0; k < n; k++) {
         const p = P[k];
        p.a += (p.w * spd * dt) / (0.25 + p.r);          // inner particles spin faster: vortex
        p.r -= dt * 0.035 * spd;
        if (p.r < 0.04) spawn(p, true);
        const rr = (p.r + Math.sin(t * 0.7 + p.j) * 0.03) * R;
        ctx.beginPath();
        ctx.arc(R, R, rr, p.a, p.a + p.len * (1 + lvl));
        ctx.strokeStyle = `rgba(${140 + p.o * 90},255,${170 + p.o * 60},${p.o * (0.35 + c.glow * 0.5)})`;
        ctx.lineWidth = 0.7 + p.o * 1.5;
        ctx.stroke();
      }
      const cr = R * (0.1 + 0.1 * c.glow + 0.2 * lvl + Math.sin(t * 2.2) * 0.01);
      const g = ctx.createRadialGradient(R, R, 0, R, R, cr * 3);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.25, "rgba(190,255,215,0.85)");
      g.addColorStop(0.6, "rgba(0,255,102,0.3)");
      g.addColorStop(1, "rgba(0,255,102,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(R, R, cr * 3, 0, 6.283); ctx.fill();
      ctx.restore();
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [size, levelRef, bandsRef]);

  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`Zymm orb, ${state}`}>
      <style>{`
        @keyframes zo-spin { to { transform: rotate(360deg); } }
        .zo-spin { animation: zo-spin calc(var(--d) / max(var(--spd, .4), .05)) linear infinite; }
        @media (prefers-reduced-motion: reduce) { .zo-spin { animation-duration: 120s; } }
      `}</style>
      <div ref={wrap} className="absolute inset-0 will-change-transform">
        {/* 1 base sphere */}
        <div className="absolute inset-0 rounded-full" style={{
          background: "radial-gradient(circle at 50% 50%, #0a4a24 0%, #04200f 38%, #010803 75%)",
          boxShadow: "inset 0 0 36px rgba(0,255,102,.35), 0 18px 46px -12px rgba(0,255,102,.55)",
          border: "1px solid rgba(160,255,190,.35)",
        }} />
        <Rings front={false} />
        {/* 2-3 core + vortex */}
        <canvas ref={canvas} className="absolute inset-0 rounded-full" style={{ width: size, height: size }} />
        <Rings front />
        {/* 5 glass highlights */}
        <div className="pointer-events-none absolute inset-0 rounded-full" style={{
          background: "radial-gradient(ellipse 55% 30% at 32% 16%, rgba(255,255,255,.45), transparent 70%), radial-gradient(ellipse 40% 18% at 66% 90%, rgba(120,255,170,.3), transparent 70%)",
        }} />
      </div>
    </div>
  );
}
