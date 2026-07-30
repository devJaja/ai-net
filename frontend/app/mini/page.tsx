"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import {
  Send, Loader2, CheckCircle, ChevronDown, ChevronUp,
  AlertCircle, Sparkles, Coins, Zap, Shield,
} from "lucide-react";
import { encodeFunctionData, createWalletClient, custom, parseUnits } from "viem";
import { celo } from "viem/chains";
import { useMiniPay } from "@/hooks/use-minipay";
import { CONTRACTS, BACKEND_URL } from "@/lib/constants";
import { parseError } from "@/lib/errors";
import { switchToCelo } from "@/lib/chain";

// ── Constants ─────────────────────────────────────────────────────────────────

/** cUSD on Celo Mainnet */
const CUSD_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a" as const;

/** Task price: 0.001 cUSD (18 decimals) */
const TASK_PRICE_CUSD = parseUnits("0.001", 18);

/** Task price in CELO wei (~0.0008 CELO ≈ $0.001) */
const TASK_PRICE_CELO = BigInt("800000000000000");

const CREATE_TASK_ABI = [{
  name: "createTask", type: "function", stateMutability: "payable",
  inputs: [{ name: "description", type: "string" }, { name: "duration", type: "uint256" }],
  outputs: [{ name: "", type: "uint256" }],
}] as const;

const ERC20_TRANSFER_ABI = [{
  name: "transfer", type: "function", stateMutability: "nonpayable",
  inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
  outputs: [{ name: "", type: "bool" }],
}] as const;

const PIPELINE_LABELS: Record<string, string> = {
  creating: "Sending payment",
  research: "Researching",
  risk: "Analyzing risks",
  coding: "Writing code",
  design: "Designing",
  audit: "Auditing",
  report: "Writing report",
};

const OUTPUT_LABELS: Record<string, string> = {
  research: "Research",
  riskAnalysis: "Risk Analysis",
  coding: "Code",
  design: "Design",
  audit: "Audit",
  report: "Final Report",
};

const EXAMPLE_PROMPTS = [
  "What are the best mobile money opportunities in East Africa?",
  "Explain the risks of investing in DeFi stablecoins",
  "How do I start a small food business in Ghana?",
  "What are the pros and cons of solar energy for homes?",
  "Compare the top 3 crypto wallets for beginners",
];

interface TaskResult {
  taskId: string;
  agentsHired: string[];
  txHashes: string[];
  research?: string;
  riskAnalysis?: string;
  coding?: string;
  design?: string;
  audit?: string;
  report?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MiniPage() {
  const { isMiniPay, address, connect } = useMiniPay();

  const [question, setQuestion]   = useState("");
  const [step, setStep]           = useState<string>("idle");
  const [result, setResult]       = useState<TaskResult | null>(null);
  const [error, setError]         = useState("");
  const [txHash, setTxHash]       = useState("");
  const [expanded, setExpanded]   = useState<string | null>("report");
  const [capabilities, setCapabilities] = useState<string[]>([]);

  const busy = step !== "idle" && step !== "done" && step !== "error";

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!question.trim() || busy) return;

    // On desktop (no MiniPay), prompt wallet connection
    if (!address) {
      if (isMiniPay) {
        connect();
      } else {
        setError("Open AI-Net inside MiniPay to submit questions.");
        setStep("error");
      }
      return;
    }

    setResult(null);
    setError("");
    setTxHash("");
    setStep("creating");

    try {
      // Guard: must have window.ethereum (MiniPay or any injected wallet)
      const ethereum = (window as any).ethereum;
      if (!ethereum) throw new Error("No wallet found. Open this app inside MiniPay.");

      // MiniPay is always on Celo — only switch for desktop/injected wallets
      if (!isMiniPay) await switchToCelo();
      const walletClient = createWalletClient({ chain: celo, transport: custom(ethereum) });

      // ── 1. Call createTask with native CELO to escrow budget on-chain ──
      // TaskCoordinator.createTask requires msg.value > 0 (native CELO only).
      // Pass feeCurrency = cUSD so gas is paid in cUSD (Celo fee abstraction),
      // meaning users don't need a separate CELO balance for gas inside MiniPay.
      const hash = await walletClient.sendTransaction({
        account: address,
        to: CONTRACTS.TASK_COORDINATOR,
        data: encodeFunctionData({
          abi: CREATE_TASK_ABI,
          functionName: "createTask",
          args: [question, BigInt(7 * 24 * 60 * 60)],
        }),
        value: TASK_PRICE_CELO,
        feeCurrency: CUSD_ADDRESS,
      });
      setTxHash(hash);

      // ── 1b. cUSD micro-fee — non-blocking, signals pay-per-use intent ──
      // If the user has no cUSD balance this silently skips — task still runs.
      try {
        await walletClient.sendTransaction({
          account: address,
          to: CUSD_ADDRESS,
          data: encodeFunctionData({
            abi: ERC20_TRANSFER_ABI,
            functionName: "transfer",
            args: [CONTRACTS.TASK_COORDINATOR, TASK_PRICE_CUSD],
          }),
          value: BigInt(0),
        });
      } catch {
        // cUSD transfer optional — CELO payment above is sufficient
      }

      // ── 2. Auto-select agents ──
      let activeCaps = ["research", "risk", "report"];
      try {
        const suggestRes = await fetch(`${BACKEND_URL}/suggest-agents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: question }),
        });
        const suggestData = await suggestRes.json();
        if (suggestData.capabilities?.length) activeCaps = suggestData.capabilities;
      } catch {}
      setCapabilities(activeCaps);

      // Animate through pipeline steps
      const pipelineKeys = ["creating", ...activeCaps];
      let si = 1;
      const ticker = setInterval(() => {
        si = Math.min(si + 1, pipelineKeys.length - 1);
        setStep(pipelineKeys[si]);
      }, 12_000);

      // ── 3. Run AI pipeline ──
      const taskRes = await fetch(`${BACKEND_URL}/task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: question, budgetEth: "0.008", capabilities: activeCaps }),
        signal: AbortSignal.timeout(300_000),
      });
      clearInterval(ticker);

      if (!taskRes.ok) {
        const err = await taskRes.json().catch(() => ({ error: taskRes.statusText }));
        throw new Error(err.error ?? taskRes.statusText);
      }

      const data = await taskRes.json();
      setResult(data);
      setStep("done");
    } catch (e: unknown) {
      setError(parseError(e));
      setStep("error");
    }
  }, [question, busy, address, isMiniPay, connect]);

  // ── Render ──────────────────────────────────────────────────────────────────

  const pipelineKeys = ["creating", ...capabilities];
  const stepIndex = pipelineKeys.indexOf(step);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#07070f" }}>

      {/* ── Header ── */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
        <div className="w-8 h-8 rounded-xl overflow-hidden ring-1 ring-white/10 flex-shrink-0">
          <Image src="/logo.png" alt="AI-Net" width={32} height={32} className="object-cover w-full h-full" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-sm text-white leading-none">AI-Net</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Pay-per-question AI</p>
        </div>
        {address ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[11px] font-medium text-green-400">
              {address.slice(0, 6)}…{address.slice(-4)}
            </span>
          </div>
        ) : (
          <button
            onClick={connect}
            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-cyan-500 to-violet-600 text-white"
          >
            Connect
          </button>
        )}
      </header>

      {/* ── Main ── */}
      <main className="flex-1 px-3 md:px-4 py-5 space-y-5 overflow-auto pb-8 safe-bottom">

        {/* ── Value prop (shown on idle) ── */}
        {step === "idle" && !result && (
          <div className="space-y-4">
            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <p className="text-sm font-semibold text-white">How it works</p>
              </div>
              <div className="space-y-2.5">
                {[
                  { icon: Coins,  color: "text-yellow-400", text: "Pay $0.001 per question in cUSD — no subscription" },
                  { icon: Zap,    color: "text-cyan-400",   text: "AI agents research, analyze, and write your report" },
                  { icon: Shield, color: "text-green-400",  text: "Private inference via Venice AI — your data stays yours" },
                ].map(({ icon: Icon, color, text }) => (
                  <div key={text} className="flex items-start gap-2.5">
                    <Icon className={`w-4 h-4 ${color} mt-0.5 flex-shrink-0`} />
                    <p className="text-xs text-slate-300 leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Example prompts */}
            <div>
              <p className="text-xs text-slate-500 mb-2">Try asking:</p>
              <div className="space-y-2">
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setQuestion(prompt)}
                    className="w-full text-left px-3 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs text-slate-300 hover:border-cyan-500/30 hover:bg-cyan-500/5 hover:text-white transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Question input ── */}
        <div className="space-y-3">
          <div className="relative">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask anything… get a full AI report for $0.001"
              className="w-full h-28 bg-white/5 border border-white/10 rounded-2xl p-4 pr-14 text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 resize-none text-sm transition-all"
              disabled={busy}
            />
            <button
              onClick={handleSubmit}
              disabled={!question.trim() || busy}
              className="absolute bottom-3 right-3 w-9 h-9 flex items-center justify-center bg-gradient-to-br from-cyan-500 to-violet-600 rounded-xl text-white disabled:opacity-40 transition-opacity active:scale-95"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>

          {!address && (
            <p className="text-center text-xs text-zinc-500">
              <button onClick={connect} className="text-cyan-400">Connect MiniPay</button> to send your first question
            </p>
          )}

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-600">
            <Coins className="w-3 h-3" />
            <span>0.001 cUSD per question · Powered by Celo</span>
          </div>
        </div>

        {/* ── Progress ── */}
        {busy && (
          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
              <p className="text-sm font-medium text-white">Working on it…</p>
            </div>
            <div className="space-y-2">
              {pipelineKeys.map((key, i) => {
                const isActive = key === step;
                const isDone = i < stepIndex;
                return (
                  <div key={key} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive ? "bg-cyan-500/10 border border-cyan-500/30 text-cyan-400" :
                    isDone   ? "bg-green-500/10 border border-green-500/20 text-green-400" :
                               "border border-white/[0.06] text-zinc-600"
                  }`}>
                    {isActive ? <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" /> :
                     isDone   ? <CheckCircle className="w-3 h-3 flex-shrink-0" /> :
                                <span className="w-3 h-3 flex-shrink-0" />}
                    {PIPELINE_LABELS[key] ?? key}
                  </div>
                );
              })}
            </div>
            {txHash && (
              <a
                href={`https://celoscan.io/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-[11px] text-cyan-400"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Payment confirmed on Celo
              </a>
            )}
          </div>
        )}

        {/* ── Error ── */}
        {step === "error" && (
          <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={() => setStep("idle")}
                className="text-xs text-zinc-400 underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* ── Results ── */}
        {step === "done" && result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <p className="text-sm font-semibold text-white">Your report is ready</p>
            </div>

            {(["report", "research", "riskAnalysis", "coding", "design", "audit"] as const).map((key) => {
              const val = result[key as keyof TaskResult] as string | undefined;
              if (!val) return null;
              const isOpen = expanded === key;
              return (
                <div key={key} className="border border-white/[0.08] rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setExpanded(isOpen ? null : key)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.04] active:bg-white/[0.08] transition-colors text-left"
                  >
                    <span className="text-sm font-medium text-white">{OUTPUT_LABELS[key]}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                  </button>
                  {isOpen && (
                    <div className="border-t border-white/[0.05] px-4 py-4 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                      {val}
                    </div>
                  )}
                </div>
              );
            })}

            <button
              onClick={() => { setQuestion(""); setStep("idle"); setResult(null); }}
              className="w-full py-3 rounded-2xl border border-white/10 text-sm text-zinc-400 active:bg-white/5 transition-colors"
            >
              Ask another question
            </button>

            {txHash && (
              <a
                href={`https://celoscan.io/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="block text-center text-[11px] text-cyan-400"
              >
                View transaction on Celoscan →
              </a>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
