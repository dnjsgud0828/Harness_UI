import { NextRequest, NextResponse } from "next/server";
import { runPython } from "@/lib/python-bridge";
import { TRIAGE_SCRIPT } from "@/lib/paths";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { request, files } = (await req.json()) as { request: string; files?: string[] };
  if (!request) {
    return NextResponse.json({ ok: false, error: "request required" }, { status: 400 });
  }
  const args = ["--request", request];
  if (files && files.length > 0) args.push("--files", ...files);
  const result = await runPython(TRIAGE_SCRIPT, args);
  return NextResponse.json(result);
}
