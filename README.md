# IndustrialMind 🏭

**AI-Powered Decentralized Industrial Safety & Compliance Network**

> 🏆 Built for **ChainHack** — Industrial 5.0 Track

![IndustrialMind Dashboard](https://img.shields.io/badge/Track-AI×Web3-00c8ff?style=for-the-badge)
![AI](https://img.shields.io/badge/AI-Groq%20LLaMA%203-ff5500?style=for-the-badge)
![Blockchain](https://img.shields.io/badge/Network-Sepolia_Testnet-9d5cff?style=for-the-badge)
![Frontend](https://img.shields.io/badge/Frontend-React_Vite-00ff88?style=for-the-badge)

---

## 🚀 The Problem
In modern industrial environments (Industrial 4.0), factories generate terabytes of sensor data, yet safety compliance remains reactive. Incidents are often logged *after* they occur, OSHA compliance is a manual paperwork nightmare, and workers are afraid of retaliation when reporting hazards.

## 💡 The Solution: Industrial 5.0
**IndustrialMind** bridges the gap between hardware sensors, Artificial Intelligence, and Blockchain to create a proactive, immutable safety net:

1. **Proactive AI Analysis:** Live sensor data (Temperature, Gas, Vibration, Pressure) is streamed to our AI Engine (**Groq LLaMA 3**) which analyzes anomalies in milliseconds, predicting root causes and determining OSHA regulatory compliance instantly.
2. **Immutable Compliance:** Every AI safety alert is automatically hashed and logged on the **Ethereum Sepolia** testnet. Factory management can no longer hide or delete safety violations. 
3. **ZK-Protected Worker Reports:** Factory workers can connect their MetaMask wallets to submit anonymous safety hazards. Using Zero-Knowledge principles, only the hashed incident data is committed on-chain, protecting the worker's identity while ensuring the report cannot be erased.

---

## ✨ Core Features

| Feature | Description |
|---|---|
| 🤖 **Groq LLaMA 3 Engine** | AI analyzes anomalies instantly, providing Root Cause, Evacuation Status, Worker Risk, and OSHA regulatory references. |
| ⛓️ **On-Chain Enforcement** | Automated smart contract transactions (`ethers.js`) lock AI incident reports permanently on Sepolia. |
| 🦊 **Web3 Wallet Integration** | Full MetaMask integration allows workers to sign and submit decentralized safety reports directly from the UI. |
| 📊 **Real-Time WebSockets** | React dashboard streams live multi-zone sensor charts without polling. |
| 🎯 **Live Compliance Scoring** | A dynamic ring gauge drops the facility's compliance score in real-time when hazards are detected. |

---

## 🛠️ Architecture

```text
[ IoT Sensors / Simulator ]
         │ (WebSockets)
         ▼
[ Node.js + Express Backend ] ───► [ Groq AI API (LLaMA 3) ]
         │                               │ (Instant Anomaly Analysis)
         │                               ▼
         │                        [ Smart Contract (Sepolia) ]
         │                               ▲
         ▼                               │ (Web3 Signature)
[ React + Vite Dashboard ] ──────────────┘
  (MetaMask Integration)
```

---

## 💻 Tech Stack

- **Frontend**: React, Vite, Recharts, Ethers.js v6
- **Backend**: Node.js, Express, WebSockets (ws)
- **AI / LLM**: Groq API (llama3-8b-8192) for sub-second inference
- **Blockchain**: Solidity Smart Contracts, deployed on Ethereum Sepolia
- **Styling**: Vanilla CSS with modern Glassmorphism aesthetics

---

## 📦 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- MetaMask Browser Extension
- API Keys: [Groq](https://console.groq.com/), Etherscan, and a Sepolia Wallet Private Key

### 2. Setup
```bash
# Clone the repo
git clone https://github.com/eya-khandoudi/IndustrialMind.git
cd IndustrialMind

# Install dependencies
npm install

# Setup Environment Variables
cp .env.example .env
# Edit .env and add your GROQ_API_KEY, PRIVATE_KEY, and ETHERSCAN_API_KEY
```

### 3. Run Locally
We need to run both the WebSocket backend and the Vite frontend:
```bash
# Terminal 1: Start the Backend
node server/index.js

# Terminal 2: Start the Frontend
npm run dev
```
Open **http://localhost:5173** in your browser.

---

## 🎬 Demo Guide (How to Wow the Judges)

1. **Dashboard Load**: Point out the live streaming charts updating via WebSockets. Show the 100% compliance score.
2. **AI Action**: Click **⚡ Trigger Incident**. Watch an anomaly spike on the chart.
3. **Sub-second AI**: See the AI alert instantly appear on the left. Expand it to show the judge the LLaMA 3 root cause analysis, worker risk, and OSHA regulatory citation.
4. **Blockchain Proof**: Show the pending blockchain transaction status turn into a confirmed Etherscan link. Click the link to prove it's live on Sepolia.
5. **Decentralized Reporting**: Click **🔗 Connect Wallet** (MetaMask opens). Then click **🔒 Report Incident**, fill out the anonymous form, and submit. MetaMask will ask you to sign the transaction, proving end-to-end Web3 capability.

---

## 🗺️ Roadmap

- [ ] Real IoT sensor integration via MQTT (Siemens/Allen-Bradley PLCs)
- [ ] ZK-SNARK circuit implementation (Noir/Circom) for mathematically proven anonymity
- [ ] Smart Contract Insurance Oracles (adjusting factory insurance premiums automatically based on on-chain compliance score)
- [ ] Mobile PWA for factory floor workers

---

## 👥 Team
Built with ❤️ for **ChainHack**.
