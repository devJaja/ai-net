"use client";

import { useState, useEffect } from "react";
import {
  Gavel,
  MessageSquareHeart,
  Star,
  Search,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  ExternalLink,
} from "lucide-react";

const API = "/api";

interface Reputation {
  avgScore: number;
  avgRating: number;
  evalCount: number;
  feedbackCount: number;
  passCount: number;
  failCount: number;
}

interface JudgeStats {
  judgeAddress: string;
  totalEvaluations: number;
  totalFeedbacks: number;
}

export default function JudgePage() {
  const [tab, setTab] = useState<"evaluate" | "feedback" | "reputation">("evaluate");
  const [stats, setStats] = useState<JudgeStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Evaluate form
  const [evalTaskId, setEvalTaskId] = useState("");
  const [evalAgent, setEvalAgent] = useState("");
  const [evalScore, setEvalScore] = useState(7);
  const [evalVerdict, setEvalVerdict] = useState("PASS");
  const [evalRationale, setEvalRationale] = useState("");

  // Feedback form
  const [fbTaskId, setFbTaskId] = useState("");
  const [fbAgent, setFbAgent] = useState("");
  const [fbContent, setFbContent] = useState("");
  const [fbRating, setFbRating] = useState(4);

  // Reputation lookup
  const [repAddr, setRepAddr] = useState("");
  const [reputation, setReputation] = useState<Reputation | null>(null);

  useEffect(() => {
    fetch(`${API}/judge/stats`)
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  async function handleEvaluate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API}/judge/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: evalTaskId,
          agent: evalAgent,
          score: evalScore,
          verdict: evalVerdict,
          rationale: evalRationale,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Evaluation failed");
      setResult(`Evaluation #${data.evalId} submitted! TX: ${data.txHash}`);
      setEvalTaskId("");
      setEvalAgent("");
      setEvalRationale("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleFeedback(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API}/judge/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: fbTaskId,
          agent: fbAgent,
          content: fbContent,
          rating: fbRating,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Feedback failed");
      setResult(`Feedback #${data.feedbackId} submitted! TX: ${data.txHash}`);
      setFbTaskId("");
      setFbAgent("");
      setFbContent("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setReputation(null);
    try {
      const res = await fetch(`${API}/judge/reputation/${repAddr}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lookup failed");
      setReputation(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Judge &amp; Feedback</h1>
          <p className="text-sm text-slate-400 mt-1">
            On-chain agent evaluation and reputation tracking — Track 3 &amp; 4
          </p>
        </div>
        {stats && (
          <div className="flex gap-3">
            <div className="glass-card px-4 py-2 text-center">
              <div className="text-lg font-bold text-cyan-400">{stats.totalEvaluations}</div>
              <div className="text-xs text-slate-400">Evaluations</div>
            </div>
            <div className="glass-card px-4 py-2 text-center">
              <div className="text-lg font-bold text-violet-400">{stats.totalFeedbacks}</div>
              <div className="text-xs text-slate-400">Feedbacks</div>
            </div>
          </div>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2">
        {([
          { key: "evaluate", label: "Evaluate", icon: Gavel },
          { key: "feedback", label: "Feedback", icon: MessageSquareHeart },
          { key: "reputation", label: "Reputation", icon: TrendingUp },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setError(null); setResult(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key
                ? "bg-gradient-to-r from-cyan-500/20 to-violet-500/15 text-cyan-400 border border-cyan-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert-error flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}
      {result && (
        <div className="alert-success flex items-center gap-2">
          <CheckCircle2 size={16} /> {result}
          {result.includes("TX:") && (
            <a
              href={`https://celoscan.io/tx/${result.split("TX: ")[1]}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-xs"
            >
              View <ExternalLink size={12} />
            </a>
          )}
        </div>
      )}

      {/* ─── Evaluate Tab ─── */}
      {tab === "evaluate" && (
        <form onSubmit={handleEvaluate} className="glass-card space-y-4 animate-slide-up">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Gavel size={18} className="text-cyan-400" /> Evaluate Agent Performance
          </h2>
          <p className="text-sm text-slate-400">
            Judge an agent&apos;s work on a completed task. Score and verdict are permanently recorded on-chain.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Task ID</label>
              <input
                type="text"
                className="input-base w-full"
                placeholder="e.g. 1234"
                value={evalTaskId}
                onChange={(e) => setEvalTaskId(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Agent Address</label>
              <input
                type="text"
                className="input-base w-full"
                placeholder="0x..."
                value={evalAgent}
                onChange={(e) => setEvalAgent(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Score (1–10)</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={evalScore}
                  onChange={(e) => setEvalScore(Number(e.target.value))}
                  className="flex-1 accent-cyan-500"
                />
                <span className="text-lg font-bold text-cyan-400 w-8 text-center">{evalScore}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Verdict</label>
              <select
                className="input-base w-full"
                value={evalVerdict}
                onChange={(e) => setEvalVerdict(e.target.value)}
              >
                <option value="PASS">PASS</option>
                <option value="FAIL">FAIL</option>
                <option value="NEEDS_REVISION">NEEDS_REVISION</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Rationale</label>
            <textarea
              className="input-base w-full h-24 resize-none"
              placeholder="Explain why this score..."
              value={evalRationale}
              onChange={(e) => setEvalRationale(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary flex items-center gap-2" disabled={loading}>
            {loading ? <Clock size={16} className="animate-spin" /> : <Send size={16} />}
            {loading ? "Submitting..." : "Submit Evaluation"}
          </button>
        </form>
      )}

      {/* ─── Feedback Tab ─── */}
      {tab === "feedback" && (
        <form onSubmit={handleFeedback} className="glass-card space-y-4 animate-slide-up">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquareHeart size={18} className="text-violet-400" /> Submit Feedback
          </h2>
          <p className="text-sm text-slate-400">
            Leave permanent feedback for an agent. Ratings feed into the on-chain reputation system.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Task ID</label>
              <input
                type="text"
                className="input-base w-full"
                placeholder="e.g. 1234"
                value={fbTaskId}
                onChange={(e) => setFbTaskId(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Agent Address</label>
              <input
                type="text"
                className="input-base w-full"
                placeholder="0x..."
                value={fbAgent}
                onChange={(e) => setFbAgent(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Rating (1–5 stars)</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setFbRating(n)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    size={28}
                    className={n <= fbRating ? "text-amber-400 fill-amber-400" : "text-slate-600"}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Feedback Content</label>
            <textarea
              className="input-base w-full h-24 resize-none"
              placeholder="Describe the agent's performance..."
              value={fbContent}
              onChange={(e) => setFbContent(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary flex items-center gap-2" disabled={loading}>
            {loading ? <Clock size={16} className="animate-spin" /> : <Send size={16} />}
            {loading ? "Submitting..." : "Submit Feedback"}
          </button>
        </form>
      )}

      {/* ─── Reputation Tab ─── */}
      {tab === "reputation" && (
        <div className="space-y-4 animate-slide-up">
          <form onSubmit={handleLookup} className="glass-card space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp size={18} className="text-green-400" /> Agent Reputation Lookup
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                className="input-base flex-1"
                placeholder="Enter agent address (0x...)"
                value={repAddr}
                onChange={(e) => setRepAddr(e.target.value)}
                required
              />
              <button type="submit" className="btn-primary flex items-center gap-2" disabled={loading}>
                {loading ? <Clock size={16} className="animate-spin" /> : <Search size={16} />}
                Lookup
              </button>
            </div>
          </form>

          {reputation && (
            <div className="glass-card space-y-4">
              <h3 className="font-semibold text-slate-200">Reputation Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard label="Avg Score" value={`${reputation.avgScore}/10`} color="cyan" />
                <StatCard label="Avg Rating" value={`${reputation.avgRating}/5`} color="amber" />
                <StatCard label="Evaluations" value={reputation.evalCount} color="violet" />
                <StatCard label="Feedbacks" value={reputation.feedbackCount} color="green" />
                <StatCard label="Passed" value={reputation.passCount} color="green" />
                <StatCard label="Failed" value={reputation.failCount} color="red" />
              </div>

              {/* Reputation bar */}
              <div>
                <div className="text-xs text-slate-400 mb-1">Reputation Score</div>
                <div className="w-full bg-slate-800 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-violet-500 h-3 rounded-full transition-all"
                    style={{ width: `${Math.min((reputation.avgScore / 10) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    cyan: "text-cyan-400",
    violet: "text-violet-400",
    green: "text-green-400",
    amber: "text-amber-400",
    red: "text-red-400",
  };
  return (
    <div className="surface rounded-lg p-3 text-center">
      <div className={`text-xl font-bold ${colors[color] || "text-slate-200"}`}>{value}</div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
    </div>
  );
}
