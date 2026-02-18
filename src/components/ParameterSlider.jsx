import { useState, useCallback } from 'react';
import './ParameterSlider.css';

export default function ParameterSlider({ label, symbol, unit, value, min, max, step, onChange, color }) {
  const [editingMin, setEditingMin] = useState(false);
  const [editingMax, setEditingMax] = useState(false);
  const [localMin, setLocalMin] = useState(String(min));
  const [localMax, setLocalMax] = useState(String(max));

  const pct = ((value - min) / (max - min)) * 100;

  const handleRangeChange = useCallback((field, raw) => {
    const parsed = parseFloat(raw);
    if (isNaN(parsed)) return;
    if (field === 'min' && parsed < max) {
      onChange({ min: parsed, max, value: Math.max(value, parsed) });
    }
    if (field === 'max' && parsed > min) {
      onChange({ min, max: parsed, value: Math.min(value, parsed) });
    }
  }, [min, max, value, onChange]);

  return (
    <div className="param-slider">
      <div className="param-header">
        <span className="param-symbol" style={{ color }}>{symbol}</span>
        <span className="param-label">{label}</span>
        <span className="param-value" style={{ color }}>{value.toFixed(1)}<span className="param-unit">{unit}</span></span>
      </div>

      <div className="slider-track-wrap">
        <div className="slider-range-label">
          {editingMin ? (
            <input
              className="range-input"
              type="number"
              value={localMin}
              onChange={e => setLocalMin(e.target.value)}
              onBlur={() => { handleRangeChange('min', localMin); setEditingMin(false); }}
              onKeyDown={e => { if (e.key === 'Enter') { handleRangeChange('min', localMin); setEditingMin(false); } }}
              autoFocus
            />
          ) : (
            <button className="range-badge" onClick={() => { setLocalMin(String(min)); setEditingMin(true); }}>
              {min}
            </button>
          )}
        </div>

        <div className="slider-track-area">
          <div className="slider-fill" style={{ width: `${pct}%`, background: color }} />
          <input
            type="range"
            className="slider-input"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={e => onChange({ min, max, value: parseFloat(e.target.value) })}
            style={{ '--thumb-color': color }}
          />
        </div>

        <div className="slider-range-label slider-range-label--right">
          {editingMax ? (
            <input
              className="range-input"
              type="number"
              value={localMax}
              onChange={e => setLocalMax(e.target.value)}
              onBlur={() => { handleRangeChange('max', localMax); setEditingMax(false); }}
              onKeyDown={e => { if (e.key === 'Enter') { handleRangeChange('max', localMax); setEditingMax(false); } }}
              autoFocus
            />
          ) : (
            <button className="range-badge" onClick={() => { setLocalMax(String(max)); setEditingMax(true); }}>
              {max}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
