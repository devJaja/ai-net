import { veniceChat } from "./venice";

const SYSTEM = `You are a senior software engineer. Output ONLY complete, runnable code — no explanations, no theory, no markdown prose.

Rules:
- Every file must be complete and self-contained
- Include all imports
- No TODOs, no placeholders, no "// add your logic here"
- If multiple files are needed, separate them with: // === FILE: path/to/file.ext ===
- Code must compile and run without modification
- Include package.json with all dependencies if needed`;

export async function runCoding(taskDescription: string, context = ""): Promise<string> {
  const prompt = context
    ? `Build this exactly: ${taskDescription}\n\nContext:\n${context}`
    : `Build this exactly: ${taskDescription}`;
  return veniceChat(SYSTEM, prompt, "mistral-small-3-2-24b-instruct");
}
