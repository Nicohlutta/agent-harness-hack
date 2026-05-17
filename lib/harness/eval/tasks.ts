import type { HarnessInput } from "../interface";
import { getWeather } from "@/lib/ai/tools/get-weather";

// ─── Eval Task Suite ─────────────────────────────────────────────────────────
// These are the exact tasks run against BOTH harnesses.
// Do not change without agreement from both hackers.

export interface EvalTask {
  id: string;
  category: "single-step" | "multi-step" | "tool-use" | "reasoning";
  description: string;
  input: HarnessInput;
  // What a correct answer must contain (case-insensitive substring match)
  expectedContains: string[];
}

export const EVAL_TASKS: EvalTask[] = [
  // ── Single-step: baseline ──────────────────────────────────────────────────
  {
    id: "single-01",
    category: "single-step",
    description: "Simple factual question",
    input: {
      task: "What is the capital of France?",
      maxSteps: 1,
    },
    expectedContains: ["paris"],
  },
  {
    id: "single-02",
    category: "single-step",
    description: "Basic math",
    input: {
      task: "What is 17 multiplied by 23?",
      maxSteps: 1,
    },
    expectedContains: ["391"],
  },

  // ── Tool use ───────────────────────────────────────────────────────────────
  {
    id: "tool-01",
    category: "tool-use",
    description: "Weather lookup via tool",
    input: {
      task: "What is the current temperature in London?",
      tools: { getWeather },
      maxSteps: 3,
    },
    expectedContains: ["london", "temperature"],
  },
  {
    id: "tool-02",
    category: "tool-use",
    description: "Multi-city weather comparison via tool",
    input: {
      task: "Compare the current temperature in Tokyo and New York. Which is warmer?",
      tools: { getWeather },
      maxSteps: 5,
    },
    expectedContains: ["tokyo", "new york"],
  },

  // ── Multi-step reasoning ───────────────────────────────────────────────────
  {
    id: "multi-01",
    category: "multi-step",
    description: "Plan then execute a structured task",
    input: {
      task: `You are a project manager. A client wants a mobile app in 4 weeks with a team of 2 engineers.
First, assess feasibility. Then, if feasible, produce a week-by-week plan. If not, explain why and suggest alternatives.`,
      maxSteps: 5,
    },
    expectedContains: ["week"],
  },
  {
    id: "multi-02",
    category: "multi-step",
    description: "Decompose and solve a compound problem",
    input: {
      task: `A company has 3 products: A ($50, 200 units sold), B ($120, 85 units sold), C ($30, 500 units sold).
Calculate total revenue per product, identify the highest-revenue product, and suggest which product to prioritize for marketing.`,
      maxSteps: 5,
    },
    expectedContains: ["10000", "10200", "15000"],
  },

  // ── Reasoning ─────────────────────────────────────────────────────────────
  {
    id: "reason-01",
    category: "reasoning",
    description: "Logic puzzle",
    input: {
      task: `Alice is taller than Bob. Bob is taller than Charlie. Is Alice taller than Charlie? Explain your reasoning step by step.`,
      maxSteps: 3,
    },
    expectedContains: ["yes", "alice"],
  },
  {
    id: "reason-02",
    category: "reasoning",
    description: "Ambiguous instruction handling",
    input: {
      task: `I need to send an email to all customers who haven't purchased in 90 days, but only if they opted into marketing. What are the risks of this approach and how would you mitigate them?`,
      maxSteps: 4,
    },
    expectedContains: ["opt", "risk"],
  },
];
