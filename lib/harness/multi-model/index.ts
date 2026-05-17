import { generateText } from "ai";
import { getLanguageModel } from "@/lib/ai/providers";
import type { Harness, HarnessInput, HarnessOutput, HarnessStep } from "../interface";

// ─── Multi-Model Harness (3-Tier Semantic Router) ────────────────────────────
// Owner: Hacker B
// Approach: classify the task, then dispatch to the smallest model that can
// plausibly answer it.
//   - Tier 1  Routine        → Haiku   (cheap, fast)
//   - Tier 2  Complex        → Sonnet  (capable, mid-cost)
//   - Tier 3  Hard reasoning → Opus    (premium, used sparingly)
// The classifier is a pure function (no API call) so cheap tiers stay cheap.
// Do NOT change the HarnessInput / HarnessOutput types — those are the contract.

const ROUTINE_MODEL = "claude-haiku-4-5-20251001";
const COMPLEX_MODEL = "claude-sonnet-4-6";
const HARD_MODEL = "claude-opus-4-7";

// USD per million tokens. Update if Anthropic pricing changes.
const PRICES: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5-20251001": { input: 1, output: 5 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-opus-4-7": { input: 15, output: 75 },
};

const COMPLEX_KEYWORDS = [
  "log",
  "error",
  "stack trace",
  "traceback",
  "crash",
  "deadlock",
  "exception",
  "debug",
  "memory leak",
];

const HARD_KEYWORDS = [
  "root cause",
  "architecture",
  "trade-off",
  "tradeoff",
  "comprehensive analysis",
  "step-by-step",
  "investigate",
  "diagnose",
  "design review",
];

const COMPLEX_LENGTH = 500;
const HARD_LENGTH = 2000;

type Route = { model: string; tier: "routine" | "complex" | "hard"; reason: string };

export function classify(task: string): Route {
  const lower = task.toLowerCase();

  if (task.length > HARD_LENGTH) {
    return { model: HARD_MODEL, tier: "hard", reason: `length ${task.length} > ${HARD_LENGTH}` };
  }
  const hardHit = HARD_KEYWORDS.find((k) => lower.includes(k));
  if (hardHit) {
    return { model: HARD_MODEL, tier: "hard", reason: `matched hard keyword "${hardHit}"` };
  }

  if (task.length > COMPLEX_LENGTH) {
    return {
      model: COMPLEX_MODEL,
      tier: "complex",
      reason: `length ${task.length} > ${COMPLEX_LENGTH}`,
    };
  }
  const complexHit = COMPLEX_KEYWORDS.find((k) => lower.includes(k));
  if (complexHit) {
    return {
      model: COMPLEX_MODEL,
      tier: "complex",
      reason: `matched complex keyword "${complexHit}"`,
    };
  }

  return { model: ROUTINE_MODEL, tier: "routine", reason: "short, no complexity signals" };
}

function cost(model: string, promptTokens: number, completionTokens: number): number {
  const p = PRICES[model];
  if (!p) return 0;
  return (promptTokens * p.input + completionTokens * p.output) / 1_000_000;
}

export const multiModelHarness: Harness = {
  name: "multi-model",
  description: "3-tier semantic router: routine→Haiku, complex→Sonnet, hard→Opus",

  async run(input: HarnessInput): Promise<HarnessOutput> {
    const start = Date.now();
    const steps: HarnessStep[] = [];

    // ── Classify ─────────────────────────────────────────────────────────────
    const route = classify(input.task);
    steps.push({
      type: "reasoning",
      content: `Router → ${route.tier} → ${route.model} (${route.reason})`,
    });

    // ── Execute ──────────────────────────────────────────────────────────────
    const execStart = Date.now();
    const { text, usage, steps: execSteps } = await generateText({
      model: getLanguageModel(route.model),
      system: input.systemPrompt,
      prompt: input.task,
      tools: input.tools,
      maxSteps: input.maxSteps ?? 5,
    });
    const latencyMs = Date.now() - execStart;
    const promptTokens = usage?.promptTokens ?? 0;
    const completionTokens = usage?.completionTokens ?? 0;

    if (execSteps && execSteps.length > 0) {
      for (const s of execSteps) {
        steps.push({
          type: "output",
          content: typeof s.text === "string" ? s.text : JSON.stringify(s),
          model: route.model,
        });
      }
    } else {
      steps.push({
        type: "output",
        content: text,
        model: route.model,
        latencyMs,
      });
    }

    return {
      result: text,
      steps,
      metrics: {
        totalLatencyMs: Date.now() - start,
        totalTokensUsed: promptTokens + completionTokens,
        estimatedCostUsd: cost(route.model, promptTokens, completionTokens),
        modelsUsed: [route.model],
      },
    };
  },
};
