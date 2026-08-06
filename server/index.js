// IndustrialMind Backend — Express + WebSocket hub
// Bridges: Sensor simulation → Groq AI → Sepolia blockchain → React frontend
import 'dotenv/config';

import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { analyzeSensorAlert, generateOnChainSummary } from './aiAgent.js';
import * as blockchain from './blockchain.js';

// Re-use sensor + AI logic from frontend utils (adapted for Node.js)
import { generateReading, triggerDanger, resetDanger, getZones } from '../src/utils/sensorSimulator.js';

const PORT   = process.env.PORT || 3001;
const ZONES  = getZones();
const POLL_MS = 3000; // sensor poll interval

// ── Express + WebSocket server ────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const wss    = new WebSocketServer({ server });

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// ── State ──────────────────────────────────────────────────────────
let triggeredAlerts = new Set();  // prevent duplicate alerts
let txLog = [];
let alertLog = [];
let complianceScore = 100;
let walletInfo = null;
let blockchainReady = false;

// ── Broadcast to all WS clients ───────────────────────────────────
function broadcast(type, data) {
  const msg = JSON.stringify({ type, data, ts: Date.now() });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

// ── Anomaly detection rules (mirrors frontend) ───────────────────
const RULES = [
  { id: 'TEMP_CRITICAL',   metric: 'temp',      threshold: 120, severity: 'critical', title: 'Critical Temperature Detected' },
  { id: 'TEMP_HIGH',       metric: 'temp',      threshold: 95,  severity: 'high',     title: 'High Temperature Warning' },
  { id: 'GAS_CRITICAL',    metric: 'gas',       threshold: 80,  severity: 'critical', title: 'Toxic Gas Level CRITICAL' },
  { id: 'GAS_HIGH',        metric: 'gas',       threshold: 60,  severity: 'high',     title: 'Elevated Gas Concentration' },
  { id: 'VIBRATION_CRIT',  metric: 'vibration', threshold: 10,  severity: 'critical', title: 'Structural Vibration Overload' },
  { id: 'PRESSURE_CRIT',   metric: 'pressure',  threshold: 2.0, severity: 'critical', title: 'Pressure Vessel Critical' },
];

// ── Main sensor loop ──────────────────────────────────────────────
async function sensorLoop() {
  const allReadings = [];

  for (const zone of ZONES) {
    const reading = generateReading(zone.id);
    allReadings.push(reading);

    // Check each rule
    for (const rule of RULES) {
      const value   = reading[rule.metric];
      const triggered = value >= rule.threshold;
      const ruleKey   = `${zone.id}-${rule.id}`;

      if (triggered && !triggeredAlerts.has(ruleKey)) {
        triggeredAlerts.add(ruleKey);
        console.log(`\n🚨  ALERT: ${rule.title} in ${zone.name} (${rule.metric}: ${value.toFixed(2)})`);

        // 1️⃣  Call Groq AI (async — don't block loop)
        processAlert(reading, rule).catch(console.error);
      }

      if (!triggered) triggeredAlerts.delete(ruleKey);
    }
  }

  // Calculate compliance score (0-100)
  const dangerCount = allReadings.filter(r => r.status === 'danger').length;
  const warnCount   = allReadings.filter(r => r.status === 'warning').length;
  const totalZones  = allReadings.length;
  complianceScore   = Math.max(0, Math.min(100, 100 - (dangerCount * 20 + warnCount * 8) / totalZones * totalZones));

  // Broadcast live sensor readings
  broadcast('SENSOR_UPDATE', {
    readings: Object.fromEntries(allReadings.map(r => [r.zoneId, r])),
    compliance: complianceScore,
    blockNumber: walletInfo?.blockNumber || 0,
  });
}

async function processAlert(reading, rule) {
  try {
    // Step 1: Groq AI analysis
    console.log(`[Groq] 🤖  Analyzing ${rule.id}…`);
    const analysis = await analyzeSensorAlert(reading, rule.id, rule.title);
    const onChainSummary = await generateOnChainSummary(reading, rule.id, analysis);

    // Step 2: Build alert object
    const alert = {
      id:          `ALERT-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      ruleId:      rule.id,
      title:       rule.title,
      severity:    analysis.severity || rule.severity,
      zoneId:      reading.zoneId,
      zoneName:    reading.zoneName,
      metric:      rule.metric,
      value:       reading[rule.metric],
      analysis,
      snapshot: {
        temp:      reading.temp,
        gas:       reading.gas,
        vibration: reading.vibration,
        pressure:  reading.pressure,
      },
      timestamp:   Date.now(),
      tx:          null,
    };

    alertLog.unshift(alert);
    if (alertLog.length > 50) alertLog.pop();

    // Broadcast AI alert immediately (before blockchain — faster UX)
    broadcast('AI_ALERT', alert);

    // Step 3: Log on-chain (Sepolia)
    if (blockchainReady) {
      console.log(`[Blockchain] 📤  Sending alert TX…`);
      const txResult = await blockchain.logAlert({
        zoneId:      reading.zoneId,
        zoneName:    reading.zoneName,
        severity:    analysis.severity || rule.severity,
        metric:      rule.metric,
        metricValue: reading[rule.metric],
        aiAnalysis:  onChainSummary,
        actionTaken: analysis.immediateAction,
      });

      if (txResult && !txResult.error) {
        alert.tx = txResult;
        txLog.unshift({ type: 'SAFETY_ALERT', ...txResult, alertId: alert.id, zoneName: reading.zoneName });
        if (txLog.length > 30) txLog.pop();

        // Broadcast confirmed TX
        broadcast('TX_CONFIRMED', { alertId: alert.id, tx: txResult });

        // Also update compliance on-chain (throttled — every 5th alert)
        if (txLog.length % 5 === 0) {
          const compTx = await blockchain.updateCompliance({
            zoneId: reading.zoneId,
            score: complianceScore,
          });
          if (compTx && !compTx.error) {
            txLog.unshift({ type: 'COMPLIANCE_UPDATE', ...compTx, score: complianceScore });
            broadcast('TX_CONFIRMED', { type: 'compliance', tx: compTx });
          }
        }

        // Refresh wallet info (block number update)
        walletInfo = await blockchain.getWalletInfo();
        broadcast('WALLET_INFO', walletInfo);
      }
    }
  } catch (err) {
    console.error('[processAlert] Error:', err.message);
  }
}

// ── REST API endpoints ─────────────────────────────────────────────
app.get('/api/status', async (req, res) => {
  res.json({
    status: 'ok',
    blockchain: blockchainReady,
    walletInfo,
    alertCount: alertLog.length,
    txCount: txLog.length,
    compliance: complianceScore,
  });
});

app.post('/api/trigger-incident', (req, res) => {
  const { zoneId } = req.body;
  const zone = ZONES.find(z => z.id === zoneId) || ZONES[Math.floor(Math.random() * ZONES.length)];
  
  // Clear triggered alerts so the zone can re-fire immediately
  triggeredAlerts.clear();
  
  triggerDanger(zone.id);
  console.log(`\n⚡  Incident triggered in ${zone.name}`);
  broadcast('INCIDENT_TRIGGERED', { zoneId: zone.id, zoneName: zone.name });
  res.json({ ok: true, zone });
});


app.post('/api/reset-incident', (req, res) => {
  resetDanger();
  triggeredAlerts.clear();
  broadcast('INCIDENT_RESET', {});
  res.json({ ok: true });
});

app.post('/api/worker-report', async (req, res) => {
  const { category, urgency, details } = req.body;
  console.log(`\n🔒  Worker report received: ${category} / ${urgency}`);

  let txResult = null;
  if (blockchainReady) {
    txResult = await blockchain.logWorkerReport({ category, urgency });
    if (txResult && !txResult.error) {
      txLog.unshift({ type: 'WORKER_REPORT', ...txResult, category, urgency, details });
      broadcast('TX_CONFIRMED', { type: 'WORKER_REPORT', tx: txResult, category, urgency, details });
    }
  }

  res.json({ ok: true, tx: txResult });
});

app.post('/api/worker-report-client', (req, res) => {
  const { category, urgency, details, txHash, zkHash } = req.body;
  const txResult = { hash: txHash, zkHash, status: 'confirmed', etherscan: `https://sepolia.etherscan.io/tx/${txHash}` };
  
  txLog.unshift({ type: 'WORKER_REPORT', ...txResult, category, urgency, details });
  broadcast('TX_CONFIRMED', { type: 'WORKER_REPORT', tx: txResult, category, urgency, details });
  
  res.json({ ok: true });
});

app.get('/api/tx-log',    (req, res) => res.json(txLog));
app.get('/api/alert-log', (req, res) => res.json(alertLog));

// ── WebSocket connection ──────────────────────────────────────────
wss.on('connection', (ws) => {
  console.log('[WS] Client connected');

  // Send current state on connect
  ws.send(JSON.stringify({ type: 'INIT', data: {
    walletInfo,
    blockchainReady,
    compliance: complianceScore,
    txLog: txLog.slice(0, 10),
    alertLog: alertLog.slice(0, 10),
  }}));

  ws.on('close', () => console.log('[WS] Client disconnected'));
});

// ── Start ─────────────────────────────────────────────────────────
async function start() {
  console.log('\n🏭  IndustrialMind Backend Starting…');

  // Initialize blockchain
  blockchainReady = blockchain.init();
  if (blockchainReady) {
    walletInfo = await blockchain.getWalletInfo();
    console.log(`[Blockchain] 💰  Balance: ${walletInfo?.balanceEth} ETH`);
  }

  // Start sensor polling
  const loop = () => {
    sensorLoop().catch(console.error);
    setTimeout(loop, POLL_MS);
  };
  setTimeout(loop, 1000); // first tick after 1s

  // Start HTTP server
  server.listen(PORT, () => {
    console.log(`\n✅  Server running on http://localhost:${PORT}`);
    console.log(`📡  WebSocket on ws://localhost:${PORT}`);
    if (blockchainReady) {
      console.log(`⛓️   Blockchain: Sepolia (${process.env.CONTRACT_ADDRESS})`);
    } else {
      console.log(`⚠️   Blockchain: DISABLED (deploy contract first)`);
    }
    console.log('\n🚀  Ready. Open http://localhost:5173 in your browser.\n');
  });
}

start().catch(console.error);
