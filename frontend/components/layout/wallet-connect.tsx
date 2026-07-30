"use client";

import { Wallet, Copy, Check, ExternalLink } from "lucide-react";
import { useAccount, useDisconnect } from "wagmi";
import { useState, useCallback } from "react";
import { openConnectModal } from "@/lib/web3modal";

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const [copied, setCopied] = useState(false);

  const copyAddress = useCallback(() => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [address]);

  if (!isConnected) {
    return (
      <button
        onClick={openConnectModal}
        className="btn-primary flex items-center gap-2 px-3 md:px-4 py-2 text-xs md:text-sm"
      >
        <Wallet className="w-3.5 h-3.5" />
        <span className="hidden xs:inline">Connect Wallet</span>
        <span className="xs:hidden">Connect</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.04]">
      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
      <span className="text-xs md:text-sm font-medium text-slate-200 font-mono">
        {address?.slice(0, 6)}…{address?.slice(-4)}
      </span>
      <button onClick={copyAddress} className="tap-target !min-w-[32px] !min-h-[32px] text-slate-500 hover:text-white transition-colors" title="Copy address">
        {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      <a
        href={`https://celoscan.io/address/${address}`}
        target="_blank"
        rel="noreferrer"
        className="tap-target !min-w-[32px] !min-h-[32px] text-slate-500 hover:text-cyan-400 transition-colors"
        title="View on Celoscan"
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}
