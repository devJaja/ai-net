"use client";

import { useEffect, useState } from "react";
import { AgentCard } from "@/components/agents/agent-card";
import { TaskCreator } from "@/components/tasks/task-creator";
import { Activity, TrendingUp, Users, Zap } from "lucide-react";
import { useTaskHistory } from "@/hooks/use-task-history";
import { useChainAgents } from "@/hooks/use-chain-agents";
import { CONTRACTS } from "@/lib/constants";
import { createPublicClient, http } from "viem";
import type { TaskRecord } from "@/hooks/use-tasks";

const celoAlfajores = { id: 42220, name: "Celo Mainnet", nativeCurrency: { name: "Celo", symbol: "CELO", decimals: 18 }, rpcUrls: { default: { http: ["https://forno.celo.org"] } } } as const;

const COORDINATOR_ABI = [{ name: "taskCount", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] }] as const;
const REGISTRY_ABI    = [{ name: "totalAgents", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] }] as const;

export default function DashboardPage() {
  const { history, addTask } = useTaskHistory();
  const { agents, loading: agentsLoading } = useChainAgents();
  const [taskCount,  setTaskCount]  = useState("—");
  const [agentCount, setAgentCount] = useState("—");

  useEffect(() => {
    const client = createPublicClient({ chain: celoAlfajores, transport: http() });
    Promise.all([
      client.readContract({ address: CONTRACTS.TASK_COORDINATOR, abi: COORDINATOR_ABI, functionName: "taskCount" }),
      client.readContract({ address: CONTRACTS.AGENT_REGISTRY,   abi: REGISTRY_ABI,    functionName: "totalAgents" }),
    ]).then(([tc, ta]) => { setTaskCount(String(tc)); setAgentCount(String(ta)); }).catch(() => {});
  }, []);

  const totalSpent = history.reduce((s, t) => s + t.agentsHired.length * 0.001, 0);
  const spentLabel = `$${totalSpent.toFixed(3)} cUSD`;

  const STATS = [
    { label: "Registered Agents", value: agentCount,                    sub: "live on-chain", icon: Users,      color: "text-cyan-400",   bg: "from-cyan-500/20 to-cyan-500/5",    border: "border-cyan-500/10"   },
    { label: "Total Tasks",       value: taskCount,                     sub: "completed",     icon: Zap,        color: "text-violet-400", bg: "from-violet-500/20 to-violet-500/5", border: "border-violet-500/10" },
    { label: "Your Sessions",     value: String(history.length),        sub: "this device",   icon: Activity,   color: "text-blue-400",   bg: "from-blue-500/20 to-blue-500/5",    border: "border-blue-500/10"   },
    { label: "Your Spend",        value: spentLabel,                   sub: "this device",   icon: TrendingUp, color: "text-green-400",  bg: "from-green-500/20 to-green-500/5",  border: "border-green-500/10"  },
  ];

  return (
    <div className="space-y-6 md:space-y-8 stagger">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Welcome to <span className="gradient-text">AI-Net</span></h1>
        <p className="text-xs md:text-sm text-slate-400 mt-1.5">Autonomous AI agents that discover, hire, and pay each other on Celo.</p>
      </div>

      <div className="card-grid-4">
        {STATS.map(({ label, value, sub, icon: Icon, color, bg, border }) => (
          <div key={label} className={`glass-card p-4 md:p-5 glow-hover border ${border}`}>
            <div className={`w-8 md:w-9 h-8 md:h-9 rounded-lg bg-gradient-to-br ${bg} flex items-center justify-center mb-2 md:mb-3`}>
              <Icon className={`w-3.5 md:w-4 h-3.5 md:h-4 ${color}`} />
            </div>
            <p className="text-lg md:text-2xl font-bold text-white tabular-nums">{value}</p>
            <p className="text-xs font-medium text-slate-300 mt-1">{label}</p>
            <p className="text-[11px] text-slate-600 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <TaskCreator onTaskComplete={(t: TaskRecord) => addTask(t)} />

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm md:text-base font-semibold text-white">Live Agents</h2>
          <a href="/agents" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">View all →</a>
        </div>
        {agentsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-44" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {agents.slice(0, 4).map(a => <AgentCard key={a.name + a.price} {...a} />)}
          </div>
        )}
      </div>
    </div>
  );
}
