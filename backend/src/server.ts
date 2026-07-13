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
  });
}
