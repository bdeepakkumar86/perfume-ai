'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';

// ─── Constants ───────────────────────────────────────────────────────────────
const G = 9.81;
const RHO = 1.225;
const SCALE = 8; // pixels per meter
const GROUND_PX = 80;
const LAUNCH_X = 5; // world meters
const TRAIL_MAX = 200;

// ─── Types ────────────────────────────────────────────────────────────────────
interface NoseCone { name: string; Cd: number; mass: number }
interface Body     { name: string; Cd: number; mass: number; refArea: number }
interface Fins     { name: string; Cd: number; mass: number; stability: number }

interface RocketDesign {
  nose: NoseCone;
  body: Body;
  fins: Fins;
}

interface RocketState {
  x: number; y: number;
  vx: number; vy: number;
  angle: number;
  wobbleV: number;
  flightTime: number;
  flying: boolean;
  Kd: number;
}

interface TrailPoint { x: number; y: number; age: number }
interface Camera { x: number; y: number }

// ─── Part Definitions ─────────────────────────────────────────────────────────
const NOSE_OPTIONS: NoseCone[] = [
  { name: 'Pointy',  Cd: 0.10, mass: 1.0 },
  { name: 'Rounded', Cd: 0.25, mass: 1.5 },
  { name: 'Blunt',   Cd: 0.50, mass: 2.0 },
];

const BODY_OPTIONS: Body[] = [
  { name: 'Slim',   Cd: 0.05, mass: 2.0, refArea: 2.3e-5 },
  { name: 'Medium', Cd: 0.10, mass: 4.0, refArea: 5.0e-5 },
  { name: 'Chunky', Cd: 0.17, mass: 6.0, refArea: 1.02e-4 },
];

const FINS_OPTIONS: Fins[] = [
  { name: 'None',  Cd: 0.00, mass: 0.0, stability: -1 },
  { name: 'Small', Cd: 0.05, mass: 0.5, stability:  1 },
  { name: 'Large', Cd: 0.10, mass: 1.5, stability:  2 },
];

// ─── Physics helpers ──────────────────────────────────────────────────────────
function computeKd(design: RocketDesign): number {
  const totalCd = design.nose.Cd + design.body.Cd + design.fins.Cd;
  const massKg  = (design.nose.mass + design.body.mass + design.fins.mass) / 1000;
  return 0.5 * RHO * totalCd * design.body.refArea / massKg;
}

function computeMass(design: RocketDesign): number {
  return design.nose.mass + design.body.mass + design.fins.mass;
}

function computeTotalCd(design: RocketDesign): number {
  return design.nose.Cd + design.body.Cd + design.fins.Cd;
}

// ─── Score messaging ─────────────────────────────────────────────────────────
function scoreMessage(t: number): string {
  if (t >= 10) return 'LEGENDARY FLIGHT!';
  if (t >= 7)  return 'INCREDIBLE!';
  if (t >= 5)  return 'EXCELLENT FLIGHT!';
  if (t >= 3)  return 'NICE ONE!';
  if (t >= 1.5) return 'NOT BAD...';
  return 'CRASH & BURN!';
}

// ─── Camera helpers ──────────────────────────────────────────────────────────
function worldToScreen(
  wx: number, wy: number,
  cam: Camera, cw: number, ch: number
): [number, number] {
  const sx = (wx - cam.x) * SCALE;
  const sy = ch - GROUND_PX - (wy - cam.y) * SCALE;
  return [sx, sy];
}

// ─── Drawing: sky ─────────────────────────────────────────────────────────────
function drawSky(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  camY: number
) {
  const altFactor = Math.min(1, camY / 200);
  const topR = Math.round(13 - 13 * altFactor);
  const topG = Math.round(13 - 13 * altFactor);
  const topB = Math.round(26 + 60 * altFactor);
  const grad = ctx.createLinearGradient(0, 0, 0, ch);
  grad.addColorStop(0, `rgb(${topR},${topG},${Math.min(255, topB + 40)})`);
  grad.addColorStop(0.7, `rgb(${20 + Math.round(30 * (1 - altFactor))},${20},${50 + Math.round(30 * (1 - altFactor))})`);
  grad.addColorStop(1, '#0d1a0d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, cw, ch);
}

// ─── Drawing: stars ──────────────────────────────────────────────────────────
function drawStars(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  stars: { x: number; y: number; r: number }[],
  camY: number
) {
  const alpha = Math.min(1, camY / 60);
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffffff';
  for (const s of stars) {
    ctx.beginPath();
    ctx.arc(s.x * cw, s.y * (ch - GROUND_PX), s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ─── Drawing: ground ─────────────────────────────────────────────────────────
function drawGround(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  cam: Camera
) {
  // Ground strip
  const grad = ctx.createLinearGradient(0, ch - GROUND_PX, 0, ch);
  grad.addColorStop(0, '#3d7a2b');
  grad.addColorStop(1, '#2a5a18');
  ctx.fillStyle = grad;
  ctx.fillRect(0, ch - GROUND_PX, cw, GROUND_PX);

  // Ground line
  ctx.strokeStyle = '#4a9a30';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, ch - GROUND_PX);
  ctx.lineTo(cw, ch - GROUND_PX);
  ctx.stroke();

  // Distance markers every 10m
  ctx.save();
  ctx.textAlign = 'center';
  const startM = Math.floor(cam.x / 10) * 10;
  for (let worldX = startM; worldX < cam.x + cw / SCALE + 10; worldX += 10) {
    const [sx] = worldToScreen(worldX, 0, cam, cw, ch);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx, ch - GROUND_PX);
    ctx.lineTo(sx, ch - GROUND_PX + 8);
    ctx.stroke();
    if (worldX % 50 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '11px monospace';
      ctx.fillText(`${worldX}m`, sx, ch - GROUND_PX + 22);
    }
  }
  ctx.restore();
}

// ─── Drawing: altitude grid ──────────────────────────────────────────────────
function drawAltGrid(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  cam: Camera
) {
  const step = 20; // meters
  const startAlt = Math.floor(cam.y / step) * step;
  ctx.save();
  ctx.strokeStyle = 'rgba(100,140,255,0.12)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 8]);
  ctx.font = '10px monospace';
  ctx.fillStyle = 'rgba(100,140,255,0.35)';
  ctx.textAlign = 'left';
  for (let alt = startAlt; alt < cam.y + ch / SCALE + step; alt += step) {
    if (alt <= 0) continue;
    const [, sy] = worldToScreen(0, alt, cam, cw, ch);
    if (sy < 0 || sy > ch - GROUND_PX) continue;
    ctx.beginPath();
    ctx.moveTo(0, sy);
    ctx.lineTo(cw, sy);
    ctx.stroke();
    ctx.fillText(`${alt}m`, 4, sy - 3);
  }
  ctx.setLineDash([]);
  ctx.restore();
}

// ─── Drawing: launch pad ─────────────────────────────────────────────────────
function drawLaunchPad(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  cam: Camera, launchAngle: number
) {
  const [px, py] = worldToScreen(LAUNCH_X, 0, cam, cw, ch);
  // Base
  ctx.fillStyle = '#555';
  ctx.fillRect(px - 14, py - 4, 28, 8);
  ctx.fillStyle = '#888';
  ctx.fillRect(px - 4, py - 18, 8, 18);
  // Angle guide
  const angleRad = (launchAngle * Math.PI) / 180;
  const guideLen = 50;
  ctx.save();
  ctx.strokeStyle = 'rgba(68,136,255,0.4)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.moveTo(px, py - 18);
  ctx.lineTo(
    px + Math.cos(angleRad) * guideLen,
    (py - 18) - Math.sin(angleRad) * guideLen
  );
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// ─── Drawing: trail ──────────────────────────────────────────────────────────
function drawTrail(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  cam: Camera, trail: TrailPoint[]
) {
  if (trail.length < 2) return;
  for (let i = 1; i < trail.length; i++) {
    const t = trail[i];
    const prev = trail[i - 1];
    const alpha = Math.max(0, 1 - t.age / 3.0);
    const frac = i / trail.length;
    const r = 255;
    const g = Math.round(100 + 155 * frac);
    const b = 0;
    ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.8})`;
    ctx.lineWidth = 2.5 * alpha + 0.5;
    ctx.beginPath();
    const [x0, y0] = worldToScreen(prev.x, prev.y, cam, cw, ch);
    const [x1, y1] = worldToScreen(t.x, t.y, cam, cw, ch);
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
}

// ─── Drawing: rocket ─────────────────────────────────────────────────────────
function drawRocket(
  ctx: CanvasRenderingContext2D,
  sx: number, sy: number,
  angle: number,
  design: RocketDesign
) {
  ctx.save();
  ctx.translate(sx, sy);
  // Canvas rotation: rocket nose drawn pointing up (−Y), world angle θ from +X
  // so canvas rotation = PI/2 - θ  (for standard Y-down canvas with inverted world-Y)
  ctx.rotate(Math.PI / 2 - angle);

  const bodyW = design.body.name === 'Slim' ? 6 : design.body.name === 'Medium' ? 9 : 12;
  const bodyH = 30;
  const noseH = design.nose.name === 'Pointy' ? 22 : design.nose.name === 'Rounded' ? 16 : 10;

  // Fins
  if (design.fins.name !== 'None') {
    const finW = design.fins.name === 'Small' ? 10 : 16;
    const finH = design.fins.name === 'Small' ? 12 : 18;
    ctx.fillStyle = '#d8d0b8';
    // Left fin
    ctx.beginPath();
    ctx.moveTo(-bodyW / 2, bodyH / 2);
    ctx.lineTo(-bodyW / 2 - finW, bodyH / 2 + finH * 0.4);
    ctx.lineTo(-bodyW / 2, bodyH / 2 - finH);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#b8a888';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    // Right fin
    ctx.beginPath();
    ctx.moveTo(bodyW / 2, bodyH / 2);
    ctx.lineTo(bodyW / 2 + finW, bodyH / 2 + finH * 0.4);
    ctx.lineTo(bodyW / 2, bodyH / 2 - finH);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Body
  ctx.fillStyle = '#f0ede0';
  ctx.strokeStyle = '#c8c0a8';
  ctx.lineWidth = 1;
  ctx.fillRect(-bodyW / 2, -bodyH / 2, bodyW, bodyH);
  ctx.strokeRect(-bodyW / 2, -bodyH / 2, bodyW, bodyH);
  // Center fold line
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(0, -bodyH / 2);
  ctx.lineTo(0, bodyH / 2);
  ctx.stroke();

  // Nose
  ctx.fillStyle = '#e8e0cc';
  ctx.strokeStyle = '#c0b898';
  ctx.lineWidth = 1;
  if (design.nose.name === 'Pointy') {
    ctx.beginPath();
    ctx.moveTo(0, -bodyH / 2 - noseH);
    ctx.lineTo(-bodyW / 2, -bodyH / 2);
    ctx.lineTo(bodyW / 2, -bodyH / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (design.nose.name === 'Rounded') {
    ctx.beginPath();
    ctx.moveTo(-bodyW / 2, -bodyH / 2);
    ctx.bezierCurveTo(
      -bodyW / 2, -bodyH / 2 - noseH * 0.6,
       bodyW / 2, -bodyH / 2 - noseH * 0.6,
       bodyW / 2, -bodyH / 2
    );
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // Blunt
    ctx.fillRect(-bodyW / 2, -bodyH / 2 - noseH, bodyW, noseH);
    ctx.strokeRect(-bodyW / 2, -bodyH / 2 - noseH, bodyW, noseH);
  }

  ctx.restore();
}

// ─── Drawing: preview rocket ─────────────────────────────────────────────────
function drawPreviewRocket(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  design: RocketDesign
) {
  ctx.save();
  ctx.translate(cx, cy);
  // Pointing straight up
  const bodyW = design.body.name === 'Slim' ? 8 : design.body.name === 'Medium' ? 12 : 16;
  const bodyH = 40;
  const noseH = design.nose.name === 'Pointy' ? 30 : design.nose.name === 'Rounded' ? 22 : 14;

  if (design.fins.name !== 'None') {
    const finW = design.fins.name === 'Small' ? 12 : 20;
    const finH = design.fins.name === 'Small' ? 16 : 24;
    ctx.fillStyle = '#c8c0a0';
    ctx.beginPath();
    ctx.moveTo(-bodyW / 2, bodyH / 2);
    ctx.lineTo(-bodyW / 2 - finW, bodyH / 2 + finH * 0.4);
    ctx.lineTo(-bodyW / 2, bodyH / 2 - finH);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(bodyW / 2, bodyH / 2);
    ctx.lineTo(bodyW / 2 + finW, bodyH / 2 + finH * 0.4);
    ctx.lineTo(bodyW / 2, bodyH / 2 - finH);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = '#f0ede0';
  ctx.strokeStyle = '#b0a890';
  ctx.lineWidth = 1.2;
  ctx.fillRect(-bodyW / 2, -bodyH / 2, bodyW, bodyH);
  ctx.strokeRect(-bodyW / 2, -bodyH / 2, bodyW, bodyH);
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(0, -bodyH / 2);
  ctx.lineTo(0, bodyH / 2);
  ctx.stroke();

  ctx.fillStyle = '#e8e0cc';
  ctx.strokeStyle = '#b0a880';
  ctx.lineWidth = 1.2;
  if (design.nose.name === 'Pointy') {
    ctx.beginPath();
    ctx.moveTo(0, -bodyH / 2 - noseH);
    ctx.lineTo(-bodyW / 2, -bodyH / 2);
    ctx.lineTo(bodyW / 2, -bodyH / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (design.nose.name === 'Rounded') {
    ctx.beginPath();
    ctx.moveTo(-bodyW / 2, -bodyH / 2);
    ctx.bezierCurveTo(
      -bodyW / 2, -bodyH / 2 - noseH * 0.6,
       bodyW / 2, -bodyH / 2 - noseH * 0.6,
       bodyW / 2, -bodyH / 2
    );
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillRect(-bodyW / 2, -bodyH / 2 - noseH, bodyW, noseH);
    ctx.strokeRect(-bodyW / 2, -bodyH / 2 - noseH, bodyW, noseH);
  }
  ctx.restore();
}

// ─── Precompute stars ─────────────────────────────────────────────────────────
const STARS = Array.from({ length: 60 }, () => ({
  x: Math.random(),
  y: Math.random(),
  r: 0.5 + Math.random() * 1.2,
}));

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RocketPage() {
  // ── Reactive UI state ──
  const [design, setDesign] = useState<RocketDesign>({
    nose: NOSE_OPTIONS[0],
    body: BODY_OPTIONS[1],
    fins: FINS_OPTIONS[1],
  });
  const [launchAngle, setLaunchAngle] = useState(60);
  const [launchPower, setLaunchPower] = useState(30);
  const [launchDisabled, setLaunchDisabled] = useState(false);
  const [resultMsg, setResultMsg] = useState('');

  // ── Refs ──
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const previewRef  = useRef<HTMLCanvasElement>(null);
  const rafRef      = useRef<number>(0);

  const rocketRef    = useRef<RocketState | null>(null);
  const trailRef     = useRef<TrailPoint[]>([]);
  const camRef       = useRef<Camera>({ x: 0, y: 0 });
  const gameStateRef = useRef<'idle' | 'flying' | 'landed'>('idle');

  // Design/angle/power readable in RAF loop via refs
  const designRef     = useRef(design);
  const angleRef      = useRef(launchAngle);
  const powerRef      = useRef(launchPower);
  const bestTimeRef   = useRef(0);

  // DOM refs for HUD text
  const hudTimeRef    = useRef<HTMLSpanElement>(null);
  const hudBestRef    = useRef<HTMLSpanElement>(null);
  const hudEstRef     = useRef<HTMLSpanElement>(null);

  // Keep design/angle/power refs in sync
  useEffect(() => { designRef.current = design; }, [design]);
  useEffect(() => { angleRef.current = launchAngle; }, [launchAngle]);
  useEffect(() => { powerRef.current = launchPower; }, [launchPower]);

  // ── handleLand ──
  const handleLand = useCallback((flightTime: number) => {
    gameStateRef.current = 'landed';
    setLaunchDisabled(false);
    setResultMsg(`${scoreMessage(flightTime)} — ${flightTime.toFixed(2)}s`);
    if (flightTime > bestTimeRef.current) {
      bestTimeRef.current = flightTime;
    }
    if (hudBestRef.current) {
      hudBestRef.current.textContent = bestTimeRef.current.toFixed(2) + 's';
    }
  }, []);

  const handleLandRef = useRef(handleLand);
  useEffect(() => { handleLandRef.current = handleLand; }, [handleLand]);

  // ── Preview canvas ──
  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawPreviewRocket(ctx, canvas.width / 2, canvas.height * 0.62, design);
  }, [design]);

  // ── Main RAF loop ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastT = 0;

    function resizeCanvas() {
      if (!canvas) return;
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resizeCanvas();
    const ro = new ResizeObserver(resizeCanvas);
    ro.observe(canvas);

    function frame(ts: number) {
      rafRef.current = requestAnimationFrame(frame);
      const rawDt = lastT === 0 ? 0.016 : (ts - lastT) / 1000;
      lastT = ts;
      const dt = Math.min(rawDt, 0.05);

      if (!canvas || !ctx) return;
      const cw = canvas.width;
      const ch = canvas.height;

      // ─ Physics update ─
      const rocket = rocketRef.current;
      if (rocket && rocket.flying) {
        const { vx, vy, angle, fins } = {
          vx: rocket.vx, vy: rocket.vy,
          angle: rocket.angle,
          fins: designRef.current.fins,
        };
        const speed = Math.sqrt(vx * vx + vy * vy);

        let dragAx = 0, dragAy = 0;
        if (speed > 0.001) {
          const Kd = rocket.Kd;
          dragAx = -Kd * speed * vx;
          dragAy = -Kd * speed * vy;
        }

        // Stability wobble
        let wobbleV = rocket.wobbleV;
        let newAngle = angle;
        if (fins.stability < 0) {
          wobbleV += (Math.random() - 0.5) * 20 * dt;
          newAngle += wobbleV * dt;
          const wobbleFactor = 0.6 * Math.abs(Math.sin(newAngle));
          dragAx *= 1 + wobbleFactor;
          dragAy *= 1 + wobbleFactor;
        } else {
          if (speed > 0.5) {
            const velAngle = Math.atan2(vy, vx);
            let error = velAngle - newAngle;
            while (error >  Math.PI) error -= 2 * Math.PI;
            while (error < -Math.PI) error += 2 * Math.PI;
            wobbleV += error * 10 * fins.stability * dt - wobbleV * 3 * fins.stability * dt;
            newAngle += wobbleV * dt;
          }
        }

        const ax = dragAx;
        const ay = dragAy - G;

        rocket.vx     += ax * dt;
        rocket.vy     += ay * dt;
        rocket.x      += rocket.vx * dt;
        rocket.y      += rocket.vy * dt;
        rocket.angle   = newAngle;
        rocket.wobbleV = wobbleV;
        rocket.flightTime += dt;

        // Trail
        trailRef.current.push({ x: rocket.x, y: rocket.y, age: 0 });
        for (const p of trailRef.current) p.age += dt;
        if (trailRef.current.length > TRAIL_MAX) {
          trailRef.current.splice(0, trailRef.current.length - TRAIL_MAX);
        }
        // Remove old trail points
        trailRef.current = trailRef.current.filter(p => p.age < 3.5);

        // Update HUD time
        if (hudTimeRef.current) {
          hudTimeRef.current.textContent = rocket.flightTime.toFixed(2) + 's';
        }

        // Land check
        if (rocket.y <= 0 && rocket.flightTime > 0.05) {
          rocket.y = 0;
          rocket.flying = false;
          handleLandRef.current(rocket.flightTime);
        }
      }

      // ─ Camera ─
      const cam = camRef.current;
      if (rocket) {
        const targetCamX = rocket.x - (cw * 0.3) / SCALE;
        const targetCamY = Math.max(0, rocket.y - (ch - GROUND_PX) * 0.55 / SCALE);
        const lerpFactor = 1 - Math.pow(0.05, dt);
        cam.x += (targetCamX - cam.x) * lerpFactor;
        cam.y += (targetCamY - cam.y) * lerpFactor;
      }

      // ─ Draw ─
      drawSky(ctx, cw, ch, cam.y);
      drawStars(ctx, cw, ch, STARS, cam.y);
      drawAltGrid(ctx, cw, ch, cam);
      drawGround(ctx, cw, ch, cam);
      drawLaunchPad(ctx, cw, ch, cam, angleRef.current);
      drawTrail(ctx, cw, ch, cam, trailRef.current);

      if (rocket) {
        const [sx, sy] = worldToScreen(rocket.x, rocket.y, cam, cw, ch);
        drawRocket(ctx, sx, sy, rocket.angle, designRef.current);

        // Altitude label when flying
        if (rocket.flying && rocket.y > 2) {
          ctx.save();
          ctx.font = 'bold 11px monospace';
          ctx.fillStyle = 'rgba(255,255,255,0.75)';
          ctx.textAlign = 'left';
          ctx.fillText(`↑ ${rocket.y.toFixed(1)}m`, sx + 18, sy - 8);
          ctx.restore();
        }
      }
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Launch ──
  function launch() {
    if (launchDisabled) return;
    const d = designRef.current;
    const angleRad = (angleRef.current * Math.PI) / 180;
    const power    = powerRef.current;
    const Kd       = computeKd(d);
    const vx = power * Math.cos(angleRad);
    const vy = power * Math.sin(angleRad);
    rocketRef.current = {
      x: LAUNCH_X, y: 0.5,
      vx, vy,
      angle: angleRad,
      wobbleV: 0,
      flightTime: 0,
      flying: true,
      Kd,
    };
    trailRef.current = [];
    camRef.current = { x: LAUNCH_X - 2, y: 0 };
    gameStateRef.current = 'flying';
    setLaunchDisabled(true);
    setResultMsg('');
    if (hudTimeRef.current) hudTimeRef.current.textContent = '0.00s';
  }

  function resetGame() {
    rocketRef.current = null;
    trailRef.current = [];
    camRef.current = { x: 0, y: 0 };
    gameStateRef.current = 'idle';
    setLaunchDisabled(false);
    setResultMsg('');
    if (hudTimeRef.current) hudTimeRef.current.textContent = '—';
  }

  // ── Derived stats ──
  const totalCd  = computeTotalCd(design);
  const totalMass = computeMass(design);
  const stability = design.fins.stability;
  // Rough est. time: simplified projectile + drag fudge
  const angleRad   = (launchAngle * Math.PI) / 180;
  const vy0        = launchPower * Math.sin(angleRad);
  const estTime    = (2 * vy0 / G).toFixed(1);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        background: '#0d0d1a',
        fontFamily: 'monospace',
      }}
    >
      {/* ── Left Panel ── */}
      <div
        style={{
          width: 280,
          minWidth: 280,
          background: '#111120',
          borderRight: '1px solid #1e1e40',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          padding: '12px 14px',
          gap: 0,
          color: '#ccd',
        }}
      >
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#4488ff', letterSpacing: 2 }}>
            PAPER ROCKET
          </div>
          <div style={{ fontSize: 10, color: '#668', marginTop: 2 }}>PHYSICS SIMULATOR</div>
        </div>

        {/* Preview */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
          <canvas
            ref={previewRef}
            width={100}
            height={180}
            style={{
              border: '1px solid #1e1e40',
              borderRadius: 6,
              background: '#0d0d1a',
            }}
          />
        </div>

        {/* Nose Cone */}
        <SectionLabel>Nose Cone</SectionLabel>
        <PartRow
          options={NOSE_OPTIONS}
          selected={design.nose}
          onSelect={(n) => setDesign(d => ({ ...d, nose: n as NoseCone }))}
          />

        {/* Body */}
        <SectionLabel>Body</SectionLabel>
        <PartRow
          options={BODY_OPTIONS}
          selected={design.body}
          onSelect={(b) => setDesign(d => ({ ...d, body: b as Body }))}
        />

        {/* Fins */}
        <SectionLabel>Fins</SectionLabel>
        <PartRow
          options={FINS_OPTIONS}
          selected={design.fins}
          onSelect={(f) => setDesign(d => ({ ...d, fins: f as Fins }))}
        />

        {/* Sliders */}
        <SectionLabel>Launch Angle</SectionLabel>
        <SliderRow
          min={20} max={85} value={launchAngle}
          onChange={setLaunchAngle}
          format={v => `${v}°`}
        />
        <SectionLabel>Launch Power</SectionLabel>
        <SliderRow
          min={5} max={50} value={launchPower}
          onChange={setLaunchPower}
          format={v => `${v} m/s`}
        />

        {/* Stats */}
        <SectionLabel>Stats</SectionLabel>
        <StatBar label="Drag Cd" value={totalCd} max={0.77} color="#ff6644" />
        <StatBar label="Mass"    value={totalMass} max={10} color="#44aaff" format={v => `${v.toFixed(1)}g`} />
        <StatBar
          label="Stability"
          value={stability + 1}
          max={3}
          color={stability < 0 ? '#ff4444' : '#44ff88'}
          format={() => stability < 0 ? 'UNSTABLE' : stability === 1 ? 'GOOD' : 'GREAT'}
        />
        <StatBar label="Est. Time" value={parseFloat(estTime)} max={12} color="#ffd700" format={v => `~${v.toFixed(1)}s`} />

        {/* Buttons */}
        <button
          onClick={launch}
          disabled={launchDisabled}
          style={{
            marginTop: 14,
            padding: '10px 0',
            background: launchDisabled ? '#333355' : 'linear-gradient(135deg,#2255cc,#4488ff)',
            color: launchDisabled ? '#666' : '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: launchDisabled ? 'not-allowed' : 'pointer',
            fontFamily: 'monospace',
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: 2,
            transition: 'all 0.2s',
          }}
        >
          {launchDisabled ? 'FLYING...' : 'LAUNCH'}
        </button>
        <button
          onClick={resetGame}
          style={{
            marginTop: 6,
            padding: '7px 0',
            background: 'transparent',
            color: '#668',
            border: '1px solid #334',
            borderRadius: 6,
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontSize: 12,
            letterSpacing: 1,
          }}
        >
          RESET
        </button>

        {/* Score */}
        <div
          style={{
            marginTop: 12,
            padding: '10px 12px',
            background: '#0d0d1a',
            borderRadius: 6,
            border: '1px solid #1e1e40',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#668' }}>
            <span>FLIGHT TIME</span>
            <span>BEST</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span ref={hudTimeRef} style={{ fontSize: 20, fontWeight: 700, color: '#4488ff' }}>—</span>
            <span ref={hudBestRef} style={{ fontSize: 20, fontWeight: 700, color: '#ffd700' }}>—</span>
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              color: '#ffd700',
              fontWeight: 700,
              minHeight: 16,
              textAlign: 'center',
            }}
          >
            {resultMsg}
          </div>
        </div>

        {/* Est time HUD ref helper */}
        <div style={{ display: 'none' }}>
          <span ref={hudEstRef} />
        </div>
      </div>

      {/* ── Canvas Area ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          style={{ display: 'block', width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        color: '#4488ff',
        letterSpacing: 1.5,
        marginTop: 10,
        marginBottom: 4,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </div>
  );
}

function PartRow({
  options,
  selected,
  onSelect,
}: {
  options: { name: string }[];
  selected: { name: string };
  onSelect: (v: { name: string }) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {options.map((o) => (
        <button
          key={o.name}
          onClick={() => onSelect(o)}
          style={{
            flex: 1,
            padding: '5px 0',
            background: selected.name === o.name ? '#4488ff22' : 'transparent',
            color: selected.name === o.name ? '#4488ff' : '#778',
            border: selected.name === o.name ? '1px solid #4488ff' : '1px solid #334',
            borderRadius: 4,
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontSize: 11,
            transition: 'all 0.15s',
          }}
        >
          {o.name}
        </button>
      ))}
    </div>
  );
}

function SliderRow({
  min, max, value, onChange, format,
}: {
  min: number; max: number; value: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: '#4488ff' }}
      />
      <span style={{ fontSize: 12, color: '#aab', width: 54, textAlign: 'right' }}>
        {format(value)}
      </span>
    </div>
  );
}

function StatBar({
  label, value, max, color,
  format = (v: number) => v.toFixed(2),
}: {
  label: string; value: number; max: number; color: string;
  format?: (v: number) => string;
}) {
  const pct = Math.min(1, Math.max(0, value / max)) * 100;
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#778', marginBottom: 2 }}>
        <span>{label}</span>
        <span style={{ color }}>{format(value)}</span>
      </div>
      <div style={{ height: 5, background: '#1e1e40', borderRadius: 3, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: color,
            borderRadius: 3,
            transition: 'width 0.3s',
          }}
        />
      </div>
    </div>
  );
}
