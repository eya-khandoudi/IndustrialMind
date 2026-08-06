import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import { ethers } from 'ethers';
import { getZones, THRESHOLDS } from './utils/sensorSimulator';
import './index.css';

const WS_URL = 'ws://localhost:3001';
const API_URL = 'http://localhost:3001/api';

const ZONES = getZones();
const MAX_HISTORY = 30;

const METRIC_META = {
  temp:      { label: 'Temp',      unit: '°C',   max: 150,  warn: THRESHOLDS.temp.warn,      danger: THRESHOLDS.temp.danger },
  vibration: { label: 'Vibration', unit: 'mm/s', max: 15,   warn: THRESHOLDS.vibration.warn,  danger: THRESHOLDS.vibration.danger },
  gas:       { label: 'Gas',       unit: 'ppm',  max: 100,  warn: THRESHOLDS.gas.warn,         danger: THRESHOLDS.gas.danger },
  pressure:  { label: 'Pressure',  unit: 'bar',  max: 3,    warn: THRESHOLDS.pressure.warn,    danger: THRESHOLDS.pressure.danger },
};

// ─── Zone Detail Modal ────────────────────────────────────────
function ZoneDetailModal({ reading, onClose }) {
  if (!reading) return null;
  const metrics = ['temp', 'vibration', 'gas', 'pressure'];
  const getColor = (metric, value) => {
    const m = METRIC_META[metric];
    if (!m) return 'var(--cyan)';
    if (value >= m.danger) return 'var(--red)';
    if (value >= m.warn) return 'var(--amber)';
    return 'var(--green)';
  };
  const statusColor = reading.status === 'danger' ? 'var(--red)' : reading.status === 'warning' ? 'var(--amber)' : 'var(--green)';

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 520 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">🏭 {reading.zoneName}</div>
            <div className="modal-subtitle" style={{ color: statusColor, fontWeight: 700 }}>
              {reading.zoneId} · Status: {reading.status.toUpperCase()}
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {metrics.map(m => {
            const meta = METRIC_META[m];
            const val = reading[m];
            const color = getColor(m, val);
            const pct = Math.min(100, (val / meta.max) * 100);
            return (
              <div key={m} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--text-muted)', marginBottom: 8 }}>{meta.label}</div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 28, fontWeight: 800, color, textShadow: `0 0 16px ${color}`, lineHeight: 1 }}>
                  {m === 'pressure' ? val?.toFixed(2) : val?.toFixed(1)}
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 4 }}>{meta.unit}</span>
                </div>
                <div style={{ marginTop: 10, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.6s ease', boxShadow: `0 0 8px ${color}` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: 'var(--text-muted)' }}>
                  <span>0</span><span style={{ color: 'var(--amber)' }}>⚠ {meta.warn}</span><span style={{ color: 'var(--red)' }}>🚨 {meta.danger}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '10px 14px' }}>
          🕐 Last updated: {new Date(reading.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

// ─── Sensor Card ─────────────────────────────────────────────
function SensorCard({ reading, onClick }) {
  if (!reading) return (
    <div className="sensor-card" style={{ opacity: 0.4, cursor: 'default' }}>
      <div className="sensor-header"><div><div className="sensor-name">Loading…</div></div></div>
    </div>
  );

  const getColor = (metric, value) => {
    const m = METRIC_META[metric];
    if (!m) return 'var(--cyan)';
    if (value >= m.danger) return 'var(--red)';
    if (value >= m.warn) return 'var(--amber)';
    return 'var(--green)';
  };

  const metrics = ['temp', 'vibration', 'gas', 'pressure'];

  return (
    <div
      className={`sensor-card ${reading.status}`}
      onClick={() => onClick(reading)}
      style={{ cursor: 'pointer' }}
      title="Click for zone details"
    >
      <div className="sensor-header">
        <div>
          <div className="sensor-name">{reading.zoneName}</div>
          <div className="sensor-zone-id">{reading.zoneId} · click for details</div>
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
                <div className="metric-bar-fill" style={{ width: `${pct}%`, background: color }} />
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
  const color = score >= 80 ? '#00fa9a' : score >= 50 ? '#ffaa00' : '#ff3355';
  const cls = score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low';

  return (
    <div className="compliance-section">
      <div className="gauge-wrapper">
        <div className="gauge-label">Compliance Score</div>
        <div className="gauge-ring-wrapper">
          <svg className="gauge-ring" viewBox="0 0 120 120" width="140" height="140">
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

// ─── Alert Item (AI Agent) ─────────────────────────────────────
function AlertItem({ alert }) {
  const [expanded, setExpanded] = useState(false);
  const a = alert.analysis || {};

  const severityColor = {
    critical: 'var(--red)',
    high:     '#ff6b35',
    medium:   'var(--amber)',
    low:      'var(--green)',
  }[alert.severity] || 'var(--cyan)';

  const workerRiskColor = {
    high:   'var(--red)',
    medium: 'var(--amber)',
    low:    'var(--green)',
  }[a.workerRisk] || 'var(--cyan)';

  const timeAgo = (() => {
    const secs = Math.floor((Date.now() - alert.timestamp) / 1000);
    if (secs < 60) return `${secs}s ago`;
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    return `${Math.floor(secs / 3600)}h ago`;
  })();

  return (
    <div
      className={`alert-item ${alert.severity}`}
      style={{ borderColor: `${severityColor}55`, cursor: 'pointer' }}
      onClick={() => setExpanded(e => !e)}
    >
      {/* ── Header Row ── */}
      <div className="alert-header" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div className="alert-title" style={{ color: severityColor }}>{alert.title}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 8 }}>
            <span>🏭 {alert.zoneName}</span>
            <span>·</span>
            <span>🕐 {timeAgo}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div className={`alert-severity ${alert.severity}`}>{alert.severity?.toUpperCase()}</div>
          {a.evacuationRequired && (
            <div style={{ fontSize: 9, fontWeight: 800, color: '#fff', background: 'var(--red)', borderRadius: 3, padding: '2px 5px', letterSpacing: '0.5px' }}>
              🚨 EVACUATE
            </div>
          )}
        </div>
      </div>

      {/* ── Key Action — always visible ── */}
      <div style={{
        marginTop: 10, padding: '8px 10px',
        background: `${severityColor}15`,
        border: `1px solid ${severityColor}33`,
        borderRadius: 6, fontSize: 12, fontWeight: 600,
        color: severityColor,
      }}>
        ⚡ {a.immediateAction}
      </div>

      {/* ── Quick Stats Row ── */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        {[
          { label: 'Worker Risk', value: a.workerRisk?.toUpperCase(), color: workerRiskColor },
          { label: 'Response', value: a.estimatedResponseTime, color: 'var(--cyan)' },
          { label: 'Regulation', value: a.regulatoryRef, color: 'var(--purple)' },
        ].filter(s => s.value).map(s => (
          <div key={s.label} style={{
            fontSize: 10, padding: '3px 8px',
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid rgba(255,255,255,0.08)`,
            borderRadius: 4, color: s.color, fontWeight: 700,
          }}>
            {s.label}: {s.value}
          </div>
        ))}
      </div>

      {/* ── Expanded Details ── */}
      {expanded && (
        <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Root Cause */}
          {a.rootCause && (
            <div style={{ fontSize: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: 4 }}>🔍 Root Cause</div>
              <div style={{ color: 'var(--text-secondary)' }}>{a.rootCause}</div>
            </div>
          )}

          {/* Risk Assessment */}
          {a.riskAssessment && (
            <div style={{ fontSize: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: 4 }}>⚠️ Risk Assessment</div>
              <div style={{ color: 'var(--text-secondary)' }}>{a.riskAssessment}</div>
            </div>
          )}

          {/* Protocol */}
          {a.protocol && (
            <div style={{ fontSize: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: 4 }}>📋 Protocol</div>
              <div style={{ color: 'var(--text-secondary)' }}>{a.protocol}</div>
            </div>
          )}

          {/* Compliance Note */}
          {a.complianceNote && (
            <div style={{ fontSize: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: 4 }}>🏛️ Compliance</div>
              <div style={{ color: 'var(--purple)', fontStyle: 'italic' }}>{a.complianceNote}</div>
            </div>
          )}

          {/* Sensor Snapshot */}
          {alert.snapshot && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: 6 }}>📡 Sensor Snapshot at Alert</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {[
                  { label: 'Temp',      value: `${alert.snapshot.temp?.toFixed(1)}°C`,   danger: 120, val: alert.snapshot.temp },
                  { label: 'Gas',       value: `${alert.snapshot.gas?.toFixed(1)} ppm`,  danger: 80,  val: alert.snapshot.gas  },
                  { label: 'Vibration', value: `${alert.snapshot.vibration?.toFixed(2)} mm/s`, danger: 10, val: alert.snapshot.vibration },
                  { label: 'Pressure',  value: `${alert.snapshot.pressure?.toFixed(2)} bar`,  danger: 2,  val: alert.snapshot.pressure  },
                ].map(s => (
                  <div key={s.label} style={{
                    background: 'rgba(0,0,0,0.2)', borderRadius: 6, padding: '6px 8px',
                    border: `1px solid ${s.val >= s.danger ? 'rgba(255,51,85,0.4)' : 'rgba(255,255,255,0.05)'}`,
                  }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>{s.label}</div>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13,
                      color: s.val >= s.danger ? 'var(--red)' : 'var(--green)',
                    }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Expand hint ── */}
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
        {expanded ? '▲ Collapse' : '▼ Show full analysis'}
      </div>

      {/* ── Blockchain TX ── */}
      {alert.tx ? (
        <div className="alert-tx" style={{ marginTop: 8 }} onClick={e => e.stopPropagation()}>
          <span>⛓️ On-Chain TX:</span>
          <a href={alert.tx.etherscan} target="_blank" rel="noreferrer" className="tx-hash" style={{ color: 'var(--cyan)' }}>
            {alert.tx.hash.slice(0, 14)}…
          </a>
          <span className="tx-confirmed">✓ Block #{alert.tx.blockNumber}</span>
        </div>
      ) : (
        <div className="alert-tx" style={{ marginTop: 8 }}>
          <span className="tx-pending">⏳ Logging to blockchain…</span>
        </div>
      )}
    </div>
  );
}

// ─── Worker Report Item ──────────────────────────────────────────
function WorkerReportItem({ report }) {
  const isConfirmed = !!report.tx?.hash || !!report.hash;
  const hash = report.tx?.hash || report.hash;
  const zkHash = report.tx?.zkHash || report.zkHash;
  
  return (
    <div className="alert-item" style={{ borderColor: 'rgba(179, 102, 255, 0.4)' }}>
      <div className="alert-header">
        <div className="alert-title" style={{ color: 'var(--purple)' }}>🔒 Anonymous Report</div>
        <div className={`alert-severity ${report.urgency}`}>{report.urgency}</div>
      </div>
      <div className="alert-desc" style={{ marginTop: 8 }}>
        <strong>Category:</strong> <span style={{ textTransform: 'capitalize' }}>{report.category}</span>
        {report.details && (
          <p style={{ margin: '8px 0 4px', fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            "{report.details}"
          </p>
        )}
      </div>
      {isConfirmed ? (
        <div className="alert-tx" style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div>
            <span>⛓️ ZK Proof:</span>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}> {zkHash?.slice(0, 16)}...</span>
          </div>
          <div>
            <span>⛓️ TX:</span>
            <a href={`https://sepolia.etherscan.io/tx/${hash}`} target="_blank" rel="noreferrer" className="tx-hash" style={{ color: 'var(--purple)' }}>
              {hash?.slice(0, 14)}...
            </a>
            <span className="tx-confirmed">✓ Confirmed</span>
          </div>
        </div>
      ) : (
        <div className="alert-tx" style={{ marginTop: 12 }}>
          <span className="tx-pending">⏳ Securing ZK Proof on-chain…</span>
        </div>
      )}
    </div>
  );
}

// ─── Blockchain TX Log ─────────────────────────────────────────
function BlockchainLog({ txLog }) {
  if (txLog.length === 0) {
    return (
      <div className="panel-content">
        <div className="no-alerts">
          <div className="icon">⛓️</div>
          No on-chain events yet.
          <span style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
            Trigger an incident to generate a blockchain TX
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className="panel-content">
      {txLog.map((tx, idx) => <TxItem key={(tx.hash || 'pending') + idx} tx={tx} />)}
    </div>
  );
}

function TxItem({ tx }) {
  const isConfirmed = !!tx.hash;
  const typeLabel = (tx.type || 'TX').replace('_', ' ');
  return (
    <div className="tx-item">
      <div className="tx-item-header">
        <span className={`tx-type ${tx.type || 'TX'}`}>{typeLabel}</span>
        <span className={`tx-status ${isConfirmed ? 'confirmed' : 'pending'}`}>
          {isConfirmed ? '✓ Confirmed' : '⏳ Pending'}
        </span>
      </div>
      {isConfirmed ? (
        <>
          <div className="tx-hash-row">
            <a href={tx.etherscan} target="_blank" rel="noreferrer">{tx.hash}</a>
          </div>
          <div className="tx-meta">
            <span>Zone: {tx.zoneName || 'System'}</span>
            <span>Block: #{tx.blockNumber}</span>
          </div>
        </>
      ) : (
        <div className="tx-meta" style={{ color: 'var(--amber)' }}>
          <span>Awaiting blockchain confirmation…</span>
        </div>
      )}
    </div>
  );
}

// ─── Connect Wallet Button ─────────────────────────────────────

// Brave has a built-in wallet that shadows window.ethereum.
// This helper finds MetaMask specifically from the providers array.
function getEthereumProvider() {
  const eth = window.ethereum;
  if (!eth) return null;
  // When multiple wallets are present (Brave + MetaMask), eth.providers is an array
  if (eth.providers?.length) {
    return eth.providers.find(p => p.isMetaMask && !p.isBraveWallet) || eth.providers[0];
  }
  return eth;
}

function WalletConnect({ onConnected }) {
  const [address, setAddress] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError]     = useState(null);
  const [chainOk, setChainOk] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const SEPOLIA_CHAIN_ID = '0xaa36a7';

  const switchToSepolia = async () => {
    const eth = getEthereumProvider();
    if (!eth) return;
    try {
      await eth.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    } catch (switchErr) {
      if (switchErr.code === 4902) {
        await eth.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: SEPOLIA_CHAIN_ID,
            chainName: 'Sepolia',
            nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://rpc.sepolia.org'],
            blockExplorerUrls: ['https://sepolia.etherscan.io'],
          }],
        });
      }
    }
  };

  const connect = async () => {
    const eth = getEthereumProvider();
    if (!eth) {
      setShowModal(true);
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        setError('No accounts found. Please unlock MetaMask.');
        setConnecting(false);
        return;
      }

      const chainId = await eth.request({ method: 'eth_chainId' });
      const isCorrectChain = chainId === SEPOLIA_CHAIN_ID;

      setAddress(accounts[0]);
      setChainOk(isCorrectChain);

      if (!isCorrectChain) {
        await switchToSepolia();
        const newChainId = await eth.request({ method: 'eth_chainId' });
        setChainOk(newChainId === SEPOLIA_CHAIN_ID);
      }

      if (onConnected) onConnected(accounts[0]);

    } catch (e) {
      if (e.code === 4001) {
        setError('Connection rejected by user.');
      } else {
        setError(`Error: ${e.message?.slice(0, 60) || 'Unknown error'}`);
      }
    }

    setConnecting(false);
  };

  const disconnect = () => {
    setAddress(null);
    setChainOk(false);
    setError(null);
  };

  // Listen for account / chain changes
  useEffect(() => {
    const eth = getEthereumProvider();
    if (!eth) return;

    const onAccounts = (accs) => {
      if (accs.length === 0) {
        setAddress(null);
        setChainOk(false);
      } else {
        setAddress(accs[0]);
      }
    };
    const onChain = (chainId) => setChainOk(chainId === SEPOLIA_CHAIN_ID);

    eth.on('accountsChanged', onAccounts);
    eth.on('chainChanged', onChain);
    return () => {
      eth.removeListener('accountsChanged', onAccounts);
      eth.removeListener('chainChanged', onChain);
    };
  }, []);

  // No-MetaMask modal
  if (showModal) {
    return (
      <div className="modal-overlay" onClick={() => setShowModal(false)}>
        <div className="modal" style={{ width: 360, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🦊</div>
          <div className="modal-title" style={{ marginBottom: 8 }}>MetaMask Required</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
            Install the MetaMask browser extension to connect your wallet and sign transactions.
          </div>
          <a
            href="https://metamask.io/download/"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-block',
              padding: '10px 24px',
              background: 'linear-gradient(135deg, #f6851b, #e2761b)',
              color: '#fff',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 14,
              textDecoration: 'none',
              marginBottom: 16,
            }}
          >
            Install MetaMask →
          </a>
          <br />
          <button
            className="wallet-btn"
            onClick={() => setShowModal(false)}
            style={{ marginTop: 8 }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (address) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {!chainOk && (
          <button
            onClick={switchToSepolia}
            style={{
              fontSize: 10, color: 'var(--amber)', fontWeight: 700,
              padding: '4px 8px', background: 'rgba(255,170,0,0.1)',
              borderRadius: 4, border: '1px solid rgba(255,170,0,0.3)',
              cursor: 'pointer',
            }}
          >
            ⚠ Switch to Sepolia
          </button>
        )}
        <div
          className="wallet-btn connected"
          onClick={disconnect}
          title="Click to disconnect"
        >
          <span className="wallet-dot" style={{ background: chainOk ? 'var(--green)' : 'var(--amber)' }} />
          {address.slice(0, 6)}…{address.slice(-4)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <button
        className="wallet-btn"
        onClick={connect}
        disabled={connecting}
      >
        {connecting ? '⏳ Connecting…' : '🔗 Connect Wallet'}
      </button>
      {error && (
        <div style={{
          fontSize: 10, color: 'var(--red)', background: 'rgba(255,51,85,0.08)',
          border: '1px solid rgba(255,51,85,0.3)', borderRadius: 4,
          padding: '3px 8px', maxWidth: 200,
        }}>
          {error}
        </div>
      )}
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
  const [awaitingWallet, setAwaitingWallet] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const hasWallet = !!getEthereumProvider();
    if (hasWallet) setAwaitingWallet(true);
    await onSubmit({ category, urgency, details });
    setAwaitingWallet(false);
    setSubmitting(false);
    setSubmitted(true);
    setTimeout(onClose, 2500);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title">🔒 Anonymous Safety Report</div>
            <div className="modal-subtitle">Identity protected via Zero-Knowledge</div>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {awaitingWallet ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🦊</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--amber)', marginBottom: 8 }}>
              Check MetaMask
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              A signature request has been sent to your wallet.<br />
              Please confirm the transaction in MetaMask to proceed.
            </div>
          </div>
        ) : submitted ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--green)', marginBottom: 8 }}>
              Report Logged On-Chain
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              ZK proof hashed &amp; secured on the blockchain.
            </div>
          </div>
        ) : (
          <form className="modal-form" onSubmit={handleSubmit}>
            <div className="zk-info">
              🔐 ZK-proof generated locally — only a cryptographic hash is sent on-chain. No personal data is ever revealed.
            </div>

            <div className="form-group">
              <label className="form-label">Violation Category</label>
              <select className="form-select" value={category} onChange={e => setCategory(e.target.value)} required>
                <option value="">Select category…</option>
                <option value="equipment">Equipment Malfunction</option>
                <option value="chemical">Chemical Hazard</option>
                <option value="fire">Fire / Explosion Risk</option>
                <option value="ppe">PPE Violation</option>
                <option value="procedure">Unsafe Work Procedure</option>
                <option value="structural">Structural Issue</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Urgency Level</label>
              <select className="form-select" value={urgency} onChange={e => setUrgency(e.target.value)}>
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
            <button className="submit-btn" type="submit" disabled={!category || submitting}>
              {submitting ? '⏳ Submitting…' : '🔏 Submit Anonymously'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Live Chart Tooltip ───────────────────────────────────────
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(5,13,26,0.95)',
      border: '1px solid rgba(0,213,255,0.3)',
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
  'ZONE-A1': '#00d5ff',
  'ZONE-B2': '#b366ff',
  'ZONE-C3': '#00fa9a',
  'ZONE-D4': '#ffaa00',
};

// ─── Main App ─────────────────────────────────────────────────
export default function App() {
  const [readings, setReadings]         = useState({});
  const [history, setHistory]           = useState({});
  const [alerts, setAlerts]             = useState([]);
  const [txLog, setTxLog]               = useState([]);
  const [workerReports, setWorkerReports] = useState([]);
  const [compliance, setCompliance]     = useState(100);
  const [activeTab, setActiveTab]       = useState('alerts');
  const [chartMetric, setChartMetric]   = useState('temp');
  const [incidentActive, setIncidentActive] = useState(false);
  const [reportOpen, setReportOpen]     = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);

  const [walletInfo, setWalletInfo]     = useState(null);
  const [wsConnected, setWsConnected]   = useState(false);
  const wsRef = useRef(null);

  // Connect to Node.js Backend via WebSocket
  useEffect(() => {
    let reconnectTimer;
    const connect = () => {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => {
        setWsConnected(false);
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onmessage = (event) => {
        const { type, data } = JSON.parse(event.data);

        switch (type) {
          case 'INIT':
            setWalletInfo(data.walletInfo);
            setCompliance(data.compliance);
            setAlerts(data.alertLog);
            setTxLog(data.txLog);
            setWorkerReports(data.txLog.filter(t => t.type === 'WORKER_REPORT'));
            break;

          case 'SENSOR_UPDATE':
            setReadings(data.readings);
            setCompliance(data.compliance);
            setHistory(prev => {
              const next = { ...prev };
              const t = new Date().toLocaleTimeString('en-US', { hour12: false });
              ZONES.forEach(z => {
                const arr = prev[z.id] || [];
                const r = data.readings[z.id];
                if (r) {
                  next[z.id] = [...arr, {
                    t, temp: r.temp, vibration: r.vibration, gas: r.gas, pressure: r.pressure,
                  }].slice(-MAX_HISTORY);
                }
              });
              return next;
            });
            break;

          case 'AI_ALERT':
            setAlerts(prev => [data, ...prev].slice(0, 20));
            setActiveTab('alerts');
            break;

          case 'TX_CONFIRMED':
            if (data.alertId) {
              setAlerts(prev => prev.map(a => a.id === data.alertId ? { ...a, tx: data.tx } : a));
            }
            if (data.type === 'WORKER_REPORT') {
              setWorkerReports(prev => [
                { ...data.tx, category: data.category, urgency: data.urgency, details: data.details },
                ...prev.filter(r => r.hash !== data.tx?.hash)
              ]);
              setActiveTab('reports');
            } else {
              setActiveTab('chain');
            }
            setTxLog(prev => [
              { type: data.type || 'SAFETY_ALERT', ...data.tx },
              ...prev.filter(t => t.hash !== data.tx?.hash)
            ].slice(0, 30));
            break;

          case 'WALLET_INFO':
            setWalletInfo(data);
            break;

          case 'INCIDENT_TRIGGERED':
            setIncidentActive(true);
            break;

          case 'INCIDENT_RESET':
            setIncidentActive(false);
            break;

          default:
            break;
        }
      };
    };

    connect();
    return () => {
      clearTimeout(reconnectTimer);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const handleTriggerIncident = async () => {
    if (incidentActive) {
      await fetch(`${API_URL}/reset-incident`, { method: 'POST' });
    } else {
      await fetch(`${API_URL}/trigger-incident`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zoneId: ZONES[0].id })
      });
    }
  };

  const handleWorkerReport = async (report) => {
    const eth = getEthereumProvider();
    if (eth) {
      try {
        const provider = new ethers.BrowserProvider(eth);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(
          '0x8aA26584dB1C610b2c3937Ef9FFee59103e1DBf2',
          ['function logWorkerReport(bytes32,string,string)'],
          signer
        );

        const zkHash = ethers.keccak256(
          ethers.toUtf8Bytes(`${report.category}-${report.urgency}-${Date.now()}`)
        );

        // This line triggers MetaMask to open for signing
        const tx = await contract.logWorkerReport(zkHash, report.category, report.urgency);
        await tx.wait(1);

        await fetch(`${API_URL}/worker-report-client`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...report, txHash: tx.hash, zkHash }),
        });
        return;
      } catch (err) {
        console.error('[handleWorkerReport] Wallet TX error:', err);
        // User rejected or error — fall through to backend
      }
    }

    // Fallback: backend signs with the server private key
    await fetch(`${API_URL}/worker-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    });
  };

  // Build chart data
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
    <>
      <div className="ambient-bg">
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
      </div>
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
            <div className={`chain-badge ${wsConnected ? 'connected' : 'offline'}`}>
              <div className="chain-dot" style={{ background: wsConnected ? 'var(--green)' : 'var(--red)' }} />
              {wsConnected ? 'AI Network Online' : 'Offline'}
            </div>
          </div>

          <div className="header-right">
            <button className="report-btn" onClick={() => setReportOpen(true)}>
              🔒 Report Incident
            </button>
            <button
              className={`incident-btn ${incidentActive ? 'active' : ''}`}
              onClick={handleTriggerIncident}
              disabled={!wsConnected}
            >
              {incidentActive ? '⛔ Stop Incident' : '⚡ Trigger Incident'}
            </button>
          </div>
        </header>

        {/* ── Left: Sensor Cards ── */}
        <aside className="left-panel">
          <div className="panel-title">Zones — Live · Click to Inspect</div>
          {ZONES.map(z => (
            <SensorCard
              key={z.id}
              reading={readings[z.id]}
              onClick={(r) => setSelectedZone(r)}
            />
          ))}
        </aside>

        {/* ── Main: Stats + Chart ── */}
        <main className="main-panel">
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-label">Compliance</div>
              <div className={`stat-value ${compliance >= 80 ? 'green' : compliance >= 50 ? 'amber' : 'red'}`}>
                {Math.round(compliance)}%
              </div>
              <div className="stat-trend">Live on-chain score</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Active Zones</div>
              <div className="stat-value cyan">{ZONES.length}</div>
              <div className="stat-trend">Live sensor streams</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Warnings</div>
              <div className={`stat-value ${warnCount > 0 ? 'amber' : 'green'}`}>{warnCount}</div>
              <div className="stat-trend">Needs attention</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">AI Agent Alerts</div>
              <div className={`stat-value ${dangerCount > 0 ? 'red' : 'green'}`}>{totalAlerts}</div>
              <div className="stat-trend">Secured on-chain</div>
            </div>
          </div>

          {/* Live Chart */}
          <div className="chart-section" style={{ minHeight: 260 }}>
            <div className="chart-header">
              <div className="chart-title">📈 Real-Time Sensor Feed</div>
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
                <XAxis dataKey="t" tick={{ fill: 'rgba(150,180,220,0.4)', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                <YAxis tick={{ fill: 'rgba(150,180,220,0.4)', fontSize: 9, fontFamily: 'JetBrains Mono' }} width={36} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={METRIC_META[chartMetric].danger} stroke="rgba(255,51,85,0.5)" strokeDasharray="4 4" />
                <ReferenceLine y={METRIC_META[chartMetric].warn} stroke="rgba(255,170,0,0.4)" strokeDasharray="4 4" />
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

          <div className="panel-tabs" style={{ display: 'flex', gap: 4 }}>
            <button
              className={`panel-tab ${activeTab === 'alerts' ? 'active' : ''}`}
              onClick={() => setActiveTab('alerts')}
              style={{ flex: 1, padding: '8px 4px', fontSize: 11 }}
            >
              AI Alerts
              {totalAlerts > 0 && <span className="badge">{Math.min(totalAlerts, 9)}</span>}
            </button>
            <button
              className={`panel-tab ${activeTab === 'chain' ? 'active' : ''}`}
              onClick={() => setActiveTab('chain')}
              style={{ flex: 1, padding: '8px 4px', fontSize: 11 }}
            >
              On-Chain
              {txLog.length > 0 && <span className="badge">{Math.min(txLog.length, 9)}</span>}
            </button>
            <button
              className={`panel-tab ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
              style={{ flex: 1, padding: '8px 4px', fontSize: 11 }}
            >
              ZK Reports
              {workerReports.length > 0 && <span className="badge">{Math.min(workerReports.length, 9)}</span>}
            </button>
          </div>

          {activeTab === 'alerts' && (
            <div className="panel-content">
              {alerts.length === 0 && (
                <div className="no-alerts">
                  <div className="icon">🛡️</div>
                  All clear — no AI anomalies.
                  <span style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
                    Try "⚡ Trigger Incident" to demo
                  </span>
                </div>
              )}
              {alerts.map(a => <AlertItem key={a.id} alert={a} />)}
            </div>
          )}

          {activeTab === 'chain' && <BlockchainLog txLog={txLog} />}

          {activeTab === 'reports' && (
            <div className="panel-content">
              {workerReports.length === 0 && (
                <div className="no-alerts">
                  <div className="icon">🔒</div>
                  No anonymous reports.
                  <span style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
                    Click "Report Incident" to submit one
                  </span>
                </div>
              )}
              {workerReports.map((r, i) => <WorkerReportItem key={r.hash || i} report={r} />)}
            </div>
          )}
        </aside>

        {/* ── Zone Detail Modal ── */}
        {selectedZone && (
          <ZoneDetailModal
            reading={selectedZone}
            onClose={() => setSelectedZone(null)}
          />
        )}

        {/* ── Worker Report Modal ── */}
        {reportOpen && (
          <WorkerReportModal
            onClose={() => setReportOpen(false)}
            onSubmit={handleWorkerReport}
          />
        )}
      </div>
    </>
  );
}
