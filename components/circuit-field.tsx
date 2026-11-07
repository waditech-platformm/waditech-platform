"use client";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { subscribeTheme } from "@/components/theme-toggle";

/**
 * Animated circuit-board background, drawn from the circuit traces in the WadiTech logo.
 * Faint PCB traces (90°/45° segments ending in pads) carry cyan "signals" that travel along them;
 * moving the pointer over the section fires signals on nearby traces.
 *
 * Budget: one 2D canvas, DPR capped at 2, paused off-screen and in background tabs,
 * one still frame for prefers-reduced-motion. Purely decorative (aria-hidden, no pointer events).
 */
type Pt = { x: number; y: number };
type Trace = { pts: Pt[]; len: number; seg: number[] };
type Pulse = { t: Trace; d: number; speed: number; life: number };

const DIRS: Pt[] = [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: -1, y: 1 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 }];

function buildTraces(w: number, h: number, cell: number, density: number): Trace[] {
  const cols = Math.ceil(w / cell), rows = Math.ceil(h / cell);
  const used = new Set<string>();
  const count = Math.max(6, Math.round(((cols * rows) / 26) * density));
  const traces: Trace[] = [];
  for (let i = 0; i < count; i++) {
    let cx = Math.floor(Math.random() * cols), cy = Math.floor(Math.random() * rows);
    if (used.has(`${cx},${cy}`)) continue;
    let dir = Math.floor(Math.random() * 4) * 2; // start orthogonal, like real traces
    const pts: Pt[] = [{ x: cx * cell, y: cy * cell }];
    const steps = 3 + Math.floor(Math.random() * 7);
    for (let s = 0; s < steps; s++) {
      if (Math.random() < 0.35) dir = (dir + (Math.random() < 0.5 ? 1 : 7)) % 8; // 45° bends
      const run = 1 + Math.floor(Math.random() * 3);
      let ok = true;
      for (let r = 0; r < run; r++) {
        const nx = cx + DIRS[dir].x, ny = cy + DIRS[dir].y;
        if (nx < 0 || ny < 0 || nx > cols || ny > rows || used.has(`${nx},${ny}`)) { ok = false; break; }
        cx = nx; cy = ny; used.add(`${cx},${cy}`);
      }
      pts.push({ x: cx * cell, y: cy * cell });
      if (!ok) break;
    }
    if (pts.length < 3) continue;
    const seg: number[] = [];
    let len = 0;
    for (let k = 1; k < pts.length; k++) { const l = Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y); seg.push(l); len += l; }
    if (len > cell * 2) traces.push({ pts, len, seg });
  }
  return traces;
}

function pointAt(t: Trace, d: number): Pt {
  let rest = Math.max(0, Math.min(d, t.len));
  for (let k = 0; k < t.seg.length; k++) {
    if (rest <= t.seg[k]) { const a = t.pts[k], b = t.pts[k + 1], f = t.seg[k] ? rest / t.seg[k] : 0; return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }; }
    rest -= t.seg[k];
  }
  return t.pts[t.pts.length - 1];
}

/** `global`: the site-wide layer (fixed behind every page). It reacts to the pointer anywhere in the window. */
export function CircuitField({ className, density = 1, cell = 30, onDark = false, global = false }: { className?: string; density?: number; cell?: number; onDark?: boolean; global?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !host || !ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let w = 0, h = 0, dpr = 1, traces: Trace[] = [], pulses: Pulse[] = [];
    let raf = 0, last = 0, spawnIn = 0, visible = true, lastPointer = 0;
    const colors = { trace: "", pulse: "" };

    const readColors = () => {
      const cs = getComputedStyle(canvas);
      colors.trace = onDark ? "rgb(111 221 240 / 0.14)" : cs.getPropertyValue("--color-trace").trim() || "rgb(0 137 235 / 0.16)";
      colors.pulse = onDark ? "#6fddf0" : cs.getPropertyValue("--color-pulse").trim() || "#00c6e0";
    };

    const spawn = (t?: Trace) => {
      const tr = t ?? traces[Math.floor(Math.random() * traces.length)];
      if (!tr || pulses.length > 40) return;
      pulses.push({ t: tr, d: 0, speed: 70 + Math.random() * 90, life: 1 });
    };

    const drawStatic = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1.25; ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.strokeStyle = colors.trace;
      ctx.beginPath();
      for (const t of traces) { ctx.moveTo(t.pts[0].x, t.pts[0].y); for (let k = 1; k < t.pts.length; k++) ctx.lineTo(t.pts[k].x, t.pts[k].y); }
      ctx.stroke();
      ctx.fillStyle = colors.trace;
      for (const t of traces) { const e = t.pts[t.pts.length - 1]; ctx.beginPath(); ctx.arc(e.x, e.y, 2.6, 0, Math.PI * 2); ctx.fill(); }
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      drawStatic();
      spawnIn -= dt;
      if (spawnIn <= 0) { spawn(); spawnIn = 0.25 + Math.random() * 0.6; }
      ctx.globalCompositeOperation = "lighter";
      for (const p of pulses) {
        p.d += p.speed * dt;
        if (p.d >= p.t.len) p.life -= dt * 2.5; // pad lights up, then fades
        const head = pointAt(p.t, p.d);
        // tail: a short fading run behind the head
        const TAIL = 46;
        for (let i = 0; i < 6; i++) {
          const q = pointAt(p.t, p.d - (TAIL * i) / 6);
          ctx.globalAlpha = Math.max(0, p.life) * (1 - i / 6) * 0.55;
          ctx.fillStyle = colors.pulse;
          ctx.beginPath(); ctx.arc(q.x, q.y, 2.2 - i * 0.25, 0, Math.PI * 2); ctx.fill();
        }
        const g = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 10);
        g.addColorStop(0, colors.pulse); g.addColorStop(1, "transparent");
        ctx.globalAlpha = Math.max(0, p.life) * 0.9;
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(head.x, head.y, 10, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
      pulses = pulses.filter((p) => p.life > 0);
      raf = requestAnimationFrame(frame);
    };

    const start = () => { cancelAnimationFrame(raf); if (reduce.matches) { drawStatic(); return; } if (visible && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } };
    const stop = () => cancelAnimationFrame(raf);

    const resize = () => {
      const r = host.getBoundingClientRect();
      w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      traces = buildTraces(w, h, cell, density);
      pulses = [];
      readColors();
      start();
    };

    // pointer: fire a signal on the trace nearest the cursor (throttled)
    const onMove = (e: PointerEvent) => {
      if (reduce.matches || e.timeStamp - lastPointer < 120) return;
      lastPointer = e.timeStamp;
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      let best: Trace | undefined, bd = 90 * 90;
      for (const t of traces) { const a = t.pts[0]; const dd = (a.x - x) ** 2 + (a.y - y) ** 2; if (dd < bd) { bd = dd; best = t; } }
      if (best) spawn(best);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(host);
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) start(); else stop(); });
    io.observe(canvas);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    const unsubTheme = subscribeTheme(() => { readColors(); if (reduce.matches) drawStatic(); });
    reduce.addEventListener("change", start);
    const target: EventTarget = global ? window : host;
    target.addEventListener("pointermove", onMove as EventListener, { passive: true });

    return () => {
      stop(); ro.disconnect(); io.disconnect(); unsubTheme();
      document.removeEventListener("visibilitychange", onVis);
      reduce.removeEventListener("change", start);
      target.removeEventListener("pointermove", onMove as EventListener);
    };
  }, [cell, density, onDark, global]);

  return <canvas ref={ref} aria-hidden className={cn("pointer-events-none absolute inset-0 block", className)} />;
}
