import { generateText } from "ai";
import { getLanguageModel } from "@/lib/ai/providers";
import type { Harness, HarnessInput, HarnessOutput } from "../interface";

// ─── Native Harness ───────────────────────────────────────────────────────────
// Owner: Hacker A (Nico)
// Approach: single model handles the full task end-to-end.
// Feel free to change the model, prompt strategy, and step logic below.
// Do NOT change the HarnessInput / HarnessOutput types — those are the contract.

export const nativeHarness: Harness = {
  name: "native",
  description: "Single model, end-to-end task completion",

  async run(input: HarnessInput): Promise<HarnessOutput> {
    const start = Date.now();

    // TODO: implement your approach here
    const { text, usage, steps } = await generateText({
      model: getLanguageModel("claude-sonnet-4-6"),
      system: input.systemPrompt,
      prompt: input.task,
      tools: input.tools,
      maxSteps: input.maxSteps ?? 5,
    });

    return {
      result: text,
      steps: steps.map((s) => ({
        type: "output",
        content: typeof s.text === "string" ? s.text : JSON.stringify(s),
        model: "claude-sonnet-4-6",
      })),
      metrics: {
        totalLatencyMs: Date.now() - start,
        totalTokensUsed: (usage?.promptTokens ?? 0) + (usage?.completionTokens ?? 0),
        estimatedCostUsd: 0,      // TODO: wire up cost calculation
        modelsUsed: ["claude-sonnet-4-6"],
      },
    };
  },
};
