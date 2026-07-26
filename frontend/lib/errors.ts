/**
 * parseError — converts any thrown value into a clean, user-facing message.
 *
 * Strips raw RPC/viem/contract noise and maps known codes to plain English.
 */
export function parseError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);

  // User rejected wallet action
  if (/user rejected|user denied|rejected the request/i.test(raw))
    return "Transaction cancelled.";

  // Insufficient funds
  if (/insufficient funds|balance too low/i.test(raw))
    return "Insufficient balance to complete this transaction.";

  // Network / RPC
  if (/network changed|chain mismatch|wrong network|does not match the target chain/i.test(raw))
    return "Wrong network. Please switch to Celo Mainnet (chain 42220).";

  if (/timeout|timed out|aborted|abort/i.test(raw))
    return "Request timed out. Please try again.";

  if (/failed to fetch|network error|econnrefused|socket/i.test(raw))
    return "Could not reach the server. Check your connection and try again.";

  // Contract reverts — strip the ABI/hex blob, keep the revert reason
  const revertMatch = raw.match(/reverted with reason string '([^']+)'/);
  if (revertMatch) return revertMatch[1];

  const customRevert = raw.match(/reverted\s*(?:with custom error)?\s*'?(\w+)'?/i);
  if (customRevert) return `Transaction failed: ${customRevert[1]}`;

  if (/execution reverted/i.test(raw))
    return "Transaction was rejected by the contract.";

  // No wallet
  if (/no wallet|wallet not found|window\.ethereum/i.test(raw))
    return "No wallet detected. Open inside MiniPay or install MetaMask.";

  // Wallet extension internal error (e.g. MetaMask emit failure)
  if (/emit|listener/i.test(raw))
    return "Wallet extension error. Please refresh the page and try again.";

  // Truncate anything else at 120 chars — don't dump a stack trace on users
  return raw.length > 120 ? raw.slice(0, 120) + "…" : raw;
}
