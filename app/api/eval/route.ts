import { NextResponse } from "next/server";
import { runComparison } from "@/lib/harness/eval/runner";
import { nativeHarness } from "@/lib/harness/native";
import { multiModelHarness } from "@/lib/harness/multi-model";

export async function POST() {
  try {
    const results = await runComparison(nativeHarness, multiModelHarness);
    return NextResponse.json(results);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
