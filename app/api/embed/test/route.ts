// POST { endpoint, model } — 임베딩 엔드포인트 연결 + 차원 확인.
// Cold start(첫 호출 모델 로딩) 고려해 기본 60초, 워밍업 모드 제공.
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TIMEOUT_MS = Number(process.env.HARNESS_EMBED_TIMEOUT_MS ?? 60_000);

export async function POST(req: NextRequest) {
  const { endpoint, model } = (await req.json()) as { endpoint?: string; model?: string };
  if (!endpoint || !model) {
    return NextResponse.json(
      { ok: false, error: "endpoint와 model이 필요합니다" },
      { status: 400 },
    );
  }
  const started = Date.now();
  try {
    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, input: "ping" }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const latencyMs = Date.now() - started;
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return NextResponse.json({
        ok: false,
        error: `HTTP ${r.status} — ${text.slice(0, 200) || r.statusText}`,
        latencyMs,
      });
    }
    const body = await r.json();
    const dim = Array.isArray(body?.data?.[0]?.embedding) ? body.data[0].embedding.length : null;
    return NextResponse.json({
      ok: true,
      latencyMs,
      dim,
      hint: latencyMs > 5000 ? "모델 cold start로 첫 호출이 느렸습니다. 다시 누르면 빠릅니다." : undefined,
    });
  } catch (e) {
    const latencyMs = Date.now() - started;
    const raw = e instanceof Error ? e.message : String(e);
    // 자주 보이는 케이스에 한국어 힌트
    let hint: string | undefined;
    if (raw.includes("timeout") || raw.includes("aborted")) {
      hint = `타임아웃(${TIMEOUT_MS / 1000}초). 모델 cold start이면 다시 시도. 너무 오래 걸리면 HARNESS_EMBED_TIMEOUT_MS 환경변수로 늘리세요.`;
    } else if (raw.includes("ECONNREFUSED") || raw.includes("Failed to fetch")) {
      hint = "엔드포인트에 연결되지 않습니다. URL과 서버 가동 여부를 확인하세요.";
    }
    return NextResponse.json({ ok: false, error: raw, hint, latencyMs });
  }
}
