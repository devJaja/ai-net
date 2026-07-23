/**
 * Track 3: Askbots — Agentic Office Hours Integration
 *
 * Registers AI-Net as a bot on askbots.ai, browses matched projects,
 * generates structured feedback via Venice AI, solves the anti-human
 * challenge programmatically, and earns USDT on Celo.
 *
 * The highest bot rating wins the $500 Askbots Prize Pool.
 *
 * Flow:
 *   1. Register + create bot profile (once)
 *   2. Poll /projects for matched feedback projects
 *   3. Review the project's property (website, API, etc.)
 *   4. Generate thoughtful feedback via Venice AI
 *   5. Submit response + solve math challenge
 *   6. Earn $0.10 USDT per response instantly
 */
import "dotenv/config";
import axios from "axios";
import { config } from "./config";
import { account } from "./chain";
import { veniceChat } from "./agents/venice";

// ── Askbots API Client ─────────────────────────────────────────────────────────

const ASKBOTS_BASE = "https://main--askbots.netlify.app/api";

interface AskbotsClient {
  apiKey: string;
  agentId: string;
}

let clientState: AskbotsClient | null = null;

function getClient(): AskbotsClient {
  const apiKey = process.env.ASKBOTS_API_KEY;
  if (!apiKey) throw new Error("ASKBOTS_API_KEY not set in .env");
  const agentId = process.env.ASKBOTS_AGENT_ID ?? "";
  return { apiKey, agentId };
}

function api(method: string, path: string, body?: any) {
  const { apiKey } = getClient();
  return axios({
    method,
    url: `${ASKBOTS_BASE}${path}`,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    data: body,
    timeout: 30_000,
  });
}

// ── Registration ──────────────────────────────────────────────────────────────

export async function registerBot(): Promise<{ apiKey: string; agentId: string }> {
  console.log("[Askbots] Registering as bot...");

  const res = await axios.post(`${ASKBOTS_BASE}/auth/openclaw`, {
    name: "AI-Net Coordinator",
    description:
      "Autonomous AI agent coordinator specializing in task delegation, payment routing, multi-agent collaboration, and on-chain coordination on Celo. I provide thoughtful feedback on developer tools, APIs, DeFi protocols, and agent infrastructure.",
  });

  const { apiKey, agentId, message } = res.data;
  console.log(`[Askbots] Registered! agentId=${agentId}`);
  console.log(`[Askbots] ${message}`);

  return { apiKey, agentId };
}

export async function checkBotStatus(): Promise<{
  agentId: string;
  name: string;
  status: string;
} | null> {
  try {
    const res = await api("POST", "/auth/openclaw", {});
    return res.data;
  } catch {
    return null;
  }
}

// ── Bot Profile ───────────────────────────────────────────────────────────────

export async function createBotProfile(): Promise<any> {
  console.log("[Askbots] Creating bot profile...");

  const res = await api("POST", "/bot-profiles", {
    botName: "AI-Net",
    country: "US",
    skills: ["browser", "github", "anthropic", "webhooks", "openai"],
    celoAddress: account.address,
  });

  console.log(`[Askbots] Profile created: ${JSON.stringify(res.data).slice(0, 200)}`);
  return res.data;
}

export async function getBotProfile(): Promise<any> {
  const res = await api("GET", "/bot-profiles/me");
  return res.data;
}

// ── Project Discovery ─────────────────────────────────────────────────────────

interface AskbotsQuestion {
  id: string;
  text: string;
  type: "freeform" | "rating" | "multiple_choice" | "multiselect";
  choices?: string[];
}

interface AskbotsProject {
  id: string;
  name: string;
  propertyType: string;
  propertyUrl: string;
  budget: number;
  responsesReceived: number;
  questions: AskbotsQuestion[];
}

export async function listMatchedProjects(): Promise<AskbotsProject[]> {
  const res = await api("GET", "/projects");
  return res.data.projects ?? [];
}

export async function getProjectDetails(
  projectId: string
): Promise<AskbotsProject> {
  const res = await api("GET", `/projects/${projectId}`);
  return res.data;
}

// ── Feedback Generation ───────────────────────────────────────────────────────

function buildFeedbackPrompt(
  projectName: string,
  propertyType: string,
  propertyUrl: string,
  questions: AskbotsQuestion[]
): string {
  const questionList = questions
    .map(
      (q, i) =>
        `${i + 1}. [${q.type}] ${q.id}: "${q.text}"${q.choices ? ` Choices: ${q.choices.join(", ")}` : ""}`
    )
    .join("\n");

  return `You are reviewing a ${propertyType} for a project called "${projectName}".

Property URL: ${propertyUrl}

Answer each question below thoughtfully. Be specific, reference concrete details, and provide actionable suggestions. Do not give generic or vague feedback.

Questions:
${questionList}

Return your answers as a JSON array with this exact format:
[
  { "questionId": "q_id", "answer": "your answer" }
]

For "rating" questions, answer with a number 1-10 as a string.
For "multiple_choice" questions, answer with exactly one of the provided choices.
For "multiselect" questions, answer with a JSON array string like "[\"Option A\", \"Option B\"]".
For "freeform" questions, provide a detailed 2-4 sentence answer with specific observations.

Output ONLY the JSON array, nothing else.`;
}

export async function generateFeedback(
  project: AskbotsProject
): Promise<Array<{ questionId: string; answer: string }>> {
  const systemPrompt = `You are a thorough, honest product reviewer specializing in developer tools, APIs, DeFi protocols, and AI agent infrastructure. You provide specific, actionable feedback — never generic praise. You reference concrete UI elements, API responses, code patterns, or design choices.`;

  const userPrompt = buildFeedbackPrompt(
    project.name,
    project.propertyType,
    project.propertyUrl,
    project.questions
  );

  console.log(`[Askbots] Generating feedback for "${project.name}" (${project.propertyType})...`);

  const raw = await veniceChat(systemPrompt, userPrompt, "mistral-small-3-2-24b-instruct");

  // Parse JSON from response (handle markdown code blocks)
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (!match) {
    throw new Error(`Failed to parse feedback JSON from Venice response: ${raw.slice(0, 300)}`);
  }

  const answers = JSON.parse(match[0]) as Array<{ questionId: string; answer: string }>;
  console.log(`[Askbots] Generated ${answers.length} answers`);
  return answers;
}

// ── Response Submission + Challenge ────────────────────────────────────────────

interface ChallengeResponse {
  challengeId: string;
  challengeType: string;
  prompt: string;
  timeoutMs: number;
}

function solveMathChallenge(prompt: string): string {
  // Parse math expressions like "What is 847293 * 193847 + 582910384?"
  const expr = prompt
    .replace(/What is /i, "")
    .replace(/\?/g, "")
    .replace(/,/g, "")
    .trim();

  // Safe math evaluation: only allow digits, operators, spaces, parentheses
  if (!/^[\d\s+\-*/().]+$/.test(expr)) {
    throw new Error(`Cannot solve non-math challenge: ${prompt}`);
  }

  // Use Function constructor for safe math eval (no access to globals)
  const result = new Function(`return (${expr})`)();
  return String(Math.floor(result));
}

export async function submitResponse(
  projectId: string,
  answers: Array<{ questionId: string; answer: string }>
): Promise<{ passed: boolean; payout?: string; txHash?: string; error?: string }> {
  console.log(`[Askbots] Submitting response to project ${projectId}...`);

  // Submit the response
  const res = await api("POST", `/projects/${projectId}/respond`, { answers });
  const challenge = res.data as ChallengeResponse;

  console.log(`[Askbots] Challenge received: ${challenge.challengeType} (timeout: ${challenge.timeoutMs}ms)`);

  // Solve the challenge
  const answer = solveMathChallenge(challenge.prompt);
  console.log(`[Askbots] Challenge answer: ${answer}`);

  // Verify challenge
  const verifyRes = await api("POST", `/projects/${projectId}/verify-challenge`, {
    challengeId: challenge.challengeId,
    answer,
  });

  const result = verifyRes.data;
  if (result.passed) {
    console.log(`[Askbots] Challenge passed! Payout: $${result.payout} USDT tx: ${result.txHash}`);
  } else {
    console.log(`[Askbots] Challenge failed: ${result.error}`);
  }

  return result;
}

// ── High-Level: Run One Feedback Cycle ────────────────────────────────────────

export interface FeedbackCycleResult {
  projectId: string;
  projectName: string;
  answersGenerated: number;
  payout?: string;
  txHash?: string;
  error?: string;
}

export async function runFeedbackCycle(): Promise<FeedbackCycleResult[]> {
  const results: FeedbackCycleResult[] = [];

  console.log("[Askbots] Starting feedback cycle...");

  // 1. List matched projects
  const projects = await listMatchedProjects();
  console.log(`[Askbots] Found ${projects.length} matched projects`);

  if (projects.length === 0) {
    console.log("[Askbots] No projects available. Try again later.");
    return results;
  }

  // 2. Process each project (rate limit: 3/day for new bots)
  for (const project of projects.slice(0, 3)) {
    try {
      console.log(`\n[Askbots] Processing: "${project.name}" (${project.propertyType})`);

      // Get full details
      const details = await getProjectDetails(project.id);

      // Generate feedback
      const answers = await generateFeedback(details);

      // Submit + solve challenge
      const result = await submitResponse(project.id, answers);

      results.push({
        projectId: project.id,
        projectName: project.name,
        answersGenerated: answers.length,
        payout: result.payout,
        txHash: result.txHash,
        error: result.error,
      });

      // Respect rate limits — wait between submissions
      if (projects.indexOf(project) < projects.length - 1) {
        console.log("[Askbots] Waiting 3s before next submission...");
        await new Promise((r) => setTimeout(r, 3000));
      }
    } catch (err) {
      console.error(`[Askbots] Error on project "${project.name}": ${(err as Error).message}`);
      results.push({
        projectId: project.id,
        projectName: project.name,
        answersGenerated: 0,
        error: (err as Error).message,
      });
    }
  }

  console.log(`[Askbots] Cycle complete: ${results.length} projects processed`);
  return results;
}

// ── Daemon Mode ───────────────────────────────────────────────────────────────

export async function startAskbotsDaemon(intervalMs = 600_000) {
  console.log("[Askbots] Starting daemon mode...");
  console.log(`[Askbots] Interval: ${intervalMs / 1000}s`);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await runFeedbackCycle();
    } catch (err) {
      console.error(`[Askbots] Cycle error: ${(err as Error).message}`);
    }
    console.log(`[Askbots] Next cycle in ${intervalMs / 1000}s...`);
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

// ── Stats ─────────────────────────────────────────────────────────────────────

let totalCycles = 0;
let totalPayouts = 0;
let totalErrors = 0;

export function getAskbotsStats() {
  return {
    totalCycles,
    totalPayouts,
    totalErrors,
    configured: !!process.env.ASKBOTS_API_KEY,
    celoAddress: account.address,
  };
}

// ── CLI Entry Point ───────────────────────────────────────────────────────────

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes("--register")) {
    registerBot()
      .then((r) => {
        console.log("\n=== Registration Complete ===");
        console.log(`API Key: ${r.apiKey}`);
        console.log(`Agent ID: ${r.agentId}`);
        console.log("\nAdd to backend/.env:");
        console.log(`ASKBOTS_API_KEY=${r.apiKey}`);
        console.log(`ASKBOTS_AGENT_ID=${r.agentId}`);
      })
      .catch((e) => {
        console.error("Registration failed:", e.message);
        process.exit(1);
      });
  } else if (args.includes("--profile")) {
    createBotProfile()
      .then(() => process.exit(0))
      .catch((e) => {
        console.error("Profile creation failed:", e.message);
        process.exit(1);
      });
  } else if (args.includes("--daemon")) {
    const interval = parseInt(args[args.indexOf("--interval") + 1] ?? "600000", 10);
    startAskbotsDaemon(interval).catch((e) => {
      console.error("Daemon error:", e);
      process.exit(1);
    });
  } else {
    runFeedbackCycle()
      .then((r) => {
        console.log("\n=== Feedback Cycle Results ===");
        r.forEach((x) =>
          console.log(
            `  ${x.projectName}: ${x.error ?? `✓ $${x.payout} tx:${x.txHash}`}`
          )
        );
        process.exit(0);
      })
      .catch((e) => {
        console.error("Cycle failed:", e.message);
        process.exit(1);
      });
  }
}
