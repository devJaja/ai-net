import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { config } from "./config";
import { runCoordinator } from "./coordinator";
import { runAgent, type Capability } from "./agentRunner";
import { buildProject } from "./builder";

// ── x402 Pay-Per-Call Server ──────────────────────────────────────────────────
import x402App from "./x402-server";

// ── ERC-8004 Agent Identity ───────────────────────────────────────────────────
import { registerAgentIdentity, getAgentIdentity } from "./erc8004";

const app = express();
app.use(cors());
app.use(express.json());

const limiter = rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false });

// ── Routes ────────────────────────────────────────────────────────────────────

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    chain: config.chainId,
    attributionTag: config.attributionTag || "not configured",
    x402Facilitator: config.x402FacilitatorUrl,
  });
});

/**
 * POST /task
 * Full coordinator loop: discover all agents → hire → Venice AI → complete
 */
app.post("/task", limiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { description, budgetEth = "0.05", durationDays = 7, capabilities } = req.body as {
      description: string; budgetEth?: string; durationDays?: number;
      capabilities?: ("research" | "risk" | "coding" | "design" | "audit" | "report")[];
    };
    if (!description?.trim()) { res.status(400).json({ error: "description is required" }); return; }

    const result = await runCoordinator(description, budgetEth, durationDays, capabilities);
    res.json({
      taskId:       result.taskId.toString(),
      agentsHired:  result.agentsHired,
      txHashes:     result.txHashes,
      research:     result.research,
      riskAnalysis: result.riskAnalysis,
      coding:       result.coding,
      design:       result.design,
      audit:        result.audit,
      report:       result.report,
    });
  } catch (err) { next(err); }
});

/**
 * POST /agent/:capability/run
 * A2A route: run a specific agent directly. The agent can autonomously hire
 * sub-agents on-chain using its own wallet before performing Venice AI inference.
 *
 * Body: { taskId: string, description: string, context?: string }
 */
app.post("/agent/:capability/run", limiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const capability = req.params.capability as Capability;
    const { taskId, description, context = "" } = req.body as {
      taskId: string; description: string; context?: string;
    };

    if (!["research","risk","report","coding","design","audit"].includes(capability)) {
      res.status(400).json({ error: `Unknown capability: ${capability}` }); return;
    }
    if (!taskId || !description?.trim()) {
      res.status(400).json({ error: "taskId and description are required" }); return;
    }

    const result = await runAgent(capability, BigInt(taskId), description, context);
    res.json({
      capability:     result.capability,
      agentAddress:   result.agentAddress,
      output:         result.output,
      subAgentsHired: result.subAgentsHired,
      txHashes:       result.txHashes,
    });
  } catch (err) { next(err); }
});

/**
 * POST /verify-endpoint
 * Probes an agent endpoint to confirm it's reachable and returns a valid response.
 */
app.post("/verify-endpoint", limiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { endpoint } = req.body as { endpoint: string };
    if (!endpoint?.trim()) { res.status(400).json({ error: "endpoint is required" }); return; }

    // Must be a valid URL
    let url: URL;
    try { url = new URL(endpoint); } catch { res.status(400).json({ ok: false, reason: "Invalid URL" }); return; }
    if (!["http:", "https:"].includes(url.protocol)) {
      res.status(400).json({ ok: false, reason: "URL must be http or https" }); return;
    }

    // Probe with a minimal test task
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const probe = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "ping", description: "AI-Net endpoint verification" }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!probe.ok) {
        res.json({ ok: false, reason: `Endpoint returned HTTP ${probe.status}` }); return;
      }
      const text = await probe.text().catch(() => "");
      res.json({ ok: true, status: probe.status, preview: text.slice(0, 200) });
    } catch (e: unknown) {
      clearTimeout(timeout);
      const msg = (e as Error).message ?? "Connection failed";
      res.json({ ok: false, reason: msg.includes("abort") ? "Endpoint timed out (>10s)" : msg });
    }
  } catch (err) { next(err); }
});

/**
 * POST /suggest-agents
 * Given a task description, returns the optimal capability pipeline.
 */
app.post("/suggest-agents", limiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { description } = req.body as { description: string };
    if (!description?.trim()) { res.status(400).json({ error: "description is required" }); return; }

    const { veniceChat } = await import("./agents/venice.js");
    const SYSTEM = `You are a task router. Given a task description, return ONLY a JSON array of capability strings needed, in execution order.

Available: ["research","risk","coding","design","audit","report"]

Rules:
- For CODE tasks (build, create, implement, write code, smart contract, script, CLI, app): return ["coding","report"] — do NOT add research/risk/audit unless explicitly asked
- For BUSINESS/STRATEGY tasks: ["research","risk","audit","report"]
- For DESIGN tasks: ["design","report"]
- For MIXED tasks (e.g. dApp with market research): ["research","coding","design","report"]
- Always end with "report"
- Output ONLY the JSON array, nothing else

Examples:
"write a solidity ERC-20 token" → ["coding","report"]
"build a React dashboard" → ["coding","design","report"]
"market analysis for AI startups" → ["research","risk","audit","report"]
"create a Web3 NFT marketplace dApp" → ["research","coding","design","report"]`;
    const raw = await veniceChat(SYSTEM, description, "mistral-small-3-2-24b-instruct");
    const cleaned = raw.replace(/```[a-z]*\n?/g, "").replace(/```/g, "").trim();
    // Extract JSON array even if the model adds extra text
    const match = cleaned.match(/\[.*?\]/s);
    let capabilities: string[];
    try {
      capabilities = JSON.parse(match?.[0] ?? cleaned) as string[];
    } catch {
      // Fallback: infer from keywords
      const d = description.toLowerCase();
      const isCoding = /build|code|implement|contract|solidity|script|app|cli/.test(d);
      const isDesign = /design|ui|ux|frontend|layout/.test(d);
      capabilities = isCoding
        ? (isDesign ? ["coding","design","report"] : ["coding","report"])
        : ["research","risk","audit","report"];
    }
    res.json({ capabilities });
  } catch (err) { next(err); }
});

/**
 * POST /enhance
 * Refine a specific agent output with a follow-up prompt.
 */
app.post("/enhance", limiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { capability, originalOutput, feedback } = req.body as {
      capability: string; originalOutput: string; feedback: string;
    };
    if (!originalOutput?.trim() || !feedback?.trim()) {
      res.status(400).json({ error: "originalOutput and feedback are required" }); return;
    }
    const { veniceChat } = await import("./agents/venice.js");
    const SYSTEM = `You are a ${capability} specialist. You previously produced an output. The user wants it improved. Apply their feedback precisely and return the complete revised output — no explanations, just the improved content.`;
    const enhanced = await veniceChat(SYSTEM, `Original output:\n${originalOutput}\n\nUser feedback:\n${feedback}\n\nRevised output:`, "mistral-small-3-2-24b-instruct");
    res.json({ enhanced });
  } catch (err) { next(err); }
});

app.post("/build", limiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prompt } = req.body as { prompt: string };
    if (!prompt?.trim()) { res.status(400).json({ error: "prompt is required" }); return; }
    const result = await buildProject(prompt);
    res.json({
      success:   result.success,
      outputDir: result.outputDir,
      plan:      result.plan,
      files:     result.files.map(f => ({ path: f.path, size: f.content.length })),
      buildLog:  result.buildLog.slice(-2000), // last 2000 chars
    });
  } catch (err) { next(err); }
});

/**
 * POST /erc8004/register
 * Register the AI-Net coordinator as an ERC-8004 agent on Celo Mainnet
 */
app.post("/erc8004/register", limiter, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await registerAgentIdentity();
    res.json({
      success: true,
      agentId: result.agentId.toString(),
      txHash: result.txHash,
      scanUrl: `https://8004scan.io/agents/celo/${result.agentId}`,
      celoscanUrl: `https://celoscan.io/nft/0x8004a169fb4a3325136eb29fa0ceb6d2e539a432/${result.agentId}`,
    });
  } catch (err) { next(err); }
});

/**
 * POST /erc8004/check
 * Check if an ERC-8004 agent identity exists
 */
app.post("/erc8004/check", limiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { agentId } = req.body as { agentId: string };
    if (!agentId) {
      res.status(400).json({ error: "agentId is required" });
      return;
    }
    const identity = await getAgentIdentity(BigInt(agentId));
    if (!identity) {
      res.json({ exists: false });
      return;
    }
    res.json({
      exists: true,
      agentId,
      uri: identity.uri,
      wallet: identity.wallet,
      scanUrl: `https://8004scan.io/agents/celo/${agentId}`,
    });
  } catch (err) { next(err); }
});

// ── Track 3: Askbots ──────────────────────────────────────────────────────────
import {
  registerBot as registerAskbotsBot,
  checkBotStatus,
  createBotProfile,
  getBotProfile,
  runFeedbackCycle as runAskbotsCycle,
  startAskbotsDaemon,
  getAskbotsStats,
} from "./askbots";

// ── Track 4: Aigora ──────────────────────────────────────────────────────────
import {
  registerAgent as registerAigoraAgent,
  discoverAgents,
  runFeedbackCycle as runAigoraCycle,
  startAigoraDaemon,
  getAigoraStats,
} from "./aigora";

// ── AgentJudge: On-chain Evaluation & Feedback ───────────────────────────────
import {
  evaluateAgent,
  submitAgentFeedback,
  getAgentReputation,
  getJudgeStats,
  JUDGE_ADDRESS,
} from "./judge";

app.get("/judge/stats", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await getJudgeStats();
    res.json({ judgeAddress: JUDGE_ADDRESS, ...stats });
  } catch (err) { next(err); }
});

app.get("/judge/reputation/:agent", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agent = req.params.agent as `0x${string}`;
    if (!agent.startsWith("0x") || agent.length !== 42) {
      res.status(400).json({ error: "Invalid address" }); return;
    }
    const rep = await getAgentReputation(agent);
    res.json({ agent, ...rep });
  } catch (err) { next(err); }
});

app.post("/judge/evaluate", limiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId, agent, score, verdict, rationale } = req.body as {
      taskId: string; agent: string; score: number; verdict: string; rationale: string;
    };
    if (!taskId || !agent || !score || !verdict) {
      res.status(400).json({ error: "taskId, agent, score, verdict required" }); return;
    }
    const result = await evaluateAgent(
      BigInt(taskId), agent as `0x${string}`, score, verdict, rationale || "",
    );
    res.json({ success: true, evalId: result.evalId.toString(), txHash: result.txHash });
  } catch (err) { next(err); }
});

app.post("/judge/feedback", limiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId, agent, content, rating } = req.body as {
      taskId: string; agent: string; content: string; rating: number;
    };
    if (!taskId || !agent || !content || !rating) {
      res.status(400).json({ error: "taskId, agent, content, rating required" }); return;
    }
    const result = await submitAgentFeedback(
      BigInt(taskId), agent as `0x${string}`, content, rating,
    );
    res.json({ success: true, feedbackId: result.feedbackId.toString(), txHash: result.txHash });
  } catch (err) { next(err); }
});

// ── x402 Pay-Per-Call Routes ─────────────────────────────────────────────────
// Mount x402 routes under /x402 prefix for Track 2 (Most x402 Payments)
app.use("/x402", x402App);

// ── Track 3: Askbots Routes ──────────────────────────────────────────────────

app.get("/askbots/status", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await checkBotStatus();
    const stats = getAskbotsStats();
    res.json({ bot: status, stats });
  } catch (err) { next(err); }
});

app.post("/askbots/register", limiter, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await registerAskbotsBot();
    res.json({
      success: true,
      agentId: result.agentId,
      message: "Save the API key — it is only shown once. Add ASKBOTS_API_KEY and ASKBOTS_AGENT_ID to .env.",
    });
  } catch (err) { next(err); }
});

app.post("/askbots/profile", limiter, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await createBotProfile();
    res.json({ success: true, profile });
  } catch (err) { next(err); }
});

app.get("/askbots/profile", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await getBotProfile();
    res.json(profile);
  } catch (err) { next(err); }
});

app.post("/askbots/run", limiter, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const results = await runAskbotsCycle();
    res.json({
      success: true,
      cycleResults: results,
      totalPayouts: results.filter((r) => r.payout).length,
    });
  } catch (err) { next(err); }
});

// ── Track 4: Aigora Routes ──────────────────────────────────────────────────

app.get("/aigora/status", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = getAigoraStats();
    res.json(stats);
  } catch (err) { next(err); }
});

app.post("/aigora/register", limiter, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await registerAigoraAgent();
    res.json({
      success: true,
      profileId: result.profileId,
      profileUrl: result.profileUrl,
      txHash: result.txHash,
    });
  } catch (err) { next(err); }
});

app.get("/aigora/discover", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const agents = await discoverAgents();
    res.json({ agents, count: agents.length });
  } catch (err) { next(err); }
});

app.post("/aigora/feedback", limiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { maxAgents = 2 } = req.body as { maxAgents?: number };
    const results = await runAigoraCycle(maxAgents);
    res.json({
      success: true,
      cycleResults: results,
      totalSubmitted: results.filter((r) => r.feedbackGenerated).length,
    });
  } catch (err) { next(err); }
});

// ── Task Runner Control ───────────────────────────────────────────────────────
import { getRunnerStats } from "./taskRunner";

app.get("/runner/stats", (_req: Request, res: Response) => {
  res.json(getRunnerStats());
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Server error]", err.message);
  res.status(500).json({ error: err.message });
});

export default app;

if (!process.env.VERCEL) {
  app.listen(config.port, () => {
    console.log(`[AI-Net] Backend running on port ${config.port}`);
    console.log(`[AI-Net] Chain ID: ${config.chainId}`);
    console.log(`[AI-Net] TaskCoordinator: ${config.contracts.taskCoordinator}`);
    console.log(`[AI-Net] Attribution Tag: ${config.attributionTag || "NOT SET"}`);
    console.log(`[AI-Net] x402 Facilitator: ${config.x402FacilitatorUrl}`);
  });
}
