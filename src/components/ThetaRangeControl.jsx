import { useState, useCallback } from 'react';
import './ThetaRangeControl.css';

export default function ThetaRangeControl({ thetaMin, thetaMax, onChangeThetaMin, onChangeThetaMax }) {
  const [editMin, setEditMin] = useState(false);
  const [editMax, setEditMax] = useState(false);
  const [localMin, setLocalMin] = useState(String(thetaMin));
  const [localMax, setLocalMax] = useState(String(thetaMax));

  const applyMin = useCallback((raw) => {
    const v = parseFloat(raw);
    if (!isNaN(v) && v < thetaMax) onChangeThetaMin(v);
  }, [thetaMax, onChangeThetaMin]);

  const applyMax = useCallback((raw) => {
    const v = parseFloat(raw);
    if (!isNaN(v) && v > thetaMin) onChangeThetaMax(v);
  }, [thetaMin, onChangeThetaMax]);

  return (
    <div className="theta-control">
      <div className="theta-label">
        <span className="theta-sym">θ</span>
        <span className="theta-desc">Angle Range</span>
      </div>
      <div className="theta-row">
        <div className="theta-field">
          <span className="theta-field-label">MIN</span>
          {editMin ? (
            <input
              className="theta-input"
              type="number"
              value={localMin}
              onChange={e => setLocalMin(e.target.value)}
              onBlur={() => { applyMin(localMin); setEditMin(false); }}
              onKeyDown={e => { if (e.key === 'Enter') { applyMin(localMin); setEditMin(false); } }}
              autoFocus
            />
          ) : (
            <button className="theta-val" onClick={() => { setLocalMin(String(thetaMin)); setEditMin(true); }}>
              {thetaMin}°
            </button>
          )}
        </div>
        <div className="theta-sep">—</div>
        <div className="theta-field">
          <span className="theta-field-label">MAX</span>
          {editMax ? (
            <input
              className="theta-input"
              type="number"
              value={localMax}
              onChange={e => setLocalMax(e.target.value)}
              onBlur={() => { applyMax(localMax); setEditMax(false); }}
              onKeyDown={e => { if (e.key === 'Enter') { applyMax(localMax); setEditMax(false); } }}
              autoFocus
            />
          ) : (
            <button className="theta-val" onClick={() => { setLocalMax(String(thetaMax)); setEditMax(true); }}>
              {thetaMax}°
            </button>
          )}
        </div>
        <span className="theta-hint">click to edit</span>
      </div>
    </div>
  );
}
