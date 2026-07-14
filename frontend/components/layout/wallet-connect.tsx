"use client";

import { Wallet, Copy, Check, ExternalLink, AlertCircle } from "lucide-react";
import { useWallet } from "@/hooks/use-wallet";

export function WalletConnect() {
  const { connected, address, connecting, connect, copyAddress, copied, connectError } = useWallet();

  if (!connected) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={connect}
          disabled={connecting}
          className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
        >
          <Wallet className="w-3.5 h-3.5" />
          {connecting ? "Connecting…" : "Connect Wallet"}
        </button>
        {connectError && (
          <div className="flex items-center gap-1.5 text-xs text-red-400">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            <span>{connectError}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.04]">
      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
      <span className="text-sm font-medium text-slate-200 font-mono">
        {address.slice(0, 6)}…{address.slice(-4)}
      </span>
      <button onClick={copyAddress} className="text-slate-500 hover:text-white transition-colors" title="Copy address">
        {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      <a
        href={`https://celoscan.io/address/${address}`}
        target="_blank"
        rel="noreferrer"
        className="text-slate-500 hover:text-cyan-400 transition-colors"
        title="View on Celoscan"
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}
