# IndustrialMind 🏭

**AI-Powered Decentralized Industrial Safety & Compliance Network**

> Built for [ChainHack 2026](https://www.hackquest.io/hackathons/ChainHack) — Industrial 5.0 Track

![IndustrialMind Dashboard](https://img.shields.io/badge/Track-AI×Web3-00c8ff?style=for-the-badge)
![Blockchain](https://img.shields.io/badge/Chain-Ethereum_Sepolia-9d5cff?style=for-the-badge)
![AI](https://img.shields.io/badge/AI-Groq_LLaMA_3-fa5a28?style=for-the-badge)

---

## 🚀 Overview

**IndustrialMind** is a real-time industrial safety platform that combines **Groq AI (LLaMA 3)** anomaly analysis with **Ethereum Sepolia on-chain compliance logging** to protect workers and automate regulatory enforcement in Industrial 5.0 environments.

Every anomaly detected by the AI engine is analyzed in milliseconds and **automatically logged on-chain** via `ethers.js` as an immutable, auditable safety record. Workers can also connect their MetaMask wallets to file anonymous hazard reports directly to the blockchain, using a simulated zero-knowledge proof architecture.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 **Groq AI Analysis (LLaMA 3)** | Real-time AI evaluation of temperature, vibration, gas & pressure spikes. Automatically determines severity, required protocol, worker risk, and evacuation needs. |
| ⛓️ **Live On-Chain Logging** | Backend automatically signs and sends transactions to the Ethereum Sepolia testnet whenever AI flags a hazard. |
| 🦊 **MetaMask Integration** | Users can connect their Web3 wallets natively to sign transactions from the dashboard. |
| 📊 **Real-Time WebSocket Dashboard** | Live data streaming for all 4 industrial zones simultaneously. |
| 🔒 **ZK Worker Reports** | Anonymous incident reporting — workers sign transactions directly via MetaMask with simulated ZK-proofs for privacy. |
| ⚡ **Incident Simulator** | One-click incident trigger for dramatic live demos of the AI-to-Blockchain pipeline. |

---

## 🛠️ Tech Stack

- **Frontend**: React + Vite (Glassmorphism design)
- **Backend**: Node.js + Express + WebSockets
- **Smart Contracts**: Solidity (Deployed on Ethereum Sepolia Testnet)
- **Web3 Integration**: `ethers.js` (v6) + MetaMask `window.ethereum`
- **AI Inference**: Groq API (`llama3-8b-8192`)
- **Charts**: Recharts (real-time sensor visualization)

---

## 📦 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/eya-khandoudi/IndustrialMind.git
cd IndustrialMind
npm install
```

### 2. Environment Variables
Create a `.env` file in the root directory:
```env
GROQ_API_KEY=your_groq_api_key
PRIVATE_KEY=your_sepolia_wallet_private_key
ETHERSCAN_API_KEY=your_etherscan_key
```

### 3. Run the Platform
You need two terminal windows:
```bash
# Terminal 1: Start Backend (WebSockets + Blockchain + AI)
node server/index.js

# Terminal 2: Start Frontend
npm run dev
```
Open **http://localhost:5173** in your browser.

---

## 🏗️ Architecture

```
[IoT Sensor Simulator]
        ↓  (WebSockets)
[Node.js Backend]  <----->  [Groq API (LLaMA 3)]
        ↓  (ethers.js)
[Ethereum Sepolia Testnet]
        ↓  (WS Broadcast)
[React Frontend + MetaMask]
```

---

## 🗺️ Roadmap (Post-Hackathon)

- [ ] Real IoT sensor integration via MQTT
- [ ] Deploy smart contracts on Arbitrum Mainnet / Base
- [ ] Actual ZK circuit implementation (Noir/Circom) for on-chain verification
- [ ] Mobile app for factory floor workers

---

## 📄 License
MIT
