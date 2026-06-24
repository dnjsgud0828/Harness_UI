// GET: 현재 finance-thresholds.json 반환
// PUT: 새 룰 저장 → test_guard.py 자동 실행 → FAIL 시 롤백
import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { GUARD_DIR } from "@/lib/paths";
import { safeWrite } from "@/lib/safe-write";
import { runGuardRegression } from "@/lib/regression";

export const dynamic = "force-dynamic";

const FILE = path.join(GUARD_DIR, "rules", "finance-thresholds.json");

export async function GET() {
  try {
    const raw = await fs.readFile(FILE, "utf-8");
    return NextResponse.json({ ok: true, data: JSON.parse(raw), path: FILE });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "JSON body required" }, { status: 400 });
  }

  // 최소 스키마 검증
  if (!Array.isArray((body as { thresholds?: unknown }).thresholds)) {
    return NextResponse.json(
      { ok: false, error: "schema: thresholds array required" },
      { status: 400 },
    );
  }

  const content = JSON.stringify(body, null, 2) + "\n";
  const result = await safeWrite(FILE, content, async () => {
    const r = await runGuardRegression();
    return { ok: r.ok, detail: { fails: r.fails, total: r.total, raw: r.raw.slice(-2000) } };
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        verifyOutput: result.verifyOutput,
        backup: result.backup,
      },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true, written: result.written, backup: result.backup });
}
