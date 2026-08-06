// IndustrialMind — Deploy Script
// Compiles IndustrialMind.sol with solc and deploys to Sepolia
// Run: node server/deploy.js

import 'dotenv/config';
import solc from 'solc';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ethers } from 'ethers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error('❌  PRIVATE_KEY not set in .env');
  process.exit(1);
}

// ── 1. Read contract source ───────────────────────────────────────
const contractPath = path.join(__dirname, '..', 'contracts', 'IndustrialMind.sol');
const source = fs.readFileSync(contractPath, 'utf8');

console.log('🔧  Compiling IndustrialMind.sol…');

// ── 2. Compile with solc ──────────────────────────────────────────
const input = {
  language: 'Solidity',
  sources: { 'IndustrialMind.sol': { content: source } },
  settings: {
    viaIR: true,
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  const errors = output.errors.filter(e => e.severity === 'error');
  if (errors.length) {
    console.error('❌  Compilation errors:');
    errors.forEach(e => console.error(e.formattedMessage));
    process.exit(1);
  }
  // warnings are ok
  output.errors.filter(e => e.severity === 'warning').forEach(w =>
    console.warn('⚠️  ', w.message)
  );
}

const contract  = output.contracts['IndustrialMind.sol']['IndustrialMind'];
const abi       = contract.abi;
const bytecode  = '0x' + contract.evm.bytecode.object;

console.log('✅  Compiled successfully');

// Save ABI for backend use
const artifactDir = path.join(__dirname, '..', 'contracts', 'compiled');
fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(
  path.join(artifactDir, 'IndustrialMind.json'),
  JSON.stringify({ abi, bytecode }, null, 2)
);
console.log('💾  ABI saved to contracts/compiled/IndustrialMind.json');

// ── 3. Deploy ─────────────────────────────────────────────────────
async function deploy() {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);

  const balance = await provider.getBalance(wallet.address);
  console.log(`\n🔑  Deployer: ${wallet.address}`);
  console.log(`💰  Balance:  ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    console.error('❌  Wallet has 0 ETH on Sepolia. Get testnet ETH from https://sepoliafaucet.com');
    process.exit(1);
  }

  console.log('\n🚀  Deploying to Sepolia…');
  const factory  = new ethers.ContractFactory(abi, bytecode, wallet);
  const deployed = await factory.deploy();

  console.log(`⏳  TX sent: ${deployed.deploymentTransaction().hash}`);
  console.log('   Waiting for confirmation…');

  await deployed.waitForDeployment();
  const address = await deployed.getAddress();

  console.log(`\n✅  Contract deployed!`);
  console.log(`📋  Address:    ${address}`);
  console.log(`🔍  Etherscan:  https://sepolia.etherscan.io/address/${address}`);
  console.log(`\n👉  Add this to your .env:\n    CONTRACT_ADDRESS=${address}\n`);

  // Auto-update .env
  const envPath = path.join(__dirname, '..', '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  envContent = envContent.replace(/CONTRACT_ADDRESS=.*/,'CONTRACT_ADDRESS=' + address);
  fs.writeFileSync(envPath, envContent);
  console.log('✅  .env updated automatically with CONTRACT_ADDRESS');
}

deploy().catch(err => {
  console.error('❌  Deploy failed:', err.message);
  process.exit(1);
});
