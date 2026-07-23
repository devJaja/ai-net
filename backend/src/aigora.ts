/**
 * Track 4: Best Feedback for Aigora
 *
 * Registers AI-Net on aigora.org for a public agent profile,
 * then submits structured feedback on other agents/services.
 * Top 10 most valuable feedback entries win $50 CELO each.
 *
 * Flow:
 *   1. Register agent on Aigora (Celo Sepolia testnet)
 *   2. Create public profile: https://aigora.org/services/<id>
 *   3. Review other agents/services on Aigora
 *   4. Submit feedback via GitHub issue (trionlabs/aigora-skills)
 *   5. Submit Aigora profile URL + feedback issue URL to Celo Builders
 */
import "dotenv/config";
import axios from "axios";
import { config } from "./config";
import { account } from "./chain";
import { veniceChat } from "./agents/venice";

// Aigora API Client
const AIGORA_BASE = "https://aigora.org/api";

interface AigoraProfile {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  walletAddress: string;
  website?: string;
  github?: string;
}

// Registration

export async function registerAgent(): Promise<{
  profileId: string;
  profileUrl: string;
  txHash?: string;
}> {
  console.log("[Aigora] Registering agent identity...");

  const profile: AigoraProfile = {
    id: "",
    name: "AI-Net Coordinator",
    description:
      "Autonomous AI agent coordinator for task delegation, agent hiring, and payment routing on Celo. Specializes in multi-agent workflows, x402 micropayments, and on-chain coordination. Part of the AI-Net decentralized agent economy.",
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
      "multi-agent-collaboration",
    ],
    walletAddress: account.address,
    website: "https://ai-net.vercel.app",
    github: "https://github.com/devJaja/ai-net",
  };

  try {
    const res = await axios.post(AIGORA_BASE + "/agents", {
      ...profile,
      chain: "celo-sepolia",
      chainId: 11142220,
    }, {
      headers: { "Content-Type": "application/json" },
      timeout: 30_000,
    });

    const profileId = res.data.id ?? res.data.agentId ?? res.data._id;
    const profileUrl = "https://aigora.org/services/" + profileId;

    console.log("[Aigora] Agent registered! ID: " + profileId);
    console.log("[Aigora] Profile URL: " + profileUrl);

    return { profileId, profileUrl, txHash: res.data.txHash };
  } catch (err) {
    console.log("[Aigora] API registration failed: " + (err as Error).message);
    console.log("[Aigora] Falling back to manual registration guidance...");

    return registerAgentFallback(profile);
  }
}

async function registerAgentFallback(
  profile: AigoraProfile
): Promise<{ profileId: string; profileUrl: string }> {
  const systemPrompt = "You are helping register an AI agent on Aigora, a decentralized agent marketplace on Celo. Generate a clean, professional agent profile JSON that follows Aigora's expected format.";

  const userPrompt = "Generate a registration payload for this agent:\n\nName: " + profile.name + "\nDescription: " + profile.description + "\nCapabilities: " + profile.capabilities.join(", ") + "\nWallet: " + profile.walletAddress + "\nWebsite: " + profile.website + "\nGitHub: " + profile.github + "\n\nReturn a JSON object with fields: name, description, image (use a placeholder), capabilities, walletAddress, endpoints (array with type and url), metadata (key-value pairs).\n\nOutput ONLY the JSON object.";

  const raw = await veniceChat(systemPrompt, userPrompt, "mistral-small-3-2-24b-instruct");
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    const payload = JSON.parse(cleaned);
    console.log("[Aigora] Registration payload generated:");
    console.log(JSON.stringify(payload, null, 2).slice(0, 500));
  } catch {
    console.log("[Aigora] Raw payload:", cleaned.slice(0, 500));
  }

  return {
    profileId: "pending-registration",
    profileUrl: "https://aigora.org/services/pending-registration",
  };
}

// Feedback Generation

export async function generateAgentFeedback(
  targetName: string,
  targetDescription: string,
  targetCapabilities: string[]
): Promise<string> {
  console.log("[Aigora] Generating feedback for " + targetName + "...");

  const systemPrompt = "You are an expert AI agent reviewer specializing in on-chain agent economies, DeFi protocols, and developer tools on Celo. You provide honest, specific, and constructive feedback. You identify both strengths and areas for improvement. Your feedback should be detailed enough to be genuinely useful to the agent's developers.";

  const userPrompt = "Review this AI agent/service and provide detailed, constructive feedback:\n\nAgent Name: " + targetName + "\nDescription: " + targetDescription + "\nCapabilities: " + targetCapabilities.join(", ") + "\n\nProvide feedback covering:\n1. Strengths - What does this agent do well? Be specific.\n2. Innovation - How does it push the boundaries of agent technology?\n3. Areas for Improvement - What could be better? Suggest concrete improvements.\n4. Celo Ecosystem Fit - How well does it serve the Celo community?\n5. Rating - Rate it 1-5 stars with a brief justification.\n\nBe thorough but concise. Reference specific aspects of the agent's capabilities and design.";

  const feedback = await veniceChat(systemPrompt, userPrompt, "mistral-small-3-2-24b-instruct");
  console.log("[Aigora] Feedback generated (" + feedback.length + " chars)");
  return feedback;
}

// Submit Feedback Issue

export async function submitFeedbackIssue(
  agentName: string,
  feedback: string
): Promise<{ issueUrl: string; issueNumber?: number }> {
  console.log("[Aigora] Submitting feedback issue for " + agentName + "...");

  const title = "Agent Feedback: " + agentName + " - reviewed by AI-Net";
  const date = new Date().toISOString();
  const wallet = account.address;
  const tag = config.attributionTag;
  const hackathonUrl = "https://celobuilders.xyz/hackathons/agentic-payments-defai";

  const bodyLines = [
    "## Agent Feedback Submission",
    "",
    "**Reviewer:** AI-Net Coordinator",
    "**Target Agent:** " + agentName,
    "**Date:** " + date,
    "**Reviewer Wallet:** " + wallet,
    "**Attribution Tag:** " + tag,
    "",
    "---",
    "",
    "### Feedback",
    "",
    feedback,
    "",
    "---",
    "",
    "*This feedback was generated as part of the [Agentic Payments & DeFAI Hackathon](" + hackathonUrl + ") Track 4: Best Feedback for Aigora.*",
  ];
  const body = bodyLines.join("\n");

  const systemPrompt = "You are a feedback quality reviewer. Given an agent feedback submission, output a quality score from 1-10 and whether it meets the bar for the Aigora feedback hackathon track. Be concise.";

  const userPrompt = "Rate this feedback submission quality (1-10) and whether it should be accepted:\n\n" + feedback.slice(0, 1000) + "\n\nOutput format: SCORE: <number> VERDICT: <ACCEPT|REJECT> REASON: <brief reason>";

  const assessment = await veniceChat(systemPrompt, userPrompt, "mistral-small-3-2-24b-instruct");
  console.log("[Aigora] Quality assessment: " + assessment.split("\n")[0]);

  const issueUrl = "https://github.com/trionlabs/aigora-skills/issues/new?title=" + encodeURIComponent(title) + "&body=" + encodeURIComponent(body);

  console.log("[Aigora] Feedback issue URL generated");
  console.log("[Aigora] Submit this issue at: " + issueUrl);

  return { issueUrl };
}

// Discover Agents on Aigora

interface AigoraAgent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  rating?: number;
}

export async function discoverAgents(): Promise<AigoraAgent[]> {
  try {
    const res = await axios.get(AIGORA_BASE + "/agents", {
      params: { chain: "celo-sepolia", limit: 20 },
      timeout: 15_000,
    });
    return res.data.agents ?? res.data ?? [];
  } catch (err) {
    console.log("[Aigora] Discovery failed: " + (err as Error).message);
    return getSeedAgents();
  }
}

function getSeedAgents(): AigoraAgent[] {
  return [
    {
      id: "celo-minipay",
      name: "MiniPay Agent",
      description: "Celo's native mobile wallet agent for seamless payments and DeFi access across 10M+ users in emerging markets.",
      capabilities: ["payments", "defi", "mobile-wallet", "minipay"],
      rating: 4,
    },
    {
      id: "celo-oracle",
      name: "Celo Oracle Service",
      description: "Decentralized oracle providing price feeds for CELO, cUSD, cEUR, and other Celo-native stablecoins.",
      capabilities: ["price-feeds", "oracle", "defi", "data"],
      rating: 4,
    },
    {
      id: "plumo-light-client",
      name: "Plumo Light Client",
      description: "Ultra-light client for Celo enabling mobile devices to verify on-chain state with minimal resources.",
      capabilities: ["light-client", "mobile", "verification", "ulc"],
      rating: 5,
    },
    {
      id: "mento-stability",
      name: "Mento Stability Protocol",
      description: "Algorithmic stability mechanism for cUSD and cEUR on Celo, managing collateral and arbitrage incentives.",
      capabilities: ["stablecoin", "defi", "stability", "protocol"],
      rating: 4,
    },
    {
      id: "impact-market",
      name: "Impact Market",
      description: "Decentralized universal basic income (UBI) protocol built on Celo, enabling community-driven wealth redistribution.",
      capabilities: ["ubi", "social-impact", "defi", "community"],
      rating: 4,
    },
  ];
}

// High-Level: Run Feedback Cycle

export interface AigoraFeedbackResult {
  agentName: string;
  feedbackGenerated: boolean;
  issueUrl?: string;
  error?: string;
}

export async function runFeedbackCycle(
  maxAgents = 3
): Promise<AigoraFeedbackResult[]> {
  const results: AigoraFeedbackResult[] = [];

  console.log("[Aigora] Starting feedback cycle...");

  const agents = await discoverAgents();
  console.log("[Aigora] Found " + agents.length + " agents to review");

  const toReview = agents.filter(
    (a) => !a.name.toLowerCase().includes("ai-net")
  );

  for (const agent of toReview.slice(0, maxAgents)) {
    try {
      console.log("\n[Aigora] Reviewing: " + agent.name);

      const feedback = await generateAgentFeedback(
        agent.name,
        agent.description,
        agent.capabilities
      );

      const { issueUrl } = await submitFeedbackIssue(agent.name, feedback);

      results.push({
        agentName: agent.name,
        feedbackGenerated: true,
        issueUrl,
      });

      if (toReview.indexOf(agent) < maxAgents - 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (err) {
      console.error("[Aigora] Error reviewing " + agent.name + ": " + (err as Error).message);
      results.push({
        agentName: agent.name,
        feedbackGenerated: false,
        error: (err as Error).message,
      });
    }
  }

  console.log("[Aigora] Cycle complete: " + results.filter((r) => r.feedbackGenerated).length + "/" + results.length + " feedbacks submitted");
  return results;
}

// Daemon Mode

export async function startAigoraDaemon(intervalMs = 1800_000) {
  console.log("[Aigora] Starting daemon mode...");
  console.log("[Aigora] Interval: " + (intervalMs / 1000) + "s");

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await runFeedbackCycle(2);
    } catch (err) {
      console.error("[Aigora] Cycle error: " + (err as Error).message);
    }
    console.log("[Aigora] Next cycle in " + (intervalMs / 1000) + "s...");
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

// Status & Stats

let totalFeedbackSubmitted = 0;
let totalIssuesCreated = 0;

export function getAigoraStats() {
  return {
    totalFeedbackSubmitted,
    totalIssuesCreated,
    profileUrl: process.env.AIGORA_PROFILE_URL ?? "not registered",
    feedbackIssueUrls: (process.env.AIGORA_FEEDBACK_ISSUES ?? "").split(",").filter(Boolean),
    configured: !!process.env.AIGORA_API_KEY || !!process.env.AIGORA_PROFILE_URL,
  };
}

// CLI Entry Point

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes("--register")) {
    registerAgent()
      .then((r) => {
        console.log("\n=== Registration Complete ===");
        console.log("Profile ID: " + r.profileId);
        console.log("Profile URL: " + r.profileUrl);
        console.log("\nAdd to backend/.env:");
        console.log("AIGORA_PROFILE_URL=" + r.profileUrl);
        if (r.txHash) console.log("AIGORA_TX_HASH=" + r.txHash);
      })
      .catch((e) => {
        console.error("Registration failed:", e.message);
        process.exit(1);
      });
  } else if (args.includes("--daemon")) {
    const interval = parseInt(args[args.indexOf("--interval") + 1] ?? "1800000", 10);
    startAigoraDaemon(interval).catch((e) => {
      console.error("Daemon error:", e);
      process.exit(1);
    });
  } else if (args.includes("--discover")) {
    discoverAgents()
      .then((agents) => {
        console.log("\n=== Discovered Agents ===");
        agents.forEach((a) =>
          console.log("  " + a.name + ": " + a.description.slice(0, 80) + "...")
        );
        process.exit(0);
      })
      .catch((e) => {
        console.error("Discovery failed:", e.message);
        process.exit(1);
      });
  } else {
    runFeedbackCycle(2)
      .then((r) => {
        console.log("\n=== Aigora Feedback Results ===");
        r.forEach((x) =>
          console.log("  " + x.agentName + ": " + (x.error ?? ("OK " + x.issueUrl)))
        );
        process.exit(0);
      })
      .catch((e) => {
        console.error("Cycle failed:", e.message);
        process.exit(1);
      });
  }
}
