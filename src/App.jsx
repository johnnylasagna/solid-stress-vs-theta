import { useState, useCallback } from 'react';
import './App.css';
import StressGraph from './components/StressGraph';
import ParameterSlider from './components/ParameterSlider';
import ThetaRangeControl from './components/ThetaRangeControl';
import BodyOrientation from './components/BodyOrientation';

const INITIAL = {
  sigmaX: { value: 80,  min: -200, max: 200, step: 1 },
  sigmaY: { value: -40, min: -200, max: 200, step: 1 },
  tauXY:  { value: 50,  min: -200, max: 200, step: 1 },
};

function DEG2RAD(d) { return d * Math.PI / 180; }

function getPrincipalAngles(sigmaX, sigmaY, tauXY) {
  const diff = sigmaX - sigmaY;
  if (Math.abs(diff) < 1e-9 && Math.abs(tauXY) < 1e-9) return null;
  const angle = 0.5 * Math.atan2(2 * tauXY, diff) * 180 / Math.PI;
  return [angle, angle + 90].map(a => ((a % 180) + 180) % 180);
}

function getMaxShear(sigmaX, sigmaY, tauXY) {
  return Math.sqrt(((sigmaX - sigmaY) / 2) ** 2 + tauXY ** 2);
}

export default function App() {
  const [params, setParams] = useState(INITIAL);
  const [thetaMin, setThetaMin] = useState(0);
  const [thetaMax, setThetaMax] = useState(180);
  const [theta, setTheta] = useState(0);

  const update = useCallback((key, patch) => {
    setParams(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }, []);

  const { sigmaX, sigmaY, tauXY } = params;
  const avg = (sigmaX.value + sigmaY.value) / 2;
  const tauMax = getMaxShear(sigmaX.value, sigmaY.value, tauXY.value);
  const sigma1 = avg + tauMax;
  const sigma2 = avg - tauMax;
  const principals = getPrincipalAngles(sigmaX.value, sigmaY.value, tauXY.value);

  return (
    <div className="app">
      {/* ── HEADER ── */}
      <header className="app-header">
        <div className="header-left">
          <span className="header-tag">MECH</span>
          <h1 className="header-title">Stress Transformation</h1>
        </div>
        <div className="header-equations">
          <span className="eq-chip">
            σ<sub>x′</sub> = <span className="eq-frac">(σ<sub>x</sub>+σ<sub>y</sub>)/2</span>
            {' + '}<span className="eq-frac">(σ<sub>x</sub>−σ<sub>y</sub>)/2</span> cos2θ + τ<sub>xy</sub> sin2θ
          </span>
          <span className="eq-chip">
            τ<sub>x′y′</sub> = −<span className="eq-frac">(σ<sub>x</sub>−σ<sub>y</sub>)/2</span> sin2θ + τ<sub>xy</sub> cos2θ
          </span>
        </div>
      </header>

      {/* ── MAIN LAYOUT ── */}
      <div className="app-body">
        {/* ── GRAPH ── */}
        <div className="graph-panel">
          <div className="graph-row">
          <BodyOrientation
            sigmaX={sigmaX.value}
            sigmaY={sigmaY.value}
            tauXY={tauXY.value}
            theta={theta}
            onThetaChange={setTheta}
          />
          <div className="graph-col">
          <div className="panel-topbar">
            <span className="panel-label">STRESS  vs  ANGLE</span>
            <div className="legend">
              <span className="legend-dot" style={{background:'var(--sigma-color)'}} />
              <span className="legend-text">σ<sub>x′</sub>(θ)</span>
              <span className="legend-dot" style={{background:'var(--tau-color)'}} />
              <span className="legend-text">τ<sub>x′y′</sub>(θ)</span>
              {principals && (
                <>
                  <span className="legend-dot" style={{background:'var(--accent)'}} />
                  <span className="legend-text">Principal</span>
                </>
              )}
            </div>
          </div>
          <StressGraph
            sigmaX={sigmaX.value}
            sigmaY={sigmaY.value}
            tauXY={tauXY.value}
            thetaMin={thetaMin}
            thetaMax={thetaMax}
          />
          </div>
          </div>
        </div>

        {/* ── SIDEBAR ── */}
        <aside className="sidebar">
          <div className="sidebar-section">
            <div className="section-heading">PARAMETERS</div>
            <ParameterSlider
              label="Normal Stress X"
              symbol="σₓ"
              unit="MPa"
              value={sigmaX.value}
              min={sigmaX.min}
              max={sigmaX.max}
              step={sigmaX.step}
              color="var(--sigma-color)"
              onChange={p => update('sigmaX', p)}
            />
            <ParameterSlider
              label="Normal Stress Y"
              symbol="σᵧ"
              unit="MPa"
              value={sigmaY.value}
              min={sigmaY.min}
              max={sigmaY.max}
              step={sigmaY.step}
              color="#7ecfa0"
              onChange={p => update('sigmaY', p)}
            />
            <ParameterSlider
              label="Shear Stress XY"
              symbol="τₓᵧ"
              unit="MPa"
              value={tauXY.value}
              min={tauXY.min}
              max={tauXY.max}
              step={tauXY.step}
              color="var(--tau-color)"
              onChange={p => update('tauXY', p)}
            />
          </div>

          <div className="sidebar-section">
            <div className="section-heading">ANGLE RANGE</div>
            <ThetaRangeControl
              thetaMin={thetaMin}
              thetaMax={thetaMax}
              onChangeThetaMin={setThetaMin}
              onChangeThetaMax={setThetaMax}
            />
          </div>

          <div className="sidebar-section">
            <div className="section-heading">DERIVED VALUES</div>
            <div className="derived-grid">
              <div className="derived-cell">
                <span className="derived-label">σ₁  (max principal)</span>
                <span className="derived-val derived-val--sigma">{sigma1.toFixed(2)} <span className="derived-unit">MPa</span></span>
              </div>
              <div className="derived-cell">
                <span className="derived-label">σ₂  (min principal)</span>
                <span className="derived-val derived-val--sigma2">{sigma2.toFixed(2)} <span className="derived-unit">MPa</span></span>
              </div>
              <div className="derived-cell">
                <span className="derived-label">τₘₐₓ  (max shear)</span>
                <span className="derived-val derived-val--tau">{tauMax.toFixed(2)} <span className="derived-unit">MPa</span></span>
              </div>
              <div className="derived-cell">
                <span className="derived-label">σₐᵥ𝓰  (hydrostatic)</span>
                <span className="derived-val ">{avg.toFixed(2)} <span className="derived-unit">MPa</span></span>
              </div>
              {principals && (
                <>
                  <div className="derived-cell">
                    <span className="derived-label">θ₁  (principal angle)</span>
                    <span className="derived-val derived-val--accent">{principals[0].toFixed(2)}°</span>
                  </div>
                  <div className="derived-cell">
                    <span className="derived-label">θ₂  (principal angle)</span>
                    <span className="derived-val derived-val--accent">{principals[1].toFixed(2)}°</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
