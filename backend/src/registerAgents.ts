/**
 * Register Agents — registers all 5 AI-Net agents on the AgentRegistry contract.
 *
 * Each agent gets a unique wallet derived from a mnemonic (HD path m/44'/60'/0'/0/{i}).
 * The coordinator funds each wallet with gas, then each wallet registers itself.
 *
 * This must be run once before the task runner can operate.
 *
 * Usage:
 *   npx ts-node src/registerAgents.ts
 */

import "dotenv/config";
import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  encodeFunctionData,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";

// ── Config ────────────────────────────────────────────────────────────────────

const RPC_URL = process.env.RPC_URL ?? "https://forno.celo.org";
const COORDINATOR_KEY = process.env.COORDINATOR_PRIVATE_KEY as `0x${string}`;
const AGENT_REGISTRY = (process.env.AGENT_REGISTRY_ADDRESS ?? "0x052f70C756B079F7eADB8b72C7Ea1579215090C8") as Address;

// ── Agent Definitions ─────────────────────────────────────────────────────────

interface AgentDef {
  capability: string;
  endpoint: string;
  pricePerTask: string; // in ETH
  hdIndex: number;
}

const AGENTS: AgentDef[] = [
  { capability: "research", endpoint: "https://api.venice.ai/api/v1", pricePerTask: "0.01", hdIndex: 0 },
  { capability: "risk",     endpoint: "https://api.venice.ai/api/v1", pricePerTask: "0.01", hdIndex: 1 },
  { capability: "report",   endpoint: "https://api.venice.ai/api/v1", pricePerTask: "0.01", hdIndex: 2 },
  { capability: "coding",   endpoint: "https://api.venice.ai/api/v1", pricePerTask: "0.02", hdIndex: 3 },
  { capability: "design",   endpoint: "https://api.venice.ai/api/v1", pricePerTask: "0.01", hdIndex: 4 },
];

// ── HD Wallet Derivation ─────────────────────────────────────────────────────

async function deriveAgentWallets(mnemonic: string) {
  const { HDKey } = await import("@scure/bip32");
  const { mnemonicToSeedSync } = await import("@scure/bip39");

  const seed = mnemonicToSeedSync(mnemonic);
  const hdKey = HDKey.fromMasterSeed(seed);

  return AGENTS.map((agent) => {
    const child = hdKey.derive(`m/44'/60'/0'/0/${agent.hdIndex}`);
    const pk = `0x${Buffer.from(child.privateKey!).toString("hex")}` as `0x${string}`;
    const account = privateKeyToAccount(pk);
    return { ...agent, privateKey: pk, address: account.address };
  });
}

// ── Registration ABI ──────────────────────────────────────────────────────────

const AGENT_REGISTRY_ABI = [
  {
    name: "register",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "endpoint", type: "string" },
      { name: "capability", type: "string" },
      { name: "pricePerTask", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "agents",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "a", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "wallet", type: "address" },
          { name: "endpoint", type: "string" },
          { name: "capability", type: "string" },
          { name: "pricePerTask", type: "uint256" },
          { name: "active", type: "bool" },
        ],
      },
    ],
  },
  {
    name: "findByCapability",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "capability", type: "string" }],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    name: "totalAgents",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const mnemonic = process.env.AGENT_MNEMONIC;
  if (!mnemonic) {
    console.error("ERROR: AGENT_MNEMONIC not set in .env");
    console.error("Generate one with: npx ts-node -e \"const{mnemonicToEntropy}=require('@scure/bip39');console.log(require('@scure/bip39').generateMnemonic())\"");
    process.exit(1);
  }

  const coordinatorAccount = privateKeyToAccount(COORDINATOR_KEY);
  const publicClient = createPublicClient({ chain: celo, transport: http(RPC_URL) });
  const coordinatorWallet = createWalletClient({
    account: coordinatorAccount,
    chain: celo,
    transport: http(RPC_URL),
  });

  console.log("=== AI-Net Agent Registration ===");
  console.log(`Coordinator: ${coordinatorAccount.address}`);
  console.log(`Registry: ${AGENT_REGISTRY}`);
  console.log("");

  // Derive agent wallets from mnemonic
  const agentWallets = await deriveAgentWallets(mnemonic);
  console.log("Derived agent wallets:");
  for (const w of agentWallets) {
    console.log(`  ${w.capability}: ${w.address}`);
  }
  console.log("");

  // Check current state
  const totalBefore = await publicClient.readContract({
    address: AGENT_REGISTRY,
    abi: AGENT_REGISTRY_ABI,
    functionName: "totalAgents",
  });
  console.log(`Current agents on-chain: ${totalBefore}`);

  // Check which capabilities are already registered
  const existingAgents: string[] = [];
  for (const agent of AGENTS) {
    const found = await publicClient.readContract({
      address: AGENT_REGISTRY,
      abi: AGENT_REGISTRY_ABI,
      functionName: "findByCapability",
      args: [agent.capability],
    }) as Address[];
    if (found.length > 0) {
      existingAgents.push(agent.capability);
      console.log(`  ✓ ${agent.capability} already registered at ${found[0]}`);
    }
  }

  const toRegister = AGENTS.filter((a) => !existingAgents.includes(a.capability));
  if (toRegister.length === 0) {
    console.log("\nAll agents already registered. Nothing to do.");
    return;
  }

  console.log(`\nRegistering ${toRegister.length} agents...`);

  for (const agent of toRegister) {
    const wallet = agentWallets.find((w) => w.capability === agent.capability)!;
    const walletClient = createWalletClient({
      account: privateKeyToAccount(wallet.privateKey),
      chain: celo,
      transport: http(RPC_URL),
    });

    // Fund the agent wallet with gas (0.005 CELO)
    console.log(`\n[${agent.capability}] Funding ${wallet.address} with 0.005 CELO...`);
    const fundHash = await coordinatorWallet.sendTransaction({
      to: wallet.address,
      value: parseEther("0.005"),
    });
    await publicClient.waitForTransactionReceipt({ hash: fundHash });
    console.log(`[${agent.capability}] Funded (tx: ${fundHash.slice(0, 18)}...)`);

    // Register the agent
    const priceWei = parseEther(agent.pricePerTask);
    const calldata = encodeFunctionData({
      abi: AGENT_REGISTRY_ABI,
      functionName: "register",
      args: [agent.endpoint, agent.capability, priceWei],
    });

    console.log(`[${agent.capability}] Registering...`);
    const regHash = await walletClient.sendTransaction({
      account: privateKeyToAccount(wallet.privateKey),
      to: AGENT_REGISTRY,
      data: calldata,
    });
    await publicClient.waitForTransactionReceipt({ hash: regHash });
    console.log(`[${agent.capability}] ✓ Registered (tx: ${regHash.slice(0, 18)}...)`);
  }

  // Verify
  const totalAfter = await publicClient.readContract({
    address: AGENT_REGISTRY,
    abi: AGENT_REGISTRY_ABI,
    functionName: "totalAgents",
  });
  console.log(`\n=== Registration Complete ===`);
  console.log(`Agents on-chain: ${totalBefore} → ${totalAfter}`);

  for (const agent of AGENTS) {
    const found = await publicClient.readContract({
      address: AGENT_REGISTRY,
      abi: AGENT_REGISTRY_ABI,
      functionName: "findByCapability",
      args: [agent.capability],
    }) as Address[];
    console.log(`  ${agent.capability}: ${found.length > 0 ? `✓ ${found[0]}` : "✗ NOT REGISTERED"}`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
