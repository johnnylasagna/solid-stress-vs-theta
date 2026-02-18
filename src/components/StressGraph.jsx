import { useRef, useEffect, useMemo } from 'react';
import './StressGraph.css';

const DEG2RAD = Math.PI / 180;

function computeCurves(sigmaX, sigmaY, tauXY, thetaMin, thetaMax, steps = 500) {
  const sigmaPoints = [];
  const tauPoints = [];
  for (let i = 0; i <= steps; i++) {
    const theta = thetaMin + (i / steps) * (thetaMax - thetaMin);
    const rad = theta * DEG2RAD;
    const avg = (sigmaX + sigmaY) / 2;
    const diff = (sigmaX - sigmaY) / 2;
    const sigma = avg + diff * Math.cos(2 * rad) + tauXY * Math.sin(2 * rad);
    const tau = -diff * Math.sin(2 * rad) + tauXY * Math.cos(2 * rad);
    sigmaPoints.push({ theta, value: sigma });
    tauPoints.push({ theta, value: tau });
  }
  return { sigmaPoints, tauPoints };
}

function buildPath(points, thetaMin, thetaMax, yMin, yMax, W, H, padL, padR, padT, padB) {
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const xScale = (theta) => padL + ((theta - thetaMin) / (thetaMax - thetaMin)) * plotW;
  const yScale = (v) => padT + (1 - (v - yMin) / (yMax - yMin)) * plotH;

  return points
    .map((p, i) => {
      const x = xScale(p.theta);
      const y = yScale(p.value);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

export default function StressGraph({ sigmaX, sigmaY, tauXY, thetaMin, thetaMax }) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const animRef = useRef(null);

  // Displayed (animated) param values
  const displayedRef = useRef({ sigmaX, sigmaY, tauXY });
  const targetRef = useRef({ sigmaX, sigmaY, tauXY });

  // Update target on prop changes
  useEffect(() => {
    targetRef.current = { sigmaX, sigmaY, tauXY };
  }, [sigmaX, sigmaY, tauXY]);

  const padL = 62, padR = 28, padT = 28, padB = 48;

  useEffect(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container) return;

    let W = container.clientWidth;
    let H = container.clientHeight;

    function lerp(a, b, t) { return a + (b - a) * t; }

    function render() {
      // Smooth lerp toward target
      const d = displayedRef.current;
      const t = targetRef.current;
      const SPEED = 0.12;
      d.sigmaX = lerp(d.sigmaX, t.sigmaX, SPEED);
      d.sigmaY = lerp(d.sigmaY, t.sigmaY, SPEED);
      d.tauXY  = lerp(d.tauXY,  t.tauXY,  SPEED);

      W = container.clientWidth;
      H = container.clientHeight;
      svg.setAttribute('width', W);
      svg.setAttribute('height', H);

      const { sigmaPoints, tauPoints } = computeCurves(
        d.sigmaX, d.sigmaY, d.tauXY, thetaMin, thetaMax
      );

      const allValues = [...sigmaPoints.map(p => p.value), ...tauPoints.map(p => p.value)];
      const rawMin = Math.min(...allValues);
      const rawMax = Math.max(...allValues);
      const range = rawMax - rawMin || 1;
      const pad = range * 0.12;
      const yMin = rawMin - pad;
      const yMax = rawMax + pad;

      const plotW = W - padL - padR;
      const plotH = H - padT - padB;
      const xScale = (theta) => padL + ((theta - thetaMin) / (thetaMax - thetaMin)) * plotW;
      const yScale = (v) => padT + (1 - (v - yMin) / (yMax - yMin)) * plotH;

      // Grid
      const TICK_X = 10, TICK_Y = 6;
      let gridLines = '';
      let xLabels = '', yLabels = '';

      const thetaStep = (thetaMax - thetaMin) / TICK_X;
      for (let i = 0; i <= TICK_X; i++) {
        const theta = thetaMin + i * thetaStep;
        const x = xScale(theta);
        const isMid = i % 2 === 0;
        gridLines += `<line x1="${x.toFixed(1)}" y1="${padT}" x2="${x.toFixed(1)}" y2="${(padT + plotH).toFixed(1)}" class="grid-line${isMid ? ' grid-mid' : ''}"/>`;
        xLabels += `<text x="${x.toFixed(1)}" y="${(padT + plotH + 18).toFixed(1)}" class="axis-label">${theta.toFixed(0)}°</text>`;
      }

      const valueStep = (yMax - yMin) / TICK_Y;
      for (let i = 0; i <= TICK_Y; i++) {
        const v = yMin + i * valueStep;
        const y = yScale(v);
        const isMid = i % 2 === 0;
        gridLines += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${(padL + plotW).toFixed(1)}" y2="${y.toFixed(1)}" class="grid-line${isMid ? ' grid-mid' : ''}"/>`;
        yLabels += `<text x="${(padL - 8).toFixed(1)}" y="${(y + 4).toFixed(1)}" class="axis-label axis-label-y">${v.toFixed(1)}</text>`;
      }

      // Zero line
      const y0 = yScale(0);
      let zeroLine = '';
      if (y0 >= padT && y0 <= padT + plotH) {
        zeroLine = `<line x1="${padL}" y1="${y0.toFixed(1)}" x2="${(padL + plotW).toFixed(1)}" y2="${y0.toFixed(1)}" class="zero-axis"/>`;
      }

      const sigmaPath = buildPath(sigmaPoints, thetaMin, thetaMax, yMin, yMax, W, H, padL, padR, padT, padB);
      const tauPath   = buildPath(tauPoints,   thetaMin, thetaMax, yMin, yMax, W, H, padL, padR, padT, padB);

      // Principal stress markers (where tau = 0)
      let markers = '';
      for (let i = 0; i < tauPoints.length - 1; i++) {
        const a = tauPoints[i], b = tauPoints[i + 1];
        if (a.value * b.value <= 0 && Math.abs(a.value - b.value) > 1e-9) {
          const tCross = a.theta + (0 - a.value) / (b.value - a.value) * (b.theta - a.theta);
          const sVal = sigmaPoints[i].value + (tCross - sigmaPoints[i].theta) / (sigmaPoints[i+1].theta - sigmaPoints[i].theta) * (sigmaPoints[i+1].value - sigmaPoints[i].value);
          const mx = xScale(tCross);
          const my = yScale(sVal);
          markers += `<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="5" class="principal-marker"/>`;
          markers += `<line x1="${mx.toFixed(1)}" y1="${padT}" x2="${mx.toFixed(1)}" y2="${(padT + plotH).toFixed(1)}" class="principal-line"/>`;
        }
      }

      // Border
      const border = `<rect x="${padL}" y="${padT}" width="${plotW.toFixed(1)}" height="${plotH.toFixed(1)}" class="plot-border"/>`;

      svg.innerHTML = `
        ${gridLines}
        ${zeroLine}
        ${markers}
        <path d="${sigmaPath}" class="curve sigma-curve"/>
        <path d="${tauPath}" class="curve tau-curve"/>
        ${border}
        ${xLabels}
        ${yLabels}
        <text x="${(padL + plotW / 2).toFixed(1)}" y="${(padT + plotH + 40).toFixed(1)}" class="axis-title">θ  (degrees)</text>
        <text x="${(padL - 46).toFixed(1)}" y="${(padT + plotH / 2).toFixed(1)}" class="axis-title axis-title-y" transform="rotate(-90, ${(padL - 46).toFixed(1)}, ${(padT + plotH / 2).toFixed(1)})">Stress  (MPa)</text>
      `;

      animRef.current = requestAnimationFrame(render);
    }

    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [thetaMin, thetaMax]);

  return (
    <div ref={containerRef} className="graph-container">
      <svg ref={svgRef} className="graph-svg" />
    </div>
  );
}
