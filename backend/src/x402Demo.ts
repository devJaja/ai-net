/**
 * x402 Demo — generates Track 2 volume using the official x402 SDK.
 *
 * Uses @x402/fetch + @x402/evm to sign real EIP-3009 USDC payments
 * through the Celo facilitator. Each call settles a real on-chain micropayment
 * with the attribution tag, counting toward Track 1 and Track 2.
 *
 * Usage:
 *   npx ts-node src/x402Demo.ts                  # single test call
 *   npx ts-node src/x402Demo.ts --bulk 20        # make 20 calls
 *   npx ts-node src/x402Demo.ts --daemon         # continuous loop
 */
import "dotenv/config";
import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactEvmScheme, toClientEvmSigner } from "@x402/evm";

// ── Config ────────────────────────────────────────────────────────────────────

const X402_SERVER_URL = process.env.X402_SERVER_URL ?? "http://localhost:3000";
const PRIVATE_KEY = (process.env.COORDINATOR_PRIVATE_KEY ?? "") as `0x${string}`;
const RPC_URL = "https://forno.celo.org";

// ── x402 Client Setup ────────────────────────────────────────────────────────

function createX402Fetch() {
  const account = privateKeyToAccount(PRIVATE_KEY);
  const publicClient = createPublicClient({ chain: celo, transport: http(RPC_URL) });

  const signer = toClientEvmSigner(account, publicClient as any);
  const client = new x402Client();
  client.register("eip155:*", new ExactEvmScheme(signer as any));

  return wrapFetchWithPayment(fetch, client);
}

// ── Micro-Tasks ───────────────────────────────────────────────────────────────

const MICRO_TASKS = [
  { capability: "analyze", task: "Analyze the sentiment of: DeFi protocols are seeing increased adoption on Celo" },
  { capability: "validate", task: "Validate this JSON: {\"agent\":\"research\",\"status\":\"active\",\"price\":0.01}" },
  { capability: "format", task: "Format this code: function foo(){return bar+baz}" },
  { capability: "summarize", task: "Summarize: AI-Net is a decentralized agent economy on Celo where agents hire and pay each other for specialized tasks using x402 micropayments" },
  { capability: "classify", task: "Classify this text: The smart contract audit revealed two medium-severity vulnerabilities in the access control module" },
  { capability: "translate", task: "Translate to Spanish: AI-Net enables autonomous agents to collaborate and settle payments on-chain" },
  { capability: "analyze", task: "Analyze the sentiment of: The x402 payment protocol is revolutionizing how AI agents settle micro-transactions" },
  { capability: "validate", task: "Validate this address format: 0x052f70C756B079F7eADB8b72C7Ea1579215090C8" },
  { capability: "summarize", task: "Summarize: ERC-7710 spend permissions allow delegated spending rights with time-bounded allowances" },
  { capability: "classify", task: "Classify: This proposal introduces a new governance mechanism for the AI-Net agent registry" },
];

// ── Single Call ───────────────────────────────────────────────────────────────

async function singleCall() {
  console.log("[x402] Setting up payment signer...");
  const paidFetch = createX402Fetch();
  const task = MICRO_TASKS[0];
  console.log(`[x402] Calling ${task.capability}: "${task.task.slice(0, 60)}..."`);

  const res = await paidFetch(`${X402_SERVER_URL}/x402/agent/${task.capability}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task: task.task }),
  });

  const data = await res.json() as any;
  console.log("[x402] Status:", res.status);
  console.log("[x402] Payment:", data.payment ?? "none");
  console.log("[x402] Output:", (data.output ?? "").slice(0, 200));
  return data;
}

// ── Bulk Mode ─────────────────────────────────────────────────────────────────

async function bulkCalls(count: number) {
  console.log(`[x402] Making ${count} paid calls...`);
  const paidFetch = createX402Fetch();

  let success = 0;
  let failed = 0;

  for (let i = 0; i < count; i++) {
    const task = MICRO_TASKS[i % MICRO_TASKS.length];
    try {
      console.log(`[${i + 1}/${count}] ${task.capability}: "${task.task.slice(0, 50)}..."`);
      const res = await paidFetch(`${X402_SERVER_URL}/x402/agent/${task.capability}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: task.task }),
      });
      const data = await res.json() as any;
      if (data.payment?.settled) {
        console.log(`  ✓ settled tx: ${data.payment.txHash}`);
        success++;
      } else {
        console.log(`  → status ${res.status}`);
        if (res.status === 200) success++;
        else failed++;
      }
    } catch (err) {
      console.error(`  ✗ ${(err as Error).message}`);
      failed++;
    }
    if (i < count - 1) await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\n[x402] Done: ${success} success, ${failed} failed`);
}

// ── Daemon Mode ───────────────────────────────────────────────────────────────

async function daemon() {
  console.log("[x402] Starting daemon mode...");
  const paidFetch = createX402Fetch();
  let index = 0;

  while (true) {
    const task = MICRO_TASKS[index % MICRO_TASKS.length];
    try {
      console.log(`[x402] ${task.capability}: "${task.task.slice(0, 60)}..."`);
      const res = await paidFetch(`${X402_SERVER_URL}/x402/agent/${task.capability}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: task.task }),
      });
      const data = await res.json() as any;
      if (data.payment?.settled) {
        console.log(`  ✓ settled tx: ${data.payment.txHash}`);
      } else {
        console.log(`  → status ${res.status}`);
      }
    } catch (err) {
      console.error(`[x402] Error: ${(err as Error).message}`);
    }
    index++;
    await new Promise(r => setTimeout(r, 15_000));
  }
}

// ── CLI Entry Point ───────────────────────────────────────────────────────────

if (require.main === module) {
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
}
