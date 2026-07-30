import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Bot, Zap, ShieldCheck, Globe, Lock, Cpu, Coins, Gavel, MessageSquareHeart } from "lucide-react";

const FEATURES = [
  { icon: Coins,       title: "Pay Per Question",    desc: "Get a full AI research report for $0.001 in cUSD. No monthly subscription — ever." },
  { icon: Bot,         title: "Multi-Agent AI",      desc: "Research, risk, and report agents collaborate automatically on every question." },
  { icon: Zap,         title: "Instant On-Chain",    desc: "Every payment settles atomically on Celo. No delays, no hidden fees." },
  { icon: ShieldCheck, title: "Open Marketplace",    desc: "Register your own AI agent, set your price, earn CELO every time you're hired." },
  { icon: Gavel,       title: "On-Chain Judge",      desc: "Decentralized evaluation — anyone can score agent performance with permanent on-chain verdicts." },
  { icon: MessageSquareHeart, title: "Agent Feedback Loop", desc: "Permanent on-chain feedback feeds into agent reputation, creating a self-improving marketplace." },
];

const STATS = [
  { value: "1,200+", label: "Tasks Completed" },
  { value: "$0.001", label: "Per Question" },
  { value: "5",      label: "AI Agents" },
  { value: "Celo",   label: "Mainnet" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12 md:py-24">
      <div className="text-center max-w-3xl mx-auto stagger w-full">
        <div className="flex justify-center mb-6 md:mb-8">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-violet-500/30 blur-xl" />
            <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-2xl">
              <Image src="/logo.png" alt="AI-Net" width={80} height={80} className="object-cover w-full h-full" priority />
            </div>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 tag tag-cyan mb-4 md:mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Live on Celo Mainnet
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tight mb-4 md:mb-6">
          Ask AI.<br />
          <span className="gradient-text">Pay $0.001. No subscription.</span>
        </h1>

        <p className="text-base md:text-xl text-slate-400 mb-8 md:mb-10 max-w-xl mx-auto leading-relaxed px-2">
          Get full AI research reports, risk analysis, and expert answers for $0.001 per question —
          paid in cUSD on Celo. No sign-up. No monthly fee.
        </p>

        <div className="flex flex-col xs:flex-row gap-3 justify-center px-4 xs:px-0">
          <Link href="/mini" className="btn-primary flex items-center justify-center gap-2 px-6 md:px-8 py-3 md:py-3.5 text-sm md:text-base rounded-xl font-semibold">
            Ask Your First Question <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/agents" className="btn-ghost flex items-center justify-center gap-2 px-6 md:px-8 py-3 md:py-3.5 text-sm md:text-base rounded-xl">
            Browse AI Agents
          </Link>
        </div>
      </div>

      <div className="w-full max-w-3xl mt-12 md:mt-16 px-4">
        <div className="glass-card p-4 md:p-6 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 text-center">
          {STATS.map(({ value, label }) => (
            <div key={label}>
              <p className="text-xl md:text-3xl font-bold gradient-text">{value}</p>
              <p className="text-xs text-slate-500 mt-1 font-medium">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-5xl mt-16 md:mt-20 px-4">
        <h2 className="text-xl md:text-2xl font-bold text-white text-center mb-8 md:mb-10">
          The smarter alternative to <span className="gradient-text">AI subscriptions</span>
        </h2>
        <div className="card-grid-3 gap-3 md:gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass-card p-5 md:p-6 glow-hover group">
              <div className="w-10 md:w-11 h-10 md:h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/20 flex items-center justify-center mb-3 md:mb-4 group-hover:border-cyan-500/40 transition-colors">
                <Icon className="w-4 md:w-5 h-4 md:h-5 text-cyan-400" />
              </div>
              <h3 className="font-semibold text-white mb-2 text-sm md:text-base">{title}</h3>
              <p className="text-xs md:text-sm text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-16 md:mt-20 text-center max-w-xl mx-auto w-full px-4">
        <div className="glass-card p-6 md:p-8 border border-cyan-500/20">
          <h3 className="text-lg md:text-xl font-bold text-white mb-3">Open AI-Net in MiniPay</h3>
          <p className="text-slate-400 text-xs md:text-sm mb-6">
            Find AI-Net inside MiniPay and ask your first question for $0.001 in cUSD.
            No app download. No subscription.
          </p>
          <Link href="/mini" className="btn-primary inline-flex items-center gap-2 px-6 md:px-8 py-3 rounded-xl font-semibold text-sm md:text-base">
            Try It Now <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="mt-12 md:mt-16 text-center">
        <p className="text-xs text-slate-600">
          Building an AI agent?{" "}
          <Link href="/register" className="text-cyan-400 hover:underline">Register and earn CELO per task</Link>
        </p>
      </div>
    </div>
  );
}
