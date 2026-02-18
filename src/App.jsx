import { useState, useCallback } from 'react';
import './App.css';
import StressGraph from './components/StressGraph';
import ParameterSlider from './components/ParameterSlider';
import ThetaRangeControl from './components/ThetaRangeControl';
import BodyOrientation from './components/BodyOrientation';
import MohrsCircle from './components/MohrsCircle';

const INITIAL = {
  sigmaX: { value: 80,  min: -200, max: 200, step: 1 },
  sigmaY: { value: -40, min: -200, max: 200, step: 1 },
  tauXY:  { value: 50,  min: -200, max: 200, step: 1 },
};

const PRESETS = [
  { name: 'Default',     sx: 80,  sy: -40, txy: 50  },
  { name: 'Uniaxial',    sx: 100, sy: 0,   txy: 0   },
  { name: 'Biaxial',     sx: 80,  sy: 40,  txy: 0   },
  { name: 'Pure Shear',  sx: 0,   sy: 0,   txy: 60  },
  { name: 'Equal Biax',  sx: 60,  sy: 60,  txy: 0   },
];

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
  const [activeTab, setActiveTab] = useState('mohr'); // 'stress' | 'mohr'

  const update = useCallback((key, patch) => {
    setParams(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }, []);

  const applyPreset = useCallback((p) => {
    setParams({
      sigmaX: { ...INITIAL.sigmaX, value: p.sx },
      sigmaY: { ...INITIAL.sigmaY, value: p.sy },
      tauXY:  { ...INITIAL.tauXY,  value: p.txy },
    });
    setTheta(0);
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
        {/* ── TABS ── */}
        <div className="header-tabs">
          <button
            className={`tab-btn${activeTab === 'stress' ? ' tab-btn--active' : ''}`}
            onClick={() => setActiveTab('stress')}
          >
            σ vs θ Graph
          </button>
          <button
            className={`tab-btn${activeTab === 'mohr' ? ' tab-btn--active' : ''}`}
            onClick={() => setActiveTab('mohr')}
          >
            Mohr's Circle
          </button>
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

        {/* ── GRAPH PANEL (tab: stress) ── */}
        <div className={`graph-panel${activeTab !== 'stress' ? ' tab-hidden' : ''}`}>
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

        {/* ── MOHR'S CIRCLE PANEL (tab: mohr) ── */}
        <div className={`graph-panel mohr-panel${activeTab !== 'mohr' ? ' tab-hidden' : ''}`}>
          <div className="panel-topbar">
            <span className="panel-label">MOHR'S CIRCLE</span>
            <div className="legend">
              <span className="legend-dot" style={{background:'var(--sigma-color)'}} />
              <span className="legend-text">σ<sub>x′</sub>, τ<sub>x′y′</sub></span>
              <span className="legend-dot" style={{background:'#64ffda'}} />
              <span className="legend-text">σ₁ (P₁)</span>
              <span className="legend-dot" style={{background:'#ff6b6b'}} />
              <span className="legend-text">σ₂ (P₂)</span>
              <span className="legend-dot" style={{background:'#ffd166'}} />
              <span className="legend-text">τ<sub>max</sub></span>
            </div>
          </div>
          <div className="mohr-panel-inner">
            <MohrsCircle
              sigmaX={sigmaX.value}
              sigmaY={sigmaY.value}
              tauXY={tauXY.value}
              theta={theta}
            />
          </div>
        </div>

        {/* ── SIDEBAR ── */}
        <aside className="sidebar">
          {/* Presets */}
          <div className="sidebar-section">
            <div className="section-heading">PRESETS</div>
            <div className="preset-grid">
              {PRESETS.map(p => (
                <button key={p.name} className="preset-btn" onClick={() => applyPreset(p)}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>

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
            <div className="section-heading">ROTATION ANGLE</div>
            <div className="theta-sidebar">
              <input
                type="range"
                className="theta-range-slider"
                min={-90} max={90} step={0.5}
                value={theta}
                onChange={e => setTheta(Number(e.target.value))}
              />
              <div className="theta-row-labels">
                <span className="theta-side-label">θ = {theta.toFixed(1)}°</span>
                <span className="theta-side-label">2θ = {(2 * theta).toFixed(1)}°</span>
              </div>
            </div>
          </div>

          {activeTab === 'stress' && (
            <div className="sidebar-section">
              <div className="section-heading">ANGLE RANGE</div>
              <ThetaRangeControl
                thetaMin={thetaMin}
                thetaMax={thetaMax}
                onChangeThetaMin={setThetaMin}
                onChangeThetaMax={setThetaMax}
              />
            </div>
          )}

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
                <span className="derived-label">σₐᵥᵍ  (hydrostatic)</span>
                <span className="derived-val">{avg.toFixed(2)} <span className="derived-unit">MPa</span></span>
              </div>
              {principals && (
                <>
                  <div className="derived-cell">
                    <span className="derived-label">θ_p1  (principal)</span>
                    <span className="derived-val derived-val--accent">{principals[0].toFixed(2)}°</span>
                  </div>
                  <div className="derived-cell">
                    <span className="derived-label">θ_p2  (principal)</span>
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
