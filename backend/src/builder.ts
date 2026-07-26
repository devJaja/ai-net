import { execSync } from "child_process";
import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { runArchitect, runCoder, runDesigner, runReviewer, type ProjectFile, type BuildPlan } from "./agents/builder";

export interface BuildResult {
  prompt: string;
  plan: BuildPlan;
  files: ProjectFile[];
  outputDir: string;
  buildLog: string;
  success: boolean;
}

function writeFiles(outputDir: string, files: ProjectFile[]) {
  for (const f of files) {
    const fullPath = join(outputDir, f.path);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, f.content, "utf8");
  }
}

function runCmd(cmd: string, cwd: string): string {
  try {
    return execSync(cmd, { cwd, timeout: 120_000, encoding: "utf8", stdio: "pipe" });
  } catch (e: unknown) {
    return (e as { stdout?: string; stderr?: string }).stdout ?? (e as Error).message;
  }
}

export async function buildProject(prompt: string, baseOutputDir = "/tmp/ai-net-builds"): Promise<BuildResult> {
  const slug = prompt.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
  const outputDir = join(baseOutputDir, `${slug}-${Date.now()}`);
  mkdirSync(outputDir, { recursive: true });

  console.log("[Builder] Architecting...");
  const plan = await runArchitect(prompt);

  console.log("[Builder] Coding...");
  let files = await runCoder(prompt, plan);

  console.log("[Builder] Designing + Reviewing in parallel...");
  const [designed, reviewed] = await Promise.all([
    runDesigner(prompt, files),
    runReviewer(prompt, files),
  ]);

  // Merge: reviewer fixes take priority, then designer polish
  const map = new Map(designed.map(f => [f.path, f]));
  for (const f of reviewed) map.set(f.path, f);
  files = Array.from(map.values());

  console.log(`[Builder] Writing ${files.length} files to ${outputDir}`);
  writeFiles(outputDir, files);

  console.log("[Builder] Installing dependencies...");
  const installLog = runCmd(plan.installCmd, outputDir);

  console.log("[Builder] Building...");
  const buildLog = runCmd(plan.buildCmd, outputDir);

  const success = !buildLog.toLowerCase().includes("error");
  console.log(`[Builder] Done — success=${success}`);

  return { prompt, plan, files, outputDir, buildLog: installLog + "\n" + buildLog, success };
}
