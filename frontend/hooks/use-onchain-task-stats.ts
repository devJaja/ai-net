"use client";

import { useState, useEffect, useCallback } from "react";
import { createPublicClient, http, formatEther, type PublicClient } from "viem";
import { CONTRACTS, CHAIN_ID } from "@/lib/constants";
import { OnChainStats } from "./use-onchain-tasks";

const celoChain = {
  id: CHAIN_ID,
  name: "Celo Mainnet",
  nativeCurrency: { name: "Celo", symbol: "CELO", decimals: 18 },
  rpcUrls: { default: { http: ["https://forno.celo.org"] } },
} as const;

const TASK_COORDINATOR_ABI = [
  {
    name: "taskCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

const AGENT_HIRED_ABI = {
  name: "AgentHired",
  type: "event" as const,
  inputs: [
    { name: "taskId", indexed: true, type: "uint256" },
    { name: "agent", indexed: true, type: "address" },
    { name: "amount", type: "uint256" },
  ],
};

const TASK_CREATED_ABI = {
  name: "TaskCreated",
  type: "event" as const,
  inputs: [
    { name: "taskId", indexed: true, type: "uint256" },
    { name: "requester", indexed: true, type: "address" },
    { name: "budget", type: "uint256" },
    { name: "permId", type: "uint256" },
  ],
};

function makeClient(): PublicClient {
  return createPublicClient({
    chain: celoChain,
    transport: http("https://forno.celo.org", { timeout: 30_000 }),
  });
}

export function useOnChainStats(): OnChainStats & { loading: boolean; error: string } {
  const [stats, setStats] = useState<OnChainStats>({ totalTasks: 0, tvl: "0", agentsActive: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = useCallback(async () => {
    if (!CONTRACTS.TASK_COORDINATOR || !CONTRACTS.AGENT_REGISTRY) {
      setLoading(false);
      return;
    }

    try {
      const client = makeClient();

      const taskCount = await client.readContract({
        address: CONTRACTS.TASK_COORDINATOR,
        abi: TASK_COORDINATOR_ABI,
        functionName: "taskCount",
      });

      const createdLogs = await client.getLogs({
        address: CONTRACTS.TASK_COORDINATOR,
        event: TASK_CREATED_ABI,
        fromBlock: 0n,
        toBlock: "latest",
      });

      let totalBudget = 0n;
      for (const log of createdLogs) {
        totalBudget += log.args.budget ?? 0n;
      }

      const hiredLogs = await client.getLogs({
        address: CONTRACTS.TASK_COORDINATOR,
        event: AGENT_HIRED_ABI,
        fromBlock: 0n,
        toBlock: "latest",
      });

      const uniqueAgents = new Set<string>();
      for (const log of hiredLogs) {
        const agent = log.args.agent;
        if (agent) uniqueAgents.add(agent.toLowerCase());
      }

      setStats({
        totalTasks: Number(taskCount),
        tvl: formatEther(totalBudget),
        agentsActive: uniqueAgents.size,
      });
      setError("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { ...stats, loading, error };
}
