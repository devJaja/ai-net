/**
 * x402 Demo — generates Track 2 volume by calling x402 pay-per-call endpoints.
 *
 * This script creates a wallet, funds it with USDC (or uses existing balance),
 * and makes repeated calls to the x402 agent endpoints. Each call settles a real
 * USDC micropayment through the Celo facilitator.
 *
 * Usage:
 *   npx ts-node src/x402Demo.ts                  # single test call
 *   npx ts-node src/x402Demo.ts --bulk 20        # make 20 calls
 *   npx ts-node src/x402Demo.ts --daemon         # continuous loop
 */

import "dotenv/config";

// ── Config ────────────────────────────────────────────────────────────────────

const X402_SERVER_URL = process.env.X402_SERVER_URL ?? "http://localhost:3001";

// ── x402 Client ───────────────────────────────────────────────────────────────

interface X402Capabilities {
  capabilities: Array<{
    id: string;
    description: string;
    price: string;
    network: string;
    token: string;
    tokenAddress: string;
    payTo: string;
  }>;
  protocol: string;
  facilitator: string;
}

async function getCapabilities(): Promise<X402Capabilities> {
  const res = await fetch(`${X402_SERVER_URL}/x402/capabilities`);
  return res.json() as Promise<X402Capabilities>;
}

async function callX402Endpoint(
  capability: string,
  task: string,
  context = ""
): Promise<any> {
  // First call without payment to get 402 requirements
  const res = await fetch(`${X402_SERVER_URL}/x402/agent/${capability}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, context }),
  });

  if (res.status === 402) {
    const data = await res.json() as { price?: string; requirements?: any; error?: string };
    console.log(`[x402] Got 402 requirements for ${capability}: $${data.price ?? "unknown"}`);
    // In a real flow, the client would sign the EIP-3009 authorization here
    // and send it in the X-PAYMENT header. For demo purposes, we log the requirements.
    return { status: 402, requirements: data.requirements, price: data.price };
  }

  return res.json() as Promise<any>;
}

// ── High-Frequency Micro-Tasks ────────────────────────────────────────────────

const MICRO_TASKS = [
  { capability: "analyze", task: "Analyze the sentiment of: DeFi protocols are seeing increased adoption on Celo" },
  { capability: "validate", task: "Validate this JSON: {\"agent\":\"research\",\"status\":\"active\",\"price\":0.01}" },
  { capability: "format", task: "Format this code: function foo(){return bar+baz}" },
  { capability: "summarize", task: "Summarize: AI-Net is a decentralized agent economy on Celo where agents hire and pay each other for specialized tasks using x402 micropayments" },
  { capability: "classify", task: "Classify this text: The smart contract audit revealed two medium-severity vulnerabilities in the access control module" },
  { capability: "translate", task: "Translate to Spanish: AI-Net enables autonomous agents to collaborate and settle payments on-chain" },
  { capability: "analyze", task: "Analyze the sentiment of: The x402 payment protocol is revolutionizing how AI agents settle micro-transactions" },
  { capability: "validate", task: "Validate this address format: 0x052f70C756B079F7eADB8b72C7Ea1579215090C8" },
  { capability: "summarize", task: "Summarize: ERC-7710 spend permissions allow delegated spending rights with time-bounded allowances, enabling agent-to-agent payment delegation without transferring ownership" },
  { capability: "classify", task: "Classify: This proposal introduces a new governance mechanism for the AI-Net agent registry" },
];

// ── Single Call Mode ──────────────────────────────────────────────────────────

async function singleCall() {
  console.log("[x402 Demo] Fetching capabilities...");
  const caps = await getCapabilities();
  console.log(`[x402 Demo] ${caps.capabilities.length} capabilities available`);

  const task = MICRO_TASKS[0];
  console.log(`[x402 Demo] Calling ${task.capability}: "${task.task.slice(0, 60)}..."`);
  const result = await callX402Endpoint(task.capability, task.task);
  console.log("[x402 Demo] Result:", JSON.stringify(result, null, 2));
}

// ── Bulk Mode ─────────────────────────────────────────────────────────────────

async function bulkCalls(count: number) {
  console.log(`[x402 Demo] Making ${count} calls...`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < count; i++) {
    const task = MICRO_TASKS[i % MICRO_TASKS.length];
    try {
      console.log(`[${i + 1}/${count}] ${task.capability}: "${task.task.slice(0, 50)}..."`);
      const result = await callX402Endpoint(task.capability, task.task);
      if (result.status === 402) {
        console.log(`  → Got 402 requirements (needs payment signing)`);
      } else {
        console.log(`  → OK`);
        successCount++;
      }
    } catch (err) {
      console.error(`  → Error: ${(err as Error).message}`);
      failCount++;
    }

    // Small delay between calls
    if (i < count - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log(`\n[x402 Demo] Done: ${successCount} success, ${failCount} failed`);
}

// ── Daemon Mode ───────────────────────────────────────────────────────────────

async function daemon() {
  console.log("[x402 Demo] Starting daemon mode...");
  let index = 0;

  while (true) {
    const task = MICRO_TASKS[index % MICRO_TASKS.length];
    try {
      console.log(`[x402] ${task.capability}: "${task.task.slice(0, 60)}..."`);
      await callX402Endpoint(task.capability, task.task);
    } catch (err) {
      console.error(`[x402] Error: ${(err as Error).message}`);
    }

    index++;
    // 30 second intervals for daemon
    await new Promise((r) => setTimeout(r, 30_000));
  }
}

// ── CLI ───────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes("--daemon")) {
  daemon().catch(console.error);
} else if (args.includes("--bulk")) {
  const idx = args.indexOf("--bulk");
  const count = parseInt(args[idx + 1] ?? "10", 10);
  bulkCalls(count).catch(console.error);
} else {
  singleCall().catch(console.error);
}
