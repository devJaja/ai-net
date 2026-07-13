/**
 * Agent Runner — executes a specific agent capability and allows it to
 * autonomously hire sub-agents on-chain (Agent-to-Agent hiring).
 *
 * Each agent:
 *   1. Receives a task description
 *   2. Calls Venice AI for inference
 *   3. Can call hireAgent() on TaskCoordinator using its own wallet (A2A)
 *   4. Returns its output
 */

import { createWalletClient, http, encodeFunctionData, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { chain, publicClient, appendAttributionTag } from "./chain";
import { config, agentRegistryAbi, taskCoordinatorAbi } from "./config";
import { veniceChat } from "./agents/venice";

export type Capability = "research" | "risk" | "report" | "coding" | "design" | "audit";

const SYSTEM_PROMPTS: Record<Capability, string> = {
  research: "You are a market research specialist. Produce concise, factual research: key players, market size, growth trends, and data points.",
  risk:     "You are a risk analysis specialist. Identify key risks (regulatory, competitive, financial, operational). Rate each High/Medium/Low and suggest mitigations.",
  report:   "You are an expert report writer. Compile a professional report with executive summary, key findings, risk overview, and recommendations.",
  coding:   "You are an expert software engineer. Write clean, well-commented, production-ready code. Include error handling, security considerations, and usage examples.",
  design:   "You are a UI/UX design specialist. Produce detailed design specifications, component breakdowns, user flow descriptions, and accessibility considerations.",
  audit:    "You are a critical quality auditor. Review AI-generated outputs for accuracy, consistency, and completeness. Flag hallucinations, contradictions, and gaps. Return verdict (PASS/FAIL/NEEDS_REVISION) with specific findings.",
};

// Sub-agents a capability can hire — only valid when the coordinator hasn't already hired them.
// Keep empty by default; populate only for standalone A2A runs where the coordinator loop
// is NOT also hiring these sub-agents (to avoid AgentAlreadyPaid reverts).
const SUB_AGENTS: Partial<Record<Capability, Capability[]>> = {
  coding:  ["research"],   // coding agent hires research — coordinator loop never hires research for coding tasks
};

export interface AgentRunResult {
  capability: Capability;
  agentAddress: Address;
  output: string;
  subAgentsHired: Address[];
  txHashes: `0x${string}`[];
}

async function findAgent(capability: Capability): Promise<Address> {
  const agents = await publicClient.readContract({
    address: config.contracts.agentRegistry,
    abi: agentRegistryAbi,
    functionName: "findByCapability",
    args: [capability],
  }) as Address[];
  if (!agents[0]) throw new Error(`No active agent for capability: ${capability}`);
  return agents[0];
}

async function getAgentKey(agentAddress: Address): Promise<`0x${string}`> {
  const mnemonic = process.env.AGENT_MNEMONIC;
  if (!mnemonic) throw new Error("AGENT_MNEMONIC not set");
  const { HDKey }           = await import("@scure/bip32");
  const { mnemonicToSeedSync } = await import("@scure/bip39");
  const seed  = mnemonicToSeedSync(mnemonic);
  const hdKey = HDKey.fromMasterSeed(seed);
  for (let i = 0; i < 10; i++) {
    const child = hdKey.derive(`m/44'/60'/0'/0/${i}`);
    const pk    = `0x${Buffer.from(child.privateKey!).toString("hex")}` as `0x${string}`;
    if (privateKeyToAccount(pk).address.toLowerCase() === agentAddress.toLowerCase()) return pk;
  }
  throw new Error(`Could not derive key for agent ${agentAddress}`);
}

export async function runAgent(
  capability: Capability,
  taskId: bigint,
  taskDescription: string,
  context = ""
): Promise<AgentRunResult> {
  const agentAddress = await findAgent(capability);
  const agentKey     = await getAgentKey(agentAddress);
  const agentAccount = privateKeyToAccount(agentKey);
  const agentWallet  = createWalletClient({ account: agentAccount, chain, transport: http(config.rpcUrl) });

  const subAgentsHired: Address[] = [];
  const txHashes: `0x${string}`[] = [];
  let subContext = context;

  // ── A2A: hire sub-agents if this capability delegates work ──────────────────
  const subs = SUB_AGENTS[capability] ?? [];
  for (const subCap of subs) {
    const subAgent = await findAgent(subCap);
    // Agent hires the sub-agent on-chain using its own wallet (A2A payment)
    const calldata = encodeFunctionData({
      abi: taskCoordinatorAbi,
      functionName: "hireAgent",
      args: [taskId, subAgent],
    });
    const hash = await agentWallet.sendTransaction({
      chain,
      account: agentAccount,
      to: config.contracts.taskCoordinator,
      data: appendAttributionTag(calldata),
    });
    await publicClient.waitForTransactionReceipt({ hash });
    txHashes.push(hash);
    subAgentsHired.push(subAgent);

    // Run sub-agent Venice AI inference for context
    const subResult = await runAgent(subCap, taskId, taskDescription);
    subContext += `\n\n[${subCap.toUpperCase()} AGENT OUTPUT]\n${subResult.output}`;
  }

  // ── Venice AI inference ────────────────────────────────────────────────────
  const prompt = context
    ? `Task: ${taskDescription}\n\nContext:\n${subContext}`
    : taskDescription;

  const output = await veniceChat(SYSTEM_PROMPTS[capability], prompt);

  return { capability, agentAddress, output, subAgentsHired, txHashes };
}
