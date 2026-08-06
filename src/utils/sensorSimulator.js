// Sensor Simulator — generates realistic industrial IoT data
// Uses statistical noise + configurable danger spikes

const ZONES = [
  { id: 'ZONE-A1', name: 'Assembly Line 1', type: 'assembly' },
  { id: 'ZONE-B2', name: 'Boiler Room B', type: 'boiler' },
  { id: 'ZONE-C3', name: 'Chemical Storage C', type: 'chemical' },
  { id: 'ZONE-D4', name: 'Welding Bay D', type: 'welding' },
];

const BASELINES = {
  assembly:  { temp: 28,  vibration: 2.1, gas: 12,  pressure: 1.01 },
  boiler:    { temp: 85,  vibration: 3.5, gas: 22,  pressure: 1.45 },
  chemical:  { temp: 22,  vibration: 0.8, gas: 35,  pressure: 1.02 },
  welding:   { temp: 55,  vibration: 6.2, gas: 28,  pressure: 1.03 },
};

const THRESHOLDS = {
  temp:      { warn: 95,  danger: 120 },
  vibration: { warn: 7.5, danger: 10  },
  gas:       { warn: 60,  danger: 80  },
  pressure:  { warn: 1.7, danger: 2.0 },
};

// Danger spike values — guaranteed to breach DANGER threshold
const DANGER_SPIKES = {
  temp:      130, // well above 120°C
  vibration: 11.5, // well above 10 mm/s
  gas:       88,  // well above 80 ppm
  pressure:  2.3, // well above 2.0 bar
};

let dangerZoneId = null;
let dangerTimer = null;

function noise(value, spread) {
  return value + (Math.random() - 0.5) * spread * 2;
}

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

export function triggerDanger(zoneId) {
  dangerZoneId = zoneId;
  if (dangerTimer) clearTimeout(dangerTimer);
  dangerTimer = setTimeout(() => {
    dangerZoneId = null;
  }, 15000); // danger lasts 15s
}

export function resetDanger() {
  dangerZoneId = null;
  if (dangerTimer) clearTimeout(dangerTimer);
}

export function getZones() {
  return ZONES;
}

export function getThresholds() {
  return THRESHOLDS;
}

export function generateReading(zoneId) {
  const zone = ZONES.find(z => z.id === zoneId);
  const base = BASELINES[zone.type];
  const isDanger = dangerZoneId === zoneId;

  let reading;
  if (isDanger) {
    // Use guaranteed spike values with small noise — ALWAYS breach danger threshold
    reading = {
      zoneId,
      zoneName: zone.name,
      timestamp: Date.now(),
      temp:      clamp(noise(DANGER_SPIKES.temp, 4), 120, 200),
      vibration: clamp(noise(DANGER_SPIKES.vibration, 0.5), 10, 15),
      gas:       clamp(noise(DANGER_SPIKES.gas, 4), 80, 100),
      pressure:  clamp(noise(DANGER_SPIKES.pressure, 0.1), 2.0, 3.0),
      isDanger: true,
    };
  } else {
    reading = {
      zoneId,
      zoneName: zone.name,
      timestamp: Date.now(),
      temp:      clamp(noise(base.temp, 3), 15, 94),
      vibration: clamp(noise(base.vibration, 0.8), 0, 7.4),
      gas:       clamp(noise(base.gas, 5), 0, 59),
      pressure:  clamp(noise(base.pressure, 0.05), 0.9, 1.69),
      isDanger: false,
    };
  }

  reading.status = getSensorStatus(reading);
  return reading;
}

export function getSensorStatus(reading) {
  const checks = [
    reading.temp      >= THRESHOLDS.temp.danger,
    reading.vibration >= THRESHOLDS.vibration.danger,
    reading.gas       >= THRESHOLDS.gas.danger,
    reading.pressure  >= THRESHOLDS.pressure.danger,
  ];
  if (checks.some(Boolean)) return 'danger';

  const warns = [
    reading.temp      >= THRESHOLDS.temp.warn,
    reading.vibration >= THRESHOLDS.vibration.warn,
    reading.gas       >= THRESHOLDS.gas.warn,
    reading.pressure  >= THRESHOLDS.pressure.warn,
  ];
  if (warns.some(Boolean)) return 'warning';

  return 'normal';
}

export { THRESHOLDS, ZONES };
