// AI Anomaly Detection Engine
// Rule-based + trend analysis — no ML dependencies needed

const ANOMALY_RULES = [
  {
    id: 'TEMP_CRITICAL',
    metric: 'temp',
    threshold: 120,
    operator: '>=',
    severity: 'critical',
    title: 'Critical Temperature Detected',
    description: (v, z) => `Temperature in ${z} reached ${v.toFixed(1)}°C — risk of equipment fire.`,
    action: 'Auto-isolating zone. Triggering fire suppression protocol.',
  },
  {
    id: 'TEMP_HIGH',
    metric: 'temp',
    threshold: 95,
    operator: '>=',
    severity: 'high',
    title: 'High Temperature Warning',
    description: (v, z) => `Temperature in ${z} is ${v.toFixed(1)}°C — approaching critical threshold.`,
    action: 'Alerting floor supervisor. Recommend equipment inspection.',
  },
  {
    id: 'GAS_CRITICAL',
    metric: 'gas',
    threshold: 80,
    operator: '>=',
    severity: 'critical',
    title: 'Toxic Gas Level CRITICAL',
    description: (v, z) => `Gas concentration in ${z} is ${v.toFixed(1)} ppm — evacuation required.`,
    action: 'Emergency evacuation initiated. Ventilation system activated.',
  },
  {
    id: 'GAS_HIGH',
    metric: 'gas',
    threshold: 60,
    operator: '>=',
    severity: 'high',
    title: 'Elevated Gas Concentration',
    description: (v, z) => `Gas level in ${z} at ${v.toFixed(1)} ppm — approaching danger zone.`,
    action: 'Increasing ventilation. Notifying safety officer.',
  },
  {
    id: 'VIBRATION_CRITICAL',
    metric: 'vibration',
    threshold: 10,
    operator: '>=',
    severity: 'critical',
    title: 'Structural Vibration Overload',
    description: (v, z) => `Vibration in ${z} at ${v.toFixed(2)} mm/s — risk of structural failure.`,
    action: 'Shutting down machinery. Structural inspection required.',
  },
  {
    id: 'PRESSURE_CRITICAL',
    metric: 'pressure',
    threshold: 2.0,
    operator: '>=',
    severity: 'critical',
    title: 'Pressure Vessel Critical',
    description: (v, z) => `Pressure in ${z} at ${v.toFixed(2)} bar — explosion risk.`,
    action: 'Emergency pressure release triggered. Zone evacuated.',
  },
];

let alertHistory = [];
let triggeredRules = new Set();

function generateTxHash() {
  return '0x' + Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

export function analyzeReading(reading) {
  const newAlerts = [];

  for (const rule of ANOMALY_RULES) {
    const value = reading[rule.metric];
    const triggered = rule.operator === '>=' ? value >= rule.threshold : value <= rule.threshold;
    const ruleKey = `${reading.zoneId}-${rule.id}`;

    if (triggered && !triggeredRules.has(ruleKey)) {
      triggeredRules.add(ruleKey);
      
      const alert = {
        id: `ALERT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        ruleId: rule.id,
        severity: rule.severity,
        title: rule.title,
        description: rule.description(value, reading.zoneName),
        action: rule.action,
        zoneId: reading.zoneId,
        zoneName: reading.zoneName,
        metric: rule.metric,
        value,
        timestamp: Date.now(),
        txHash: generateTxHash(),
        blockNumber: 18000000 + Math.floor(Math.random() * 500000),
        confirmed: false,
      };

      // Simulate block confirmation after 2s
      setTimeout(() => {
        alert.confirmed = true;
      }, 2000);

      newAlerts.push(alert);
      alertHistory.unshift(alert);
      if (alertHistory.length > 50) alertHistory.pop();
    }

    // Clear rule when value recovers below threshold
    if (!triggered) {
      triggeredRules.delete(ruleKey);
    }
  }

  return newAlerts;
}

export function resetAlertEngine() {
  triggeredRules.clear();
}

export function getAlertHistory() {
  return alertHistory;
}

export function calculateComplianceScore(readings) {
  if (!readings || readings.length === 0) return 100;
  
  const dangerCount = readings.filter(r => r.status === 'danger').length;
  const warnCount   = readings.filter(r => r.status === 'warning').length;
  const total       = readings.length;

  const penalty = (dangerCount * 15 + warnCount * 5) / total;
  return Math.max(0, Math.min(100, 100 - penalty * 100));
}
