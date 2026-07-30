"use client";

import { useEffect, useState } from "react";
import { useMiniPay } from "@/hooks/use-minipay";
import { CONTRACTS } from "@/lib/constants";
import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";
import { usePathname } from "next/navigation";

const publicClient = createPublicClient({ chain: celo, transport: http("https://forno.celo.org") });
const ABI = [{ name: "taskCount", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] }] as const;

/**
 * MiniPayBanner — shown only on non-/mini pages when inside MiniPay.
 * Prompts users to navigate to /mini. Hidden on /mini itself since that
 * page has its own full connect/address UI.
 */
export function MiniPayBanner() {
  const { isMiniPay, address } = useMiniPay();
  const [taskCount, setTaskCount] = useState<number | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!CONTRACTS.TASK_COORDINATOR) return;
    publicClient
      .readContract({ address: CONTRACTS.TASK_COORDINATOR, abi: ABI, functionName: "taskCount" })
      .then(n => setTaskCount(Number(n)))
      .catch(() => {});
  }, []);

  // Don't render on /mini (it has its own UI) or outside MiniPay
  if (!isMiniPay || pathname === "/mini") return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 safe-bottom bg-gradient-to-t from-black/90 to-transparent z-50">
      <div className="glass-card p-4 text-center space-y-2">
        <p className="text-sm text-slate-400">
          {taskCount !== null ? `${taskCount} tasks completed on AI-Net` : "Loading…"}
        </p>
        {address ? (
          <p className="text-xs text-green-400">
            ✓ Connected: {address.slice(0, 6)}…{address.slice(-4)}
          </p>
        ) : (
          <p className="text-xs text-slate-500">Connecting wallet…</p>
        )}
      </div>
    </div>
  );
}
