import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { SKILLS_DIR } from "@/lib/paths";

export const dynamic = "force-dynamic";

// 후보 AI 서버 — 사내 환경에서는 환경변수 HARNESS_AI_SERVERS (콤마구분)로 주입.
const DEFAULT_CANDIDATES = (
  process.env.HARNESS_AI_SERVERS ??
  "http://localhost:11434,http://localhost:8000"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

async function ping(base: string): Promise<{
  url: string;
  reachable: boolean;
  latencyMs?: number;
  models?: string[];
}> {
  const started = Date.now();
  try {
    const r = await fetch(`${base}/v1/models`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!r.ok) return { url: base, reachable: false };
    const body = await r.json();
    const models = Array.isArray(body?.data)
      ? (body.data.map((m: { id?: string }) => m.id).filter(Boolean) as string[])
      : [];
    return { url: base, reachable: true, latencyMs: Date.now() - started, models };
  } catch {
    return { url: base, reachable: false };
  }
}

function listPlugins() {
  const pluginsDir = path.join(SKILLS_DIR, "..", "plugins");
  try {
    const dirs = fs.readdirSync(pluginsDir, { withFileTypes: true });
    return dirs
      .filter((d) => d.isDirectory())
      .map((d) => {
        const mf = path.join(pluginsDir, d.name, "plugin.json");
        try {
          const m = JSON.parse(fs.readFileSync(mf, "utf-8"));
          return {
            id: m.name ?? d.name,
            kind: m.kind ?? "unknown",
            version: m.version ?? "0.0.0",
            enabled: m.enabled !== false,
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function GET() {
  const ai_servers = await Promise.all(DEFAULT_CANDIDATES.map(ping));
  const plugins = listPlugins();
  const mcp_servers: { id: string; available: boolean }[] = []; // Phase 2에서 ~/.claude/mcp.json 파싱
  return NextResponse.json({ ok: true, data: { ai_servers, plugins, mcp_servers } });
}
