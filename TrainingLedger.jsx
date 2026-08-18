import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Trash2, X, Award } from 'lucide-react';

const COLORS = {
  bg: '#141210',
  bgGrid: '#221E19',
  card: '#1C1916',
  cardAlt: '#211D19',
  border: '#332D26',
  ink: '#F4EFE7',
  inkSoft: '#948C81',
  accent: '#D97757',
  accentDim: '#3A2A21',
  accentText: '#EFAE8E',
  gold: '#E8B667',
  decline: '#B2604A',
};

const DEFAULT_METRICS = [
  { id: 'weight', name: 'Body Weight', unit: 'lb', higherBetter: false },
  { id: 'bench', name: 'Bench Press', unit: 'lb', higherBetter: true },
  { id: 'squat', name: 'Squat', unit: 'lb', higherBetter: true },
  { id: 'deadlift', name: 'Deadlift', unit: 'lb', higherBetter: true },
  { id: 'waist', name: 'Waist', unit: 'in', higherBetter: false },
];

const STORAGE_KEY = 'tracker-data';
const uid = () => Math.random().toString(36).slice(2, 10);
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });

function GridBG({ children, style = {} }) {
  return (
    <div
      style={{
        backgroundColor: COLORS.bg,
        backgroundImage: `linear-gradient(${COLORS.bgGrid} 1px, transparent 1px), linear-gradient(90deg, ${COLORS.bgGrid} 1px, transparent 1px)`,
        backgroundSize: '28px 28px',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default function TrainingLedger() {
  const [loaded, setLoaded] = useState(false);
  const [metrics, setMetrics] = useState(DEFAULT_METRICS);
  const [entries, setEntries] = useState([]);
  const [activeMetric, setActiveMetric] = useState('weight');
  const [showAdd, setShowAdd] = useState(false);
  const [showAddMetric, setShowAddMetric] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setMetrics(parsed.metrics && parsed.metrics.length ? parsed.metrics : DEFAULT_METRICS);
          setEntries(parsed.entries || []);
          if (parsed.metrics && parsed.metrics.length) setActiveMetric(parsed.metrics[0].id);
        }
      } catch (e) {
        // no existing data yet — start fresh
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const persist = (nextMetrics, nextEntries) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ metrics: nextMetrics, entries: nextEntries }));
      setSaveError(false);
    } catch (e) {
      setSaveError(true);
    }
  };

  const addEntry = (entry) => {
    const next = [...entries, { id: uid(), ...entry }].sort((a, b) => (a.date < b.date ? 1 : -1));
    setEntries(next);
    persist(metrics, next);
    setShowAdd(false);
  };

  const deleteEntry = (id) => {
    const next = entries.filter((e) => e.id !== id);
    setEntries(next);
    persist(metrics, next);
  };

  const addMetric = (metric) => {
    const next = [...metrics, { id: uid(), ...metric }];
    setMetrics(next);
    persist(next, entries);
    setActiveMetric(next[next.length - 1].id);
    setShowAddMetric(false);
  };

  const resetAll = async () => {
    setMetrics(DEFAULT_METRICS);
    setEntries([]);
    await persist(DEFAULT_METRICS, []);
  };

  const series = useMemo(() => {
    const map = {};
    metrics.forEach((m) => (map[m.id] = []));
    const chrono = [...entries].sort((a, b) => (a.date > b.date ? 1 : -1));
    const best = {};
    chrono.forEach((e) => {
      Object.entries(e.values || {}).forEach(([metricId, val]) => {
        if (val === '' || val === null || val === undefined) return;
        const m = metrics.find((mm) => mm.id === metricId);
        if (!m) return;
        const num = Number(val);
        let isPR = false;
        if (best[metricId] === undefined) {
          isPR = true;
        } else if (m.higherBetter && num > best[metricId]) {
          isPR = true;
        } else if (!m.higherBetter && num < best[metricId]) {
          isPR = true;
        }
        if (isPR) best[metricId] = num;
        map[metricId].push({ date: e.date, value: num, label: fmtDate(e.date), isPR });
      });
    });
    return map;
  }, [entries, metrics]);

  const latestFor = (metricId) => {
    const s = series[metricId];
    if (!s || !s.length) return null;
    const last = s[s.length - 1];
    const prev = s.length > 1 ? s[s.length - 2] : null;
    return { value: last.value, delta: prev ? last.value - prev.value : null };
  };

  if (!loaded) {
    return (
      <GridBG style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: COLORS.inkSoft, fontFamily: 'monospace', fontSize: '13px' }}>loading ledger…</p>
      </GridBG>
    );
  }

  return (
    <GridBG style={{ minHeight: '100%', padding: '32px 24px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@400;500&display=swap');
        .lt-display { font-family: 'Space Grotesk', sans-serif; }
        .lt-mono { font-family: 'JetBrains Mono', monospace; }
        .lt-input { color-scheme: dark; }
        .lt-input::placeholder { color: #6B655C; }
      `}</style>

      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            borderBottom: `2px solid ${COLORS.border}`,
            paddingBottom: '16px',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <p
              className="lt-mono"
              style={{ fontSize: '11px', letterSpacing: '0.18em', color: COLORS.accentText, textTransform: 'uppercase', marginBottom: '4px' }}
            >
              Personal Log
            </p>
            <h1 className="lt-display" style={{ fontSize: '32px', fontWeight: 700, color: COLORS.ink, letterSpacing: '-0.01em' }}>
              Training Ledger
            </h1>
          </div>
          <p className="lt-mono" style={{ fontSize: '12px', color: COLORS.inkSoft }}>
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'} logged
          </p>
        </div>

        {saveError && (
          <div style={{ background: '#2E1A15', border: `1px solid ${COLORS.decline}`, color: COLORS.decline, fontSize: '13px', padding: '10px 14px', borderRadius: '4px', marginBottom: '20px' }}>
            Couldn't save that change. Your data may not persist — try again.
          </div>
        )}

        {/* Stat cards */}
        {entries.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '28px' }}>
            {metrics.map((m) => {
              const latest = latestFor(m.id);
              if (!latest) return null;
              const improving = latest.delta !== null && (m.higherBetter ? latest.delta > 0 : latest.delta < 0);
              const worsening = latest.delta !== null && latest.delta !== 0 && !improving;
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveMetric(m.id)}
                  style={{
                    background: COLORS.card,
                    border: `1px solid ${activeMetric === m.id ? COLORS.accent : COLORS.border}`,
                    borderWidth: activeMetric === m.id ? '2px' : '1px',
                    borderRadius: '6px',
                    padding: '14px 16px',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <p className="lt-mono" style={{ fontSize: '10px', color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                    {m.name}
                  </p>
                  <p className="lt-display" style={{ fontSize: '24px', fontWeight: 700, color: COLORS.ink }}>
                    {latest.value}
                    <span style={{ fontSize: '13px', color: COLORS.inkSoft, marginLeft: '3px' }}>{m.unit}</span>
                  </p>
                  {latest.delta !== null && latest.delta !== 0 && (
                    <p className="lt-mono" style={{ fontSize: '11px', marginTop: '4px', color: improving ? COLORS.accentText : worsening ? COLORS.decline : COLORS.inkSoft }}>
                      {latest.delta > 0 ? '+' : ''}
                      {Math.round(latest.delta * 100) / 100} {m.unit}
                    </p>
                  )}
                </button>
              );
            })}
            <button
              onClick={() => setShowAddMetric(true)}
              style={{
                border: `1px dashed ${COLORS.border}`,
                borderRadius: '6px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                color: COLORS.inkSoft,
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              <Plus size={15} /> Metric
            </button>
          </div>
        )}

        {/* Empty state */}
        {entries.length === 0 && (
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '8px', padding: '40px 24px', textAlign: 'center', marginBottom: '28px' }}>
            <p className="lt-display" style={{ fontSize: '18px', fontWeight: 700, color: COLORS.ink, marginBottom: '6px' }}>
              Nothing logged yet
            </p>
            <p style={{ fontSize: '14px', color: COLORS.inkSoft, marginBottom: '18px' }}>
              Add your first entry to start tracking body weight, lifts, or any measurement you want.
            </p>
            <button
              onClick={() => setShowAdd(true)}
              style={{ background: COLORS.accent, color: '#1A120C', border: 'none', borderRadius: '6px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
            >
              Log first entry
            </button>
          </div>
        )}

        {/* Chart */}
        {entries.length > 0 && (
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '8px', padding: '20px', marginBottom: '28px' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {metrics.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setActiveMetric(m.id)}
                  style={{
                    fontSize: '12px',
                    padding: '5px 12px',
                    borderRadius: '999px',
                    border: `1px solid ${activeMetric === m.id ? COLORS.accent : COLORS.border}`,
                    background: activeMetric === m.id ? COLORS.accentDim : 'transparent',
                    color: activeMetric === m.id ? COLORS.accentText : COLORS.inkSoft,
                    cursor: 'pointer',
                    fontWeight: activeMetric === m.id ? 600 : 400,
                  }}
                >
                  {m.name}
                </button>
              ))}
            </div>

            {series[activeMetric] && series[activeMetric].length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={series[activeMetric]} margin={{ top: 10, right: 16, bottom: 0, left: -16 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: COLORS.inkSoft, fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: COLORS.border }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: COLORS.inkSoft, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} width={40} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ background: COLORS.cardAlt, border: `1px solid ${COLORS.border}`, borderRadius: '4px', fontSize: '12px' }}
                    labelStyle={{ color: COLORS.ink }}
                    itemStyle={{ color: COLORS.accentText }}
                    formatter={(v) => [`${v} ${metrics.find((m) => m.id === activeMetric)?.unit || ''}`, '']}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={COLORS.accent}
                    strokeWidth={2.5}
                    dot={(props) => {
                      const { cx, cy, payload, index } = props;
                      if (payload.isPR) {
                        return (
                          <g key={`dot-${index}`}>
                            <circle cx={cx} cy={cy} r={5} fill={COLORS.gold} stroke={COLORS.bg} strokeWidth={1.5} />
                          </g>
                        );
                      }
                      return <circle key={`dot-${index}`} cx={cx} cy={cy} r={3} fill={COLORS.accent} stroke={COLORS.bg} strokeWidth={1} />;
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ fontSize: '13px', color: COLORS.inkSoft, padding: '30px 0', textAlign: 'center' }}>No entries for this metric yet.</p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
              <Award size={13} color={COLORS.gold} />
              <span className="lt-mono" style={{ fontSize: '11px', color: COLORS.inkSoft }}>gold dot marks a personal record</span>
            </div>
          </div>
        )}

        {/* Log table */}
        {entries.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <p className="lt-mono" style={{ fontSize: '11px', letterSpacing: '0.1em', color: COLORS.inkSoft, textTransform: 'uppercase', marginBottom: '10px' }}>
              Entries
            </p>
            <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: '8px', overflow: 'hidden', background: COLORS.card }}>
              {entries.map((e, i) => (
                <div
                  key={e.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderTop: i === 0 ? 'none' : `1px solid ${COLORS.border}`,
                    gap: '12px',
                  }}
                >
                  <span className="lt-mono" style={{ fontSize: '12px', color: COLORS.inkSoft, minWidth: '72px' }}>
                    {fmtDate(e.date)}
                  </span>
                  <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
                    {Object.entries(e.values || {})
                      .filter(([, v]) => v !== '' && v !== null && v !== undefined)
                      .map(([metricId, v]) => {
                        const m = metrics.find((mm) => mm.id === metricId);
                        if (!m) return null;
                        return (
                          <span key={metricId} style={{ fontSize: '13px', color: COLORS.ink }}>
                            <span style={{ color: COLORS.inkSoft }}>{m.name}:</span> {v} {m.unit}
                          </span>
                        );
                      })}
                    {e.note && <span style={{ fontSize: '13px', color: COLORS.inkSoft, fontStyle: 'italic' }}>"{e.note}"</span>}
                  </div>
                  <button onClick={() => deleteEntry(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.inkSoft, padding: '4px' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
          {entries.length > 0 ? (
            <button
              onClick={() => setShowAdd(true)}
              style={{ background: COLORS.accent, color: '#1A120C', border: 'none', borderRadius: '6px', padding: '10px 18px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={15} /> Log entry
            </button>
          ) : (
            <span />
          )}
          {entries.length > 0 && (
            <button onClick={resetAll} style={{ background: 'none', border: 'none', fontSize: '12px', color: COLORS.inkSoft, cursor: 'pointer', textDecoration: 'underline' }}>
              Clear all data
            </button>
          )}
        </div>
      </div>

      {showAdd && <AddEntryModal metrics={metrics} onClose={() => setShowAdd(false)} onSave={addEntry} />}
      {showAddMetric && <AddMetricModal onClose={() => setShowAddMetric(false)} onSave={addMetric} />}
    </GridBG>
  );
}

function AddEntryModal({ metrics, onClose, onSave }) {
  const [date, setDate] = useState(todayStr());
  const [values, setValues] = useState({});
  const [note, setNote] = useState('');
  const inputStyle = { width: '100%', background: COLORS.bg, color: COLORS.ink, border: `1px solid ${COLORS.border}`, borderRadius: '6px', padding: '8px 10px', fontSize: '14px' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 50 }}>
      <div style={{ background: COLORS.cardAlt, border: `1px solid ${COLORS.border}`, borderRadius: '10px', padding: '24px', width: '100%', maxWidth: '400px', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <p className="lt-display" style={{ fontSize: '18px', fontWeight: 700, color: COLORS.ink }}>New entry</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.inkSoft }}>
            <X size={18} />
          </button>
        </div>

        <label style={{ fontSize: '12px', color: COLORS.inkSoft, display: 'block', marginBottom: '4px' }}>Date</label>
        <input type="date" className="lt-input" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inputStyle, marginBottom: '14px' }} />

        {metrics.map((m) => (
          <div key={m.id} style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', color: COLORS.inkSoft, display: 'block', marginBottom: '4px' }}>
              {m.name} ({m.unit})
            </label>
            <input
              type="number"
              step="any"
              className="lt-input"
              placeholder="—"
              value={values[m.id] ?? ''}
              onChange={(e) => setValues({ ...values, [m.id]: e.target.value })}
              style={inputStyle}
            />
          </div>
        ))}

        <label style={{ fontSize: '12px', color: COLORS.inkSoft, display: 'block', marginBottom: '4px' }}>Note (optional)</label>
        <input
          type="text"
          className="lt-input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Felt strong today"
          style={{ ...inputStyle, marginBottom: '18px' }}
        />

        <button
          onClick={() => onSave({ date, values, note })}
          style={{ width: '100%', background: COLORS.accent, color: '#1A120C', border: 'none', borderRadius: '6px', padding: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
        >
          Save entry
        </button>
      </div>
    </div>
  );
}

function AddMetricModal({ onClose, onSave }) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [higherBetter, setHigherBetter] = useState(true);
  const inputStyle = { width: '100%', background: COLORS.bg, color: COLORS.ink, border: `1px solid ${COLORS.border}`, borderRadius: '6px', padding: '8px 10px', fontSize: '14px' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 50 }}>
      <div style={{ background: COLORS.cardAlt, border: `1px solid ${COLORS.border}`, borderRadius: '10px', padding: '24px', width: '100%', maxWidth: '360px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <p className="lt-display" style={{ fontSize: '18px', fontWeight: 700, color: COLORS.ink }}>New metric</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.inkSoft }}>
            <X size={18} />
          </button>
        </div>

        <label style={{ fontSize: '12px', color: COLORS.inkSoft, display: 'block', marginBottom: '4px' }}>Name</label>
        <input type="text" className="lt-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Overhead Press" style={{ ...inputStyle, marginBottom: '12px' }} />

        <label style={{ fontSize: '12px', color: COLORS.inkSoft, display: 'block', marginBottom: '4px' }}>Unit</label>
        <input type="text" className="lt-input" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. lb, in, mi" style={{ ...inputStyle, marginBottom: '12px' }} />

        <label style={{ fontSize: '12px', color: COLORS.inkSoft, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
          <input type="checkbox" checked={higherBetter} onChange={(e) => setHigherBetter(e.target.checked)} />
          Higher numbers are better (uncheck for things like waist size)
        </label>

        <button
          onClick={() => name.trim() && onSave({ name: name.trim(), unit: unit.trim() || '—', higherBetter })}
          disabled={!name.trim()}
          style={{ width: '100%', background: name.trim() ? COLORS.accent : COLORS.border, color: name.trim() ? '#1A120C' : COLORS.inkSoft, border: 'none', borderRadius: '6px', padding: '10px', fontSize: '14px', fontWeight: 600, cursor: name.trim() ? 'pointer' : 'not-allowed' }}
        >
          Add metric
        </button>
      </div>
    </div>
  );
}
