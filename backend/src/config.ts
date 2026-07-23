import "dotenv/config";

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env var: ${key}`);
  return val;
}

export const config = {
  rpcUrl:               required("RPC_URL"),
  chainId:              Number(required("CHAIN_ID")),
  coordinatorKey:       (required("COORDINATOR_PRIVATE_KEY").startsWith("0x") ? required("COORDINATOR_PRIVATE_KEY") : `0x${required("COORDINATOR_PRIVATE_KEY")}`) as `0x${string}`,
  veniceApiKey:         required("VENICE_API_KEY"),
  veniceBaseUrl:        process.env.VENICE_BASE_URL ?? "https://api.venice.ai/api/v1",
  oneshotApiKey:        required("ONESHOT_API_KEY"),
  oneshotBaseUrl:       process.env.ONESHOT_BASE_URL ?? "https://api.1shot.link/v1",
  port:                 Number(process.env.PORT ?? 3000),
  contracts: {
    agentRegistry:      required("AGENT_REGISTRY_ADDRESS") as `0x${string}`,
    guildPermissions:   required("GUILD_PERMISSIONS_ADDRESS") as `0x${string}`,
    taskCoordinator:    required("TASK_COORDINATOR_ADDRESS") as `0x${string}`,
  },
  // Celo Builders attribution tag (ERC-8021) — from registration
  attributionTag:       process.env.ATTRIBUTION_TAG ?? "",
  // x402 facilitator URL for Track 2 payments
  x402FacilitatorUrl:   process.env.X402_FACILITATOR_URL ?? "https://x402.celo.org",
  // USDC address on Celo mainnet (EIP-3009 compatible)
  usdcAddress:          (process.env.USDC_ADDRESS ?? "0xcebA9300f2b948710d2653dD7B07f33A8B32118C") as `0x${string}`,
  // Track 3: Askbots
  askbotsApiKey:        process.env.ASKBOTS_API_KEY ?? "",
  askbotsAgentId:       process.env.ASKBOTS_AGENT_ID ?? "",
  // Track 4: Aigora
  aigoraProfileUrl:     process.env.AIGORA_PROFILE_URL ?? "",
  aigoraFeedbackIssues: (process.env.AIGORA_FEEDBACK_ISSUES ?? "").split(",").filter(Boolean),
} as const;

// ── Minimal ABIs (only functions the backend calls) ───────────────────────────

export const agentRegistryAbi = [
  {
    name: "findByCapability",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "capability", type: "string" }],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    name: "agents",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "a", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "wallet",       type: "address" },
          { name: "endpoint",     type: "string"  },
          { name: "capability",   type: "string"  },
          { name: "pricePerTask", type: "uint256" },
          { name: "active",       type: "bool"    },
        ],
      },
    ],
  },
] as const;

export const taskCoordinatorAbi = [
  {
    name: "createTask",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "description", type: "string"  },
      { name: "duration",    type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "hireAgent",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "taskId", type: "uint256" },
      { name: "agent",  type: "address" },
    ],
    outputs: [],
  },
  {
    name: "completeTask",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "getAssignedAgents",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [{ name: "", type: "address[]" }],
  },
] as const;
