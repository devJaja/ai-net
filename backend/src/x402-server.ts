/**
 * x402 Pay-Per-Call Agent Endpoints
 *
 * Exposes AI-Net agent capabilities as USDC micropayment endpoints.
 * Each call settles a real x402 v2 payment through the Celo facilitator,
 * counting toward Track 2 (Most x402 Payments).
 *
 * Uses HTTP-based facilitator client (raw fetch to https://x402.celo.org)
 * to avoid moduleResolution issues with @x402/core subpath exports.
 */
import express, { type Request, type Response } from "express";
import cors from "cors";
import { config } from "./config";
import { account } from "./chain";
import { veniceChat } from "./agents/venice";

// ── x402 v2 Types (inline to avoid moduleResolution issues) ────────────────────

interface X402PaymentRequirements {
  scheme: string;
  network: string;
  asset: string;
  amount: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra: Record<string, unknown>;
}

interface X402PaymentPayload {
  x402Version: number;
  resource?: { url: string; description?: string; mimeType?: string };
  accepted: X402PaymentRequirements;
  payload: Record<string, unknown>;
  extensions?: Record<string, unknown>;
}

interface X402PaymentRequired {
  x402Version: number;
  error?: string;
  resource: { url: string; description?: string; mimeType?: string };
  accepts: X402PaymentRequirements[];
  extensions?: Record<string, unknown>;
}

interface X402VerifyRequest {
  x402Version: number;
  paymentPayload: X402PaymentPayload;
  paymentRequirements: X402PaymentRequirements;
}

interface X402VerifyResponse {
  isValid: boolean;
  invalidReason?: string;
  invalidMessage?: string;
  payer?: string;
}

interface X402SettleRequest {
  x402Version: number;
  paymentPayload: X402PaymentPayload;
  paymentRequirements: X402PaymentRequirements;
}

interface X402SettleResponse {
  success: boolean;
  errorReason?: string;
  errorMessage?: string;
  payer?: string;
  transaction: string;
  network: string;
}

// ── Facilitator HTTP Client ────────────────────────────────────────────────────

const FACILITATOR_URL = config.x402FacilitatorUrl;

async function facilitatorVerify(
  payload: X402PaymentPayload,
  requirements: X402PaymentRequirements,
): Promise<X402VerifyResponse> {
  const body: X402VerifyRequest = {
    x402Version: 2,
    paymentPayload: payload,
    paymentRequirements: requirements,
  };
  const res = await fetch(`${FACILITATOR_URL}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<X402VerifyResponse>;
}

async function facilitatorSettle(
  payload: X402PaymentPayload,
  requirements: X402PaymentRequirements,
): Promise<X402SettleResponse> {
  const body: X402SettleRequest = {
    x402Version: 2,
    paymentPayload: payload,
    paymentRequirements: requirements,
  };
  const res = await fetch(`${FACILITATOR_URL}/settle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<X402SettleResponse>;
}

// ── Agent Capabilities (priced per-call) ───────────────────────────────────────

interface Capability {
  id: string;
  description: string;
  priceUSD: string;
  priceUnits: number;
}

const AGENT_CAPABILITIES: Capability[] = [
  { id: "research",  description: "Market research and competitive analysis",  priceUSD: "0.01",  priceUnits: 10000 },
  { id: "risk",      description: "Risk assessment and mitigation strategies", priceUSD: "0.01",  priceUnits: 10000 },
  { id: "coding",    description: "Code generation and technical implementation", priceUSD: "0.02", priceUnits: 20000 },
  { id: "design",    description: "UI/UX design specifications and wireframes", priceUSD: "0.01", priceUnits: 10000 },
  { id: "audit",     description: "Quality assurance and code review",         priceUSD: "0.01",  priceUnits: 10000 },
  { id: "report",    description: "Deliverable compilation and reporting",     priceUSD: "0.005", priceUnits: 5000 },
  { id: "analyze",   description: "Quick text analysis and sentiment detection", priceUSD: "0.001", priceUnits: 1000 },
  { id: "validate",  description: "Data validation and format checking",       priceUSD: "0.001", priceUnits: 1000 },
  { id: "format",    description: "Code and text formatting",                  priceUSD: "0.001", priceUnits: 1000 },
  { id: "summarize", description: "Quick text summarization",                  priceUSD: "0.001", priceUnits: 1000 },
  { id: "translate", description: "Language translation and localization",     priceUSD: "0.002", priceUnits: 2000 },
  { id: "classify",  description: "Content classification and categorization", priceUSD: "0.001", priceUnits: 1000 },
];

// ── Agent Inference ────────────────────────────────────────────────────────────

async function callAgent(capability: string, task: string, context: string): Promise<string> {
  const SYSTEM_MAP: Record<string, string> = {
    research:  "You are a market research specialist. Produce concise, factual research: key players, market size, growth trends.",
    risk:      "You are a risk analysis specialist. Identify key risks and rate each High/Medium/Low. Be concise.",
    coding:    "You are a senior software engineer. Output ONLY complete, runnable code. No explanations.",
    design:    "You are a UI/UX design specialist. Produce detailed design specifications.",
    audit:     "You are a quality auditor. Review outputs for accuracy. Give a verdict (PASS/FAIL/NEEDS_REVISION).",
    report:    "You are a deliverable compiler. Match output format to what was requested.",
    analyze:   "You are a text analyst. Return JSON: { sentiment, topics[], summary }.",
    validate:  "You are a data validator. Return JSON: { valid: bool, errors[], warnings[] }.",
    format:    "You are a code formatter. Return the input properly formatted and indented. No explanations.",
    summarize: "You are a summarizer. Return a 1-2 sentence summary of the input text.",
    translate: "You are a translator. Translate the input text to the target language specified in context.",
    classify:  "You are a classifier. Return JSON: { category: string, confidence: number, tags[] }.",
  };
  const prompt = context ? `Task: ${task}\n\nContext:\n${context}` : task;
  return veniceChat(SYSTEM_MAP[capability] ?? SYSTEM_MAP.report, prompt, "mistral-small-3-2-24b-instruct");
}

// ── x402 Helpers ───────────────────────────────────────────────────────────────

function buildRequirements(cap: Capability): X402PaymentRequirements {
  return {
    scheme: "exact",
    network: "eip155:42220",
    asset: config.usdcAddress,
    amount: cap.priceUnits.toString(),
    payTo: account.address,
    maxTimeoutSeconds: 300,
    extra: {},
  };
}

function buildBatchRequirements(totalUnits: number, itemCount: number): X402PaymentRequirements {
  return {
    scheme: "exact",
    network: "eip155:42220",
    asset: config.usdcAddress,
    amount: totalUnits.toString(),
    payTo: account.address,
    maxTimeoutSeconds: 300,
    extra: {},
  };
}

async function verifyAndSettle(
  paymentPayload: X402PaymentPayload,
  requirements: X402PaymentRequirements,
): Promise<{ success: boolean; txHash?: string; payer?: string; error?: string }> {
  const verifyResult = await facilitatorVerify(paymentPayload, requirements);
  if (!verifyResult.isValid) {
    return { success: false, error: verifyResult.invalidReason ?? verifyResult.invalidMessage ?? "Verification failed" };
  }

  const settleResult = await facilitatorSettle(paymentPayload, requirements);
  if (!settleResult.success) {
    return { success: false, error: settleResult.errorReason ?? settleResult.errorMessage ?? "Settlement failed" };
  }

  return {
    success: true,
    txHash: settleResult.transaction,
    payer: settleResult.payer,
  };
}

function parsePaymentHeader(raw: string | undefined): X402PaymentPayload | null {
  if (!raw) return null;
  try {
    const decoded = Buffer.from(raw, "base64").toString();
    return JSON.parse(decoded) as X402PaymentPayload;
  } catch {
    return null;
  }
}

// ── Express Server ─────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

/**
 * GET /x402/capabilities
 */
app.get("/capabilities", (_req: Request, res: Response) => {
  res.json({
    capabilities: AGENT_CAPABILITIES.map(c => ({
      id: c.id,
      description: c.description,
      price: c.priceUSD,
      network: "eip155:42220",
      token: "USDC",
      tokenAddress: config.usdcAddress,
      payTo: account.address,
    })),
    protocol: "x402",
    facilitator: FACILITATOR_URL,
  });
});

/**
 * POST /x402/agent/:capability
 * Pay-per-call agent endpoint.
 */
app.post("/agent/:capability", async (req: Request, res: Response) => {
  const { capability } = req.params;
  const { task, context = "" } = req.body as { task?: string; context?: string };

  const capConfig = AGENT_CAPABILITIES.find(c => c.id === capability);
  if (!capConfig) {
    res.status(400).json({ error: `Unknown capability: ${capability}. Available: ${AGENT_CAPABILITIES.map(c => c.id).join(", ")}` });
    return;
  }

  if (!task?.trim()) {
    res.status(400).json({ error: "task is required in request body" });
    return;
  }

  const rawHeader = req.headers["x-payment"] as string | undefined;
  const paymentPayload = parsePaymentHeader(rawHeader);

  if (!paymentPayload) {
    const requirements = buildRequirements(capConfig);
    const paymentRequired: X402PaymentRequired = {
      x402Version: 2,
      error: "Payment required",
      resource: { url: `/x402/agent/${capability}`, description: `AI-Net ${capConfig.description}`, mimeType: "application/json" },
      accepts: [requirements],
    };
    res.status(402).json(paymentRequired);
    return;
  }

  const requirements = buildRequirements(capConfig);
  const result = await verifyAndSettle(paymentPayload, requirements);

  if (!result.success) {
    res.status(402).json({ error: "Payment failed", details: result.error });
    return;
  }

  try {
    console.log(`[x402] ${capability} served (tx: ${result.txHash}, payer: ${result.payer})`);
    const output = await callAgent(capability, task, context);

    res.json({
      capability,
      output,
      payment: {
        settled: true,
        txHash: result.txHash,
        payer: result.payer,
        amount: capConfig.priceUSD,
        token: "USDC",
        network: "Celo Mainnet (42220)",
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Agent execution failed", details: (err as Error).message });
  }
});

/**
 * POST /x402/batch
 * Batch multiple agent calls under a single x402 payment.
 * Client signs one payment for the total amount of all items.
 */
app.post("/batch", async (req: Request, res: Response) => {
  const { items } = req.body as { items?: Array<{ capability: string; task: string; context?: string }> };

  if (!items?.length) {
    res.status(400).json({ error: "items array required (1-10 items)" });
    return;
  }

  if (items.length > 10) {
    res.status(400).json({ error: "Maximum 10 items per batch" });
    return;
  }

  // Validate all capabilities and compute total
  let totalUnits = 0;
  for (const item of items) {
    const cap = AGENT_CAPABILITIES.find(c => c.id === item.capability);
    if (!cap) {
      res.status(400).json({ error: `Unknown capability: ${item.capability}` });
      return;
    }
    if (!item.task?.trim()) {
      res.status(400).json({ error: `task required for capability: ${item.capability}` });
      return;
    }
    totalUnits += cap.priceUnits;
  }

  const rawHeader = req.headers["x-payment"] as string | undefined;
  const paymentPayload = parsePaymentHeader(rawHeader);

  if (!paymentPayload) {
    const requirements = buildBatchRequirements(totalUnits, items.length);
    const paymentRequired: X402PaymentRequired = {
      x402Version: 2,
      error: "Payment required",
      resource: { url: "/x402/batch", description: `AI-Net batch: ${items.length} agent calls`, mimeType: "application/json" },
      accepts: [requirements],
    };
    res.status(402).json(paymentRequired);
    return;
  }

  // Verify and settle the single batch payment
  const requirements = buildBatchRequirements(totalUnits, items.length);
  const result = await verifyAndSettle(paymentPayload, requirements);

  if (!result.success) {
    res.status(402).json({ error: "Batch payment failed", details: result.error });
    return;
  }

  // Execute all agent calls in parallel (payment already settled)
  console.log(`[x402] batch of ${items.length} settled (tx: ${result.txHash})`);

  const results = await Promise.allSettled(
    items.map(async (item) => {
      const cap = AGENT_CAPABILITIES.find(c => c.id === item.capability)!;
      const output = await callAgent(item.capability, item.task, item.context ?? "");
      return { capability: item.capability, output, price: cap.priceUSD };
    })
  );

  res.json({
    results: results.map(r =>
      r.status === "fulfilled"
        ? { status: "ok", ...r.value }
        : { status: "error", error: (r.reason as Error).message }
    ),
    payment: {
      settled: true,
      txHash: result.txHash,
      payer: result.payer,
      totalUSDC: (totalUnits / 1_000_000).toFixed(6),
      token: "USDC",
      network: "Celo Mainnet (42220)",
    },
  });
});

/**
 * GET /x402/health
 */
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    protocol: "x402",
    version: 2,
    network: "Celo Mainnet (42220)",
    capabilities: AGENT_CAPABILITIES.length,
    payTo: account.address,
    attributionTag: config.attributionTag,
  });
});

export default app;
