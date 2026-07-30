"use client";

import { useState, useCallback } from "react";
import { useAccount, useDisconnect } from "wagmi";
import type { WalletClient } from "viem";
import { openConnectModal } from "@/lib/web3modal";

/**
 * useWallet — wallet hook powered by Wagmi + Web3Modal.
 *
 * Supports injected wallets (MetaMask, Rabby, MiniPay) and WalletConnect
 * protocol (mobile wallets via QR code). Desktop and mobile friendly.
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
  const { address: wagmiAddress, isConnected } = useAccount();
  const { disconnect: wagmiDisconnect } = useDisconnect();

  const [connecting, setConnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [connectError, setConnectError] = useState("");

  const connect = useCallback(async () => {
    setConnecting(true);
    setConnectError("");
    try {
      await openConnectModal();
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    wagmiDisconnect();
  }, [wagmiDisconnect]);

  const copyAddress = useCallback(() => {
    if (!wagmiAddress) return;
    navigator.clipboard.writeText(wagmiAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [wagmiAddress]);

  return {
    connected: isConnected,
    address: (wagmiAddress as `0x${string}`) ?? "",
    connecting,
    copied,
    smartAccount: false,
    walletClient: null,
    connectError,
    connect,
    disconnect,
    copyAddress,
  };
}
