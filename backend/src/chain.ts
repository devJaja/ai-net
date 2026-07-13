import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  type PublicClient,
  type WalletClient,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "./config";
import { toDataSuffix } from "@celo/attribution-tags";

// Define the chain dynamically from env so this works on any EVM network
export const chain = defineChain({
  id: config.chainId,
  name: "AI-Net Chain",
  nativeCurrency: { name: "Celo", symbol: "CELO", decimals: 18 },
  rpcUrls: { default: { http: [config.rpcUrl] } },
});

export const account = privateKeyToAccount(config.coordinatorKey);

// Public client — read-only chain queries
export const publicClient: PublicClient = createPublicClient({
  chain,
  transport: http(config.rpcUrl),
});

// Wallet client — signs and broadcasts transactions directly.
// To enable 1Shot gasless relay, replace the transport with:
//   http(`${config.oneshotBaseUrl}/relay`, { fetchOptions: { headers: { "x-api-key": config.oneshotApiKey } } })
export const walletClient: WalletClient = createWalletClient({
  account,
  chain,
  transport: http(config.rpcUrl),
});

// ── Attribution Tag (ERC-8021) ────────────────────────────────────────────────
// Your assigned attribution tag from Celo Builders registration.
// EVERY transaction must include this tag via the data suffix.
const ATTRIBUTION_TAG = config.attributionTag;

/**
 * Appends the ERC-8021 attribution tag to existing calldata.
 * Use this after viem encodes the function call so the tag is a suffix,
 * not a replacement.
 */
export function appendAttributionTag(calldata: Hex): Hex {
  if (!ATTRIBUTION_TAG) {
    console.warn("[Chain] No ATTRIBUTION_TAG configured — transaction will NOT be credited on leaderboard");
    return calldata;
  }
  const tagBytes = toDataSuffix(ATTRIBUTION_TAG);
  // tagBytes is the raw ERC-8021 suffix bytes — concatenate after the original calldata
  return (calldata + tagBytes.slice(2)) as Hex; // strip leading "0x" from tagBytes before concat
}
