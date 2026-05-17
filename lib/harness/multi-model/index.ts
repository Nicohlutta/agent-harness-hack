import {
  type AssistantMessage,
  complete,
  type Context,
  getModel,
  type Message,
  type Tool,
  type ToolCall,
  type ToolResultMessage,
} from "@earendil-works/pi-ai";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { Harness, HarnessInput, HarnessOutput, HarnessStep } from "../interface";

// HarnessTool from "ai" is referenced in interface.ts but not re-exported by AI SDK v6.
// Reuse the contract's resolved tool-map type to stay aligned without re-importing.
type HarnessTool = NonNullable<HarnessInput["tools"]>[string];
type HarnessTools = Record<string, HarnessTool>;

// ─── Multi-Model Harness (3-Tier Semantic Router, powered by Pi) ──────────────
// Owner: Hacker B
// Engine: @earendil-works/pi-ai (complete() + getModel()) via Vercel AI Gateway.
// Routing: pure-function classifier, then a single model call (with manual tool
// loop when input.tools is populated).
//   - Tier 1  Routine        → Haiku 4.5
//   - Tier 2  Complex        → Sonnet 4.6
//   - Tier 3  Hard reasoning → Opus 4.7
// Pi reports cost in USD directly via Usage.cost.total — no local price table.
// Do NOT change the HarnessInput / HarnessOutput types — those are the contract.

const PROVIDER = "vercel-ai-gateway" as const;
const ROUTINE_MODEL = "anthropic/claude-haiku-4.5";
const COMPLEX_MODEL = "anthropic/claude-sonnet-4.6";
const HARD_MODEL = "anthropic/claude-opus-4.7";

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

type Route = {
  model: string;
  tier: "routine" | "complex" | "hard";
  reason: string;
};

export function classify(task: string): Route {
  const lower = task.toLowerCase();

  if (task.length > HARD_LENGTH) {
    return {
      model: HARD_MODEL,
      tier: "hard",
      reason: `length ${task.length} > ${HARD_LENGTH}`,
    };
  }
  const hardHit = HARD_KEYWORDS.find((k) => lower.includes(k));
  if (hardHit) {
    return {
      model: HARD_MODEL,
      tier: "hard",
      reason: `matched hard keyword "${hardHit}"`,
    };
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

  return {
    model: ROUTINE_MODEL,
    tier: "routine",
    reason: "short, no complexity signals",
  };
}

function adaptTool(name: string, coreTool: HarnessTool): Tool {
  // biome-ignore lint/suspicious/noExplicitAny: zod -> JSON Schema cast is unavoidable here.
  const schema = (coreTool as any).inputSchema ?? (coreTool as any).parameters;
  const jsonSchema = schema
    ? zodToJsonSchema(schema, { target: "openApi3" })
    : { type: "object", properties: {} };
  return {
    name,
    // biome-ignore lint/suspicious/noExplicitAny: HarnessTool shape varies across AI SDK versions.
    description: (coreTool as any).description ?? "",
    // biome-ignore lint/suspicious/noExplicitAny: Pi accepts a TSchema; JSON Schema is structurally compatible.
    parameters: jsonSchema as any,
  };
}

async function runToolCalls(
  toolCalls: ToolCall[],
  toolMap: HarnessTools
): Promise<{ results: ToolResultMessage[]; steps: HarnessStep[] }> {
  const results: ToolResultMessage[] = [];
  const steps: HarnessStep[] = [];

  for (const call of toolCalls) {
    steps.push({
      type: "tool_call",
      content: `${call.name}(${JSON.stringify(call.arguments)})`,
    });

    const tool = toolMap[call.name];
    let resultText: string;
    let isError = false;
    // biome-ignore lint/suspicious/noExplicitAny: HarnessTool.execute is dynamic.
    const execute = (tool as any)?.execute;

    if (typeof execute !== "function") {
      resultText = `Tool "${call.name}" not found or has no execute()`;
      isError = true;
    } else {
      try {
        const out = await execute(call.arguments);
        resultText = typeof out === "string" ? out : JSON.stringify(out);
      } catch (err) {
        resultText = String(err);
        isError = true;
      }
    }

    steps.push({
      type: "tool_result",
      content: resultText.length > 500 ? `${resultText.slice(0, 500)}…` : resultText,
    });

    results.push({
      role: "toolResult",
      toolCallId: call.id,
      toolName: call.name,
      content: [{ type: "text", text: resultText }],
      isError,
      timestamp: Date.now(),
    });
  }

  return { results, steps };
}

function extractText(msg: AssistantMessage): string {
  return msg.content
    .filter((c): c is { type: "text"; text: string } => c.type === "text")
    .map((c) => c.text)
    .join("");
}

function extractToolCalls(msg: AssistantMessage): ToolCall[] {
  return msg.content.filter((c): c is ToolCall => c.type === "toolCall");
}

export const multiModelHarness: Harness = {
  name: "multi-model",
  description: "3-tier semantic router (Pi-powered): routine→Haiku, complex→Sonnet, hard→Opus",

  async run(input: HarnessInput): Promise<HarnessOutput> {
    const start = Date.now();
    const steps: HarnessStep[] = [];

    // ── Classify ─────────────────────────────────────────────────────────────
    const route = classify(input.task);
    steps.push({
      type: "reasoning",
      content: `Router → ${route.tier} → ${route.model} (${route.reason})`,
    });

    // ── Pi setup ─────────────────────────────────────────────────────────────
    // biome-ignore lint/suspicious/noExplicitAny: Pi's getModel is typed against a generated registry; we use a runtime string.
    const model = getModel(PROVIDER, route.model as any);
    const toolMap = input.tools ?? {};
    const piTools: Tool[] = Object.entries(toolMap).map(([n, t]) => adaptTool(n, t));

    const messages: Message[] = [
      { role: "user", content: input.task, timestamp: Date.now() },
    ];
    const context: Context = {
      systemPrompt: input.systemPrompt,
      messages,
      tools: piTools.length > 0 ? piTools : undefined,
    };

    // ── Tool loop ────────────────────────────────────────────────────────────
    const maxSteps = input.maxSteps ?? 5;
    let totalTokens = 0;
    let totalCostUsd = 0;
    let finalText = "";
    let lastError: string | undefined;

    for (let step = 0; step < maxSteps; step++) {
      let msg: AssistantMessage;
      try {
        msg = await complete(model, context);
      } catch (err) {
        lastError = String(err);
        steps.push({
          type: "output",
          content: `Pi complete() error: ${lastError}`,
          model: route.model,
        });
        break;
      }

      totalTokens += msg.usage?.totalTokens ?? 0;
      totalCostUsd += msg.usage?.cost?.total ?? 0;

      const text = extractText(msg);
      if (text) {
        steps.push({ type: "output", content: text, model: route.model });
        finalText = text;
      }

      const toolCalls = extractToolCalls(msg);
      if (toolCalls.length === 0 || msg.stopReason !== "toolUse") {
        break;
      }

      context.messages.push(msg);
      const { results, steps: toolSteps } = await runToolCalls(toolCalls, toolMap);
      steps.push(...toolSteps);
      context.messages.push(...results);
    }

    return {
      result: finalText,
      steps,
      metrics: {
        totalLatencyMs: Date.now() - start,
        totalTokensUsed: totalTokens,
        estimatedCostUsd: totalCostUsd,
        modelsUsed: [route.model],
      },
      error: lastError,
    };
  },
};
