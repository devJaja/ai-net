/**
 * AgentJudge — on-chain evaluation and feedback integration.
 *
 * Provides functions to:
 * - Evaluate agent performance on completed tasks (Track 3)
 * - Submit feedback for agents (Track 4)
 * - Query agent reputation scores
 */
import { encodeFunctionData, type Hex } from "viem";
import { walletClient, publicClient, chain, account, appendAttributionTag } from "./chain";

// AgentJudge contract address (deploy after AgentJudge.sol is compiled)
export const JUDGE_ADDRESS = (process.env.AGENT_JUDGE_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;

// ── ABI ────────────────────────────────────────────────────────────────────────

const JUDGE_ABI = [
  {
    name: "evaluateTask",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "taskId", type: "uint256" },
      { name: "agent", type: "address" },
      { name: "score", type: "uint8" },
      { name: "verdict", type: "string" },
      { name: "rationale", type: "string" },
    ],
    outputs: [{ name: "evalId", type: "uint256" }],
  },
  {
    name: "submitFeedback",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "taskId", type: "uint256" },
      { name: "agent", type: "address" },
      { name: "content", type: "string" },
      { name: "rating", type: "uint8" },
    ],
    outputs: [{ name: "fbId", type: "uint256" }],
  },
  {
    name: "getReputation",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [
      { name: "avgScore", type: "uint256" },
      { name: "avgRating", type: "uint256" },
      { name: "evalCount", type: "uint256" },
      { name: "feedbackCount", type: "uint256" },
      { name: "passCount", type: "uint256" },
      { name: "failCount", type: "uint256" },
    ],
  },
  {
    name: "avgScore",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "avgRating",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "evaluationCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "feedbackCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// ── On-chain Judge Evaluation ──────────────────────────────────────────────────

/**
 * Submit an on-chain evaluation for an agent's performance on a task.
 * This generates a tagged tx that counts toward Track 1 (revenue) and Track 3 (judge).
 */
export async function evaluateAgent(
  taskId: bigint,
  agentAddress: `0x${string}`,
  score: number,
  verdict: string,
  rationale: string,
): Promise<{ evalId: bigint; txHash: string }> {
  if (JUDGE_ADDRESS === "0x0000000000000000000000000000000000000000") {
    throw new Error("AGENT_JUDGE_ADDRESS not configured in .env");
  }

  console.log(`[Judge] Evaluating agent ${agentAddress} on task ${taskId}: score=${score} verdict=${verdict}`);

  const calldata = encodeFunctionData({
    abi: JUDGE_ABI,
    functionName: "evaluateTask",
    args: [taskId, agentAddress, score, verdict, rationale],
  });
  const taggedCalldata = appendAttributionTag(calldata);

  const hash = await walletClient.sendTransaction({
    account,
    to: JUDGE_ADDRESS,
    data: taggedCalldata,
    chain,
  } as any);

  console.log(`[Judge] TX submitted: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  let evalId = 0n;
  if (receipt.logs.length > 0 && receipt.logs[0].data) {
    evalId = BigInt(receipt.logs[0].data.slice(0, 66));
  }

  console.log(`[Judge] Evaluation #${evalId} recorded on-chain`);
  return { evalId, txHash: hash };
}

/**
 * Submit on-chain feedback for an agent.
 * This generates a tagged tx that counts toward Track 1 (revenue) and Track 4 (feedback).
 */
export async function submitAgentFeedback(
  taskId: bigint,
  agentAddress: `0x${string}`,
  content: string,
  rating: number,
): Promise<{ feedbackId: bigint; txHash: string }> {
  if (JUDGE_ADDRESS === "0x0000000000000000000000000000000000000000") {
    throw new Error("AGENT_JUDGE_ADDRESS not configured in .env");
  }

  console.log(`[Feedback] Submitting feedback for agent ${agentAddress} on task ${taskId}: rating=${rating}`);

  const calldata = encodeFunctionData({
    abi: JUDGE_ABI,
    functionName: "submitFeedback",
    args: [taskId, agentAddress, content, rating],
  });
  const taggedCalldata = appendAttributionTag(calldata);

  const hash = await walletClient.sendTransaction({
    account,
    to: JUDGE_ADDRESS,
    data: taggedCalldata,
    chain,
  } as any);

  console.log(`[Feedback] TX submitted: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  let feedbackId = 0n;
  if (receipt.logs.length > 0 && receipt.logs[0].data) {
    feedbackId = BigInt(receipt.logs[0].data.slice(0, 66));
  }

  console.log(`[Feedback] Feedback #${feedbackId} recorded on-chain`);
  return { feedbackId, txHash: hash };
}

// ── On-chain Queries ──────────────────────────────────────────────────────────

/**
 * Get an agent's full reputation from the AgentJudge contract.
 */
export async function getAgentReputation(agentAddress: `0x${string}`) {
  if (JUDGE_ADDRESS === "0x0000000000000000000000000000000000000000") {
    return { avgScore: 0, avgRating: 0, evalCount: 0, feedbackCount: 0, passCount: 0, failCount: 0 };
  }

  const result = await publicClient.readContract({
    address: JUDGE_ADDRESS,
    abi: JUDGE_ABI,
    functionName: "getReputation",
    args: [agentAddress],
  } as any);

  const r = result as any[];
  return {
    avgScore: Number(r[0]),
    avgRating: Number(r[1]),
    evalCount: Number(r[2]),
    feedbackCount: Number(r[3]),
    passCount: Number(r[4]),
    failCount: Number(r[5]),
  };
}

/**
 * Get total evaluation and feedback counts.
 */
export async function getJudgeStats() {
  if (JUDGE_ADDRESS === "0x0000000000000000000000000000000000000000") {
    return { totalEvaluations: 0, totalFeedbacks: 0 };
  }

  const [totalEvaluations, totalFeedbacks] = await Promise.all([
    publicClient.readContract({ address: JUDGE_ADDRESS, abi: JUDGE_ABI, functionName: "evaluationCount" } as any),
    publicClient.readContract({ address: JUDGE_ADDRESS, abi: JUDGE_ABI, functionName: "feedbackCount" } as any),
  ]);

  return { totalEvaluations: Number(totalEvaluations), totalFeedbacks: Number(totalFeedbacks) };
}
