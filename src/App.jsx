import React, { useEffect, useState, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import {
  generateReading, triggerDanger, resetDanger,
  getZones, getThresholds, THRESHOLDS,
} from './utils/sensorSimulator';
import {
  analyzeReading, calculateComplianceScore,
  resetAlertEngine,
} from './utils/aiDetector';
import {
  logAlert, logWorkerReport, logComplianceUpdate,
  getBlockNumber, getChainName, submitTransaction,
} from './utils/mockBlockchain';
import './index.css';

const POLL_MS = 2000;
const MAX_HISTORY = 30;
const ZONES = getZones();

const METRIC_META = {
  temp:      { label: 'Temp',      unit: '°C',   max: 150,  warn: THRESHOLDS.temp.warn,      danger: THRESHOLDS.temp.danger },
  vibration: { label: 'Vibration', unit: 'mm/s', max: 15,   warn: THRESHOLDS.vibration.warn,  danger: THRESHOLDS.vibration.danger },
  gas:       { label: 'Gas',       unit: 'ppm',  max: 100,  warn: THRESHOLDS.gas.warn,         danger: THRESHOLDS.gas.danger },
  pressure:  { label: 'Pressure',  unit: 'bar',  max: 3,    warn: THRESHOLDS.pressure.warn,    danger: THRESHOLDS.pressure.danger },
};

// ─── Sensor Card ─────────────────────────────────────────────
function SensorCard({ reading }) {
  if (!reading) return null;

  const getColor = (metric, value) => {
    const m = METRIC_META[metric];
    if (!m) return 'var(--cyan)';
    if (value >= m.danger) return 'var(--red)';
    if (value >= m.warn) return 'var(--amber)';
    return 'var(--green)';
  };

  const getBarColor = getColor;

  const metrics = ['temp', 'vibration', 'gas', 'pressure'];

  return (
    <div className={`sensor-card ${reading.status}`}>
      <div className="sensor-header">
        <div>
          <div className="sensor-name">{reading.zoneName}</div>
          <div className="sensor-zone-id">{reading.zoneId}</div>
        </div>
        <div className={`status-badge ${reading.status}`}>
          <div className="status-dot" />
          {reading.status.toUpperCase()}
        </div>
      </div>

      <div className="sensor-metrics">
        {metrics.map(m => {
          const meta = METRIC_META[m];
          const val = reading[m];
          const pct = Math.min(100, (val / meta.max) * 100);
          const color = getColor(m, val);
          const cls = val >= meta.danger ? 'hot' : val >= meta.warn ? 'warn' : '';
          return (
            <div className="metric" key={m}>
              <div className="metric-label">{meta.label}</div>
              <div className={`metric-value ${cls}`}>
                {m === 'pressure' ? val.toFixed(2) : val.toFixed(1)}
                <span className="metric-unit"> {meta.unit}</span>
              </div>
              <div className="metric-bar">
                <div
                  className="metric-bar-fill"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Compliance Gauge ─────────────────────────────────────────
function ComplianceGauge({ score }) {
  const R = 52;
  const circ = 2 * Math.PI * R;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? '#00ff88' : score >= 50 ? '#ffb800' : '#ff3d5a';
  const cls = score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low';

  return (
    <div className="compliance-section">
      <div className="gauge-wrapper">
        <div className="gauge-label">Compliance Score</div>
        <div className="gauge-ring-wrapper">
          <svg className="gauge-ring" viewBox="0 0 120 120" width="120" height="120">
            <circle className="gauge-ring-bg" cx="60" cy="60" r={R} />
            <circle
              className="gauge-ring-fill"
              cx="60" cy="60" r={R}
              strokeDasharray={circ}
              strokeDashoffset={offset}
              stroke={color}
              style={{ filter: `drop-shadow(0 0 6px ${color})` }}
            />
          </svg>
          <div className="gauge-center">
            <div className={`gauge-pct ${cls}`} style={{ color }}>
              {Math.round(score)}
            </div>
            <div className="gauge-unit">/ 100</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Alert Item ───────────────────────────────────────────────
function AlertItem({ alert }) {
  const [confirmed, setConfirmed] = useState(alert.confirmed);
  useEffect(() => {
    if (confirmed) return;
    const t = setTimeout(() => setConfirmed(true), 2500);
    return () => clearTimeout(t);
  }, [confirmed]);

  return (
    <div className={`alert-item ${alert.severity}`}>
      <div className="alert-header">
        <div className="alert-title">{alert.title}</div>
        <div className={`alert-severity ${alert.severity}`}>{alert.severity}</div>
      </div>
      <div className="alert-desc">{alert.description}</div>
      <div className="alert-action">⚡ {alert.action}</div>
      <div className="alert-tx">
        <span>TX:</span>
        <span className="tx-hash">{alert.txHash}</span>
        <span className={confirmed ? 'tx-confirmed' : 'tx-pending'}>
          {confirmed ? '✓ confirmed' : '⏳ pending'}
        </span>
      </div>
    </div>
  );
}

// ─── Blockchain Log ────────────────────────────────────────────
function BlockchainLog({ txLog }) {
  return (
    <div className="panel-content">
      {txLog.length === 0 && (
        <div className="no-alerts">
          <div className="icon">⛓️</div>
          Waiting for on-chain events…
        </div>
      )}
      {txLog.map(tx => (
        <TxItem key={tx.hash} tx={tx} />
      ))}
    </div>
  );
}

function TxItem({ tx }) {
  const [status, setStatus] = useState(tx.status);
  useEffect(() => {
    if (status === 'confirmed') return;
    const t = setTimeout(() => setStatus('confirmed'), 3500);
    return () => clearTimeout(t);
  }, [status]);

  const age = Math.round((Date.now() - tx.timestamp) / 1000);

  return (
    <div className="tx-item">
      <div className="tx-item-header">
        <span className={`tx-type ${tx.type}`}>{tx.type.replace('_', ' ')}</span>
        <span className={`tx-status ${status}`}>
          {status === 'confirmed' ? '✓ Confirmed' : '⏳ Pending'}
        </span>
      </div>
      <div className="tx-hash-row">{tx.hash}</div>
      <div className="tx-meta">
        <span>Gas: {tx.gasUsed.toLocaleString()}</span>
        <span>{age}s ago</span>
      </div>
    </div>
  );
}

// ─── Worker Report Modal ──────────────────────────────────────
function WorkerReportModal({ onClose, onSubmit }) {
  const [category, setCategory] = useState('');
  const [urgency, setUrgency]   = useState('medium');
  const [details, setDetails]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1800));
    onSubmit({ category, urgency, details });
    setSubmitted(true);
    setTimeout(onClose, 2500);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title">🔒 Anonymous Safety Report</div>
            <div className="modal-subtitle">Your identity is protected by zero-knowledge proof</div>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--green)', marginBottom: 8 }}>
              Report Submitted On-Chain
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              ZK proof generated. Your identity is fully protected.
            </div>
          </div>
        ) : (
          <form className="modal-form" onSubmit={handleSubmit}>
            <div className="zk-info">
              🔐 ZK-proof generated locally — only a cryptographic commitment is sent on-chain. No personal data is ever revealed.
            </div>

            <div className="form-group">
              <label className="form-label">Violation Category</label>
              <select
                className="form-select"
                value={category}
                onChange={e => setCategory(e.target.value)}
                required
              >
                <option value="">Select category…</option>
                <option value="equipment">Equipment Malfunction</option>
                <option value="chemical">Chemical Hazard</option>
                <option value="fire">Fire / Explosion Risk</option>
                <option value="ppe">PPE Violation</option>
                <option value="procedure">Unsafe Work Procedure</option>
                <option value="structural">Structural Issue</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Urgency Level</label>
              <select
                className="form-select"
                value={urgency}
                onChange={e => setUrgency(e.target.value)}
              >
                <option value="low">Low — Monitor only</option>
                <option value="medium">Medium — Needs attention</option>
                <option value="high">High — Immediate action required</option>
                <option value="critical">Critical — Emergency</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Additional Details (optional)</label>
              <textarea
                className="form-textarea"
                placeholder="Describe the issue without identifying yourself…"
                value={details}
                onChange={e => setDetails(e.target.value)}
              />
            </div>

            <button
              className="submit-btn"
              type="submit"
              disabled={!category || submitting}
            >
              {submitting ? '⏳ Generating ZK Proof & Submitting…' : '🔏 Submit Anonymously'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Live Chart ───────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(5,13,26,0.95)',
      border: '1px solid rgba(0,200,255,0.3)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 11,
      fontFamily: 'JetBrains Mono, monospace',
    }}>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </div>
      ))}
    </div>
  );
};

const CHART_COLORS = {
  'ZONE-A1': '#00c8ff',
  'ZONE-B2': '#9d5cff',
  'ZONE-C3': '#00ff88',
  'ZONE-D4': '#ffb800',
};

// ─── Main App ─────────────────────────────────────────────────
export default function App() {
  const [readings, setReadings]         = useState({});
  const [history, setHistory]           = useState({});
  const [alerts, setAlerts]             = useState([]);
  const [txLog, setTxLog]               = useState([]);
  const [compliance, setCompliance]     = useState(100);
  const [activeTab, setActiveTab]       = useState('alerts');
  const [chartMetric, setChartMetric]   = useState('temp');
  const [incidentActive, setIncidentActive] = useState(false);
  const [reportOpen, setReportOpen]     = useState(false);
  const [blockNum, setBlockNum]         = useState(getBlockNumber());
  const incidentZone = useRef(null);

  // Poll sensors
  useEffect(() => {
    const tick = () => {
      const newReadings = {};
      const allReadings = [];

      ZONES.forEach(z => {
        const r = generateReading(z.id);
        newReadings[z.id] = r;
        allReadings.push(r);

        // AI detection
        const newAlerts = analyzeReading(r);
        if (newAlerts.length > 0) {
          newAlerts.forEach(a => {
            const tx = logAlert(a);
            setTxLog(prev => [tx, ...prev].slice(0, 30));
            setAlerts(prev => [a, ...prev].slice(0, 20));
            // Periodically log compliance
            const compTx = logComplianceUpdate(compliance, z.id);
            setTxLog(prev => [compTx, ...prev].slice(0, 30));
          });
        }
      });

      // History for chart
      setHistory(prev => {
        const next = { ...prev };
        ZONES.forEach(z => {
          const arr = prev[z.id] || [];
          const r = newReadings[z.id];
          next[z.id] = [
            ...arr,
            {
              t: new Date().toLocaleTimeString('en-US', { hour12: false }),
              temp: r.temp,
              vibration: r.vibration,
              gas: r.gas,
              pressure: r.pressure,
            }
          ].slice(-MAX_HISTORY);
        });
        return next;
      });

      setReadings(newReadings);
      const score = calculateComplianceScore(allReadings);
      setCompliance(score);
      setBlockNum(getBlockNumber());
    };

    const id = setInterval(tick, POLL_MS);
    tick();
    return () => clearInterval(id);
  }, []);

  const handleTriggerIncident = () => {
    if (incidentActive) {
      resetDanger();
      resetAlertEngine();
      setIncidentActive(false);
      incidentZone.current = null;
    } else {
      const zone = ZONES[Math.floor(Math.random() * ZONES.length)];
      incidentZone.current = zone.id;
      triggerDanger(zone.id);
      setIncidentActive(true);
      // Auto-reset after 15s
      setTimeout(() => {
        setIncidentActive(false);
        incidentZone.current = null;
      }, 15000);
    }
  };

  const handleWorkerReport = (report) => {
    const tx = logWorkerReport(report);
    setTxLog(prev => [tx, ...prev].slice(0, 30));
  };

  // Build chart data — merge all zones into one timeline
  const chartData = (() => {
    const zone0 = history[ZONES[0]?.id] || [];
    return zone0.map((point, i) => {
      const merged = { t: point.t };
      ZONES.forEach(z => {
        const h = history[z.id] || [];
        if (h[i]) merged[z.id] = h[i][chartMetric];
      });
      return merged;
    });
  })();

  const dangerCount = Object.values(readings).filter(r => r?.status === 'danger').length;
  const warnCount   = Object.values(readings).filter(r => r?.status === 'warning').length;
  const totalAlerts = alerts.length;

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-logo">
          <div className="logo-icon">🏭</div>
          <div>
            <div className="logo-text">IndustrialMind</div>
            <div className="logo-sub">AI × Blockchain Safety Network</div>
          </div>
        </div>

        <div className="header-center">
          <div className="chain-badge">
            <div className="chain-dot" />
            {getChainName()}
          </div>
          <div className="block-counter">
            Block <span className="block-num">#{blockNum.toLocaleString()}</span>
          </div>
        </div>

        <div className="header-right">
          <button
            className={`report-btn`}
            onClick={() => setReportOpen(true)}
          >
            🔒 Report Incident
          </button>
          <button
            className={`incident-btn ${incidentActive ? 'active' : ''}`}
            onClick={handleTriggerIncident}
          >
            {incidentActive ? '⛔ Stop Incident' : '⚡ Trigger Incident'}
          </button>
        </div>
      </header>

      {/* ── Left: Sensor Cards ── */}
      <aside className="left-panel">
        <div className="panel-title">Zones — Live</div>
        {ZONES.map(z => (
          <SensorCard key={z.id} reading={readings[z.id]} />
        ))}
      </aside>

      {/* ── Main: Stats + Chart ── */}
      <main className="main-panel">
        {/* Stats Row */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-label">Compliance</div>
            <div className={`stat-value ${compliance >= 80 ? 'green' : compliance >= 50 ? 'amber' : 'red'}`}>
              {Math.round(compliance)}%
            </div>
            <div className="stat-trend">Overall safety score</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active Zones</div>
            <div className="stat-value cyan">{ZONES.length}</div>
            <div className="stat-trend">Online & monitored</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Warnings</div>
            <div className={`stat-value ${warnCount > 0 ? 'amber' : 'green'}`}>{warnCount}</div>
            <div className="stat-trend">Needs attention</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">AI Alerts</div>
            <div className={`stat-value ${dangerCount > 0 ? 'red' : 'green'}`}>{totalAlerts}</div>
            <div className="stat-trend">Auto-logged on-chain</div>
          </div>
        </div>

        {/* Live Chart */}
        <div className="chart-section" style={{ minHeight: 260 }}>
          <div className="chart-header">
            <div className="chart-title">📈 Real-Time Sensor Feed — All Zones</div>
            <div className="chart-tabs">
              {['temp', 'vibration', 'gas', 'pressure'].map(m => (
                <button
                  key={m}
                  className={`chart-tab ${chartMetric === m ? 'active' : ''}`}
                  onClick={() => setChartMetric(m)}
                >
                  {METRIC_META[m].label}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="t"
                tick={{ fill: 'rgba(150,180,220,0.4)', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: 'rgba(150,180,220,0.4)', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                width={36}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={METRIC_META[chartMetric].danger}
                stroke="rgba(255,61,90,0.5)"
                strokeDasharray="4 4"
                label={{ value: 'DANGER', fill: '#ff3d5a', fontSize: 9, fontFamily: 'JetBrains Mono' }}
              />
              <ReferenceLine
                y={METRIC_META[chartMetric].warn}
                stroke="rgba(255,184,0,0.4)"
                strokeDasharray="4 4"
                label={{ value: 'WARN', fill: '#ffb800', fontSize: 9, fontFamily: 'JetBrains Mono' }}
              />
              {ZONES.map(z => (
                <Line
                  key={z.id}
                  type="monotone"
                  dataKey={z.id}
                  name={z.name}
                  stroke={CHART_COLORS[z.id]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </main>

      {/* ── Right: Alerts / Blockchain ── */}
      <aside className="right-panel">
        <ComplianceGauge score={compliance} />

        <div className="panel-tabs">
          <button
            className={`panel-tab ${activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            AI Alerts
            {totalAlerts > 0 && <span className="badge">{Math.min(totalAlerts, 9)}</span>}
          </button>
          <button
            className={`panel-tab ${activeTab === 'chain' ? 'active' : ''}`}
            onClick={() => setActiveTab('chain')}
          >
            On-Chain
            {txLog.length > 0 && <span className="badge">{Math.min(txLog.length, 9)}</span>}
          </button>
        </div>

        {activeTab === 'alerts' && (
          <div className="panel-content">
            {alerts.length === 0 && (
              <div className="no-alerts">
                <div className="icon">🛡️</div>
                All clear — no anomalies detected.
                <br />
                <span style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
                  Try "⚡ Trigger Incident" to demo
                </span>
              </div>
            )}
            {alerts.map(a => <AlertItem key={a.id} alert={a} />)}
          </div>
        )}

        {activeTab === 'chain' && (
          <BlockchainLog txLog={txLog} />
        )}
      </aside>

      {/* ── Worker Report Modal ── */}
      {reportOpen && (
        <WorkerReportModal
          onClose={() => setReportOpen(false)}
          onSubmit={(r) => {
            handleWorkerReport(r);
            setTxLog(prev => prev);
          }}
        />
      )}
    </div>
  );
}
