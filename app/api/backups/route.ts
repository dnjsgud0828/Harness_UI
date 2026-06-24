// GET — 백업 파일 목록 (시간순 desc)
// 각 백업은 safe-write가 자동 생성 (.harness-backups/<ts>__<flattened-path>.bak)
import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { backupRoot } from "@/lib/safe-write";

export const dynamic = "force-dynamic";

interface BackupEntry {
  id: string;          // 파일명 (복원 시 사용)
  timestamp: string;   // ISO 시각
  origin: string;      // 복원 대상 원본 경로 (추정)
  size: number;
  display: string;     // UI 표시용 한 줄
}

function parseFileName(fn: string): { ts: string; origin: string } | null {
  // 형식: <ISO ts>__<flattened path>.bak
  const idx = fn.indexOf("__");
  if (idx < 0 || !fn.endsWith(".bak")) return null;
  const ts = fn.slice(0, idx);
  const flat = fn.slice(idx + 2, -4);
  const origin = "/" + flat.replace(/_/g, "/");
  return { ts, origin };
}

export async function GET() {
  const root = backupRoot();
  let files: string[];
  try {
    files = await fs.readdir(root);
  } catch {
    return NextResponse.json({ ok: true, data: [] as BackupEntry[] });
  }
  const entries: BackupEntry[] = [];
  for (const fn of files) {
    if (!fn.endsWith(".bak")) continue;
    const parsed = parseFileName(fn);
    if (!parsed) continue;
    const fp = path.join(root, fn);
    let size = 0;
    try {
      const st = await fs.stat(fp);
      size = st.size;
    } catch {
      continue;
    }
    const originBase = path.basename(parsed.origin);
    entries.push({
      id: fn,
      timestamp: parsed.ts,
      origin: parsed.origin,
      size,
      display: `${originBase} — ${parsed.ts.replace(/-/g, ":").slice(0, 19)}`,
    });
  }
  entries.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  return NextResponse.json({ ok: true, data: entries });
}
