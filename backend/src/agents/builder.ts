import { veniceChat } from "./venice";

export interface ProjectFile { path: string; content: string; }
export interface BuildPlan {
  stack: string;
  framework: string;
  files: string[];   // relative paths that will be generated
  installCmd: string;
  buildCmd: string;
  devCmd: string;
  description: string;
}

const ARCHITECT_SYSTEM = `You are a senior software architect. Given a one-line product description, output ONLY a JSON object — no explanation, no markdown, no text outside the JSON.

Output format:
{
  "stack": "e.g. Next.js 14 + Tailwind + TypeScript",
  "framework": "nextjs" | "vite-react" | "vite-vanilla" | "hardhat",
  "files": ["list", "of", "relative", "file", "paths", "to", "generate"],
  "installCmd": "npm install",
  "buildCmd": "npm run build",
  "devCmd": "npm run dev",
  "description": "one sentence describing what will be built"
}

Rules:
- Choose the simplest stack that fully satisfies the request
- For dApps use Next.js + wagmi + viem + Tailwind
- For websites use Next.js + Tailwind
- For smart contracts use Hardhat + TypeScript
- Include package.json, tsconfig, tailwind.config if relevant
- List every file needed for a working app — no placeholders`;

const CODER_SYSTEM = `You are a senior software engineer. Given a build plan and a product description, output ONLY a JSON array — no explanation, no markdown, no text outside the JSON.

Output format:
[
  { "path": "relative/path/to/file.ts", "content": "complete file content here" },
  ...
]

Rules:
- Write EVERY file completely — no TODOs, no placeholders, no "// rest of implementation"
- Every import must resolve — include all files those imports need
- package.json must have all dependencies with pinned versions
- If building a dApp: use wagmi + viem, include wallet connect, show real contract interactions
- If building a website: use Tailwind, make it visually polished with dark theme
- Never write explanations. Only output the JSON array.`;

const DESIGNER_SYSTEM = `You are a senior UI/UX engineer specialising in Tailwind CSS. Given a list of generated files and the product description, output ONLY a JSON array of files to UPDATE with improved styling.

Output format:
[
  { "path": "path/to/component.tsx", "content": "complete updated file with better UI" },
  ...
]

Rules:
- Only return files that need UI changes — typically page.tsx, layout.tsx, component files
- Make it dark, modern, clean — use gradients, glassmorphism, proper spacing
- Keep all logic identical — only improve visual presentation
- Never write explanations. Only output the JSON array.`;

const REVIEWER_SYSTEM = `You are a code reviewer and fixer. Given the full file list for a project and the product description, output ONLY a JSON array of files that have bugs or issues, with fixes applied.

Output format:
[
  { "path": "path/to/file.ts", "content": "complete fixed file" },
  ...
]

Rules:
- Fix import errors, missing exports, type errors, runtime bugs
- If nothing is wrong, output []
- Never write explanations. Only output the JSON array.`;

function parseJSON<T>(raw: string): T {
  const cleaned = raw.replace(/^```[a-z]*\n?/gm, "").replace(/^```\n?/gm, "").trim();
  // Try direct parse first
  try { return JSON.parse(cleaned) as T; } catch {}
  // Try to extract the first complete JSON object or array
  const objMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (objMatch) {
    try { return JSON.parse(objMatch[1]) as T; } catch {}
  }
  // If still truncated, try to repair by closing open brackets
  const repaired = cleaned.replace(/,\s*$/, "") + (cleaned.startsWith("[") ? "]" : "}");
  try { return JSON.parse(repaired) as T; } catch {}
  throw new Error(`Failed to parse JSON from model output: ${cleaned.slice(0, 200)}`);
}

const MODEL = "mistral-small-3-2-24b-instruct";

export async function runArchitect(prompt: string): Promise<BuildPlan> {
  const raw = await veniceChat(ARCHITECT_SYSTEM, prompt, MODEL);
  return parseJSON<BuildPlan>(raw);
}

export async function runCoder(prompt: string, plan: BuildPlan): Promise<ProjectFile[]> {
  const userMsg = `Product: ${prompt}\n\nBuild plan:\n${JSON.stringify(plan, null, 2)}\n\nGenerate all files now.`;
  const raw = await veniceChat(CODER_SYSTEM, userMsg, MODEL);
  return parseJSON<ProjectFile[]>(raw);
}

export async function runDesigner(prompt: string, files: ProjectFile[]): Promise<ProjectFile[]> {
  const fileSummary = files.map(f => f.path).join("\n");
  const uiFiles = files.filter(f => /\.(tsx|jsx|css|html)$/.test(f.path));
  const userMsg = `Product: ${prompt}\n\nFiles in project:\n${fileSummary}\n\nUI files to polish:\n${JSON.stringify(uiFiles, null, 2)}`;
  const raw = await veniceChat(DESIGNER_SYSTEM, userMsg, MODEL);
  const updates = parseJSON<ProjectFile[]>(raw);
  const map = new Map(files.map(f => [f.path, f]));
  for (const u of updates) map.set(u.path, u);
  return Array.from(map.values());
}

export async function runReviewer(prompt: string, files: ProjectFile[]): Promise<ProjectFile[]> {
  // Only send source files — skip package.json, tsconfig, etc. to reduce tokens
  const srcFiles = files.filter(f => /\.(ts|tsx|js|jsx|css)$/.test(f.path));
  const userMsg = `Product: ${prompt}\n\nSource files:\n${JSON.stringify(srcFiles, null, 2)}`;
  const raw = await veniceChat(REVIEWER_SYSTEM, userMsg, MODEL);
  const fixes = parseJSON<ProjectFile[]>(raw);
  const map = new Map(files.map(f => [f.path, f]));
  for (const f of fixes) map.set(f.path, f);
  return Array.from(map.values());
}
