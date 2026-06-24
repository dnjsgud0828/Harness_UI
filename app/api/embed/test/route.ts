import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { endpoint, model } = (await req.json()) as { endpoint: string; model: string };
  if (!endpoint || !model) {
    return NextResponse.json({ ok: false, error: "endpoint and model required" }, { status: 400 });
  }
  const started = Date.now();
  try {
    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, input: "ping" }),
      signal: AbortSignal.timeout(5000),
    });
    const latencyMs = Date.now() - started;
    if (!r.ok) {
      return NextResponse.json({ ok: false, error: `HTTP ${r.status}`, latencyMs });
    }
    const body = await r.json();
    const dim = Array.isArray(body?.data?.[0]?.embedding) ? body.data[0].embedding.length : null;
    return NextResponse.json({ ok: true, latencyMs, dim });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      latencyMs: Date.now() - started,
    });
  }
}
