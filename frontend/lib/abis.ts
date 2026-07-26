
// TaskCreated event ABI
export const TASK_CREATED_EVENT_ABI = {
  name: "TaskCreated",
  type: "event",
  inputs: [
    { name: "taskId", indexed: true, type: "uint256" },
    { name: "requester", indexed: true, type: "address" },
    { name: "budget", type: "uint256" },
    { name: "permId", type: "uint256" },
  ],
} as const;

// AgentHired event ABI
export const AGENT_HIRED_EVENT_ABI = {
  name: "AgentHired",
  type: "event",
  inputs: [
    { name: "taskId", indexed: true, type: "uint256" },
    { name: "agent", indexed: true, type: "address" },
    { name: "amount", type: "uint256" },
  ],
} as const;
