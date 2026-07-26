export const CONTRACTS = {
  AGENT_REGISTRY:    process.env.NEXT_PUBLIC_AGENT_REGISTRY    as `0x${string}`,
  GUILD_PERMISSIONS: process.env.NEXT_PUBLIC_GUILD_PERMISSIONS as `0x${string}`,
  TASK_COORDINATOR:  process.env.NEXT_PUBLIC_TASK_COORDINATOR  as `0x${string}`,
  AGENT_JUDGE:       process.env.NEXT_PUBLIC_AGENT_JUDGE       as `0x${string}` ?? "0x57b98Ef64884F698479D22D786cf0D7EfeC93270",
};

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 42220);

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "/api/backend";

export const CAPABILITIES = ["research", "risk", "coding", "design", "audit", "report"] as const;
export type Capability = typeof CAPABILITIES[number];
