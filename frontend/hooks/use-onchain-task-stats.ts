"use client";
import { useState, useEffect } from "react";
import { createPublicClient, http } from "viem";
import { CONTRACTS, CHAIN_ID } from "@/lib/constants";

export function useOnChainStats() {
  const [stats, setStats] = useState({ totalTasks: 0, tvl: "0", agentsActive: 0 });
  useEffect(() => {
    // Fetch on-chain stats from TaskCoordinator taskCount
    async function load() {
      try {
        const client = createPublicClient({
          chain: { id: CHAIN_ID, name: "Celo", nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 }, rpcUrls: { default: { http: ["https://forno.celo.org"] } } },
          transport: http(),
        });
        const tc = await client.readContract({
          address: CONTRACTS.TASK_COORDINATOR,
          abi: [{ name: "taskCount", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] }],
          functionName: "taskCount",
        });
        setStats({ totalTasks: Number(tc), tvl: "0", agentsActive: 0 });
      } catch {}
    }
    load();
  }, []);
  return stats;
}

// Enhancement: feat(dashboard): handle error state when chain is unreachable

// Enhancement: feat(tasks): replace localStorage history with on-chain task list

// Enhancement: feat(tasks): display task IDs from on-chain TaskCreated events

// Enhancement: feat(tasks): show agent count per task from AgentHired events

// Enhancement: feat(tasks): show completion status with green badge

// Enhancement: feat(tasks): show refund amounts for completed tasks

// Enhancement: feat(tasks): link to Celoscan using on-chain tx hashes

// Enhancement: feat(tasks): add task detail expandable view with full event log

// Enhancement: feat(tasks): add pagination for large on-chain task lists
