"use client";

import { useState, useCallback, useEffect } from "react";
import { createWalletClient, custom, type WalletClient } from "viem";
import { celo } from "viem/chains";
import { parseError } from "@/lib/errors";
import { switchToCelo } from "@/lib/chain";

/**
 * useWallet — injected wallet hook for desktop pages.
 *
 * Uses window.ethereum directly (MetaMask, Rabby, Coinbase Wallet, etc.)
 * following the same pattern as useMiniPay. This avoids any dependency on
 * Privy being configured, which is an optional enhancement.
 *
 * For MiniPay pages, use useMiniPay instead.
 */

export interface WalletState {
  connected: boolean;
  address: `0x${string}` | "";
  connecting: boolean;
  copied: boolean;
  smartAccount: boolean;
  walletClient: WalletClient | null;
  connectError: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  copyAddress: () => void;
}

export function useWallet(): WalletState {
  const [address, setAddress]           = useState<`0x${string}` | "">("");
  const [connecting, setConnecting]     = useState(false);
  const [copied, setCopied]             = useState(false);
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [connectError, setConnectError] = useState("");

  // Auto-connect if wallet already authorised (e.g. page refresh)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const eth = (window as any).ethereum;
    if (!eth) return;
    eth.request({ method: "eth_accounts" })
      .then((accounts: string[]) => {
        if (accounts[0]) {
          setAddress(accounts[0] as `0x${string}`);
          setWalletClient(createWalletClient({ chain: celo, transport: custom(eth) }));
        }
      })
      .catch(() => {});

    // Keep address in sync when user switches account in wallet
    const onAccountsChanged = (accounts: string[]) => {
      setAddress((accounts[0] as `0x${string}`) ?? "");
      if (!accounts[0]) setWalletClient(null);
    };
    // Reset wallet client when user switches network (forces switchToCelo on next connect)
    const onChainChanged = () => {
      setWalletClient(null);
    };
    eth.on?.("accountsChanged", onAccountsChanged);
    eth.on?.("chainChanged", onChainChanged);
    return () => {
      eth.removeListener?.("accountsChanged", onAccountsChanged);
      eth.removeListener?.("chainChanged", onChainChanged);
    };
  }, []);

  const connect = useCallback(async () => {
    if (typeof window === "undefined") return;
    const eth = (window as any).ethereum;
    if (!eth) {
      setConnectError("No wallet detected. Install MetaMask or open in MiniPay.");
      return;
    }
    setConnecting(true);
    setConnectError("");
    try {
      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
      if (accounts[0]) {
        setAddress(accounts[0] as `0x${string}`);
        try { await switchToCelo(); } catch { /* non-fatal */ }
        setWalletClient(createWalletClient({ chain: celo, transport: custom(eth) }));
      }
    } catch (e) {
      setConnectError(parseError(e));
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress("");
    setWalletClient(null);
  }, []);

  const copyAddress = useCallback(() => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [address]);

  return {
    connected: !!address,
    address,
    connecting,
    copied,
    smartAccount: false, // standard injected wallets are EOAs
    walletClient,
    connectError,
    connect,
    disconnect,
    copyAddress,
  };
}
