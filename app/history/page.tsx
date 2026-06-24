"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RotateCcw, RefreshCw, Search, CheckCircle2, XCircle } from "lucide-react";

interface Backup {
  id: string;
  timestamp: string;
  origin: string;
  size: number;
  display: string;
}

export default function HistoryPage() {
  const [items, setItems] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [restoring, setRestoring] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, { ok: boolean; msg?: string }>>({});

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/backups").then((r) => r.json());
      if (r.ok) setItems(r.data);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function restore(id: string) {
    if (!confirm(`이 백업으로 복원하시겠습니까?\n\n${id}\n\n복원 후 자동 회귀가 실행됩니다.`)) return;
    setRestoring(id);
    try {
      const r = await fetch("/api/backups/restore", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      }).then((r) => r.json());
      setResult((s) => ({
        ...s,
        [id]: r.ok ? { ok: true } : { ok: false, msg: r.error ?? "실패" },
      }));
      if (r.ok) {
        await load();
      }
    } finally {
      setRestoring(null);
    }
  }

  const filtered = items.filter(
    (it) =>
      filter === "" ||
      it.origin.toLowerCase().includes(filter.toLowerCase()) ||
      it.timestamp.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">변경 이력 · 백업 복원</h1>
          <p className="mt-1 text-sm text-neutral-400">
            모든 룰 저장 시 자동으로 백업이 생성됩니다. 시점을 골라 1클릭으로 되돌릴 수 있습니다.
          </p>
        </div>
        <Button variant="secondary" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> 새로고침
        </Button>
      </div>

      <Card>
        <div className="flex items-center gap-2">
          <Search size={16} className="text-neutral-500" />
          <Input
            placeholder="파일명·시간으로 필터..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="mt-2 text-xs text-neutral-500">
          전체 {items.length}건 · 필터 후 {filtered.length}건
        </div>
      </Card>

      {filtered.length === 0 && !loading && (
        <Card>
          <div className="text-sm text-neutral-500">
            백업이 없습니다. 가드·트리아지·에이전트 변경 시 자동으로 생성됩니다.
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {filtered.map((it) => {
          const r = result[it.id];
          return (
            <Card key={it.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <CardHeader hint={it.origin}>
                    <span className="text-sm">{it.display}</span>
                  </CardHeader>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                    <Badge tone="muted">{(it.size / 1024).toFixed(1)} KB</Badge>
                    <span>{it.timestamp}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Button
                    variant="secondary"
                    onClick={() => restore(it.id)}
                    disabled={restoring === it.id}
                  >
                    <RotateCcw size={14} />
                    {restoring === it.id ? "복원·회귀 중…" : "이 시점으로 복원"}
                  </Button>
                  {r && r.ok && (
                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                      <CheckCircle2 size={12} /> 복원됨
                    </span>
                  )}
                  {r && !r.ok && (
                    <span className="flex items-center gap-1 text-xs text-red-400">
                      <XCircle size={12} /> {r.msg}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
