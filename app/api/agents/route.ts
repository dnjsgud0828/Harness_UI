// GET: ~/.claude/agents/*.md frontmatter 목록
// PUT: 단일 에이전트의 `model:` 라인만 surgical edit (다른 내용 보존)
import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { safeWrite } from "@/lib/safe-write";

export const dynamic = "force-dynamic";

const AGENTS_DIR = process.env.HARNESS_AGENTS_DIR ?? path.join(os.homedir(), ".claude", "agents");

const ALLOWED_MODELS = ["opus", "sonnet", "haiku"] as const;
type Model = (typeof ALLOWED_MODELS)[number];

interface AgentInfo {
  name: string;
  file: string;
  model: string | null;
  description: string | null;
}

function parseFrontmatter(md: string): { fm: Record<string, string>; body: string } | null {
  if (!md.startsWith("---\n")) return null;
  const end = md.indexOf("\n---\n", 4);
  if (end < 0) return null;
  const fmText = md.slice(4, end);
  const body = md.slice(end + 5);
  const fm: Record<string, string> = {};
  for (const line of fmText.split("\n")) {
    const m = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (m) fm[m[1]] = m[2].trim();
  }
  return { fm, body };
}

async function listAgents(): Promise<AgentInfo[]> {
  const files = await fs.readdir(AGENTS_DIR).catch(() => []);
  const out: AgentInfo[] = [];
  for (const f of files.filter((x) => x.endsWith(".md"))) {
    const fp = path.join(AGENTS_DIR, f);
    const md = await fs.readFile(fp, "utf-8");
    const p = parseFrontmatter(md);
    out.push({
      name: f.replace(/\.md$/, ""),
      file: fp,
      model: p?.fm.model ?? null,
      description: p?.fm.description ?? null,
    });
  }
  return out;
}

export async function GET() {
  try {
    return NextResponse.json({ ok: true, data: await listAgents(), dir: AGENTS_DIR });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const obj = body as { name?: unknown; model?: unknown } | null;
  if (!obj || typeof obj.name !== "string" || typeof obj.model !== "string") {
    return NextResponse.json({ ok: false, error: "{name, model} required" }, { status: 400 });
  }
  if (!ALLOWED_MODELS.includes(obj.model as Model)) {
    return NextResponse.json(
      { ok: false, error: `model must be one of ${ALLOWED_MODELS.join("/")}` },
      { status: 400 },
    );
  }
  if (!/^[a-z][a-z0-9_-]*$/.test(obj.name)) {
    return NextResponse.json({ ok: false, error: "invalid agent name" }, { status: 400 });
  }
  const filePath = path.join(AGENTS_DIR, `${obj.name}.md`);
  let md: string;
  try {
    md = await fs.readFile(filePath, "utf-8");
  } catch {
    return NextResponse.json({ ok: false, error: "agent file not found" }, { status: 404 });
  }
  const parsed = parseFrontmatter(md);
  if (!parsed) {
    return NextResponse.json({ ok: false, error: "frontmatter missing or invalid" }, { status: 422 });
  }
  // Surgical edit — model 라인만 교체. 없으면 description 다음에 추가.
  let next: string;
  if (/^model:\s*.+$/m.test(md.slice(0, md.indexOf("\n---\n", 4)))) {
    next = md.replace(/(\nmodel:\s*)[^\n]+/, `$1${obj.model}`);
  } else {
    next = md.replace(/(\ndescription:[^\n]+)/, `$1\nmodel: ${obj.model}`);
  }
  const result = await safeWrite(filePath, next);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, written: result.written, backup: result.backup });
}
