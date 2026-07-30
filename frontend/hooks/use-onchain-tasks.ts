"use client";

import { useState, useEffect, useCallback } from "react";
import { createPublicClient, http, formatEther, type PublicClient } from "viem";
import { CONTRACTS, CHAIN_ID } from "@/lib/constants";

const celoChain = {
  id: CHAIN_ID,
  name: "Celo Mainnet",
  nativeCurrency: { name: "Celo", symbol: "CELO", decimals: 18 },
  rpcUrls: { default: { http: ["https://forno.celo.org"] } },
} as const;

const TASK_CREATED_ABI = {
  name: "TaskCreated",
  type: "event",
  inputs: [
    { name: "taskId", indexed: true, type: "uint256" },
    { name: "requester", indexed: true, type: "address" },
    { name: "budget", type: "uint256" },
    { name: "permId", type: "uint256" },
  ],
} as const;

const AGENT_HIRED_ABI = {
  name: "AgentHired",
  type: "event",
  inputs: [
    { name: "taskId", indexed: true, type: "uint256" },
    { name: "agent", indexed: true, type: "address" },
    { name: "amount", type: "uint256" },
  ],
} as const;

const TASK_COMPLETED_ABI = {
  name: "TaskCompleted",
  type: "event",
  inputs: [
    { name: "taskId", indexed: true, type: "uint256" },
    { name: "requester", indexed: true, type: "address" },
    { name: "refund", type: "uint256" },
  ],
} as const;

export interface OnChainTask {
  taskId: string;
  requester: string;
  budget: string;
  budgetWei: bigint;
  description: string;
  agentsHired: string[];
  agentCount: number;
  completed: boolean;
  refund: string;
  txHashes: string[];
  timestamp: number;
  blockNumber: number;
}

export interface OnChainStats {
  totalTasks: number;
  tvl: string;
  agentsActive: number;
}

function makeClient(): PublicClient {
  return createPublicClient({
    chain: celoChain,
    transport: http("https://forno.celo.org", { timeout: 30_000 }),
  });
}

async function resolveTimestamp(client: PublicClient, blockNumber: bigint): Promise<number> {
  try {
    const block = await client.getBlock({ blockNumber });
    return Number(block.timestamp) * 1000;
  } catch {
    return 0;
  }
}

export function useOnChainTasks(walletAddress?: string) {
  const [tasks, setTasks] = useState<OnChainTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTasks = useCallback(async () => {
    if (!CONTRACTS.TASK_COORDINATOR) {
      setLoading(false);
      return;
    }

    try {
      const client = makeClient();

      const [createdLogs, hiredLogs, completedLogs] = await Promise.all([
        client.getLogs({
          address: CONTRACTS.TASK_COORDINATOR,
          event: TASK_CREATED_ABI,
          fromBlock: 0n,
          toBlock: "latest",
        }),
        client.getLogs({
          address: CONTRACTS.TASK_COORDINATOR,
          event: AGENT_HIRED_ABI,
          fromBlock: 0n,
          toBlock: "latest",
        }),
        client.getLogs({
          address: CONTRACTS.TASK_COORDINATOR,
          event: TASK_COMPLETED_ABI,
          fromBlock: 0n,
          toBlock: "latest",
        }),
      ]);

      const completedSet = new Set<string>();
      const refundMap = new Map<string, string>();

      for (const log of completedLogs) {
        const taskId = log.args.taskId?.toString() ?? "";
        completedSet.add(taskId);
        const refund = log.args.refund;
        if (refund !== undefined) {
          refundMap.set(taskId, formatEther(refund));
        }
      }

      const taskMap = new Map<string, OnChainTask>();

      for (const log of createdLogs) {
        const taskId = log.args.taskId?.toString() ?? "";
        const requester = log.args.requester ?? "0x";
        const budget = log.args.budget ?? 0n;
        const timestamp = await resolveTimestamp(client, log.blockNumber);

        taskMap.set(taskId, {
          taskId,
          requester,
          budget: formatEther(budget),
          budgetWei: budget,
          description: "",
          agentsHired: [],
          agentCount: 0,
          completed: completedSet.has(taskId),
          refund: refundMap.get(taskId) ?? "0",
          txHashes: [log.transactionHash],
          timestamp,
          blockNumber: Number(log.blockNumber),
        });
      }

      for (const log of hiredLogs) {
        const taskId = log.args.taskId?.toString() ?? "";
        const agent = log.args.agent ?? "0x";
        const task = taskMap.get(taskId);
        if (task) {
          task.agentsHired.push(agent);
          task.agentCount = task.agentsHired.length;
          if (!task.txHashes.includes(log.transactionHash)) {
            task.txHashes.push(log.transactionHash);
          }
        }
      }

      const allTasks = Array.from(taskMap.values()).sort(
        (a, b) => Number(b.taskId) - Number(a.taskId)
      );

      const filtered = walletAddress
        ? allTasks.filter((t) => t.requester.toLowerCase() === walletAddress.toLowerCase())
        : allTasks;

      setTasks(filtered);
      setError("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch on-chain tasks");
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, loading, error, refetch: fetchTasks };
}
