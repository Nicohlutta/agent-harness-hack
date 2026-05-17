import { generateText } from "ai";
import { getLanguageModel } from "@/lib/ai/providers";
import type { Harness, HarnessInput, HarnessOutput, HarnessStep } from "../interface";

// ─── Multi-Model Harness ──────────────────────────────────────────────────────
// Owner: Hacker B
// Approach: route subtasks to specialized models.
//   - Planner model: breaks task into steps
//   - Executor model: runs each step (with tools)
//   - Synthesizer model: combines results into final answer
// Feel free to change models, routing logic, and pipeline below.
// Do NOT change the HarnessInput / HarnessOutput types — those are the contract.

const PLANNER_MODEL = "claude-haiku-4-5-20251001";   // fast, cheap — plan only
const EXECUTOR_MODEL = "claude-sonnet-4-6";           // capable — tool use + execution
const SYNTHESIZER_MODEL = "claude-sonnet-4-6";        // final answer synthesis

export const multiModelHarness: Harness = {
  name: "multi-model",
  description: "Planner → Executor → Synthesizer pipeline across specialized models",

  async run(input: HarnessInput): Promise<HarnessOutput> {
    const start = Date.now();
    const steps: HarnessStep[] = [];
    let totalTokens = 0;

    // ── Step 1: Plan ─────────────────────────────────────────────────────────
    const planStart = Date.now();
    const { text: plan, usage: planUsage } = await generateText({
      model: getLanguageModel(PLANNER_MODEL),
      system: "You are a planner. Break the task into numbered steps. Be concise.",
      prompt: input.task,
    });
    totalTokens += (planUsage?.promptTokens ?? 0) + (planUsage?.completionTokens ?? 0);
    steps.push({
      type: "reasoning",
      content: plan,
      model: PLANNER_MODEL,
      latencyMs: Date.now() - planStart,
    });

    // ── Step 2: Execute ───────────────────────────────────────────────────────
    const execStart = Date.now();
    const { text: execution, usage: execUsage, steps: execSteps } = await generateText({
      model: getLanguageModel(EXECUTOR_MODEL),
      system: input.systemPrompt ?? "Execute the plan step by step. Use tools when needed.",
      prompt: `Original task: ${input.task}\n\nPlan:\n${plan}\n\nNow execute each step.`,
      tools: input.tools,
      maxSteps: input.maxSteps ?? 5,
    });
    totalTokens += (execUsage?.promptTokens ?? 0) + (execUsage?.completionTokens ?? 0);
    steps.push({
      type: "output",
      content: execution,
      model: EXECUTOR_MODEL,
      latencyMs: Date.now() - execStart,
    });

    // ── Step 3: Synthesize ────────────────────────────────────────────────────
    const synthStart = Date.now();
    const { text: result, usage: synthUsage } = await generateText({
      model: getLanguageModel(SYNTHESIZER_MODEL),
      system: "Synthesize the execution results into a clear, final answer for the user.",
      prompt: `Task: ${input.task}\n\nExecution results:\n${execution}`,
    });
    totalTokens += (synthUsage?.promptTokens ?? 0) + (synthUsage?.completionTokens ?? 0);
    steps.push({
      type: "output",
      content: result,
      model: SYNTHESIZER_MODEL,
      latencyMs: Date.now() - synthStart,
    });

    return {
      result,
      steps,
      metrics: {
        totalLatencyMs: Date.now() - start,
        totalTokensUsed: totalTokens,
        estimatedCostUsd: 0,      // TODO: wire up cost calculation
        modelsUsed: [...new Set([PLANNER_MODEL, EXECUTOR_MODEL, SYNTHESIZER_MODEL])],
      },
    };
  },
};
