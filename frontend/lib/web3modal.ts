import { wagmiConfig } from "@/lib/wagmi-config";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _modal: any = null;

export function setModal(modal: typeof _modal) {
  _modal = modal;
}

export async function openConnectModal() {
  if (_modal) {
    await _modal.open({ view: "Connect" });
    return;
  }

  // Lazy-init Web3Modal if the provider hasn't loaded it yet
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";
  if (!projectId) {
    console.warn("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set");
    return;
  }

  try {
    const { createWeb3Modal } = await import("@web3modal/wagmi/react");
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
    _modal = modal;
    await modal.open({ view: "Connect" });
  } catch (e) {
    console.error("Failed to load Web3Modal", e);
  }
}
