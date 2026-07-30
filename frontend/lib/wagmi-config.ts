import { createConfig, http, cookieStorage, createStorage } from "wagmi";
import { celo } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

export const wagmiConfig = createConfig({
  chains: [celo],
  transports: { [celo.id]: http() },
  connectors: [
    injected(),
    ...(projectId ? [walletConnect({ projectId })] : []),
  ],
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
});
