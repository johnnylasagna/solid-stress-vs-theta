import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import './MohrsCircle.css';

/* ─── helpers ───────────────────────────────────────────────────── */
const toRad = (deg) => (deg * Math.PI) / 180;
const fmt = (v, d = 2) => (typeof v === 'number' ? v.toFixed(d) : '—');

/* ─── main component ────────────────────────────────────────── */
export default function MohrsCircle({ sigmaX, sigmaY, tauXY, theta }) {
  const svgRef = useRef(null);

  // ── zoom / pan state ──
  const [zoom, setZoom] = useState(1.6);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const isPanning = useRef(false);
  const panStart  = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  // wheel to zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    setZoom(z => Math.min(Math.max(z * factor, 0.4), 8));
  }, []);
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // drag to pan
  const handleMouseDown = useCallback((e) => {
    isPanning.current = true;
    setIsDragging(true);
    panStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
    e.preventDefault();
  }, [pan]);
  const handleMouseMove = useCallback((e) => {
    if (!isPanning.current) return;
    setPan({
      x: panStart.current.px + (e.clientX - panStart.current.mx),
      y: panStart.current.py + (e.clientY - panStart.current.my),
    });
  }, []);
  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
    setIsDragging(false);
  }, []);
  const handleDblClick = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

  // ── visibility toggles ──
  const [vis, setVis] = useState({
    grid:        true,
    principal:   true,   // P1, P2 points, radius lines, 2θp arc
    shear:       true,   // τmax / τmin points
    sigmaAvg:    true,   // σavg dashed line + arrow
    rotation:    true,   // rotating point, conjugate, 2θ arc, diameter line, projections, R label
    axisTicks:   true,   // numeric tick labels
  });
  const toggle = useCallback((key) =>
    setVis(v => ({ ...v, [key]: !v[key] })), []);

  // ── hovered point (for z-order: hovered group renders last = on top) ──
  const [hoveredPt, setHoveredPt] = useState(null);

  // ── computed values ──
  const derived = useMemo(() => {
    const avg = (sigmaX + sigmaY) / 2;
    const diff = (sigmaX - sigmaY) / 2;
    const R = Math.sqrt(diff * diff + tauXY * tauXY);

    const angle2 = toRad(2 * theta);
    const sx_prime = avg + diff * Math.cos(angle2) + tauXY * Math.sin(angle2);
    const txy_prime = -diff * Math.sin(angle2) + tauXY * Math.cos(angle2);

    // principal stresses
    const s1 = avg + R;
    const s2 = avg - R;

    // principal angle (angle from x-face to σ1, in degrees)
    const thetaP1 = (Math.atan2(tauXY, diff) * 180) / Math.PI / 2;
    // second principal angle
    const thetaP2 = thetaP1 + 90;
    // max shear angle (45° from principal)
    const thetaS1 = thetaP1 - 45;

    return { avg, diff, R, sx_prime, txy_prime, s1, s2, thetaP1, thetaP2, thetaS1 };
  }, [sigmaX, sigmaY, tauXY, theta]);

  const { avg, diff, R, sx_prime, txy_prime, s1, s2, thetaP1, thetaP2, thetaS1 } = derived;

  // ── SVG coordinate mapping ──
  const W = 900;
  const H = 820;
  const cx = W / 2;
  const cy = H / 2;

  // auto-scale so circle always fills most of the viewport
  const maxVal = Math.max(Math.abs(sigmaX), Math.abs(sigmaY), Math.abs(tauXY), 1);
  const scale = (Math.min(W, H) / 2 - 80) / (maxVal + R + 10);
  const clampedScale = Math.min(Math.max(scale, 0.5), 8);

  const toSvgX = (v) => cx + v * clampedScale;
  const toSvgY = (v) => cy - v * clampedScale; // y flips

  const circleCX = toSvgX(avg);
  const circleCY = toSvgY(0);
  const circleR = R * clampedScale;

  // ── Point A: the x-face point (σx, τxy) — fixed on the circle ──
  // Convention: τxy plots on the NEGATIVE y-axis (downward), so Point A is at (diff, -tauXY)
  const angle2 = toRad(2 * theta);
  const alpha_A = Math.atan2(-tauXY, diff || 0); // angle of Point A (τxy plots down)
  const aX = circleCX + circleR * Math.cos(alpha_A);
  const aY = circleCY - circleR * Math.sin(alpha_A); // SVG y-flip

  // current rotating point (σx', τx'y') — starts at A, rotates by −2θ
  const liveAngle = alpha_A - angle2;
  const pointX = circleCX + circleR * Math.cos(liveAngle);
  const pointY = circleCY - circleR * Math.sin(liveAngle);

  // conjugate point (180° from live point)
  const conjX = circleCX + circleR * Math.cos(liveAngle + Math.PI);
  const conjY = circleCY - circleR * Math.sin(liveAngle + Math.PI);

  // ── P1: σ1 principal stress — always at angle 0 (rightmost, τ = 0) ──
  const p1X = circleCX + circleR;
  const p1Y = circleCY;

  // ── P2: σ2 principal stress — always at angle 180° (leftmost, τ = 0) ──
  const p2X = circleCX - circleR;
  const p2Y = circleCY;

  // ── Max shear point (top/bottom of circle) ──
  const topShearX = circleCX;
  const topShearY = circleCY - circleR;
  const botShearX = circleCX;
  const botShearY = circleCY + circleR;

  // arc for 2θ (from Point A to live point)
  const arcR = Math.max(circleR * 0.22, 14);
  const arcX1 = circleCX + arcR * Math.cos(alpha_A); // start at Point A direction
  const arcY1 = circleCY - arcR * Math.sin(alpha_A);
  const arcEndX = circleCX + arcR * Math.cos(liveAngle);
  const arcEndY = circleCY - arcR * Math.sin(liveAngle);
  const largeArc = Math.abs(2 * theta) > 180 ? 1 : 0;
  const sweepArc = theta >= 0 ? 1 : 0; // positive θ → CW on circle (decreasing angle)

  // arc for 2θP1 (from Point A to P1 at angle 0)
  const arcP_R = circleR * 0.35;
  const arcP_StartX = circleCX + arcP_R * Math.cos(alpha_A);
  const arcP_StartY = circleCY - arcP_R * Math.sin(alpha_A);
  const arcP_EndX = circleCX + arcP_R; // P1 is always at angle 0
  const arcP_EndY = circleCY;
  const arcP_large = Math.abs(2 * thetaP1) > 180 ? 1 : 0;
  const arcP_sweep = thetaP1 >= 0 ? 0 : 1; // A below axis (+τxy): go CCW (incr angle) to P1 at 0°

  // axis bounds
  const axisExtent = (R + Math.max(Math.abs(avg), 1) + 15) * clampedScale + 40;
  const axisLeft = Math.max(cx - axisExtent, 10);
  const axisRight = Math.min(cx + axisExtent, W - 10);
  const axisTop = Math.max(cy - axisExtent, 10);
  const axisBottom = Math.min(cy + axisExtent, H - 10);

  // grid ticks
  const tickStep = (() => {
    const raw = (R + Math.abs(avg)) / clampedScale / 4;
    const exp = Math.pow(10, Math.floor(Math.log10(raw || 1)));
    const nice = [1, 2, 5, 10].find(f => f * exp >= raw) || 10;
    return nice * exp;
  })();
  const maxTick = Math.ceil(((R + Math.abs(avg)) / clampedScale + tickStep) / tickStep) * tickStep;
  const ticks = [];
  for (let v = -maxTick; v <= maxTick; v += tickStep) {
    ticks.push(+v.toPrecision(4));
  }

  /* ── helper: pill label (bg rect + text) ─────────────────────────────── */
  function pill(x, y, text, color, anchor = 'start') {
    const cw = 7.5;
    const tw = text.length * cw;
    const ph = 18, pv = 5, r = 3;
    const ox = anchor === 'middle' ? -tw / 2 - pv : anchor === 'end' ? -tw - pv * 2 : 0;
    return (
      <g>
        <rect x={x + ox} y={y - ph + 4} width={tw + pv * 2} height={ph}
          rx={r} fill="white" fillOpacity="0.92"
          stroke={color} strokeWidth="1.5" strokeOpacity="0.9" />
        <text x={x + ox + pv} y={y} fill={color}
          fontSize="13" fontFamily="JetBrains Mono, monospace" fontWeight="700">
          {text}
        </text>
      </g>
    );
  }

  return (
    <div className="mohr-wrap">
      {/* ── toolbar: zoom controls + visibility toggles ── */}
      <div className="mohr-toolbar">
        {/* zoom section */}
        <div className="mohr-zoom-bar">
          <button className="mohr-zoom-btn" onClick={() => setZoom(z => Math.min(z * 1.25, 8))} title="Zoom in">️+</button>
          <span className="mohr-zoom-label">{Math.round(zoom * 100)}%</span>
          <button className="mohr-zoom-btn" onClick={() => setZoom(z => Math.max(z / 1.25, 0.4))} title="Zoom out">️−</button>
          <button className="mohr-zoom-btn mohr-zoom-reset" onClick={handleDblClick} title="Reset view">↺</button>
        </div>
        <div className="mohr-toolbar-sep" />
        {/* visibility toggles */}
        <div className="mohr-vis-bar">
          {[
            { key: 'principal', label: 'Principal', color: '#1b5e20' },
            { key: 'shear',     label: 'τₐₑⴹ', color: '#6a1b9a' },
            { key: 'sigmaAvg',  label: 'σₐᵥᵍ', color: '#e65c00' },
            { key: 'rotation',  label: 'Live Point', color: '#1565c0' },
            { key: 'grid',      label: 'Grid', color: '#5b7fa6' },
            { key: 'axisTicks', label: 'Ticks', color: '#2a4a7a' },
          ].map(({ key, label, color }) => (
            <button
              key={key}
              className={`mohr-vis-btn${vis[key] ? ' mohr-vis-btn--on' : ''}`}
              style={vis[key] ? { borderColor: color, color: color, background: color + '18' } : {}}
              onClick={() => toggle(key)}
            >
              <span className="mohr-vis-dot" style={{ background: vis[key] ? color : '#aaa' }} />
              {label}
            </button>
          ))}
        </div>
      </div>
      {/* ── SVG canvas ── */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="mohr-svg"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        aria-label="Mohr's Circle"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDblClick}
      >
        <defs>
          <radialGradient id="circleFillM" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#1565c0" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#1565c0" stopOpacity="0.04" />
          </radialGradient>
          <filter id="glowM">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glowStrongM">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <marker id="arrowAxis" markerWidth="9" markerHeight="9" refX="7" refY="3.5" orient="auto">
            <path d="M0,0 L0,7 L9,3.5 z" fill="#1a3a6e" />
          </marker>
        </defs>

        {/* zoom + pan transform group — all content lives inside here */}
        <g transform={`translate(${W/2 + pan.x} ${H/2 + pan.y}) scale(${zoom}) translate(${-W/2} ${-H/2})`}>

        {/* ── grid lines ── */}
        {vis.grid && ticks.map(v => {
          const gx = toSvgX(v);
          const gy = toSvgY(v);
          return (
            <g key={v}>
              {gx > 10 && gx < W - 10 && <line x1={gx} y1={axisTop} x2={gx} y2={axisBottom} stroke="rgba(0,80,160,0.12)" strokeWidth="1" />}
              {gy > 10 && gy < H - 10 && <line x1={axisLeft} y1={gy} x2={axisRight} y2={gy} stroke="rgba(0,80,160,0.12)" strokeWidth="1" />}
            </g>
          );
        })}

        {/* ── axes ── */}
        <line x1={axisLeft} y1={cy} x2={axisRight} y2={cy}
          stroke="#1a3a6e" strokeWidth="2.5" markerEnd="url(#arrowAxis)" />
        <line x1={cx} y1={axisBottom} x2={cx} y2={axisTop}
          stroke="#1a3a6e" strokeWidth="2.5" markerEnd="url(#arrowAxis)" />

        {/* axis labels */}
        <text x={axisRight - 6} y={cy - 14} fill="#1a3a6e" fontSize="16" fontFamily="JetBrains Mono, monospace" fontWeight="800" textAnchor="end">σ (MPa)</text>
        <text x={cx + 12} y={axisTop + 16} fill="#1a3a6e" fontSize="16" fontFamily="JetBrains Mono, monospace" fontWeight="800">τ (MPa)</text>

        {/* ── tick labels ── */}
        {vis.axisTicks && ticks.filter(v => v !== 0).map(v => {
          const gx = toSvgX(v);
          const gy = toSvgY(v);
          const inBoundsX = gx > 34 && gx < W - 34;
          const inBoundsY = gy > 22 && gy < H - 22;
          const label = Math.abs(v) >= 1000 ? (v / 1000).toFixed(0) + 'k' : v % 1 === 0 ? String(v) : v.toFixed(1);
          return (
            <g key={v}>
              {inBoundsX && (
                <text x={gx} y={cy + 19} fill="#2a4a7a" fontSize="12" fontFamily="JetBrains Mono, monospace" fontWeight="600" textAnchor="middle">{label}</text>
              )}
              {inBoundsY && (
                <text x={cx - 9} y={gy + 4} fill="#2a4a7a" fontSize="12" fontFamily="JetBrains Mono, monospace" fontWeight="600" textAnchor="end">{label}</text>
              )}
            </g>
          );
        })}

        {/* ── σavg vertical dashed line ── */}
        {vis.sigmaAvg && <line x1={circleCX} y1={axisTop} x2={circleCX} y2={axisBottom}
          stroke="#e65c00" strokeWidth="1.5" strokeDasharray="6,5" opacity="0.4" />}

        {/* ── σavg arrow + label ── */}
        {vis.sigmaAvg && circleR > 0 && (() => {
          const ly = axisTop + 18;
          return (
            <>
              <line x1={axisLeft + 10} y1={ly} x2={circleCX - 8} y2={ly}
                stroke="#e65c00" strokeWidth="1.5" strokeDasharray="5,4" opacity="0.7"
                markerEnd="url(#arrowAxis)" />
              {pill((axisLeft + 10 + circleCX - 8) / 2, ly - 4, `σavg=${fmt(avg)}`, '#e65c00', 'middle')}
            </>
          );
        })()}

        {/* ── Max shear horizontal projection lines (non-interactive decoration) ── */}
        {vis.shear && circleR > 0 && (
          <>
            <line x1={topShearX} y1={topShearY} x2={cx} y2={topShearY}
              stroke="#6a1b9a" strokeWidth="1.5" strokeDasharray="4,4" opacity="0.45" />
            <line x1={botShearX} y1={botShearY} x2={cx} y2={botShearY}
              stroke="#6a1b9a" strokeWidth="1.5" strokeDasharray="4,4" opacity="0.45" />
          </>
        )}

        {/* ── Principal stress axis markers (σ1 σ2 tick marks on x-axis) ── */}
        {vis.principal && [s1, s2].map((s, i) => {
          const sx_ = toSvgX(s);
          const color = i === 0 ? '#1b5e20' : '#e65100';
          return (
            <g key={i}>
              <line x1={sx_} y1={cy - 12} x2={sx_} y2={cy + 12}
                stroke={color} strokeWidth="3" />
            </g>
          );
        })}

        {/* ── Mohr's circle ── */}
        {circleR > 0 ? (
          <circle
            cx={circleCX} cy={circleCY} r={circleR}
            fill="url(#circleFillM)"
            stroke="#1565c0"
            strokeWidth="3"
            style={{ filter: 'url(#glowM)', transition: 'cx 0.25s ease, cy 0.25s ease, r 0.25s ease' }}
          />
        ) : (
          <circle cx={circleCX} cy={circleCY} r={6}
            fill="#1565c0" style={{ filter: 'url(#glowM)' }} />
        )}

        {/* center dot C */}
        <circle cx={circleCX} cy={circleCY} r={7}
          fill="#e65c00" stroke="#fff" strokeWidth="1.5" />
        <text x={circleCX - 18} y={circleCY + 5}
          fill="#e65c00" fontSize="15" fontFamily="JetBrains Mono, monospace" fontWeight="800">C</text>

        {/* ── Principal angle arc 2θP1 (from A-point to P1) ── */}
        {vis.principal && circleR > 8 && Math.abs(thetaP1) > 0.5 && (
          <>
            <path
              d={`M ${arcP_StartX},${arcP_StartY} A ${arcP_R},${arcP_R} 0 ${arcP_large},${arcP_sweep} ${arcP_EndX},${arcP_EndY}`}
              fill="none" stroke="#1b5e20" strokeWidth="2.5" opacity="0.8"
            />
            {pill(
              circleCX + (arcP_R + 18) * Math.cos(alpha_A / 2),
              circleCY - (arcP_R + 18) * Math.sin(alpha_A / 2),
              `2θp=${fmt(2 * thetaP1, 1)}°`,
              '#1b5e20',
              'middle'
            )}
          </>
        )}

        {/* ── solid radius line from C to Point A ── */}
        {circleR > 0 && (
          <line x1={circleCX} y1={circleCY} x2={aX} y2={aY}
            stroke="#37474f" strokeWidth="2.5" opacity="0.85" />
        )}

        {/* ── radius lines to P1 and P2 ── */}
        {vis.principal && circleR > 0 && (
          <>
            <line x1={circleCX} y1={circleCY} x2={p1X} y2={p1Y}
              stroke="#1b5e20" strokeWidth="2" strokeDasharray="6,4" opacity="0.65" />
            <line x1={circleCX} y1={circleCY} x2={p2X} y2={p2Y}
              stroke="#e65100" strokeWidth="2" strokeDasharray="6,4" opacity="0.65" />
          </>
        )}

        {/* diameter line through current rotating point */}
        {vis.rotation && <line
          x1={pointX} y1={pointY} x2={conjX} y2={conjY}
          stroke="#1565c0" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.4"
          style={{ transition: 'x1 0.25s ease, y1 0.25s ease, x2 0.25s ease, y2 0.25s ease' }}
        />}

        {/* ── 2θ arc (rotation indicator from A) ── */}
        {vis.rotation && circleR > 5 && Math.abs(theta) > 0.3 && (
          <>
            <path
              d={`M ${arcX1},${arcY1} A ${arcR},${arcR} 0 ${largeArc},${sweepArc} ${arcEndX},${arcEndY}`}
              fill="none" stroke="#e65c00" strokeWidth="2.5" opacity="0.9"
            />
            {pill(
              circleCX + (arcR + 16) * Math.cos(alpha_A - toRad(theta)),
              circleCY - (arcR + 16) * Math.sin(alpha_A - toRad(theta)),
              `2θ=${fmt(2 * theta, 1)}°`,
              '#e65c00',
              'middle'
            )}
          </>
        )}

        {/* dashed projection lines from live point to axes */}
        {vis.rotation && <>
          <line x1={pointX} y1={pointY} x2={pointX} y2={cy}
            stroke="#1565c0" strokeWidth="1.5" strokeDasharray="4,5" opacity="0.4"
            style={{ transition: 'x1 0.25s ease, y1 0.25s ease' }} />
          <line x1={pointX} y1={pointY} x2={cx} y2={pointY}
            stroke="#1565c0" strokeWidth="1.5" strokeDasharray="4,5" opacity="0.4"
            style={{ transition: 'y1 0.25s ease, y2 0.25s ease' }} />
          <circle cx={pointX} cy={cy} r={5} fill="#1565c0" opacity="0.7"
            style={{ transition: 'cx 0.25s ease' }} />
          <circle cx={cx} cy={pointY} r={5} fill="#1565c0" opacity="0.7"
            style={{ transition: 'cy 0.25s ease' }} />
        </>}

        {/* R radius label */}
        {vis.rotation && circleR > 30 && pill(
          (circleCX + pointX) / 2 + 6,
          (circleCY + pointY) / 2,
          `R=${fmt(R)}`, '#e65c00'
        )}

        {/* ── Interactive point groups — sorted so hovered renders last (on top) ── */}
        {[
          // ── τmax (top of circle) ──
          {
            key: 'tauMax',
            show: vis.shear && circleR > 0,
            render: () => {
              const dx = topShearX - circleCX, dy = topShearY - circleCY;
              const len = Math.sqrt(dx * dx + dy * dy) || 1;
              const nx = dx / len, ny = dy / len;
              const lx = topShearX + nx * 34, ly = topShearY + ny * 34;
              const anchor = Math.abs(nx) < 0.3 ? 'middle' : nx > 0 ? 'start' : 'end';
              return <>
                <circle cx={topShearX} cy={topShearY} r={hoveredPt === 'tauMax' ? 9 : 7}
                  fill="#6a1b9a" stroke="#fff" strokeWidth="1.5"
                  style={{ filter: 'url(#glowStrongM)', transition: 'r 0.1s' }} />
                {pill(lx, ly, `τmax = ${fmt(R)}`, '#6a1b9a', anchor)}
              </>;
            },
          },
          // ── τmin (bottom of circle) ──
          {
            key: 'tauMin',
            show: vis.shear && circleR > 0,
            render: () => {
              const dx = botShearX - circleCX, dy = botShearY - circleCY;
              const len = Math.sqrt(dx * dx + dy * dy) || 1;
              const nx = dx / len, ny = dy / len;
              const lx = botShearX + nx * 34, ly = botShearY + ny * 34;
              const anchor = Math.abs(nx) < 0.3 ? 'middle' : nx > 0 ? 'start' : 'end';
              return <>
                <circle cx={botShearX} cy={botShearY} r={hoveredPt === 'tauMin' ? 9 : 7}
                  fill="#6a1b9a" stroke="#fff" strokeWidth="1.5"
                  style={{ filter: 'url(#glowStrongM)', transition: 'r 0.1s' }} />
                {pill(lx, ly, `τmin = ${fmt(-R)}`, '#6a1b9a', anchor)}
              </>;
            },
          },
          // ── P1 principal point ──
          {
            key: 'p1',
            show: vis.principal && circleR > 0,
            render: () => {
              const dx = p1X - circleCX, dy = p1Y - circleCY;
              const len = Math.sqrt(dx * dx + dy * dy) || 1;
              const nx = dx / len, ny = dy / len;
              const offset = 32;
              const lx = p1X + nx * offset, ly = p1Y + ny * offset;
              const anchor = Math.abs(nx) < 0.3 ? 'middle' : nx > 0 ? 'start' : 'end';
              return <>
                <circle cx={p1X} cy={p1Y} r={hoveredPt === 'p1' ? 11 : 9}
                  fill="#1b5e20" stroke="#fff" strokeWidth="2"
                  style={{ filter: 'url(#glowStrongM)', transition: 'r 0.1s' }} />
                {pill(lx, ly - 2, `P1  θp = ${fmt(thetaP1, 1)}°`, '#1b5e20', anchor)}
                {pill(lx, ly + 22, `σ1 = ${fmt(s1)}`, '#1b5e20', anchor)}
              </>;
            },
          },
          // ── P2 principal point ──
          {
            key: 'p2',
            show: vis.principal && circleR > 0,
            render: () => {
              const dx = p2X - circleCX, dy = p2Y - circleCY;
              const len = Math.sqrt(dx * dx + dy * dy) || 1;
              const nx = dx / len, ny = dy / len;
              const offset = 32;
              const lx = p2X + nx * offset, ly = p2Y + ny * offset;
              const anchor = Math.abs(nx) < 0.3 ? 'middle' : nx > 0 ? 'start' : 'end';
              return <>
                <circle cx={p2X} cy={p2Y} r={hoveredPt === 'p2' ? 11 : 9}
                  fill="#e65100" stroke="#fff" strokeWidth="2"
                  style={{ filter: 'url(#glowStrongM)', transition: 'r 0.1s' }} />
                {pill(lx, ly - 2, `P2  θp = ${fmt(thetaP2, 1)}°`, '#e65100', anchor)}
                {pill(lx, ly + 22, `σ2 = ${fmt(s2)}`, '#e65100', anchor)}
              </>;
            },
          },
          // ── Point A: x-face (\u03c3x, \u03c4xy) \u2014 fixed reference point ──
          {
            key: 'pointA',
            show: true,
            render: () => {
              const dx = aX - circleCX, dy = aY - circleCY;
              const len = Math.sqrt(dx * dx + dy * dy) || 1;
              const nx = dx / len, ny = dy / len;
              const offset = 32;
              const lx = aX + nx * offset, ly = aY + ny * offset;
              const anchor = Math.abs(nx) < 0.3 ? 'middle' : nx > 0 ? 'start' : 'end';
              return <>
                <circle cx={aX} cy={aY} r={hoveredPt === 'pointA' ? 11 : 9}
                  fill="#37474f" stroke="#fff" strokeWidth="2"
                  style={{ filter: 'url(#glowStrongM)', transition: 'r 0.1s' }} />
                <text x={aX} y={aY + 1} fill="white" fontSize="11"
                  fontFamily="JetBrains Mono, monospace" fontWeight="800" textAnchor="middle"
                  dominantBaseline="middle">A</text>
                {pill(lx, ly, `A  (\u03c3x=${fmt(sigmaX)}, \u03c4xy=${fmt(tauXY)})`, '#37474f', anchor)}
              </>;
            },
          },
          // ── Conjugate y-face point ──
          {
            key: 'conjPoint',
            show: vis.rotation,
            render: () => {
              const dx = conjX - circleCX, dy = conjY - circleCY;
              const len = Math.sqrt(dx * dx + dy * dy) || 1;
              const nx = dx / len, ny = dy / len;
              const offset = 30;
              const lx = conjX + nx * offset, ly = conjY + ny * offset;
              const anchor = Math.abs(nx) < 0.3 ? 'middle' : nx > 0 ? 'start' : 'end';
              return <>
                <circle cx={conjX} cy={conjY} r={hoveredPt === 'conjPoint' ? 9 : 7}
                  fill="white" stroke="#c62828" strokeWidth="3"
                  style={{ filter: 'url(#glowM)', transition: 'cx 0.25s ease, cy 0.25s ease, r 0.1s' }} />
                {hoveredPt === 'conjPoint' && pill(lx, ly,
                  `(${fmt(2 * avg - sx_prime)}, ${fmt(-txy_prime)})`, '#c62828', anchor)}
              </>;
            },
          },
          // ── Live x-face rotating point ──
          {
            key: 'livePoint',
            show: vis.rotation,
            render: () => {
              const dx = pointX - circleCX, dy = pointY - circleCY;
              const len = Math.sqrt(dx * dx + dy * dy) || 1;
              const nx = dx / len, ny = dy / len;
              const offset = 32;
              const lx = pointX + nx * offset, ly = pointY + ny * offset;
              const anchor = Math.abs(nx) < 0.3 ? 'middle' : nx > 0 ? 'start' : 'end';
              return <>
                <circle cx={pointX} cy={pointY} r={hoveredPt === 'livePoint' ? 11 : 9}
                  fill="#1565c0" stroke="#fff" strokeWidth="2"
                  style={{ filter: 'url(#glowStrongM)', transition: 'cx 0.25s ease, cy 0.25s ease, r 0.1s' }} />
                {pill(lx, ly, `(${fmt(sx_prime)}, ${fmt(txy_prime)})`, '#1565c0', anchor)}
              </>;
            },
          },
        ]
          .filter(p => p.show)
          .sort((a, b) => a.key === hoveredPt ? 1 : b.key === hoveredPt ? -1 : 0)
          .map(({ key, render }) => (
            <g key={key} style={{ cursor: 'crosshair' }}
              onMouseEnter={() => setHoveredPt(key)}
              onMouseLeave={() => setHoveredPt(null)}
            >
              {render()}
            </g>
          ))
        }
        </g>{/* end zoom+pan group */}
      </svg>

      {/* ── readout panel ── */}
      <div className="mohr-readout">
        <div className="mohr-readout-title">DERIVED VALUES</div>
        <div className="mohr-readout-grid">
          <div className="mohr-readout-cell">
            <span className="mohr-cell-label">σ<sub>x'</sub></span>
            <span className="mohr-cell-val" style={{ color: '#1565c0' }}>{fmt(sx_prime)} <span className="mohr-cell-unit">MPa</span></span>
          </div>
          <div className="mohr-readout-cell">
            <span className="mohr-cell-label">τ<sub>x'y'</sub></span>
            <span className="mohr-cell-val" style={{ color: '#c62828' }}>{fmt(txy_prime)} <span className="mohr-cell-unit">MPa</span></span>
          </div>
          <div className="mohr-readout-cell">
            <span className="mohr-cell-label">σ<sub>avg</sub></span>
            <span className="mohr-cell-val" style={{ color: '#e65c00' }}>{fmt(avg)} <span className="mohr-cell-unit">MPa</span></span>
          </div>
          <div className="mohr-readout-cell">
            <span className="mohr-cell-label">σ<sub>1</sub></span>
            <span className="mohr-cell-val" style={{ color: '#1b5e20' }}>{fmt(s1)} <span className="mohr-cell-unit">MPa</span></span>
          </div>
          <div className="mohr-readout-cell">
            <span className="mohr-cell-label">σ<sub>2</sub></span>
            <span className="mohr-cell-val" style={{ color: '#e65100' }}>{fmt(s2)} <span className="mohr-cell-unit">MPa</span></span>
          </div>
          <div className="mohr-readout-cell">
            <span className="mohr-cell-label">τ<sub>max</sub></span>
            <span className="mohr-cell-val" style={{ color: '#6a1b9a' }}>{fmt(R)} <span className="mohr-cell-unit">MPa</span></span>
          </div>
          <div className="mohr-readout-cell">
            <span className="mohr-cell-label">θ<sub>p1</sub></span>
            <span className="mohr-cell-val" style={{ color: '#1b5e20' }}>{fmt(thetaP1, 2)}°</span>
          </div>
          <div className="mohr-readout-cell">
            <span className="mohr-cell-label">θ<sub>p2</sub></span>
            <span className="mohr-cell-val" style={{ color: '#e65100' }}>{fmt(thetaP2, 2)}°</span>
          </div>
          <div className="mohr-readout-cell">
            <span className="mohr-cell-label">θ<sub>s</sub></span>
            <span className="mohr-cell-val" style={{ color: '#6a1b9a' }}>{fmt(thetaS1, 2)}°</span>
          </div>
        </div>
        <div className="mohr-readout-eq">
          (σ<sub>x'</sub> − {fmt(avg)})² + τ² = {fmt(R, 1)}²
        </div>
      </div>
    </div>
  );
}
