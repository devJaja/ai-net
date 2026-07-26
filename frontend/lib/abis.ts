
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
