import type { HarnessOutput } from "../interface";
import type { EvalTask } from "./tasks";

export interface TaskResult {
  taskId: string;
  harness: string;
  passed: boolean;
  score: number;           // 0–1 composite
  latencyMs: number;
  tokensUsed: number;
  costUsd: number;
  modelsUsed: string[];
  output: string;
  error?: string;
}

export interface EvalSummary {
  harness: string;
  totalTasks: number;
  passed: number;
  passRate: number;         // 0–1
  avgLatencyMs: number;
  totalCostUsd: number;
  totalTokens: number;
  byCategory: Record<string, { passed: number; total: number }>;
  results: TaskResult[];
}

export function scoreResult(
  task: EvalTask,
  output: HarnessOutput
): TaskResult {
  const result = output.result.toLowerCase();
  const passed = !output.error &&
    task.expectedContains.every((s) => result.includes(s.toLowerCase()));

  // Composite score: correctness (70%) + speed bonus (30%)
  // Speed bonus: full points under 3s, zero at 15s+
  const speedScore = Math.max(0, 1 - (output.metrics.totalLatencyMs - 3000) / 12000);
  const score = passed ? 0.7 + 0.3 * speedScore : 0;

  return {
    taskId: task.id,
    harness: "",              // filled by runner
    passed,
    score,
    latencyMs: output.metrics.totalLatencyMs,
    tokensUsed: output.metrics.totalTokensUsed,
    costUsd: output.metrics.estimatedCostUsd,
    modelsUsed: output.metrics.modelsUsed,
    output: output.result,
    error: output.error,
  };
}

export function summarize(harness: string, results: TaskResult[]): EvalSummary {
  const passed = results.filter((r) => r.passed).length;
  const byCategory: Record<string, { passed: number; total: number }> = {};

  for (const r of results) {
    const cat = r.taskId.split("-")[0];
    if (!byCategory[cat]) byCategory[cat] = { passed: 0, total: 0 };
    byCategory[cat].total++;
    if (r.passed) byCategory[cat].passed++;
  }

  return {
    harness,
    totalTasks: results.length,
    passed,
    passRate: results.length ? passed / results.length : 0,
    avgLatencyMs: results.reduce((s, r) => s + r.latencyMs, 0) / results.length,
    totalCostUsd: results.reduce((s, r) => s + r.costUsd, 0),
    totalTokens: results.reduce((s, r) => s + r.tokensUsed, 0),
    byCategory,
    results,
  };
}
