# IndustrialMind 🏭

**AI-Powered Decentralized Industrial Safety & Compliance Network**

> Built for [ChainHack 2026](https://www.hackquest.io/hackathons/ChainHack) — Industrial 5.0 Track

![IndustrialMind Dashboard](https://img.shields.io/badge/Track-AI×Web3-00c8ff?style=for-the-badge)
![Blockchain](https://img.shields.io/badge/Chain-Arbitrum_L2-9d5cff?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Live_Demo-00ff88?style=for-the-badge)

---

## 🚀 Overview

IndustrialMind is a real-time industrial safety platform that combines **AI anomaly detection** with **on-chain compliance logging** to protect workers and automate regulatory enforcement in Industrial 5.0 environments.

Every anomaly detected by the AI engine is **automatically logged on-chain** as an immutable, auditable safety record. Workers can file anonymous reports protected by **zero-knowledge proofs**.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 **AI Anomaly Detection** | Rule-based engine monitors temperature, vibration, gas & pressure across all zones |
| ⛓️ **On-Chain Logging** | Every safety alert auto-generates a blockchain transaction (Arbitrum L2) |
| 📊 **Live Sensor Dashboard** | Real-time line charts for all 4 industrial zones simultaneously |
| 🔒 **ZK Worker Reports** | Anonymous incident reporting — identity protected by zero-knowledge proof |
| 🎯 **Compliance Score** | Live compliance ring gauge that drops when hazards are detected |
| ⚡ **Incident Simulator** | One-click incident trigger for dramatic demos |

---

## 🛠️ Tech Stack

- **Frontend**: React + Vite
- **Charts**: Recharts (real-time sensor visualization)
- **Sensor Simulation**: Statistical noise generator with spike injection (mirrors NASA turbofan dataset patterns)
- **AI Engine**: Rule-based anomaly detection with multi-metric threshold analysis
- **Blockchain**: Mock Arbitrum L2 with realistic TX hashes, block production, gas estimation
- **ZK Reports**: Simulated ZK-proof generation for anonymous worker safety reports

---

## 📦 Getting Started

```bash
# Clone the repo
git clone https://github.com/eya-khandoudi/IndustrialMind.git
cd IndustrialMind

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open **http://localhost:5173**

---

## 🎬 Demo Guide

1. **Dashboard loads** — all 4 zones are green, compliance at ~94%
2. Click **⚡ Trigger Incident** — a zone goes into danger mode
3. Watch the **AI Alerts panel** fire within 2 seconds
4. See the **blockchain TX** appear in the On-Chain tab
5. Watch the **Compliance Score** ring drop live
6. Click **🔒 Report Incident** — submit an anonymous ZK-proof report
7. The report appears as a TX in the blockchain log

---

## 🏗️ Architecture

```
[Sensor Simulator (JS)]
        ↓  every 2s
[AI Anomaly Engine]
        ↓  if threshold exceeded
[Alert Generated + TX Hash]
        ↓
[Mock Arbitrum L2 Block]
        ↓
[React Dashboard — live update]
```

---

## 🗺️ Roadmap (Post-Hackathon)

- [ ] Real IoT sensor integration via MQTT
- [ ] Deploy smart contracts on Arbitrum Mainnet
- [ ] Actual ZK circuit implementation (Noir/Circom)
- [ ] Mobile app for factory floor workers
- [ ] Insurance premium API integration (tokenized compliance scores)
- [ ] Multi-tenant SaaS for enterprise factories

---

## 👥 Team

Built at **ChainHack 2026** — Industrial 5.0 Hackathon

---

## 📄 License

MIT
