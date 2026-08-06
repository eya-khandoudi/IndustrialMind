// Blockchain service — ethers.js v6 + Sepolia Testnet
import 'dotenv/config';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RPC_URL    = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

let provider, wallet, contract, abi;

function loadABI() {
  const abiPath = path.join(__dirname, '..', 'contracts', 'compiled', 'IndustrialMind.json');
  if (!fs.existsSync(abiPath)) {
    console.warn('[Blockchain] ABI not found — run: node server/deploy.js first');
    return null;
  }
  const artifact = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
  return artifact.abi;
}

export function init() {
  if (!PRIVATE_KEY) { console.error('[Blockchain] PRIVATE_KEY not set'); return false; }
  if (!CONTRACT_ADDRESS) { console.warn('[Blockchain] CONTRACT_ADDRESS not set — txs disabled'); return false; }

  abi = loadABI();
  if (!abi) return false;

  provider = new ethers.JsonRpcProvider(RPC_URL);
  wallet   = new ethers.Wallet(PRIVATE_KEY, provider);
  contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

  console.log(`[Blockchain] ✅  Connected to Sepolia`);
  console.log(`[Blockchain] 📋  Contract: ${CONTRACT_ADDRESS}`);
  console.log(`[Blockchain] 🔑  Wallet:   ${wallet.address}`);
  return true;
}

/**
 * Log a safety alert on-chain
 */
export async function logAlert({ zoneId, zoneName, severity, metric, metricValue, aiAnalysis, actionTaken }) {
  if (!contract) return null;
  try {
    const tx = await contract.logAlert(
      zoneId,
      zoneName,
      severity,
      metric,
      Math.round(metricValue * 100), // scale x100
      aiAnalysis.slice(0, 500),      // cap calldata size
      actionTaken.slice(0, 200)
    );
    console.log(`[Blockchain] 🔗  Alert TX sent: ${tx.hash}`);
    const receipt = await tx.wait(1); // wait 1 confirmation
    console.log(`[Blockchain] ✅  Alert confirmed in block #${receipt.blockNumber}`);
    return {
      hash:        tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed:     receipt.gasUsed.toString(),
      etherscan:   `https://sepolia.etherscan.io/tx/${tx.hash}`,
      status:      'confirmed',
    };
  } catch (err) {
    console.error('[Blockchain] ❌  logAlert failed:', err.message);
    return { error: err.message, status: 'failed' };
  }
}

/**
 * Log an anonymous worker report on-chain
 */
export async function logWorkerReport({ category, urgency }) {
  if (!contract) return null;
  try {
    // Simulate ZK proof hash
    const zkHash = ethers.keccak256(
      ethers.toUtf8Bytes(`${category}-${urgency}-${Date.now()}`)
    );
    const tx = await contract.logWorkerReport(zkHash, category, urgency);
    console.log(`[Blockchain] 🔒  Worker report TX sent: ${tx.hash}`);
    const receipt = await tx.wait(1);
    return {
      hash:        tx.hash,
      zkHash,
      blockNumber: receipt.blockNumber,
      etherscan:   `https://sepolia.etherscan.io/tx/${tx.hash}`,
      status:      'confirmed',
    };
  } catch (err) {
    console.error('[Blockchain] ❌  logWorkerReport failed:', err.message);
    return { error: err.message, status: 'failed' };
  }
}

/**
 * Update compliance score on-chain
 */
export async function updateCompliance({ zoneId, score }) {
  if (!contract) return null;
  try {
    const tx = await contract.updateCompliance(zoneId, Math.round(score * 100));
    const receipt = await tx.wait(1);
    console.log(`[Blockchain] 📊  Compliance updated in block #${receipt.blockNumber}`);
    return {
      hash:        tx.hash,
      blockNumber: receipt.blockNumber,
      etherscan:   `https://sepolia.etherscan.io/tx/${tx.hash}`,
      status:      'confirmed',
    };
  } catch (err) {
    console.error('[Blockchain] ❌  updateCompliance failed:', err.message);
    return { error: err.message, status: 'failed' };
  }
}

export async function getWalletInfo() {
  if (!provider || !wallet) return null;
  try {
    const balance = await provider.getBalance(wallet.address);
    const block   = await provider.getBlockNumber();
    return {
      address:     wallet.address,
      balanceEth:  parseFloat(ethers.formatEther(balance)).toFixed(4),
      blockNumber: block,
      network:     'Sepolia Testnet',
      contractAddress: CONTRACT_ADDRESS,
      etherscanContract: `https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`,
    };
  } catch { return null; }
}

