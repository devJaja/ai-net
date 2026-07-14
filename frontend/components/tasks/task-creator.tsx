"use client";

import { useState } from "react";
import { Send, Sparkles, Loader2, CheckCircle, ChevronDown, ChevronUp, AlertCircle, Wand2, RefreshCw } from "lucide-react";
import { CAPABILITIES, CONTRACTS, BACKEND_URL } from "@/lib/constants";
import { encodeFunctionData, createWalletClient, custom } from "viem";
import { celo } from "viem/chains";
import { useWallet } from "@/hooks/use-wallet";
import { useMiniPay } from "@/hooks/use-minipay";
import type { TaskRecord } from "@/hooks/use-tasks";
import { parseError } from "@/lib/errors";
import { switchToCelo } from "@/lib/chain";

const PIPELINE_LABELS: Record<string, string> = {
  creating: "⛓️ Smart Account tx", research: "🔍 Research", risk: "⚠️ Risk",
  coding: "💻 Coding", design: "🎨 Design", audit: "✅ Audit", report: "📄 Report",
};
const OUTPUT_LABELS: Record<string, string> = {
  research: "🔍 Research", riskAnalysis: "⚠️ Risk Analysis",
  coding: "💻 Code", design: "🎨 Design", audit: "✅ Audit", report: "📄 Final Report",
};
const CREATE_TASK_ABI = [{
  name: "createTask", type: "function", stateMutability: "payable",
  inputs: [{ name: "description", type: "string" }, { name: "duration", type: "uint256" }],
  outputs: [{ name: "", type: "uint256" }],
}] as const;

interface Props { onTaskComplete?: (task: TaskRecord) => void; }

export function TaskCreator({ onTaskComplete }: Props) {
  const [description,  setDescription]  = useState("");
  const [capabilities, setCapabilities] = useState<string[]>(["research", "risk", "audit", "report"]);
  const [autoMode,     setAutoMode]     = useState(true);
  const [suggesting,   setSuggesting]   = useState(false);
  const [step,         setStep]         = useState("idle");
  const [result,       setResult]       = useState<TaskRecord | null>(null);
  const [error,        setError]        = useState("");
  const [expanded,     setExpanded]     = useState<string | null>("report");
  const [onChainTx,    setOnChainTx]    = useState("");
  // enhance state per section
  const [enhancing,    setEnhancing]    = useState<string | null>(null);
  const [feedback,     setFeedback]     = useState<Record<string, string>>({});
  const [enhanced,     setEnhanced]     = useState<Record<string, string>>({});

  const { connected, address, connect } = useWallet();
  const { isMiniPay, address: miniPayAddress, client: miniPayClient } = useMiniPay();

  const busy = step !== "idle" && step !== "done" && step !== "error";
  const pipelineKeys = ["creating", ...capabilities];
  const stepIndex = pipelineKeys.indexOf(step);

  // Auto-suggest agents based on description
  async function suggestAgents() {
    if (!description.trim()) return;
    setSuggesting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/suggest-agents`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();
      if (data.capabilities) setCapabilities(data.capabilities);
    } catch {} finally { setSuggesting(false); }
  }

  async function handleSubmit() {
    if (!description.trim() || busy) return;
    if (!connected && !isMiniPay) { connect(); return; }

    // Auto-suggest agents and capture the result directly (don't rely on state update)
    let activeCaps = capabilities;
    if (autoMode) {
      setSuggesting(true);
      try {
        const res = await fetch(`${BACKEND_URL}/suggest-agents`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description }),
        });
        const data = await res.json();
        if (data.capabilities?.length) {
          activeCaps = data.capabilities;
          setCapabilities(activeCaps);
        }
      } catch {} finally { setSuggesting(false); }
    }

    setResult(null); setError(""); setOnChainTx(""); setEnhanced({}); setStep("creating");
    const pKeys = ["creating", ...activeCaps];

    try {
      // ── Send createTask via MiniPay or injected wallet ──
      const ethereum = (window as any).ethereum;
      if (!ethereum) throw new Error("No wallet found. Please install MetaMask or open inside MiniPay.");

      if (!isMiniPay) await switchToCelo();

      let viemWallet;
      let txAddress: `0x${string}`;

      if (isMiniPay && miniPayClient && miniPayAddress) {
        viemWallet  = miniPayClient;
        txAddress   = miniPayAddress;
      } else {
        viemWallet  = createWalletClient({ account: address as `0x${string}`, chain: celo, transport: custom(ethereum) });
        txAddress   = address as `0x${string}`;
      }

      const txHash = await (viemWallet as any).sendTransaction({
        chain:   celo,
        account: txAddress,
        to:      CONTRACTS.TASK_COORDINATOR as `0x${string}`,
        data:    encodeFunctionData({ abi: CREATE_TASK_ABI, functionName: "createTask", args: [description, BigInt(7 * 24 * 60 * 60)] }),
        value:   BigInt("800000000000000"),
        feeCurrency: "0x765DE816845861e75A25fCA122bb6898B8B1282a", // cUSD fee abstraction
      });
      setOnChainTx(txHash);

      // ── Run backend pipeline with the resolved capabilities ──
      let si = 1;
      const ticker = setInterval(() => { si = Math.min(si + 1, pKeys.length - 1); setStep(pKeys[si]); }, 14_000);
      const res = await fetch(`${BACKEND_URL}/task`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, budgetEth: "0.008", capabilities: activeCaps }),
        signal: AbortSignal.timeout(300_000),
      });
      clearInterval(ticker);
      if (!res.ok) { const err = await res.json().catch(() => ({ error: res.statusText })); throw new Error(err.error ?? res.statusText); }
      const data = await res.json();
      const record: TaskRecord = { ...data, description, status: "completed", createdAt: Date.now() };
      setResult(record); setStep("done");
      onTaskComplete?.(record);
    } catch (e: unknown) {
      setError(parseError(e));
      setStep("error");
    }
  }

  async function handleEnhance(key: string) {
    const fb = feedback[key];
    if (!fb?.trim() || !result) return;
    const original = result[key as keyof TaskRecord] as string;
    setEnhancing(key);
    try {
      const res = await fetch(`${BACKEND_URL}/enhance`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capability: key, originalOutput: original, feedback: fb }),
        signal: AbortSignal.timeout(120_000),
      });
      if (!res.ok) throw new Error(`Enhancement failed (${res.status})`);
      const data = await res.json();
      if (data.enhanced) setEnhanced(prev => ({ ...prev, [key]: data.enhanced }));
    } catch (e: unknown) {
      setError(parseError(e));
    } finally { setEnhancing(null); }
  }

  return (
    <div className="glass-card p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white">Create New Task</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-sm text-zinc-400">Autonomous agents · on-chain payments · Venice AI</p>
          </div>
        </div>
        {/* Auto / Manual toggle */}
        <button onClick={() => setAutoMode(p => !p)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${autoMode ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-400" : "border-white/10 bg-white/5 text-zinc-400"}`}>
          {autoMode ? "🤖 Auto" : "🔧 Manual"}
        </button>
      </div>

      {/* Capability selector (shown in manual mode, or after auto-suggest) */}
      {(!autoMode || suggesting || step !== "idle") && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs text-zinc-500">Agents{autoMode ? " (auto-selected)" : ""}</p>
            {autoMode && description.trim() && step === "idle" && (
              <button onClick={suggestAgents} disabled={suggesting} className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
                {suggesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />} Re-suggest
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {CAPABILITIES.map(cap => {
              const active = capabilities.includes(cap);
              return (
                <button key={cap} disabled={busy || autoMode}
                  onClick={() => !autoMode && setCapabilities(prev => active && prev.length > 1 ? prev.filter(c => c !== cap) : active ? prev : [...prev, cap])}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${active ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-400" : "border-white/10 bg-white/5 text-zinc-500"} ${autoMode ? "cursor-default" : ""}`}>
                  {cap}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && e.metaKey) handleSubmit(); }}
          placeholder="Describe your task... agents will be auto-selected (⌘+Enter to submit)"
          className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 pr-14 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 resize-none transition-all"
          disabled={busy} />
        <button onClick={handleSubmit} disabled={!description.trim() || busy}
          className="absolute bottom-4 right-4 p-2 bg-gradient-to-r from-cyan-500 to-violet-600 rounded-lg text-white disabled:opacity-40 hover:opacity-90 transition-opacity">
          {busy || suggesting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>

      {!connected && <p className="text-xs text-zinc-500 text-center"><button onClick={connect} className="text-cyan-400 hover:underline">Connect wallet</button> to submit tasks on-chain</p>}

      {/* On-chain tx */}
      {onChainTx && (
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Smart Account tx confirmed:
          <a href={`https://celoscan.io/tx/${onChainTx}`} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline font-mono">{onChainTx.slice(0, 18)}…</a>
        </div>
      )}

      {/* Progress */}
      {busy && (
        <div className="flex flex-wrap gap-2">
          {pipelineKeys.map((key, i) => {
            const isActive = key === step; const isDone = i < stepIndex;
            return (
              <div key={key} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${isActive ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-400 animate-pulse" : isDone ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-white/10 bg-white/5 text-zinc-500"}`}>
                {isActive ? <Loader2 className="w-3 h-3 animate-spin" /> : isDone ? "✓" : ""}{PIPELINE_LABELS[key] ?? key}
              </div>
            );
          })}
        </div>
      )}

      {/* Error */}
      {step === "error" && <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl"><AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" /><p className="text-sm text-red-400">{error}</p></div>}

      {/* Results */}
      {step === "done" && result && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-green-400"><CheckCircle className="w-5 h-5" /><span className="text-sm font-medium">Task #{result.taskId} completed</span></div>
            <span className="text-xs text-zinc-500">{result.agentsHired.length} agents · {result.txHashes.length} txs</span>
            <a href={`https://celoscan.io/tx/${result.txHashes[0]}`} target="_blank" rel="noreferrer" className="text-xs text-cyan-400 hover:underline">Celoscan →</a>
          </div>

          {(["research","riskAnalysis","coding","design","audit","report"] as const).map(key => {
            const val = enhanced[key] ?? result[key];
            if (!val) return null;
            const isOpen = expanded === key;
            return (
              <div key={key} className="border border-white/10 rounded-xl overflow-hidden">
                <button onClick={() => setExpanded(isOpen ? null : key)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/[0.08] transition-colors text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{OUTPUT_LABELS[key]}</span>
                    {enhanced[key] && <span className="text-xs text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">enhanced</span>}
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                </button>
                {isOpen && (
                  <div className="border-t border-white/5">
                    <div className={`px-4 py-4 text-sm leading-relaxed max-h-[600px] overflow-y-auto ${
                      key === "coding" || (key === "report" && val.includes("// === FILE:"))
                        ? "font-mono text-green-300 bg-black/30 whitespace-pre text-xs"
                        : key === "design"
                        ? "font-mono text-violet-200 bg-black/30 whitespace-pre text-xs"
                        : "text-zinc-300 whitespace-pre-wrap"
                    }`}>{val}</div>
                    {/* Enhance input */}
                    <div className="px-4 pb-4 flex gap-2">
                      <input
                        value={feedback[key] ?? ""}
                        onChange={e => setFeedback(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder="Request improvements..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50"
                      />
                      <button onClick={() => handleEnhance(key)} disabled={!feedback[key]?.trim() || enhancing === key}
                        className="flex items-center gap-1.5 px-3 py-2 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-lg text-xs font-medium hover:bg-cyan-500/30 transition-colors disabled:opacity-40">
                        {enhancing === key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}Enhance
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
