// Groq AI Agent — analyzes sensor readings using LLaMA 3 via Groq API
import 'dotenv/config';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Analyze a sensor anomaly and return structured AI assessment
 * @param {object} reading  - sensor reading object
 * @param {string} alertType - e.g. "TEMP_CRITICAL", "GAS_HIGH"
 * @param {string} ruleTitle - human-readable rule name
 * @returns {object} { severity, immediateAction, riskAssessment, protocol, raw }
 */
export async function analyzeSensorAlert(reading, alertType, ruleTitle) {
  const prompt = `You are an expert industrial safety AI agent monitoring a smart factory in real time.

SENSOR ALERT:
- Zone: ${reading.zoneName} (${reading.zoneId})
- Alert Type: ${ruleTitle}
- Temperature: ${reading.temp.toFixed(1)}°C  (danger: >120°C)
- Gas Level:   ${reading.gas.toFixed(1)} ppm  (danger: >80 ppm)
- Vibration:   ${reading.vibration.toFixed(2)} mm/s (danger: >10 mm/s)
- Pressure:    ${reading.pressure.toFixed(2)} bar  (danger: >2.0 bar)

Respond ONLY with valid JSON:
{
  "severity": "critical|high|medium|low",
  "rootCause": "one sentence — most likely cause of this anomaly",
  "immediateAction": "one sentence — what operator must do RIGHT NOW",
  "riskAssessment": "two sentences — consequences if unaddressed",
  "workerRisk": "high|medium|low",
  "evacuationRequired": true|false,
  "estimatedResponseTime": "e.g. Immediate / Within 5 min / Within 30 min",
  "protocol": "one sentence — standard safety protocol name and action",
  "complianceNote": "one sentence — OSHA/regulatory reference",
  "regulatoryRef": "e.g. OSHA 1910.119 / ISO 13849"
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 300,
    });

    const raw = completion.choices[0].message.content.trim();

    // Parse JSON — handle possible markdown wrapping
    const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed  = JSON.parse(jsonStr);

    return {
      severity:              parsed.severity              || 'high',
      rootCause:             parsed.rootCause             || 'Sensor anomaly detected.',
      immediateAction:       parsed.immediateAction       || 'Evacuate zone and notify supervisor.',
      riskAssessment:        parsed.riskAssessment        || 'Risk assessment unavailable.',
      workerRisk:            parsed.workerRisk            || 'high',
      evacuationRequired:    parsed.evacuationRequired    ?? false,
      estimatedResponseTime: parsed.estimatedResponseTime || 'Immediate',
      protocol:              parsed.protocol              || 'Follow standard emergency protocol.',
      complianceNote:        parsed.complianceNote        || '',
      regulatoryRef:         parsed.regulatoryRef         || '',
      raw,
      model: 'llama3-8b-8192',
      latencyMs: completion.usage?.total_tokens || 0,
    };
  } catch (err) {
    console.error('[Groq] Analysis failed:', err.message);
    // Fallback — don't crash if Groq is unavailable
    return {
      severity:              'high',
      rootCause:             `${ruleTitle} anomaly detected.`,
      immediateAction:       `Anomaly detected in ${reading.zoneName}. Notify floor supervisor immediately.`,
      riskAssessment:        `${ruleTitle} in ${reading.zoneName} poses immediate risk to worker safety.`,
      workerRisk:            'high',
      evacuationRequired:    false,
      estimatedResponseTime: 'Immediate',
      protocol:              'Activate emergency protocol and isolate affected zone.',
      complianceNote:        'Incident must be logged per OSHA 300 requirements.',
      regulatoryRef:         'OSHA 1910.119',
      raw:                   null,
      model:                 'fallback',
      error:                 err.message,
    };
  }
}

/**
 * Generate a short AI summary for the blockchain calldata
 * (shorter than full analysis — fits in TX calldata)
 */
export async function generateOnChainSummary(reading, alertType, analysis) {
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      messages: [{
        role: 'user',
        content: `Summarize this industrial safety alert in exactly one sentence (max 200 chars):
Zone: ${reading.zoneName}, Alert: ${alertType}, Action: ${analysis.immediateAction}`
      }],
      temperature: 0.1,
      max_tokens: 80,
    });
    return completion.choices[0].message.content.trim().slice(0, 200);
  } catch {
    return `${alertType} in ${reading.zoneName}. ${analysis.immediateAction}`.slice(0, 200);
  }
}

