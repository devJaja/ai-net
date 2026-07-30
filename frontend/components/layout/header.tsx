"use client";

import { Search, Menu, Smartphone, X } from "lucide-react";
import { WalletConnect } from "./wallet-connect";
import { useState, useRef, useEffect } from "react";

interface HeaderProps {
  onMenuClick: () => void;
  isMiniPay?: boolean;
  miniPayAddress?: `0x${string}` | null;
}

export function Header({ onMenuClick, isMiniPay, miniPayAddress }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  return (
    <header className="h-14 flex items-center gap-2 md:gap-3 px-3 md:px-6 flex-shrink-0 border-b border-white/[0.06] sticky top-0 z-30 safe-top"
      style={{ background: "rgba(7,7,15,0.9)", backdropFilter: "blur(20px)" }}>

      {!isMiniPay && (
        <button onClick={onMenuClick} className="lg:hidden tap-target text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Search: full width on mobile when toggled */}
      <div className={`relative flex-1 ${searchOpen ? "block" : "hidden sm:block"} max-w-xs md:max-w-sm`}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 pointer-events-none" />
        <input ref={searchRef} type="text" placeholder="Search agents, tasks, capabilities…"
          className="input-base pl-9 pr-4 py-1.5 text-sm w-full" />
      </div>

      <div className="flex items-center gap-1.5 md:gap-2.5 ml-auto">
        {/* Mobile search toggle */}
        <button onClick={() => setSearchOpen(!searchOpen)} className="sm:hidden tap-target text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">
          {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
        </button>

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-medium text-green-400">Celo Mainnet</span>
        </div>
        <div className="hidden md:block h-4 w-px bg-white/10" />

        {isMiniPay && miniPayAddress ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-green-500/20 bg-green-500/5">
            <Smartphone className="w-3.5 h-3.5 text-green-400" />
            <span className="text-sm font-medium text-slate-200 hidden xs:inline">
              {miniPayAddress.slice(0, 6)}…{miniPayAddress.slice(-4)}
            </span>
          </div>
        ) : (
          <WalletConnect />
        )}
      </div>
    </header>
  );
}
