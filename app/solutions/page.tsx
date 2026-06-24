"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface Discover {
  ai_servers: { url: string; reachable: boolean; latencyMs?: number; models?: string[] }[];
  plugins: { id: string; kind: string; version: string; enabled: boolean }[];
  mcp_servers: { id: string; available: boolean }[];
}

export default function SolutionsPage() {
  const [data, setData] = useState<Discover | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/discover").then((r) => r.json());
      if (r.ok) setData(r.data);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">사내 자원</h1>
          <p className="mt-1 text-sm text-neutral-400">
            발견된 AI 서버·MCP·설치된 플러그인을 표시합니다.
          </p>
        </div>
        <Button variant="secondary" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> 새로고침
        </Button>
      </div>

      <Card>
        <CardHeader hint="발견된 vLLM·Ollama 인스턴스">AI 서버</CardHeader>
        {!data && <div className="text-sm text-neutral-500">불러오는 중…</div>}
        {data && data.ai_servers.length === 0 && (
          <div className="text-sm text-neutral-500">발견된 서버가 없습니다.</div>
        )}
        <ul className="flex flex-col gap-2">
          {data?.ai_servers.map((s, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2">
                {s.reachable ? <Badge tone="ok">연결</Badge> : <Badge tone="danger">실패</Badge>}
                <code className="text-neutral-300">{s.url}</code>
              </div>
              <div className="text-xs text-neutral-500">
                {s.latencyMs ? `${s.latencyMs} ms` : "-"} · {s.models?.length ?? 0} 모델
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader hint="플러그인 매니페스트 기반">설치된 플러그인</CardHeader>
        {data && data.plugins.length === 0 && (
          <div className="text-sm text-neutral-500">
            플러그인이 없습니다. ZIP 또는 사내 Git URL로 설치 (Phase 2).
          </div>
        )}
        <ul className="flex flex-col gap-2">
          {data?.plugins.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <Badge tone={p.enabled ? "ok" : "muted"}>{p.enabled ? "활성" : "비활성"}</Badge>
                <span className="text-neutral-200">{p.id}</span>
                <span className="text-neutral-500">v{p.version}</span>
                <Badge tone="info">{p.kind}</Badge>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader hint="설정된 사내 MCP">MCP 서버</CardHeader>
        {data && data.mcp_servers.length === 0 && (
          <div className="text-sm text-neutral-500">설정된 MCP 서버가 없습니다.</div>
        )}
        <ul className="flex flex-col gap-2">
          {data?.mcp_servers.map((m) => (
            <li key={m.id} className="text-sm text-neutral-300">
              <Badge tone={m.available ? "ok" : "muted"}>
                {m.available ? "사용 가능" : "미설치"}
              </Badge>{" "}
              <code>{m.id}</code>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
