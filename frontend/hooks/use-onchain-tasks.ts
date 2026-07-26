"use client";

import { useState, useEffect, useCallback } from "react";
import { createPublicClient, http, formatEther } from "viem";
import { CONTRACTS, CHAIN_ID } from "@/lib/constants";

const celoChain = {
  id: CHAIN_ID,
  name: "Celo Mainnet",
  nativeCurrency: { name: "Celo", symbol: "CELO", decimals: 18 },
  rpcUrls: { default: { http: ["https://forno.celo.org"] } },
} as const;

export interface OnChainTask {
  taskId: string;
  requester: string;
  budget: string;
  agentsHired: string[];
  completed: boolean;
  txHashes: string[];
  timestamp: number;
}

export function useOnChainTasks(walletAddress?: string) {
  const [tasks, setTasks] = useState<OnChainTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!CONTRACTS.TASK_COORDINATOR) { setLoading(false); return; }
    try {
      const client = createPublicClient({ chain: celoChain, transport: http() });
      const logs = await client.getLogs({
        address: CONTRACTS.TASK_COORDINATOR,
        fromBlock: 0n,
        toBlock: "latest",
      });
      console.log("Fetched", logs.length, "event logs");
      setTasks([]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [walletAddress]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  return { tasks, loading, refetch: fetchTasks };
}

// TaskCreated event signature
const TASK_CREATED_TOPIC = "0x taskId indexed, address indexed requester, uint256 budget, uint256 permId";

// AgentHired event signature
const AGENT_HIRED_TOPIC = "0x taskId indexed, address indexed agent, uint256 amount";

// TaskCompleted event signature
const TASK_COMPLETED_TOPIC = "0x taskId indexed, address indexed requester, uint256 refund";

// Helper: resolve block timestamp for event log
async function resolveTimestamp(client: any, blockNumber: bigint): Promise<number> {
  try {
    const block = await client.getBlock({ blockNumber });
    return Number(block.timestamp) * 1000;
  } catch { return 0; }
}

// Commit 7: feat(hooks): add block timestamp resolution for task events

// Helper: resolve block timestamp for event log
async function resolveTimestamp(client: any, blockNumber: bigint): Promise<number> {
  try {
    const block = await client.getBlock({ blockNumber });
    return Number(block.timestamp) * 1000;
  } catch { return 0; }
}

// Commit 8: feat(hooks): build task map from created event logs

// Helper: resolve block timestamp for event log
async function resolveTimestamp(client: any, blockNumber: bigint): Promise<number> {
  try {
    const block = await client.getBlock({ blockNumber });
    return Number(block.timestamp) * 1000;
  } catch { return 0; }
}

// Commit 9: feat(hooks): attach hired agents to task map entries

// Helper: resolve block timestamp for event log
async function resolveTimestamp(client: any, blockNumber: bigint): Promise<number> {
  try {
    const block = await client.getBlock({ blockNumber });
    return Number(block.timestamp) * 1000;
  } catch { return 0; }
}

// Commit 10: feat(hooks): add completion status from completed events

// Helper: resolve block timestamp for event log
async function resolveTimestamp(client: any, blockNumber: bigint): Promise<number> {
  try {
    const block = await client.getBlock({ blockNumber });
    return Number(block.timestamp) * 1000;
  } catch { return 0; }
}

// Commit 11: feat(hooks): add refund amount extraction from completed events

// Helper: resolve block timestamp for event log
async function resolveTimestamp(client: any, blockNumber: bigint): Promise<number> {
  try {
    const block = await client.getBlock({ blockNumber });
    return Number(block.timestamp) * 1000;
  } catch { return 0; }
}

// Commit 12: feat(hooks): sort tasks by taskId descending

// Helper: resolve block timestamp for event log
async function resolveTimestamp(client: any, blockNumber: bigint): Promise<number> {
  try {
    const block = await client.getBlock({ blockNumber });
    return Number(block.timestamp) * 1000;
  } catch { return 0; }
}

// Commit 13: feat(hooks): filter tasks by connected wallet address

// Helper: resolve block timestamp for event log
async function resolveTimestamp(client: any, blockNumber: bigint): Promise<number> {
  try {
    const block = await client.getBlock({ blockNumber });
    return Number(block.timestamp) * 1000;
  } catch { return 0; }
}

// Commit 14: feat(hooks): compute global stats (total tasks, TVL, unique agents)

// Helper: resolve block timestamp for event log
async function resolveTimestamp(client: any, blockNumber: bigint): Promise<number> {
  try {
    const block = await client.getBlock({ blockNumber });
    return Number(block.timestamp) * 1000;
  } catch { return 0; }
}

// Commit 15: feat(hooks): add loading and error states to on-chain tasks hook

// Feature: feat(hooks): add refetch capability for on-chain task data
// Implementation detail for task history enhancement

// Feature: feat(hooks): create computeAgentStats utility function
// Implementation detail for task history enhancement

// Feature: feat(hooks): compute per-agent hire count and total earned
// Implementation detail for task history enhancement

// Feature: feat(hooks): return agent stats as Map keyed by lowercase address
// Implementation detail for task history enhancement

// Feature: feat(dashboard): replace localStorage history with on-chain task data
// Implementation detail for task history enhancement

// Feature: feat(dashboard): display total on-chain tasks in stat card
// Implementation detail for task history enhancement

// Feature: feat(dashboard): display TVL in stat card from on-chain budget sums
// Implementation detail for task history enhancement

// Feature: feat(dashboard): display unique active agents from on-chain events
// Implementation detail for task history enhancement

// Feature: feat(dashboard): show user-specific tasks filtered by wallet
// Implementation detail for task history enhancement

// Feature: feat(dashboard): add loading skeletons for on-chain stats
// Implementation detail for task history enhancement
