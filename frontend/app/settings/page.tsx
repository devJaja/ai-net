"use client";

import { ExternalLink } from "lucide-react";
import { CONTRACTS, CHAIN_ID, CAPABILITIES } from "@/lib/constants";

const AGENTS_ONCHAIN = [
  { capability: "research", address: "0xD14E15844ceb4dB8aaBE7F23E3e7F4097E344867", price: "0.001 ETH" },
  { capability: "risk",     address: "0xf0055f49E6BD2cE3b12357af60540Bc8bDC4AFaC", price: "0.001 ETH" },
  { capability: "coding",   address: "0xCDfe537F32A2A7c58aFA8aC401a13a5364643e2E", price: "0.001 ETH" },
  { capability: "design",   address: "0x0bdd9e8b4beEF396aDea5E709F91360774672bc2", price: "0.001 ETH" },
  { capability: "audit",    address: "0xf757fd57587263C28A387286e542A7d1F439e0fd", price: "0.001 ETH" },
  { capability: "report",   address: "0x9FCB62Ce711F8768898A8c5Ffbff3AC2C5C51A85", price: "0.001 ETH" },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6 md:space-y-8 animate-slide-up max-w-2xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">
          Settings <span className="text-sm md:text-base font-normal text-slate-500">/ Configuration</span>
        </h1>
        <p className="text-sm text-zinc-400">Network configuration and deployed contracts</p>
      </div>

      <div className="glass-card p-4 md:p-6 space-y-4">
        <h2 className="text-base md:text-lg font-semibold text-white">Network</h2>
        <div className="grid grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm">
          <div><p className="text-zinc-500 mb-1">Chain</p><p className="text-white">Celo Mainnet</p></div>
          <div><p className="text-zinc-500 mb-1">Chain ID</p><p className="text-white">{CHAIN_ID}</p></div>
          <div className="col-span-2"><p className="text-zinc-500 mb-1">RPC</p><p className="text-cyan-400 font-mono text-xs break-all">https://forno.celo.org</p></div>
          <div className="col-span-2"><p className="text-zinc-500 mb-1">Explorer</p>
            <a href="https://celoscan.io" target="_blank" rel="noreferrer" className="text-cyan-400 font-mono text-xs hover:underline flex items-center gap-1">
              https://celoscan.io <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      <div className="glass-card p-4 md:p-6 space-y-4">
        <h2 className="text-base md:text-lg font-semibold text-white">Deployed Contracts</h2>
        <div className="space-y-3">
          {[
            { label: "AgentRegistry",    addr: CONTRACTS.AGENT_REGISTRY    },
            { label: "GuildPermissions", addr: CONTRACTS.GUILD_PERMISSIONS },
            { label: "TaskCoordinator",  addr: CONTRACTS.TASK_COORDINATOR  },
            { label: "AgentJudge",       addr: CONTRACTS.AGENT_JUDGE       },
          ].map(({ label, addr }) => (
            <div key={label} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-white">{label}</p>
                <code className="text-xs text-zinc-500 break-all">{addr}</code>
              </div>
              <a href={`https://celoscan.io/address/${addr}`} target="_blank" rel="noreferrer"
                className="text-zinc-500 hover:text-cyan-400 transition-colors flex-shrink-0">
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-4 md:p-6 space-y-4">
        <h2 className="text-base md:text-lg font-semibold text-white">Registered Agents</h2>
        <div className="space-y-3">
          {AGENTS_ONCHAIN.map(a => (
            <div key={a.capability} className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 xs:gap-3">
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <span className="px-2 py-0.5 text-xs bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-md capitalize flex-shrink-0">{a.capability}</span>
                <code className="text-xs text-zinc-400 truncate">{a.address.slice(0,10)}…{a.address.slice(-6)}</code>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs text-zinc-500">{a.price}</span>
                <a href={`https://celoscan.io/address/${a.address}`} target="_blank" rel="noreferrer"
                  className="text-zinc-500 hover:text-cyan-400 transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-4 md:p-6 space-y-4">
        <h2 className="text-base md:text-lg font-semibold text-white">Default Pipeline</h2>
        <div className="flex flex-wrap gap-2">
          {CAPABILITIES.map(cap => (
            <span key={cap} className="px-3 py-1.5 text-xs border border-white/10 bg-white/5 text-zinc-400 rounded-lg capitalize">{cap}</span>
          ))}
        </div>
        <p className="text-xs text-zinc-500">Order: research → risk → coding → design → audit → report</p>
      </div>
    </div>
  );
}
