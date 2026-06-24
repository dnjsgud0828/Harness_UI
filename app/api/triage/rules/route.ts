// GET: 도메인별 {domain}.rules.json 목록 반환
// PUT: 단일 도메인 룰 저장 → test_triage.py 자동 실행 → FAIL 시 롤백
import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { TRIAGE_DIR } from "@/lib/paths";
import { safeWrite } from "@/lib/safe-write";
import { runTriageRegression } from "@/lib/regression";

export const dynamic = "force-dynamic";

const RULES_DIR = path.join(TRIAGE_DIR, "rules");

export async function GET() {
  try {
    const files = await fs.readdir(RULES_DIR);
    const out: { domain: string; data: unknown }[] = [];
    for (const f of files.filter((x) => x.endsWith(".rules.json"))) {
      const raw = await fs.readFile(path.join(RULES_DIR, f), "utf-8");
      out.push({ domain: f.replace(".rules.json", ""), data: JSON.parse(raw) });
    }
    return NextResponse.json({ ok: true, data: out });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const obj = body as { domain?: unknown; data?: unknown } | null;
  if (!obj || typeof obj.domain !== "string" || typeof obj.data !== "object" || obj.data === null) {
    return NextResponse.json(
      { ok: false, error: "{domain, data} required" },
      { status: 400 },
    );
  }
  // 경로 인젝션 방지
  if (!/^[a-z][a-z0-9_-]*$/.test(obj.domain)) {
    return NextResponse.json({ ok: false, error: "invalid domain name" }, { status: 400 });
  }
  const data = obj.data as { domain?: string };
  if (data.domain !== obj.domain) {
    return NextResponse.json(
      { ok: false, error: "data.domain must equal {domain}" },
      { status: 400 },
    );
  }
  const filePath = path.join(RULES_DIR, `${obj.domain}.rules.json`);
  const content = JSON.stringify(data, null, 2) + "\n";
  const result = await safeWrite(filePath, content, async () => {
    const r = await runTriageRegression();
    return { ok: r.ok, detail: { fails: r.fails, total: r.total, raw: r.raw.slice(-2000) } };
  });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, verifyOutput: result.verifyOutput },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true, written: result.written, backup: result.backup });
}
