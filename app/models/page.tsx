"use client";
import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function ModelsPage() {
  const [endpoint, setEndpoint] = useState("http://localhost:11434/v1/embeddings");
  const [model, setModel] = useState("qwen3-embedding:8b");
  const [status, setStatus] = useState<null | {
    ok: boolean;
    latencyMs?: number;
    error?: string;
    hint?: string;
    dim?: number | null;
  }>(null);
  const [testing, setTesting] = useState(false);

  async function test() {
    setTesting(true);
    setStatus(null);
    try {
      const r = await fetch("/api/embed/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint, model }),
      }).then((r) => r.json());
      setStatus(r);
    } catch (e) {
      setStatus({ ok: false, error: String(e) });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">AI 엔진</h1>
        <p className="mt-1 text-sm text-neutral-400">
          사내 vLLM/Ollama 엔드포인트를 설정하고 연결을 확인합니다.
        </p>
      </div>

      <Card>
        <CardHeader hint="OpenAI 호환 /v1/embeddings 엔드포인트">의미 분석 (임베딩)</CardHeader>
        <div className="flex flex-col gap-3">
          <div>
            <div className="mb-1 text-xs text-neutral-500">엔드포인트</div>
            <Input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} />
          </div>
          <div>
            <div className="mb-1 text-xs text-neutral-500">모델</div>
            <Input value={model} onChange={(e) => setModel(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={test} disabled={testing}>
              {testing ? "테스트 중… (cold start이면 30~60초)" : "연결 테스트"}
            </Button>
            {status && status.ok && (
              <Badge tone="ok">
                연결 성공 · {status.latencyMs} ms{status.dim ? ` · ${status.dim} 차원` : ""}
              </Badge>
            )}
            {status && !status.ok && <Badge tone="danger">실패 · {status.error}</Badge>}
          </div>
          {status && status.hint && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300">
              💡 {status.hint}
            </div>
          )}
          <div className="mt-2 text-xs text-neutral-500">
            ℹ️ 미설정 시 라우팅은 L1 규칙만으로 동작합니다 (graceful skip).
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader hint="환경 변수로 전달됨">현재 적용 (환경)</CardHeader>
        <div className="text-xs text-neutral-400">
          <div>
            <code>FIN_EMBED_ENDPOINT</code>: 컨테이너 환경변수에서 읽습니다.
          </div>
          <div>
            <code>FIN_EMBED_MODEL</code> · <code>FIN_EMBED_VERSION</code> 동일.
          </div>
          <div className="mt-2">
            영구 저장은 다음 단계(Phase 2)에서 폼 → .env 파일 동기화로 구현 예정.
          </div>
        </div>
      </Card>
    </div>
  );
}
