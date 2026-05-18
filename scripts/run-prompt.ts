// Side-by-side prompt tester.
// Usage: pnpm prompt "your prompt here"
// Runs both harnesses against the same prompt and prints results + a metrics
// row. The getWeather tool is attached by default so weather prompts work; the
// model just ignores it otherwise. Promise.allSettled keeps one harness's
// failure from killing the other.

import { getWeather } from "../lib/ai/tools/get-weather";
import type { HarnessInput, HarnessOutput } from "../lib/harness/interface";
import { multiModelHarness } from "../lib/harness/multi-model";
import { nativeHarness } from "../lib/harness/native";

const prompt = process.argv.slice(2).join(" ").trim();
if (!prompt) {
  console.error('Usage: pnpm prompt "your prompt here"');
  process.exit(1);
}
if (!process.env.AI_GATEWAY_API_KEY && !process.env.ANTHROPIC_API_KEY) {
  console.error(
    "Neither AI_GATEWAY_API_KEY nor ANTHROPIC_API_KEY is set. Add one to .env.local or export it before running."
  );
  process.exit(1);
}

const input: HarnessInput = {
  task: prompt,
  tools: { getWeather },
  maxSteps: 5,
};

const RULE = "─".repeat(64);

function header(label: string): void {
  const inner = ` ${label} `;
  const pad = Math.max(0, RULE.length - inner.length - 2);
  console.log(`\n──${inner}${"─".repeat(pad)}`);
}

function print(label: string, r: PromiseSettledResult<HarnessOutput>): void {
  header(label);
  if (r.status === "rejected") {
    console.log("ERROR:", String(r.reason));
    return;
  }
  const o = r.value;
  console.log("Result:", o.result || "(empty)");
  console.log(
    `Models: ${o.metrics.modelsUsed.join(", ") || "(none)"} | Steps: ${o.steps.length}`
  );
  console.log(
    `Latency: ${o.metrics.totalLatencyMs}ms | Tokens: ${o.metrics.totalTokensUsed} | Cost: $${o.metrics.estimatedCostUsd.toFixed(6)}`
  );
  if (o.error) {
    console.log("Harness error:", o.error);
  }
  const stepTypes = o.steps.map((s) => s.type).join(" -> ");
  if (stepTypes) {
    console.log("Step types:", stepTypes);
  }
  const reasoning = o.steps.find((s) => s.type === "reasoning");
  if (reasoning) {
    console.log("Router note:", reasoning.content);
  }
}

function pickWinner(aVal: number, bVal: number, lowerIsBetter = true): string {
  if (aVal === bVal) {
    return "tie";
  }
  const aWins = lowerIsBetter ? aVal < bVal : aVal > bVal;
  return aWins ? "NATIVE" : "MULTI";
}

function summary(
  a: PromiseSettledResult<HarnessOutput>,
  b: PromiseSettledResult<HarnessOutput>
): void {
  header("SUMMARY");
  if (a.status !== "fulfilled" || b.status !== "fulfilled") {
    console.log("(skipped — one harness did not return a result)");
    return;
  }
  const am = a.value.metrics;
  const bm = b.value.metrics;
  const col = (s: string | number) => String(s).padEnd(20);
  console.log(`  ${"metric".padEnd(12)}${col("NATIVE")}${col("MULTI")}winner`);
  console.log(
    `  ${"latency(ms)".padEnd(12)}${col(am.totalLatencyMs)}${col(bm.totalLatencyMs)}${pickWinner(am.totalLatencyMs, bm.totalLatencyMs)}`
  );
  console.log(
    `  ${"tokens".padEnd(12)}${col(am.totalTokensUsed)}${col(bm.totalTokensUsed)}${pickWinner(am.totalTokensUsed, bm.totalTokensUsed)}`
  );
  console.log(
    `  ${"cost($)".padEnd(12)}${col(am.estimatedCostUsd.toFixed(6))}${col(bm.estimatedCostUsd.toFixed(6))}${pickWinner(am.estimatedCostUsd, bm.estimatedCostUsd)}`
  );
}

async function main(): Promise<void> {
  header("PROMPT");
  console.log(prompt);

  const [a, b] = await Promise.allSettled([
    nativeHarness.run(input),
    multiModelHarness.run(input),
  ]);

  print("NATIVE (Vercel AI SDK)", a);
  print("MULTI  (Pi router)", b);
  summary(a, b);
  console.log("");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
