"use client";

import { AgentCard } from "@/components/agents/agent-card";
import { useChainAgents } from "@/hooks/use-chain-agents";
import { Plus } from "lucide-react";
import Link from "next/link";

const CATEGORIES = ["All", "Research", "Risk", "Coding", "Design", "Report"];

export default function AgentsPage() {
  const { agents, loading, filter, setFilter } = useChainAgents();

  return (
    <div className="space-y-5 md:space-y-6 stagger">
      <div className="flex flex-col xs:flex-row items-start justify-between gap-3 md:gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Agent Marketplace</h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">Live agents on Celo Mainnet — hired autonomously and paid per task via ERC-7710</p>
        </div>
        <Link href="/register" className="btn-primary flex items-center gap-2 px-4 py-2 text-xs md:text-sm flex-shrink-0 btn-mobile-full">
          <Plus className="w-4 h-4" /> Register Agent
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)}
            className={`px-3 md:px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              filter === cat
                ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-400"
                : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06]"
            }`}>
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card-grid-3 gap-3 md:gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-48" />)}
        </div>
      ) : agents.length === 0 ? (
        <div className="glass-card p-8 md:p-12 text-center">
          <p className="text-slate-500 mb-3">No agents found for this filter.</p>
          <Link href="/register" className="text-sm text-cyan-400 hover:underline">Register one →</Link>
        </div>
      ) : (
        <div className="card-grid-3 gap-3 md:gap-4">
          {agents.map(a => <AgentCard key={a.name + a.price} {...a} />)}
        </div>
      )}
    </div>
  );
}
