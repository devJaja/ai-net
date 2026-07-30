"use client";

import { ExternalLink, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { useWallet } from "@/hooks/use-wallet";
import { useTaskHistory } from "@/hooks/use-task-history";
import { CONTRACTS } from "@/lib/constants";

export default function PaymentsPage() {
  const { connected, address, connect } = useWallet();
  const { history } = useTaskHistory();

  const txRows = history.flatMap(task =>
    task.txHashes.map((hash, i) => ({
      hash,
      label: i === 0 ? `Task #${task.taskId} — createTask`
           : i === task.txHashes.length - 1 ? `Task #${task.taskId} — completeTask`
           : `Task #${task.taskId} — hireAgent (${task.agentsHired[i - 1]?.slice(0, 8)}…)`,
      type:   i === task.txHashes.length - 1 ? "in" : "out",
      amount: i === 0 ? "0.0008 CELO"
            : i === task.txHashes.length - 1 ? "refund"
            : "0.001 cUSD",
    }))
  );

  return (
    <div className="space-y-6 md:space-y-8 animate-slide-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">Payments</h1>
        <p className="text-sm text-zinc-400">On-chain payment history via ERC-7710 spend permissions</p>
      </div>

      <div className="card-grid-3 gap-3 md:gap-4">
        {[
          { label: "AgentRegistry",    addr: CONTRACTS.AGENT_REGISTRY    },
          { label: "GuildPermissions", addr: CONTRACTS.GUILD_PERMISSIONS },
          { label: "TaskCoordinator",  addr: CONTRACTS.TASK_COORDINATOR  },
        ].map(({ label, addr }) => (
          <div key={label} className="glass-card p-3 md:p-4">
            <p className="text-xs text-zinc-500 mb-1">{label}</p>
            <div className="flex items-center gap-2">
              <code className="text-xs text-cyan-400 truncate">{addr}</code>
              <a href={`https://celoscan.io/address/${addr}`} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-white flex-shrink-0">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {!connected ? (
        <div className="glass-card p-6 md:p-8 text-center space-y-4">
          <p className="text-sm text-zinc-400">Connect your wallet to view your address</p>
          <button onClick={connect} className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-violet-600 rounded-lg text-white font-medium hover:opacity-90 transition-opacity text-sm">Connect Wallet</button>
        </div>
      ) : (
        <div className="glass-card p-3 md:p-4 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
          <code className="text-xs md:text-sm text-white truncate">{address}</code>
          <a href={`https://celoscan.io/address/${address}`} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-white ml-auto flex-shrink-0">
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}

      {txRows.length > 0 ? (
        <div>
          <h2 className="text-base md:text-xl font-bold text-white mb-4">Transaction History</h2>
          <div className="space-y-2">
            {txRows.map(tx => (
              <div key={tx.hash} className="glass-card px-3 md:px-4 py-3 flex items-center justify-between gap-2 md:gap-3">
                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                  <div className={`w-7 md:w-8 h-7 md:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${tx.type === "out" ? "bg-red-500/10" : "bg-green-500/10"}`}>
                    {tx.type === "out" ? <ArrowUpRight className="w-3.5 md:w-4 h-3.5 md:h-4 text-red-400" /> : <ArrowDownLeft className="w-3.5 md:w-4 h-3.5 md:h-4 text-green-400" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm text-white truncate">{tx.label}</p>
                    <code className="text-xs text-zinc-500">{tx.hash.slice(0, 18)}…</code>
                  </div>
                </div>
                <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                  <span className={`text-xs md:text-sm font-medium ${tx.type === "out" ? "text-red-400" : "text-green-400"}`}>
                    {tx.type === "out" ? "-" : "+"}{tx.amount}
                  </span>
                  <a href={`https://celoscan.io/tx/${tx.hash}`} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-cyan-400 transition-colors tap-target !min-w-[32px] !min-h-[32px]">
                    <ExternalLink className="w-3.5 md:w-4 h-3.5 md:h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="glass-card p-6 md:p-8 text-center text-zinc-500 text-sm">
          No transactions yet. Submit a task to see your payment history here.
        </div>
      )}
    </div>
  );
}
