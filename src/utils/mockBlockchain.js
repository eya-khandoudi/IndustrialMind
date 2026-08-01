// Mock Blockchain — simulates on-chain transaction feed
// Produces realistic-looking TX hashes, block numbers, and gas fees

const CHAIN_NAME = 'IndustrialChain (Arbitrum L2)';
const BLOCK_TIME_MS = 4000; // ~4s per block like Arbitrum

let blockNumber = 18_234_567;
let txPool = [];
let blockLog = [];

function randomHex(len) {
  return Array.from({ length: len }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

function shortAddress(addr) {
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

// Simulate block production
setInterval(() => {
  blockNumber++;
  
  const pendingTxs = txPool.splice(0, Math.min(txPool.length, 5));
  if (pendingTxs.length > 0) {
    const block = {
      number: blockNumber,
      hash: '0x' + randomHex(64),
      transactions: pendingTxs.map(tx => tx.hash),
      timestamp: Date.now(),
    };
    blockLog.unshift(block);
    if (blockLog.length > 20) blockLog.pop();

    // Mark txs as confirmed
    pendingTxs.forEach(tx => {
      tx.status = 'confirmed';
      tx.blockNumber = blockNumber;
      tx.blockHash = block.hash;
    });
  }
}, BLOCK_TIME_MS);

export function submitTransaction(type, data) {
  const tx = {
    hash: '0x' + randomHex(64),
    from: '0x' + randomHex(40),
    to:   '0xIndustrialMind' + randomHex(36),
    type,
    data,
    gasUsed: Math.floor(21000 + Math.random() * 80000),
    gasPrice: (0.001 + Math.random() * 0.009).toFixed(6),
    value: '0',
    status: 'pending',
    timestamp: Date.now(),
    blockNumber: null,
    blockHash: null,
  };

  txPool.push(tx);
  return tx;
}

export function logAlert(alert) {
  return submitTransaction('SAFETY_ALERT', {
    alertId: alert.id,
    zoneId: alert.zoneId,
    severity: alert.severity,
    metric: alert.metric,
    value: alert.value,
    action: alert.action,
    ipfsHash: 'Qm' + randomHex(44), // mock IPFS hash for report
  });
}

export function logWorkerReport(report) {
  return submitTransaction('WORKER_REPORT', {
    zkProof: '0x' + randomHex(128), // simulated ZK proof
    reportHash: '0x' + randomHex(64),
    category: report.category,
    urgency: report.urgency,
    // identity hidden — ZK verified
  });
}

export function logComplianceUpdate(score, zoneId) {
  return submitTransaction('COMPLIANCE_UPDATE', {
    zoneId,
    score: score.toFixed(2),
    auditor: 'AI-Engine-v1.0',
    timestamp: Date.now(),
  });
}

export function getBlockNumber() {
  return blockNumber;
}

export function getChainName() {
  return CHAIN_NAME;
}

export function formatAddress(addr) {
  return shortAddress(addr);
}
