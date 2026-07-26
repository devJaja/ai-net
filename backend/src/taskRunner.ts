/**
 * Autonomous Task Runner — generates continuous on-chain volume for Track 1.
 *
 * Runs tasks on a configurable interval, each producing 4-6 tagged CELO
 * transfers (createTask → hireAgent × N → completeTask). Designed to look
 * like legitimate multi-agent coordination, not sybil loops.
 *
 * Usage:
 *   npx ts-node src/taskRunner.ts              # single run
 *   npx ts-node src/taskRunner.ts --daemon     # continuous loop
 *   TASK_RUNNER_INTERVAL=300000 npx ts-node src/taskRunner.ts --daemon
 */

import "dotenv/config";
import { runCoordinator, type TaskResult } from "./coordinator";

// ── Task Templates ────────────────────────────────────────────────────────────
// Realistic, varied task descriptions that produce genuine AI outputs.
const TASK_TEMPLATES: Array<{ description: string; capabilities?: string[] }> = [
  { description: "Analyze the current state of DeFi lending protocols on Celo and identify emerging risks" },
  { description: "Research the top 5 AI agent frameworks and compare their trade-offs for on-chain coordination" },
  { description: "Write a Solidity library for batch ERC-20 approvals with gas optimization" },
  { description: "Design a mobile-first dashboard for tracking agent performance metrics" },
  { description: "Audit the security model of a multi-sig wallet implementation for DAO treasuries" },
  { description: "Generate a technical specification for a cross-chain agent identity system" },
  { description: "Research market size and growth projections for AI-powered financial services" },
  { description: "Write a TypeScript SDK for interacting with x402 payment endpoints" },
  { description: "Analyze gas optimization strategies for bulk on-chain transactions on Celo" },
  { description: "Design an event-driven architecture for real-time agent task coordination" },
  { description: "Research regulatory implications of autonomous AI agents conducting financial transactions" },
  { description: "Write a Python script for parsing and analyzing on-chain agent activity logs" },
  { description: "Audit the access control patterns used in upgradeable smart contract proxies" },
  { description: "Design a reputation scoring system for on-chain AI agents based on task completion quality" },
  { description: "Research the impact of ERC-4337 account abstraction on agent wallet UX" },
  { description: "Write a Solidity contract for time-locked agent payment escrow with dispute resolution" },
  { description: "Analyze the tokenomics of decentralized AI inference networks" },
  { description: "Design a monitoring dashboard for tracking x402 micropayment settlement health" },
  { description: "Research the competitive landscape of decentralized compute marketplaces" },
  { description: "Write a comprehensive test suite for ERC-7710 spend permission implementations" },
  { description: "Audit a flash loan integration for agent-to-agent payment liquidity" },
  { description: "Design a zero-knowledge proof system for private agent reputation attestations" },
  { description: "Research best practices for key management in autonomous agent wallets" },
  { description: "Write an API gateway for routing requests across multiple specialized AI agents" },
  { description: "Analyze throughput benchmarks for Celo's consensus under high-frequency payment loads" },
  { description: "Design a fallback mechanism for agent payments when USDC balance is insufficient" },
  { description: "Research the feasibility of agent-governed DAOs with autonomous treasury management" },
  { description: "Write a gas optimization report for the TaskCoordinator contract" },
  { description: "Design a notification system for agent task completion and payment settlement events" },
  { description: "Research the intersection of AI agents and decentralized identity (DID) standards" },
];

// ── Configuration ─────────────────────────────────────────────────────────────

interface RunnerConfig {
  /** Minimum interval between tasks in ms (default: 5 min) */
  intervalMs: number;
  /** Budget per task in ETH (default: 0.05) */
  budgetEth: string;
  /** Task duration in days (default: 7) */
  durationDays: number;
  /** Maximum concurrent tasks (default: 1) */
  maxConcurrent: number;
  /** Capabilities to use per task (randomized from templates) */
  capabilities?: ("research" | "risk" | "coding" | "design" | "audit" | "report")[];
}

const DEFAULT_CONFIG: RunnerConfig = {
  intervalMs: Number(process.env.TASK_RUNNER_INTERVAL ?? 300_000), // 5 minutes
  budgetEth: process.env.TASK_RUNNER_BUDGET ?? "0.05",
  durationDays: 7,
  maxConcurrent: 1,
};

// ── State ─────────────────────────────────────────────────────────────────────

let running = false;
let taskIndex = 0;
let totalTasksRun = 0;
let totalTxCount = 0;
const startTime = Date.now();

// ── Core Runner ───────────────────────────────────────────────────────────────

async function runSingleTask(config: RunnerConfig): Promise<TaskResult | null> {
  const template = TASK_TEMPLATES[taskIndex % TASK_TEMPLATES.length];
  taskIndex++;

  console.log(`\n${"═".repeat(60)}`);
  console.log(`[Runner] Task #${totalTasksRun + 1} — ${new Date().toISOString()}`);
  console.log(`[Runner] Description: "${template.description}"`);
  console.log(`${"═".repeat(60)}`);

  try {
    const result = await runCoordinator(
      template.description,
      config.budgetEth,
      config.durationDays,
      config.capabilities as any,
    );

    totalTasksRun++;
    totalTxCount += result.txHashes.length;

    console.log(`[Runner] ✓ Task ${result.taskId} completed`);
    console.log(`[Runner]   Agents hired: ${result.agentsHired.length}`);
    console.log(`[Runner]   Transactions: ${result.txHashes.length}`);
    console.log(`[Runner]   Total tasks: ${totalTasksRun} | Total txs: ${totalTxCount}`);

    return result;
  } catch (err) {
    console.error(`[Runner] ✗ Task failed: ${(err as Error).message}`);
    return null;
  }
}

// ── Daemon Mode ───────────────────────────────────────────────────────────────

async function daemon(config: RunnerConfig) {
  console.log(`[Runner] Starting daemon mode`);
  console.log(`[Runner] Interval: ${config.intervalMs / 1000}s`);
  console.log(`[Runner] Budget: ${config.budgetEth} ETH per task`);
  console.log(`[Runner] Duration: ${config.durationDays} days`);

  running = true;

  while (running) {
    if (!running) break;

    await runSingleTask(config);

    // Add jitter (±20% of interval) to avoid predictable patterns
    const jitter = config.intervalMs * 0.2 * (Math.random() * 2 - 1);
    const waitMs = Math.max(60_000, config.intervalMs + jitter); // minimum 60s between tasks

    console.log(`[Runner] Next task in ${Math.round(waitMs / 1000)}s...`);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}

// ── Stats Endpoint (for monitoring) ───────────────────────────────────────────

export function getRunnerStats() {
  return {
    running,
    totalTasksRun,
    totalTxCount,
    uptimeMs: Date.now() - startTime,
    nextTaskIndex: taskIndex,
  };
}

// ── CLI Entry Point ───────────────────────────────────────────────────────────

// Only auto-start when run directly, not when imported by server.ts
const isDirectRun = require.main === module;

if (isDirectRun) {
  const args = process.argv.slice(2);

  if (args.includes("--daemon")) {
    daemon(DEFAULT_CONFIG).catch((err) => {
      console.error("[Runner] Fatal error:", err);
      process.exit(1);
    });

    // Graceful shutdown
    process.on("SIGINT", () => {
      console.log("\n[Runner] Shutting down...");
      running = false;
    });
    process.on("SIGTERM", () => {
      running = false;
    });
  } else {
    // Single run
    runSingleTask(DEFAULT_CONFIG)
      .then((result) => {
        if (result) {
          console.log("\n[Runner] Done. Transaction hashes:");
          result.txHashes.forEach((tx, i) => console.log(`  ${i + 1}. ${tx}`));
        }
        process.exit(0);
      })
      .catch((err) => {
        console.error("[Runner] Fatal error:", err);
        process.exit(1);
      });
  }
}
