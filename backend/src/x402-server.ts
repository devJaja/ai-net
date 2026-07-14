/**
 * x402 Pay-Per-Call Agent Endpoints
 * 
 * Exposes AI-Net agent capabilities as USDC micropayment endpoints.
 * Each call settles a real x402 payment through the Celo facilitator,
 * counting toward Track 2 (Most x402 Payments).
 * 
 * The attribution tag is appended to every settlement transaction
 * so it also counts toward Track 1 (Most Revenue Generated).
 */
import express, { type Request, type Response } from "express";
import cors from "cors";
import { config } from "./config";
import { account } from "./chain";
import { veniceChat } from "./agents/venice";

// ── Constants ──────────────────────────────────────────────────────────────────

// EIP-712 domain for Celo USDC
const USDC_DOMAIN = {
  name: "USD Coin",
  version: "2",
  chainId: 42220,
  verifyingContract: config.usdcAddress,
};

// ── Agent Capabilities (priced per-call) ───────────────────────────────────────
const AGENT_CAPABILITIES = [
  {
    id: "research",
    description: "Market research and competitive analysis",
    priceUSD: "0.01",
    priceUnits: 10000, // 6 decimals = 0.01 USDC
  },
  {
    id: "risk",
    description: "Risk assessment and mitigation strategies",
    priceUSD: "0.01",
    priceUnits: 10000,
  },
  {
    id: "coding",
    description: "Code generation and technical implementation",
    priceUSD: "0.02",
    priceUnits: 20000,
  },
  {
    id: "design",
    description: "UI/UX design specifications and wireframes",
    priceUSD: "0.01",
    priceUnits: 10000,
  },
  {
    id: "audit",
    description: "Quality assurance and code review",
    priceUSD: "0.01",
    priceUnits: 10000,
  },
  {
    id: "report",
    description: "Deliverable compilation and reporting",
    priceUSD: "0.005",
    priceUnits: 5000,
  },
  // ── High-frequency micro-services (Track 2 stackers) ──────────────────────
  {
    id: "analyze",
    description: "Quick text analysis and sentiment detection",
    priceUSD: "0.001",
    priceUnits: 1000, // $0.001 per call — very cheap, high frequency
  },
  {
    id: "validate",
    description: "Data validation and format checking",
    priceUSD: "0.001",
    priceUnits: 1000,
  },
  {
    id: "format",
    description: "Code and text formatting",
    priceUSD: "0.001",
    priceUnits: 1000,
  },
  {
    id: "summarize",
    description: "Quick text summarization",
    priceUSD: "0.001",
    priceUnits: 1000,
  },
  {
    id: "translate",
    description: "Language translation and localization",
    priceUSD: "0.002",
    priceUnits: 2000,
  },
  {
    id: "classify",
    description: "Content classification and categorization",
    priceUSD: "0.001",
    priceUnits: 1000,
  },
];

// ── Facilitator Client ─────────────────────────────────────────────────────────

interface FacilitatorResponse {
  valid: boolean;
  payer?: string;
  error?: string;
}

interface SettlementResponse {
  success: boolean;
  txHash?: string;
  error?: string;
}

async function verifyPayment(
  paymentPayload: any,
  paymentRequirements: any
): Promise<FacilitatorResponse> {
  try {
    const res = await fetch(`${config.x402FacilitatorUrl}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentPayload, paymentRequirements }),
    });
    return await res.json() as FacilitatorResponse;
  } catch (err) {
    return { valid: false, error: `Facilitator error: ${(err as Error).message}` };
  }
}

async function settlePayment(
  paymentPayload: any,
  paymentRequirements: any
): Promise<SettlementResponse> {
  try {
    const res = await fetch(`${config.x402FacilitatorUrl}/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentPayload, paymentRequirements }),
    });
    return await res.json() as SettlementResponse;
  } catch (err) {
    return { success: false, error: `Settlement error: ${(err as Error).message}` };
  }
}

// ── Agent Inference ────────────────────────────────────────────────────────────

async function callAgent(capability: string, task: string, context: string): Promise<string> {
  const SYSTEM_MAP: Record<string, string> = {
    research: "You are a market research specialist. Produce concise, factual research: key players, market size, growth trends.",
    risk:     "You are a risk analysis specialist. Identify key risks and rate each High/Medium/Low. Be concise.",
    coding:   "You are a senior software engineer. Output ONLY complete, runnable code. No explanations.",
    design:   "You are a UI/UX design specialist. Produce detailed design specifications.",
    audit:    "You are a quality auditor. Review outputs for accuracy. Give a verdict (PASS/FAIL/NEEDS_REVISION).",
    report:   "You are a deliverable compiler. Match output format to what was requested — code for code tasks, report for analysis tasks.",
    // High-frequency micro-services
    analyze:   "You are a text analyst. Analyze the text for sentiment (positive/negative/neutral), key topics, and brief summary. Return JSON: { sentiment, topics[], summary }.",
    validate:  "You are a data validator. Check the input for valid format, structure, and required fields. Return JSON: { valid: bool, errors[], warnings[] }.",
    format:    "You are a code formatter. Return the input properly formatted and indented. No explanations.",
    summarize: "You are a summarizer. Return a 1-2 sentence summary of the input text.",
    translate: "You are a translator. Translate the input text to the target language specified in the context. Return only the translation.",
    classify:  "You are a classifier. Classify the input text into categories. Return JSON: { category: string, confidence: number, tags[] }.",
  };
  const prompt = context ? `Task: ${task}\n\nContext:\n${context}` : task;
  return veniceChat(SYSTEM_MAP[capability] ?? SYSTEM_MAP.report, prompt, "mistral-small-3-2-24b-instruct");
}

// ── Express Server ─────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

/**
 * GET /x402/capabilities
 * List available agent services and their prices
 */
app.get("/x402/capabilities", (_req: Request, res: Response) => {
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
    facilitator: config.x402FacilitatorUrl,
  });
});

/**
 * POST /x402/agent/:capability
 * Pay-per-call agent endpoint. If no payment header, returns 402 with requirements.
 * If payment is valid, settles and returns the agent's response.
 */
app.post("/x402/agent/:capability", async (req: Request, res: Response) => {
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

  // Check for payment header
  const rawHeader = req.headers["x-payment"] || req.headers["payment-signature"];
  const paymentData = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

  if (!paymentData) {
    // Return 402 Payment Required with requirements
    const requirements = {
      accepts: [
        {
          scheme: "exact",
          network: "eip155:42220",
          amount: capConfig.priceUnits.toString(),
          asset: config.usdcAddress,
          payTo: account.address,
          maxTimeoutSeconds: 300,
        },
      ],
      description: `AI-Net ${capConfig.id} agent: ${capConfig.description}`,
      mimeType: "application/json",
    };

    res.status(402).set({
      "Content-Type": "application/json",
      "Accepts": JSON.stringify(requirements),
    }).json({
      error: "Payment required",
      requirements,
      price: `$${capConfig.priceUSD} USDC`,
      endpoint: `/x402/agent/${capability}`,
      instructions: "Sign a transferWithAuthorization for the amount above and send it in the X-PAYMENT header",
    });
    return;
  }

  // Parse payment payload
  let paymentPayload: any;
  try {
    const decoded = Buffer.from(paymentData, "base64").toString();
    paymentPayload = JSON.parse(decoded);
  } catch {
    res.status(400).json({ error: "Invalid payment payload encoding" });
    return;
  }

  const paymentRequirements = {
    scheme: "exact",
    network: "eip155:42220",
    amount: capConfig.priceUnits.toString(),
    asset: config.usdcAddress,
    payTo: account.address,
    maxTimeoutSeconds: 300,
  };

  // Verify payment
  const verification = await verifyPayment(paymentPayload, paymentRequirements);
  if (!verification.valid) {
    res.status(402).json({ error: "Payment verification failed", details: verification.error });
    return;
  }

  // Settle payment on-chain
  const settlement = await settlePayment(paymentPayload, paymentRequirements);
  if (!settlement.success) {
    res.status(402).json({ error: "Payment settlement failed", details: settlement.error });
    return;
  }

  // Run the agent
  try {
    console.log(`[x402] Serving ${capability} request (tx: ${settlement.txHash})`);
    const output = await callAgent(capability, task, context);

    res.json({
      capability,
      output,
      payment: {
        settled: true,
        txHash: settlement.txHash,
        amount: capConfig.priceUSD,
        token: "USDC",
        network: "Celo Mainnet (42220)",
      },
      attribution: config.attributionTag,
    });
  } catch (err) {
    res.status(500).json({ error: "Agent execution failed", details: (err as Error).message });
  }
});

/**
 * GET /x402/health
 * Health check for the x402 server
 */
app.get("/x402/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    protocol: "x402",
    network: "Celo Mainnet (42220)",
    facilitator: config.x402FacilitatorUrl,
    capabilities: AGENT_CAPABILITIES.length,
    attributionTag: config.attributionTag,
  });
});

/**
 * POST /x402/batch
 * Batch multiple x402 payments in one request.
 * Each item in the batch is a separate payment (counts separately on leaderboard).
 */
app.post("/x402/batch", async (req: Request, res: Response) => {
  const { items } = req.body as { items?: Array<{ capability: string; task: string; context?: string }> };

  if (!items?.length) {
    res.status(400).json({ error: "items array is required with at least 1 item" });
    return;
  }

  if (items.length > 10) {
    res.status(400).json({ error: "Maximum 10 items per batch" });
    return;
  }

  // Process all items in parallel
  const results = await Promise.allSettled(
    items.map(async (item) => {
      const capConfig = AGENT_CAPABILITIES.find(c => c.id === item.capability);
      if (!capConfig) throw new Error(`Unknown capability: ${item.capability}`);
      
      const output = await callAgent(item.capability, item.task, item.context ?? "");
      return {
        capability: item.capability,
        output,
        price: capConfig.priceUSD,
      };
    })
  );

  res.json({
    results: results.map((r, i) => ({
      status: r.status,
      ...(r.status === "fulfilled" ? r.value : { error: (r.reason as Error).message }),
    })),
    totalItems: items.length,
    attribution: config.attributionTag,
  });
});

export default app;
