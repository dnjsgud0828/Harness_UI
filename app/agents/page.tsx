"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";

interface Agent {
  name: string;
  file: string;
  model: string | null;
  description: string | null;
}

const MODEL_INFO: Record<string, { label: string; cost: string; tone: "info" | "ok" | "warn" }> = {
  opus: { label: "최고 품질 (Opus)", cost: "비용↑·정확도↑", tone: "warn" },
  sonnet: { label: "균형 (Sonnet)", cost: "비용·정확도 균형", tone: "info" },
  haiku: { label: "경량 (Haiku)", cost: "비용↓·속도↑", tone: "ok" },
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, { ok: boolean; msg?: string }>>({});

  async function load() {
    const r = await fetch("/api/agents").then((r) => r.json());
    if (r.ok) setAgents(r.data);
  }
  useEffect(() => {
    load();
  }, []);

  async function save(name: string, model: string) {
    setSaving(name);
    try {
      const r = await fetch("/api/agents", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, model }),
      }).then((r) => r.json());
      if (r.ok) {
        setAgents((as) => as.map((a) => (a.name === name ? { ...a, model } : a)));
        setResult((s) => ({ ...s, [name]: { ok: true } }));
      } else {
        setResult((s) => ({ ...s, [name]: { ok: false, msg: r.error } }));
      }
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">에이전트 모델</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Claude Code 에이전트별로 사용할 모델을 선택합니다. 비용·품질 트레이드오프를 고려하세요.
        </p>
        <div className="mt-2 text-xs text-neutral-500">
          저장 시 <code>~/.claude/agents/&lt;name&gt;.md</code>의 frontmatter <code>model:</code>{" "}
          필드만 변경됩니다. 다음 Claude Code 세션부터 적용.
        </div>
      </div>

      {agents.length === 0 && <Card>불러오는 중…</Card>}

      <div className="flex flex-col gap-3">
        {agents.map((a) => (
          <Card key={a.name}>
            <CardHeader hint={a.description ?? a.file}>
              <code>{a.name}</code>
            </CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-xs text-neutral-500">현재:</div>
              {a.model ? (
                <Badge tone={MODEL_INFO[a.model]?.tone ?? "muted"}>{a.model}</Badge>
              ) : (
                <Badge tone="muted">미설정</Badge>
              )}
              <div className="ml-auto flex items-center gap-2">
                {["opus", "sonnet", "haiku"].map((m) => (
                  <Button
                    key={m}
                    variant={a.model === m ? "primary" : "secondary"}
                    disabled={saving === a.name}
                    onClick={() => save(a.name, m)}
                  >
                    {m}
                  </Button>
                ))}
              </div>
            </div>
            {result[a.name] && result[a.name].ok && (
              <div className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
                <CheckCircle2 size={12} /> 저장됨 — 다음 세션부터 적용
              </div>
            )}
            {result[a.name] && !result[a.name].ok && (
              <div className="mt-2 flex items-center gap-1 text-xs text-red-400">
                <XCircle size={12} /> {result[a.name].msg}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
