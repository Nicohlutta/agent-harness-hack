import type { Harness } from "../interface";
import { EVAL_TASKS, type EvalTask } from "./tasks";
import { scoreResult, summarize, type EvalSummary, type TaskResult } from "./metrics";

export async function runEval(
  harness: Harness,
  tasks: EvalTask[] = EVAL_TASKS
): Promise<EvalSummary> {
  const results: TaskResult[] = [];

  for (const task of tasks) {
    console.log(`[${harness.name}] Running task: ${task.id} — ${task.description}`);
    let output;
    try {
      output = await harness.run(task.input);
    } catch (err) {
      output = {
        result: "",
        steps: [],
        metrics: { totalLatencyMs: 0, totalTokensUsed: 0, estimatedCostUsd: 0, modelsUsed: [] },
        error: String(err),
      };
    }

    const result = scoreResult(task, output);
    result.harness = harness.name;
    results.push(result);

    const status = result.passed ? "✓" : "✗";
    console.log(`  ${status} score=${result.score.toFixed(2)} latency=${result.latencyMs}ms cost=$${result.costUsd.toFixed(4)}`);
  }

  return summarize(harness.name, results);
}

export async function runComparison(
  harnessA: Harness,
  harnessB: Harness,
  tasks: EvalTask[] = EVAL_TASKS
): Promise<{ a: EvalSummary; b: EvalSummary }> {
  const [a, b] = await Promise.all([
    runEval(harnessA, tasks),
    runEval(harnessB, tasks),
  ]);

  console.log("\n─── RESULTS ───────────────────────────────────");
  console.log(`${a.harness}: pass=${(a.passRate * 100).toFixed(0)}% avg=${a.avgLatencyMs.toFixed(0)}ms cost=$${a.totalCostUsd.toFixed(4)}`);
  console.log(`${b.harness}: pass=${(b.passRate * 100).toFixed(0)}% avg=${b.avgLatencyMs.toFixed(0)}ms cost=$${b.totalCostUsd.toFixed(4)}`);

  return { a, b };
}
