"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus, CheckCircle2, XCircle, FolderPlus } from "lucide-react";

interface RuleData {
  domain: string;
  force_full?: { keywords?: string[]; paths?: string[] };
  domain_signal?: { keywords?: string[]; paths?: string[] };
  orchestrator?: string;
  pack?: { agents?: string[]; skills?: string[] };
  weights?: { path: number; keyword: number };
}

interface DomainRule {
  domain: string;
  data: RuleData;
}

export default function RoutingPage() {
  const [domains, setDomains] = useState<DomainRule[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, { ok: boolean; msg?: string }>>({});
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newKeywords, setNewKeywords] = useState<string[]>([]);
  const [newPaths, setNewPaths] = useState<string[]>([]);
  const [newKwInput, setNewKwInput] = useState("");
  const [newPathInput, setNewPathInput] = useState("");

  async function createDomain() {
    if (!/^[a-z][a-z0-9_-]*$/.test(newName)) {
      alert("도메인명은 소문자 영문/숫자/_/- 만 사용 (예: banking)");
      return;
    }
    if (domains.some((d) => d.domain === newName)) {
      alert("이미 같은 이름의 도메인이 존재합니다");
      return;
    }
    const data: RuleData = {
      domain: newName,
      force_full: { keywords: newKeywords, paths: newPaths },
      weights: { path: 3, keyword: 1 },
    };
    const r = await fetch("/api/triage/rules", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ domain: newName, data }),
    }).then((r) => r.json());
    if (r.ok) {
      setDomains((ds) => [...ds, { domain: newName, data }]);
      setShowNew(false);
      setNewName("");
      setNewKeywords([]);
      setNewPaths([]);
    } else {
      alert(`실패: ${r.error}`);
    }
  }

  useEffect(() => {
    fetch("/api/triage/rules")
      .then((r) => r.json())
      .then((r) => r.ok && setDomains(r.data));
  }, []);

  function update(domain: string, fn: (d: RuleData) => RuleData) {
    setDomains((ds) => ds.map((d) => (d.domain === domain ? { ...d, data: fn(d.data) } : d)));
  }

  async function save(domain: string) {
    const d = domains.find((x) => x.domain === domain);
    if (!d) return;
    setSaving(domain);
    setResult((r) => ({ ...r, [domain]: { ok: false, msg: "검증 중…" } }));
    try {
      const r = await fetch("/api/triage/rules", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domain, data: d.data }),
      }).then((r) => r.json());
      setResult((s) => ({
        ...s,
        [domain]: r.ok ? { ok: true } : { ok: false, msg: r.error ?? "실패" },
      }));
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">작업 분류 규칙</h1>
          <p className="mt-1 text-sm text-neutral-400">
            이 단어/경로가 포함되면 자동으로 위험 작업(풀 검증)으로 분류됩니다. 저장 시 6개 회귀 테스트가 자동 실행됩니다.
          </p>
        </div>
        <Button onClick={() => setShowNew(true)} variant="secondary">
          <FolderPlus size={14} /> 새 도메인 추가
        </Button>
      </div>

      {showNew && (
        <Card>
          <CardHeader hint="새 도메인 파일(.rules.json)이 생성됩니다">
            새 도메인
          </CardHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs text-neutral-500">도메인명 (영문)</span>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="banking"
              />
            </label>
          </div>
          <div className="mt-3">
            <div className="mb-2 text-xs text-neutral-500">키워드 (선택)</div>
            <div className="flex flex-wrap gap-1.5">
              {newKeywords.map((kw, i) => (
                <span
                  key={`nk-${kw}-${i}`}
                  className="inline-flex items-center gap-1 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs"
                >
                  {kw}
                  <button
                    onClick={() => setNewKeywords(newKeywords.filter((_, j) => j !== i))}
                    className="text-neutral-500 hover:text-red-400"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Input
                value={newKwInput}
                onChange={(e) => setNewKwInput(e.target.value)}
                placeholder="키워드 Enter"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newKwInput.trim()) {
                    setNewKeywords([...newKeywords, newKwInput.trim()]);
                    setNewKwInput("");
                    e.preventDefault();
                  }
                }}
              />
            </div>
          </div>
          <div className="mt-3">
            <div className="mb-2 text-xs text-neutral-500">경로 (선택)</div>
            <div className="flex flex-wrap gap-1.5">
              {newPaths.map((p, i) => (
                <span
                  key={`np-${p}-${i}`}
                  className="inline-flex items-center gap-1 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs"
                >
                  {p}
                  <button
                    onClick={() => setNewPaths(newPaths.filter((_, j) => j !== i))}
                    className="text-neutral-500 hover:text-red-400"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Input
                value={newPathInput}
                onChange={(e) => setNewPathInput(e.target.value)}
                placeholder="경로 Enter (예: bank/)"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newPathInput.trim()) {
                    setNewPaths([...newPaths, newPathInput.trim()]);
                    setNewPathInput("");
                    e.preventDefault();
                  }
                }}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2 border-t border-neutral-800 pt-3">
            <Button onClick={createDomain}>생성 + 저장</Button>
            <Button variant="ghost" onClick={() => setShowNew(false)}>
              취소
            </Button>
          </div>
        </Card>
      )}

      {domains.length === 0 && <Card>불러오는 중…</Card>}

      {domains.map((d) => (
        <Card key={d.domain}>
          <CardHeader
            hint={`${d.data.force_full?.keywords?.length ?? 0}개 키워드 · ${
              d.data.force_full?.paths?.length ?? 0
            }개 경로`}
          >
            <span className="capitalize">{d.domain} 도메인</span>
          </CardHeader>

          <div className="flex flex-col gap-4">
            <ChipEditor
              label="키워드 (이 단어가 포함되면 위험)"
              items={d.data.force_full?.keywords ?? []}
              onChange={(items) =>
                update(d.domain, (r) => ({ ...r, force_full: { ...r.force_full, keywords: items } }))
              }
            />
            <ChipEditor
              label="경로 (이 경로가 변경되면 위험)"
              items={d.data.force_full?.paths ?? []}
              onChange={(items) =>
                update(d.domain, (r) => ({ ...r, force_full: { ...r.force_full, paths: items } }))
              }
            />
          </div>

          <div className="mt-4 flex items-center gap-3 border-t border-neutral-800 pt-3">
            <Button onClick={() => save(d.domain)} disabled={saving === d.domain}>
              {saving === d.domain ? "저장 + 회귀 검증 중…" : `${d.domain} 저장`}
            </Button>
            {result[d.domain] && result[d.domain].ok && (
              <Badge tone="ok">
                <CheckCircle2 size={12} /> 저장됨
              </Badge>
            )}
            {result[d.domain] && !result[d.domain].ok && (
              <Badge tone="danger">
                <XCircle size={12} /> {result[d.domain].msg}
              </Badge>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function ChipEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (next: string[]) => void;
}) {
  const [input, setInput] = useState("");
  return (
    <div>
      <div className="mb-2 text-xs text-neutral-500">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it, idx) => (
          <span
            key={`${it}-${idx}`}
            className="inline-flex items-center gap-1 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-200"
          >
            {it}
            <button
              type="button"
              className="text-neutral-500 hover:text-red-400"
              onClick={() => onChange(items.filter((_, i) => i !== idx))}
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="새 항목 입력 후 Enter"
          onKeyDown={(e) => {
            if (e.key === "Enter" && input.trim()) {
              onChange([...items, input.trim()]);
              setInput("");
              e.preventDefault();
            }
          }}
        />
        <Button
          variant="secondary"
          onClick={() => {
            if (input.trim()) {
              onChange([...items, input.trim()]);
              setInput("");
            }
          }}
        >
          <Plus size={14} /> 추가
        </Button>
      </div>
    </div>
  );
}
