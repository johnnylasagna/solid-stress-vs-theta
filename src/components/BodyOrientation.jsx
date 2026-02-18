import { useRef, useEffect, useCallback } from 'react';
import './BodyOrientation.css';

const DEG2RAD = Math.PI / 180;

/**
 * Draws a rotated square element with stress arrows on each face.
 * sigmaX, sigmaY, tauXY  – reference-frame stresses (MPa)
 * theta                  – rotation angle in degrees
 * onThetaChange          – callback(newDegrees)
 */
export default function BodyOrientation({ sigmaX, sigmaY, tauXY, theta, onThetaChange }) {
  const canvasRef = useRef(null);
  // animated display value
  const displayThetaRef = useRef(theta);
  const targetThetaRef  = useRef(theta);
  const animRef = useRef(null);

  useEffect(() => { targetThetaRef.current = theta; }, [theta]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // lerp theta
    const dt = targetThetaRef.current - displayThetaRef.current;
    displayThetaRef.current += dt * 0.14;
    if (Math.abs(dt) < 0.01) displayThetaRef.current = targetThetaRef.current;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
    }

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2;
    const side = Math.min(W, H) * 0.3;
    const rad = displayThetaRef.current * DEG2RAD;

    // ── compute transformed stresses ──────────────────────────────────────
    const avg  = (sigmaX + sigmaY) / 2;
    const diff = (sigmaX - sigmaY) / 2;
    const sigma_x_prime = avg + diff * Math.cos(2 * rad) + tauXY * Math.sin(2 * rad);
    const sigma_y_prime = avg - diff * Math.cos(2 * rad) - tauXY * Math.sin(2 * rad);
    const tau_prime     = -diff * Math.sin(2 * rad) + tauXY * Math.cos(2 * rad);

    // ── reference axes (light dashed) ────────────────────────────────────
    ctx.save();
    ctx.setLineDash([5, 6]);
    ctx.strokeStyle = 'rgba(0,60,140,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - W * 0.45, cy); ctx.lineTo(cx + W * 0.45, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - H * 0.45); ctx.lineTo(cx, cy + H * 0.45); ctx.stroke();
    ctx.restore();

    // ── rotated coordinate axes ────────────────────────────────────────────
    const axisLen = side * 0.85;
    drawAxis(ctx, cx, cy, rad, axisLen, '#1565c0', "x′");
    drawAxis(ctx, cx, cy, rad + Math.PI / 2, axisLen, '#1565c0', "y′");

    // ── square body ───────────────────────────────────────────────────────
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rad);

    // fill
    ctx.fillStyle = 'rgba(21,101,192,0.06)';
    ctx.strokeStyle = '#1565c0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(-side / 2, -side / 2, side, side);
    ctx.fill();
    ctx.stroke();

    // ── stress arrows on each face ────────────────────────────────────────
    const maxStress = Math.max(
      Math.abs(sigma_x_prime),
      Math.abs(sigma_y_prime),
      Math.abs(tau_prime),
      1
    );
    const arrowScale = (side * 0.55) / maxStress;

    const SIGMA_COLOR = '#1565c0';
    const TAU_COLOR   = '#c62828';
    const MID = side / 2;

    // RIGHT face: σ_x′ (normal, horizontal in rotated frame) + τ (shear, vertical)
    drawNormalArrow(ctx, MID, 0, sigma_x_prime, arrowScale, SIGMA_COLOR, true);
    drawShearArrow(ctx, MID, 0, tau_prime, arrowScale, TAU_COLOR, true);

    // LEFT face: −σ_x′ (reaction)
    drawNormalArrow(ctx, -MID, 0, -sigma_x_prime, arrowScale, SIGMA_COLOR, true);
    drawShearArrow(ctx, -MID, 0, -tau_prime, arrowScale, TAU_COLOR, true);

    // TOP face: σ_y′ (normal, vertical) + τ
    drawNormalArrow(ctx, 0, -MID, sigma_y_prime, arrowScale, SIGMA_COLOR, false);
    drawShearArrow(ctx, 0, -MID, -tau_prime, arrowScale, TAU_COLOR, false);

    // BOTTOM face: −σ_y′
    drawNormalArrow(ctx, 0, MID, -sigma_y_prime, arrowScale, SIGMA_COLOR, false);
    drawShearArrow(ctx, 0, MID, tau_prime, arrowScale, TAU_COLOR, false);

    ctx.restore();

    // ── theta label ───────────────────────────────────────────────────────
    ctx.save();
    ctx.font = `bold 13px 'JetBrains Mono', monospace`;
    ctx.fillStyle = '#ffdd00';
    ctx.textAlign = 'center';
    ctx.fillText(`θ = ${displayThetaRef.current.toFixed(1)}°`, cx, H - 14);
    ctx.restore();

    // ── stress value legend (bottom-left) ─────────────────────────────────
    const lx = 14, ly = H - 66;
    ctx.save();
    ctx.font = `11px 'JetBrains Mono', monospace`;

    const lines = [
      { color: '#00cfff', text: `σx′ = ${sigma_x_prime.toFixed(1)} MPa` },
      { color: '#00ff9f', text: `σy′ = ${sigma_y_prime.toFixed(1)} MPa` },
      { color: '#ff4d6d', text: `τx′y′ = ${tau_prime.toFixed(1)} MPa`  },
    ];
    lines.forEach(({ color, text }, i) => {
      ctx.fillStyle = color;
      ctx.fillText(text, lx + ctx.measureText(text).width / 2, ly + i * 16);
    });
    ctx.restore();

    animRef.current = requestAnimationFrame(draw);
  }, [sigmaX, sigmaY, tauXY]);

  // restart loop when stress params change
  useEffect(() => {
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  // ── drag to rotate ────────────────────────────────────────────────────────
  const dragStart = useRef(null);

  const handleMouseDown = useCallback((e) => {
    dragStart.current = { x: e.clientX, theta };
    e.preventDefault();
  }, [theta]);

  const handleMouseMove = useCallback((e) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const newTheta = Math.max(0, Math.min(180, dragStart.current.theta + dx * 0.5));
    onThetaChange(newTheta);
  }, [onThetaChange]);

  const handleMouseUp = useCallback(() => { dragStart.current = null; }, []);

  return (
    <div className="body-orientation">
      <div className="bo-topbar">
        <span className="bo-label">ELEMENT ORIENTATION</span>
        <span className="bo-hint">drag to rotate</span>
      </div>
      <canvas
        ref={canvasRef}
        className="bo-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      {/* theta scrubber */}
      <div className="bo-slider-row">
        <span className="bo-slider-label">θ</span>
        <input
          type="range"
          className="bo-slider"
          min={0} max={180} step={0.5}
          value={theta}
          onChange={e => onThetaChange(Number(e.target.value))}
        />
        <span className="bo-slider-val">{theta.toFixed(1)}°</span>
      </div>
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────

function arrowHead(ctx, x, y, angle, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-size, -size * 0.5);
  ctx.lineTo(-size,  size * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Normal arrow: perpendicular to the face (tension = away, compression = inward).
 * isHorizontalFace = true  → face is vertical (right/left), arrow along x-axis of rotated frame
 * isHorizontalFace = false → face is horizontal (top/bottom), arrow along y-axis
 */
function drawNormalArrow(ctx, fx, fy, sigma, scale, color, isHorizontalFace) {
  const len = sigma * scale;
  const AH = 7;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle   = color;
  ctx.lineWidth = 1.8;

  let ex, ey, angle;
  if (isHorizontalFace) {
    // right face: arrow goes +x direction for tension
    ex = fx + len;
    ey = fy;
    angle = len >= 0 ? 0 : Math.PI;
  } else {
    // top face: arrow goes -y direction for tension (upward in canvas = negative y)
    ex = fx;
    ey = fy - len;
    angle = len >= 0 ? -Math.PI / 2 : Math.PI / 2;
  }

  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(fx, fy);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  arrowHead(ctx, ex, ey, angle, AH, color);

  ctx.restore();
}

/**
 * Shear arrow: parallel to the face.
 */
function drawShearArrow(ctx, fx, fy, tau, scale, color, isHorizontalFace) {
  const len = tau * scale;
  const AH = 6;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle   = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 3]);

  let ex, ey, angle;
  if (isHorizontalFace) {
    // on right/left face, shear is along y
    ex = fx;
    ey = fy + len;
    angle = len >= 0 ? Math.PI / 2 : -Math.PI / 2;
  } else {
    // on top/bottom face, shear is along x
    ex = fx + len;
    ey = fy;
    angle = len >= 0 ? 0 : Math.PI;
  }

  ctx.beginPath();
  ctx.moveTo(fx, fy);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  arrowHead(ctx, ex, ey, angle, AH, color);
  ctx.restore();
}

function drawAxis(ctx, cx, cy, angle, len, color, label) {
  const ex = cx + Math.cos(angle) * len;
  const ey = cy + Math.sin(angle) * len;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle   = color;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.45;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(ex, ey);
  ctx.stroke();

  ctx.globalAlpha = 0.7;
  ctx.setLineDash([]);
  ctx.font = `bold 11px 'JetBrains Mono', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lx = cx + Math.cos(angle) * (len + 16);
  const ly = cy + Math.sin(angle) * (len + 16);
  ctx.fillText(label, lx, ly);
  ctx.restore();
}
