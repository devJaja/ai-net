/**
 * ERC-8004 Agent Identity Registration
 * 
 * Registers the AI-Net coordinator as an ERC-8004 agent on Celo Mainnet.
 * This is required for hackathon submission — the 8004scan URL must be
 * included in the submission fields.
 */
import { walletClient, publicClient, chain, account } from "./chain";
import { config } from "./config";
import { toHex } from "viem";

// ERC-8004 Identity Registry on Celo Mainnet
const IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as const;

// Minimal ABI for the register function
const IDENTITY_REGISTRY_ABI = [
  {
    name: "register",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "metadataUri", type: "string" }],
    outputs: [],
  },
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "getAgentWallet",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

/**
 * Agent metadata JSON for ERC-8004 registration
 */
function buildAgentMetadata(): object {
  return {
    type: "Agent",
    name: "AI-Net Coordinator",
    description: "Autonomous AI agent coordinator that manages task delegation, agent hiring, and payment routing on Celo. Part of the AI-Net decentralized agent economy.",
    image: "https://ai-net.vercel.app/logo.png",
    endpoints: [
      {
        type: "a2a",
        url: "https://ai-net.vercel.app/api/backend/task",
      },
      {
        type: "a2a",
        url: "https://ai-net.vercel.app/api/backend/health",
      },
    ],
    supportedTrust: ["reputation", "validation"],
    capabilities: [
      "task-coordination",
      "agent-discovery",
      "payment-routing",
      "x402-payments",
      "research",
      "risk-analysis",
      "coding",
      "design",
      "audit",
      "report",
    ],
    attributionTag: config.attributionTag,
    website: "https://ai-net.vercel.app",
    github: "https://github.com/devJaja/ai-net",
  };
}

/**
 * Register the agent on ERC-8004 and return the agent ID
 */
export async function registerAgentIdentity(): Promise<{ agentId: bigint; txHash: string; metadataUri: string }> {
  const metadata = buildAgentMetadata();
  
  // For now, use a data URI pointing to the metadata
  // In production, you'd upload to IPFS and use ipfs://...
  const metadataJson = JSON.stringify(metadata, null, 2);
  const metadataUri = `data:application/json;base64,${Buffer.from(metadataJson).toString("base64")}`;

  console.log("[ERC-8004] Registering agent identity...");
  console.log("[ERC-8004] Metadata:", metadataJson.slice(0, 200) + "...");

  // Register the agent
  const hash = await walletClient.writeContract({
    chain,
    account,
    address: IDENTITY_REGISTRY,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "register",
    args: [metadataUri],
  } as any);

  console.log(`[ERC-8004] Transaction submitted: ${hash}`);

  // Wait for confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  
  // Find the Transfer event (topic[0] = keccak256("Transfer(address,address,uint256)"))
  const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
  const transferLog = receipt.logs.find(log => log.topics[0] === transferTopic);
  
  if (!transferLog || !transferLog.topics[3]) {
    throw new Error("Transfer event not found in receipt — registration may have failed");
  }

  const agentId = BigInt(transferLog.topics[3]);
  
  console.log(`[ERC-8004] Agent registered with ID: ${agentId}`);
  console.log(`[ERC-8004] 8004scan URL: https://8004scan.io/agents/celo/${agentId}`);

  return { agentId, txHash: hash, metadataUri };
}

/**
 * Check if an agent identity exists
 */
export async function getAgentIdentity(agentId: bigint): Promise<{ uri: string; wallet: string } | null> {
  try {
    const [uri, wallet] = await Promise.all([
      publicClient.readContract({
        address: IDENTITY_REGISTRY,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: "tokenURI",
        args: [agentId],
      }),
      publicClient.readContract({
        address: IDENTITY_REGISTRY,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: "getAgentWallet",
        args: [agentId],
      }),
    ]);

    return { uri: uri as string, wallet: wallet as string };
  } catch {
    return null;
  }
}
