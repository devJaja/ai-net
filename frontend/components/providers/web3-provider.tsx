"use client";

import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi-config";
import { setModal } from "@/lib/web3modal";

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";
    if (!projectId) return;

    import("@web3modal/wagmi/react").then(({ createWeb3Modal }) => {
      const modal = createWeb3Modal({
        wagmiConfig,
        projectId,
        enableAnalytics: false,
        themeMode: "dark",
        themeVariables: {
          "--w3m-color-mix": "#07070f",
          "--w3m-color-mix-strength": 40,
        },
      });
      setModal(modal);
    });
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
