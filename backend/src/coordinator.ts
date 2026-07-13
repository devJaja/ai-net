import { parseEther, encodeFunctionData, type Address } from "viem";
import { publicClient, walletClient, account, chain, appendAttributionTag } from "./chain";
import { config, agentRegistryAbi, taskCoordinatorAbi } from "./config";
import { runResearch } from "./agents/research";
import { runRiskAnalysis } from "./agents/risk";
import { runReport } from "./agents/report";
import { runCoding } from "./agents/coding";
import { runDesign } from "./agents/design";
import { runAudit } from "./agents/audit";
import { veniceChat } from "./agents/venice.js";

const VENICE_HOST = "api.venice.ai";

/**
 * Run an agent by capability.
 * - If the registered endpoint is a Venice AI URL → use internal Venice client (fast, authenticated)
 * - If it's an external URL → POST the task to the developer's own agent endpoint
 */
async function callAgent(
  agentAddress: Address,
  capability: string,
  taskDescription: string,
  context = ""
): Promise<string> {
  // Read the agent's endpoint from registry
  const agentData = await publicClient.readContract({
    address: config.contracts.agentRegistry,
    abi: agentRegistryAbi,
    functionName: "agents",
    args: [agentAddress],
  }) as { endpoint: string; capability: string };

  const endpoint = agentData.endpoint;
  const isVenice = endpoint.includes(VENICE_HOST) || !endpoint.startsWith("http");

  if (isVenice) {
    // Use internal Venice client — same as before
    const prompt = context ? `Task: ${taskDescription}\n\nContext:\n${context}` : taskDescription;
    const SYSTEM_MAP: Record<string, string> = {
      research: "You are a market research specialist. Produce concise, factual research: key players, market size, growth trends.",
      risk:     "You are a risk analysis specialist. Identify key risks and rate each High/Medium/Low. Be concise.",
      coding:   "You are a senior software engineer. Output ONLY complete, runnable code. No explanations.",
      design:   "You are a UI/UX design specialist. Produce detailed design specifications.",
      audit:    "You are a quality auditor. Review outputs for accuracy. Give a verdict (PASS/FAIL/NEEDS_REVISION).",
      report:   "You are a deliverable compiler. Match output format to what was requested — code for code tasks, report for analysis tasks.",
    };
    return veniceChat(SYSTEM_MAP[capability] ?? SYSTEM_MAP.research, prompt, "mistral-small-3-2-24b-instruct");
  }

  // External agent endpoint — POST the task and get the result
  console.log(`[Coordinator] Calling external agent at ${endpoint}`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: taskDescription, capability, context, source: "ai-net" }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Agent endpoint returned HTTP ${res.status}`);
    const data = await res.json() as { result?: string; output?: string; response?: string; text?: string };
    // Accept any common response field name
    return data.result ?? data.output ?? data.response ?? data.text ?? await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

export interface TaskResult {
  taskId: bigint;
  research?: string;
  riskAnalysis?: string;
  coding?: string;
  design?: string;
  audit?: string;
  report: string;
  agentsHired: Address[];
  txHashes: `0x${string}`[];
}

// ── On-chain helpers ──────────────────────────────────────────────────────────

async function findAgents(capability: string): Promise<Address[]> {
  return publicClient.readContract({
    address: config.contracts.agentRegistry,
    abi: agentRegistryAbi,
    functionName: "findByCapability",
    args: [capability],
  }) as Promise<Address[]>;
}

async function createTask(description: string, budgetEth: string, durationSecs: bigint): Promise<bigint> {
  // Encode the function call, then append attribution tag as suffix
  const calldata = encodeFunctionData({
    abi: taskCoordinatorAbi,
    functionName: "createTask",
    args: [description, durationSecs],
  });
  const hash = await walletClient.sendTransaction({
    chain,
    account,
    to: config.contracts.taskCoordinator,
    value: parseEther(budgetEth),
    data: appendAttributionTag(calldata),
  } as any);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  // TaskCreated(uint256 indexed taskId, ...) — taskId is topics[1]
  const log = receipt.logs.find(l => l.topics.length >= 2);
  if (!log) throw new Error("TaskCreated log not found");
  return BigInt(log.topics[1]!);
}

async function hireAgent(taskId: bigint, agent: Address): Promise<`0x${string}`> {
  const calldata = encodeFunctionData({
    abi: taskCoordinatorAbi,
    functionName: "hireAgent",
    args: [taskId, agent],
  });
  const hash = await walletClient.sendTransaction({ chain,
    account,
    to: config.contracts.taskCoordinator,
    data: appendAttributionTag(calldata),
  } as any);
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

async function completeTask(taskId: bigint): Promise<`0x${string}`> {
  const calldata = encodeFunctionData({
    abi: taskCoordinatorAbi,
    functionName: "completeTask",
    args: [taskId],
  });
  const hash = await walletClient.sendTransaction({ chain,
    account,
    to: config.contracts.taskCoordinator,
    data: appendAttributionTag(calldata),
  } as any);
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

// ── Main orchestration loop ───────────────────────────────────────────────────

export async function runCoordinator(
  taskDescription: string,
  budgetEth = "0.05",
  durationDays = 7,
  capabilities: ("research" | "risk" | "coding" | "design" | "audit" | "report")[] = ["research", "risk", "audit", "report"]
): Promise<TaskResult> {
  const durationSecs = BigInt(durationDays * 24 * 60 * 60);
  const txHashes: `0x${string}`[] = [];
  const agentsHired: Address[] = [];
  const result: TaskResult = { taskId: 0n, report: "", agentsHired, txHashes };

  console.log(`[Coordinator] Creating task: "${taskDescription}"`);
  result.taskId = await createTask(taskDescription, budgetEth, durationSecs);
  console.log(`[Coordinator] Task created: id=${result.taskId}`);

  // Discover all needed agents up front (parallel)
  const agentMap: Partial<Record<string, Address>> = {};
  await Promise.all(capabilities.map(async (cap) => {
    const found = await findAgents(cap);
    if (!found[0]) throw new Error(`No ${cap} agent registered`);
    agentMap[cap] = found[0];
  }));

  // ── Wave 1: research + coding + design — Venice runs in parallel, hires are sequential ──
  const wave1 = capabilities.filter(c => ["research","coding","design"].includes(c));
  if (wave1.length > 0) {
    console.log(`[Coordinator] Wave 1 (Venice parallel, hire sequential): ${wave1.join(", ")}`);
    const veniceResults = await Promise.all(wave1.map(cap =>
      callAgent(agentMap[cap]!, cap, taskDescription)
    ));
    for (let i = 0; i < wave1.length; i++) {
      const cap = wave1[i];
      const tx = await hireAgent(result.taskId, agentMap[cap]!);
      txHashes.push(tx); agentsHired.push(agentMap[cap]!);
      if (cap === "research") result.research = veniceResults[i];
      if (cap === "coding")   result.coding   = veniceResults[i];
      if (cap === "design")   result.design   = veniceResults[i];
    }
    console.log("[Coordinator] Wave 1 complete");
  }

  // ── Wave 2: risk (uses research context) ─────────────────────────────────
  if (capabilities.includes("risk")) {
    console.log("[Coordinator] Wave 2: risk");
    const [tx, output] = await Promise.all([
      hireAgent(result.taskId, agentMap.risk!),
      callAgent(agentMap.risk!, "risk", taskDescription, (result.research ?? "").slice(0, 1500)),
    ]);
    txHashes.push(tx); agentsHired.push(agentMap.risk!);
    result.riskAnalysis = output;
    console.log("[Coordinator] Risk complete");
  }

  // ── Wave 3: audit ────────────────────────────────────────────────────────
  if (capabilities.includes("audit")) {
    console.log("[Coordinator] Wave 3: audit");
    const ctx = Object.entries({
      research: result.research, risk: result.riskAnalysis,
      coding: result.coding, design: result.design,
    }).filter(([,v]) => v).map(([k,v]) => `[${k}]\n${v!.slice(0,600)}`).join("\n\n");
    const [tx, output] = await Promise.all([
      hireAgent(result.taskId, agentMap.audit!),
      callAgent(agentMap.audit!, "audit", taskDescription, ctx),
    ]);
    txHashes.push(tx); agentsHired.push(agentMap.audit!);
    result.audit = output;
    console.log("[Coordinator] Audit complete");
  }

  // ── Wave 4: report ───────────────────────────────────────────────────────
  if (capabilities.includes("report")) {
    console.log("[Coordinator] Wave 4: report");
    const ctx = [
      result.research?.slice(0,1000),
      result.riskAnalysis?.slice(0,800),
      result.audit?.slice(0,500),
    ].filter(Boolean).join("\n\n");
    const [tx, output] = await Promise.all([
      hireAgent(result.taskId, agentMap.report!),
      callAgent(agentMap.report!, "report", taskDescription, ctx),
    ]);
    txHashes.push(tx); agentsHired.push(agentMap.report!);
    result.report = output;
    console.log("[Coordinator] Report complete");
  }

  const completeTx = await completeTask(result.taskId);
  txHashes.push(completeTx);
  console.log(`[Coordinator] Task ${result.taskId} completed`);

  return result;
}
