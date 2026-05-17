"use client";

import { useState } from "react";

type TaskResult = {
  taskId: string;
  passed: boolean;
  score: number;
  latencyMs: number;
  tokensUsed: number;
  costUsd: number;
  output: string;
  error?: string;
};

type Summary = {
  harness: string;
  totalTasks: number;
  passed: number;
  passRate: number;
  avgLatencyMs: number;
  totalCostUsd: number;
  totalTokens: number;
  results: TaskResult[];
};

export default function EvalPage() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<{ a: Summary; b: Summary } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runEval() {
    setRunning(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch("/api/eval", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      setResults(await res.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="min-h-screen bg-background p-8 font-[family-name:var(--font-geist)]">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Agent Harness Eval</h1>
        <p className="text-muted-foreground mb-6 text-sm">
          Sundai Hackathon — May 17 &nbsp;·&nbsp; Native vs Multi-Model
        </p>

        <button
          type="button"
          onClick={runEval}
          disabled={running}
          className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          {running ? "Running eval…" : "Run Comparison"}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {results && (
          <div className="mt-8 grid grid-cols-2 gap-6">
            {[results.a, results.b].map((s) => (
              <div key={s.harness} className="border border-border rounded-xl p-5">
                <h2 className="font-semibold text-lg capitalize mb-3">{s.harness}</h2>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <Stat label="Pass rate" value={`${(s.passRate * 100).toFixed(0)}%`} />
                  <Stat label="Passed" value={`${s.passed}/${s.totalTasks}`} />
                  <Stat label="Avg latency" value={`${s.avgLatencyMs.toFixed(0)}ms`} />
                  <Stat label="Total cost" value={`$${s.totalCostUsd.toFixed(4)}`} />
                  <Stat label="Total tokens" value={s.totalTokens.toString()} />
                </div>
                <div className="space-y-2">
                  {s.results.map((r) => (
                    <div
                      key={r.taskId}
                      className="flex items-start gap-2 text-xs p-2 rounded-md bg-muted"
                    >
                      <span className={r.passed ? "text-green-600" : "text-red-500"}>
                        {r.passed ? "✓" : "✗"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="font-mono text-muted-foreground">{r.taskId}</span>
                        <span className="ml-2 text-muted-foreground">{r.latencyMs}ms</span>
                        {r.error && <p className="text-red-500 mt-0.5 truncate">{r.error}</p>}
                      </div>
                      <span className="font-medium">{r.score.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted rounded-lg p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-base font-semibold mt-0.5">{value}</p>
    </div>
  );
}
