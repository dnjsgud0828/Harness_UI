// POST { id } — 백업을 원본 경로로 복원 + 회귀 자동 실행 + 실패 시 자동 재롤백
import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { backupRoot, safeWrite } from "@/lib/safe-write";
import { runGuardRegression, runTriageRegression } from "@/lib/regression";

export const dynamic = "force-dynamic";

function parseFileName(fn: string): { ts: string; origin: string } | null {
  const idx = fn.indexOf("__");
  if (idx < 0 || !fn.endsWith(".bak")) return null;
  return { ts: fn.slice(0, idx), origin: "/" + fn.slice(idx + 2, -4).replace(/_/g, "/") };
}

async function regressionFor(target: string) {
  // 어떤 회귀를 돌릴지 결정: 가드/트리아지 룰 경로면 해당 회귀
  if (target.includes("/input-guardrails/")) return runGuardRegression();
  if (target.includes("/triage-routing/rules/")) return runTriageRegression();
  return { ok: true, fails: 0, total: 0, raw: "no regression bound to this path" };
}

export async function POST(req: NextRequest) {
  const { id } = (await req.json()) as { id?: string };
  if (!id || typeof id !== "string" || id.includes("/") || id.includes("..") || !id.endsWith(".bak")) {
    return NextResponse.json({ ok: false, error: "valid backup id required" }, { status: 400 });
  }
  const parsed = parseFileName(id);
  if (!parsed) {
    return NextResponse.json({ ok: false, error: "unrecognized backup name" }, { status: 400 });
  }
  const root = backupRoot();
  const backupPath = path.join(root, id);
  let content: string;
  try {
    content = await fs.readFile(backupPath, "utf-8");
  } catch {
    return NextResponse.json({ ok: false, error: "backup file not found" }, { status: 404 });
  }
  const target = parsed.origin;

  const result = await safeWrite(target, content, async () => {
    const r = await regressionFor(target);
    return { ok: r.ok, detail: { fails: r.fails, total: r.total, raw: r.raw.slice(-2000) } };
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, verifyOutput: result.verifyOutput },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true, restored: target, backup_id: id });
}
