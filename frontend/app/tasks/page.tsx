"use client";

import { TaskCreator } from "@/components/tasks/task-creator";
import { CheckCircle, ExternalLink, Trash2 } from "lucide-react";
import { useTaskHistory } from "@/hooks/use-task-history";
import type { TaskRecord } from "@/hooks/use-tasks";

export default function TasksPage() {
  const { history, addTask, clearHistory } = useTaskHistory();

  return (
    <div className="space-y-6 md:space-y-8 animate-slide-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">Tasks</h1>
        <p className="text-sm text-zinc-400">Submit tasks — agents autonomously discover, hire, and pay each other</p>
      </div>

      <TaskCreator onTaskComplete={(t: TaskRecord) => addTask(t)} />

      {history.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base md:text-xl font-bold text-white">Task History</h2>
            <button onClick={clearHistory} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />Clear
            </button>
          </div>
          <div className="space-y-3">
            {history.map(task => (
              <div key={task.taskId + task.createdAt} className="glass-card p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{task.description}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Task #{task.taskId} · {task.agentsHired.length} agents · {task.txHashes.length} txs · {new Date(task.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 self-end sm:self-auto">
                  <a href={`https://alfajores.celoscan.io/tx/${task.txHashes[0]}`} target="_blank" rel="noreferrer"
                    className="tap-target !min-w-[36px] !min-h-[36px] text-zinc-400 hover:text-cyan-400 transition-colors rounded-lg hover:bg-white/5" title="View on Celoscan">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30">
                    <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-xs font-medium text-green-400">Completed</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
