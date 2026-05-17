import type { CoreTool } from "ai";

// ─── Shared Contract ────────────────────────────────────────────────────────
// Both harnesses MUST implement this interface exactly.
// Do not change without agreement from both hackers.

export interface HarnessInput {
  task: string;
  tools?: Record<string, CoreTool>;
  systemPrompt?: string;
  maxSteps?: number;
}

export interface HarnessStep {
  type: "reasoning" | "tool_call" | "tool_result" | "output";
  content: string;
  model?: string;        // which model produced this step
  latencyMs?: number;
}

export interface HarnessOutput {
  result: string;
  steps: HarnessStep[];
  metrics: {
    totalLatencyMs: number;
    totalTokensUsed: number;
    estimatedCostUsd: number;
    modelsUsed: string[];
  };
  error?: string;
}

export interface Harness {
  name: "native" | "multi-model";
  description: string;
  run(input: HarnessInput): Promise<HarnessOutput>;
}
