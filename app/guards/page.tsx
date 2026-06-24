"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, Plus, Trash2 } from "lucide-react";

interface Threshold {
  id: string;
  law: string;
  severity: "block" | "warn";
  kind: "max_annual_rate" | "min_ctr_threshold_krw" | "forbidden_pattern" | "policy" | "convention";
  limit_percent?: number;
  limit_value?: number;
  pattern?: string;
  applies_to_keywords?: string[];
  message_ko: string;
}

interface GuardData {
  domain: string;
  version: string;
  updated: string;
  thresholds: Threshold[];
}

type NewRuleForm = {
  id: string;
  law: string;
  kind: "max_annual_rate" | "min_ctr_threshold_krw" | "forbidden_pattern" | "policy" | "convention";
  severity: "block" | "warn";
  limit_percent?: number;
  limit_value?: number;
  pattern?: string;
  message_ko: string;
  applies_to_keywords: string[];
};

export default function GuardsPage() {
  const [data, setData] = useState<GuardData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<
    | null
    | { ok: true; backup?: string }
    | { ok: false; error: string; verifyOutput?: unknown }
  >(null);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/guard/rules")
      .then((r) => r.json())
      .then((r) => r.ok && setData(r.data));
  }, []);

  function updateThreshold(idx: number, patch: Partial<Threshold>) {
    if (!data) return;
    const next = {
      ...data,
      thresholds: data.thresholds.map((t, i) => (i === idx ? { ...t, ...patch } : t)),
    };
    setData(next);
  }

  function deleteThreshold(id: string) {
    if (!data) return;
    setData({ ...data, thresholds: data.thresholds.filter((t) => t.id !== id) });
    setConfirmDelete(null);
  }

  function addThreshold(form: NewRuleForm): boolean {
    if (!data) return false;
    if (data.thresholds.some((t) => t.id === form.id)) {
      alert(`이미 같은 ID의 룰이 있습니다: ${form.id}`);
      return false;
    }
    const next: Threshold = {
      id: form.id,
      law: form.law,
      severity: form.severity,
      kind: form.kind,
      message_ko: form.message_ko,
      applies_to_keywords: form.applies_to_keywords,
      ...(form.limit_percent !== undefined ? { limit_percent: form.limit_percent } : {}),
      ...(form.limit_value !== undefined ? { limit_value: form.limit_value } : {}),
      ...(form.pattern ? { pattern: form.pattern } : {}),
    };
    setData({ ...data, thresholds: [...data.thresholds, next] });
    setShowAdd(false);
    return true;
  }

  async function save() {
    if (!data) return;
    setSaving(true);
    setSaveResult(null);
    try {
      const r = await fetch("/api/guard/rules", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json());
      setSaveResult(r);
    } catch (e) {
      setSaveResult({ ok: false, error: String(e) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">안전 가드</h1>
          <p className="mt-1 text-sm text-neutral-400">
            법령 상한·금지 패턴. 저장 시 자동으로 12개 회귀 테스트가 실행되며, 하나라도 실패하면 저장 자체가 차단됩니다.
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} variant="secondary">
          <Plus size={14} /> 새 룰 추가
        </Button>
      </div>

      {showAdd && (
        <AddRuleModal onCancel={() => setShowAdd(false)} onAdd={addThreshold} />
      )}

      {!data && <Card>불러오는 중…</Card>}

      {data &&
        data.thresholds.map((t, idx) => (
          <Card key={t.id}>
            <div className="flex items-start justify-between">
              <CardHeader hint={t.law}>
                <div className="flex items-center gap-2">
                  <Badge tone={t.severity === "block" ? "danger" : "warn"}>{t.severity}</Badge>
                  <code className="text-sm text-neutral-300">{t.id}</code>
                </div>
              </CardHeader>
              <button
                onClick={() => setConfirmDelete(t.id)}
                className="rounded-md p-1.5 text-neutral-500 hover:bg-red-500/10 hover:text-red-400"
                title="이 룰 삭제"
              >
                <Trash2 size={14} />
              </button>
            </div>
            {confirmDelete === t.id && (
              <div className="mb-3 rounded-md border border-red-500/40 bg-red-500/5 p-3 text-sm">
                <div className="text-red-300">이 룰을 삭제하시겠습니까?</div>
                <div className="mt-1 text-xs text-neutral-500">
                  저장 누르기 전까지는 화면에만 반영됩니다. 저장 시 회귀가 의존하면 자동 차단됩니다.
                </div>
                <div className="mt-2 flex gap-2">
                  <Button variant="danger" onClick={() => deleteThreshold(t.id)}>
                    삭제
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
                    취소
                  </Button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="법령 / 근거">
                <Input
                  value={t.law}
                  onChange={(e) => updateThreshold(idx, { law: e.target.value })}
                />
              </Field>
              <Field label="종류 (kind)">
                <select
                  value={t.kind}
                  onChange={(e) =>
                    updateThreshold(idx, { kind: e.target.value as Threshold["kind"] })
                  }
                  className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
                >
                  <option value="max_annual_rate">최대 연이율(%)</option>
                  <option value="min_ctr_threshold_krw">최소 임계값 (원)</option>
                  <option value="forbidden_pattern">금지 패턴 (정규식)</option>
                  <option value="policy">정책</option>
                  <option value="convention">컨벤션</option>
                </select>
              </Field>
              {(t.kind === "max_annual_rate" || t.limit_percent !== undefined) && (
                <Field label="연 이율 상한 (%)">
                  <Input
                    type="number"
                    step="0.1"
                    value={t.limit_percent ?? ""}
                    onChange={(e) =>
                      updateThreshold(idx, {
                        limit_percent: e.target.value === "" ? undefined : Number(e.target.value),
                      })
                    }
                  />
                </Field>
              )}
              {(t.kind === "min_ctr_threshold_krw" || t.limit_value !== undefined) && (
                <Field label="임계값 (원)">
                  <Input
                    type="number"
                    value={t.limit_value ?? ""}
                    onChange={(e) =>
                      updateThreshold(idx, {
                        limit_value: e.target.value === "" ? undefined : Number(e.target.value),
                      })
                    }
                  />
                </Field>
              )}
              {(t.kind === "forbidden_pattern" || t.pattern !== undefined) && (
                <Field label="정규식 패턴">
                  <Input
                    value={t.pattern ?? ""}
                    onChange={(e) => updateThreshold(idx, { pattern: e.target.value })}
                  />
                </Field>
              )}
              <Field label="위반 시 동작">
                <select
                  value={t.severity}
                  onChange={(e) =>
                    updateThreshold(idx, { severity: e.target.value as "block" | "warn" })
                  }
                  className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
                >
                  <option value="block">차단 (block)</option>
                  <option value="warn">경고 (warn)</option>
                </select>
              </Field>
              <Field label="메시지 (한국어)">
                <Input
                  value={t.message_ko}
                  onChange={(e) => updateThreshold(idx, { message_ko: e.target.value })}
                />
              </Field>
            </div>
            <div className="mt-3">
              <KeywordChips
                label="매칭 키워드"
                items={t.applies_to_keywords ?? []}
                onChange={(items) => updateThreshold(idx, { applies_to_keywords: items })}
              />
            </div>
          </Card>
        ))}

      {data && (
        <div className="sticky bottom-0 -mx-8 border-t border-neutral-800 bg-neutral-950 px-8 py-4">
          <div className="flex items-center gap-3">
            <Button onClick={save} disabled={saving}>
              {saving ? "저장 + 회귀 검증 중…" : "저장 (회귀 통과 시)"}
            </Button>
            {saveResult && saveResult.ok && (
              <span className="flex items-center gap-1 text-sm text-emerald-400">
                <CheckCircle2 size={16} /> 저장됨 (백업 포함)
              </span>
            )}
            {saveResult && !saveResult.ok && (
              <span className="flex items-start gap-1 text-sm text-red-400">
                <XCircle size={16} />
                <span>
                  실패 — {saveResult.error}.
                  {saveResult.verifyOutput ? (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-neutral-500">
                        회귀 출력 보기
                      </summary>
                      <pre className="mt-1 max-h-40 overflow-auto rounded bg-neutral-900 p-2 text-[10px] text-neutral-400">
                        {JSON.stringify(saveResult.verifyOutput, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                </span>
              </span>
            )}
          </div>
          <div className="mt-2 text-xs text-neutral-500">
            <AlertTriangle size={12} className="inline" /> 저장 전 기존 파일은 자동 백업됩니다.
            회귀 실패 시 원본으로 즉시 롤백.
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-neutral-500">{label}</span>
      {children}
    </label>
  );
}

function KeywordChips({
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
      <div className="mb-1 text-xs text-neutral-500">{label}</div>
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
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="새 키워드 Enter (한국어 OK)"
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
          추가
        </Button>
      </div>
    </div>
  );
}

function AddRuleModal({
  onCancel,
  onAdd,
}: {
  onCancel: () => void;
  onAdd: (f: NewRuleForm) => boolean;
}) {
  const [form, setForm] = useState<NewRuleForm>({
    id: "",
    law: "",
    kind: "max_annual_rate",
    severity: "block",
    message_ko: "",
    applies_to_keywords: [],
    limit_percent: 20,
  });
  const [kwInput, setKwInput] = useState("");

  function submit() {
    if (!/^[a-z][a-z0-9_]*$/.test(form.id)) {
      alert("룰 ID는 소문자 영문/숫자/_ 만 사용 (예: my_new_rule_v1)");
      return;
    }
    if (!form.law.trim() || !form.message_ko.trim()) {
      alert("법령/근거와 메시지는 필수입니다");
      return;
    }
    onAdd(form);
  }

  return (
    <Card>
      <CardHeader hint="추가 후 사이드바의 저장을 눌러야 실제 적용됩니다 (회귀 자동)">
        새 가드 룰
      </CardHeader>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="룰 ID (영문 소문자·숫자·_)">
          <Input
            value={form.id}
            onChange={(e) => setForm({ ...form, id: e.target.value })}
            placeholder="my_new_rule_v1"
          />
        </Field>
        <Field label="법령/근거">
          <Input
            value={form.law}
            onChange={(e) => setForm({ ...form, law: e.target.value })}
            placeholder="예: 이자제한법 §2"
          />
        </Field>
        <Field label="종류">
          <select
            value={form.kind}
            onChange={(e) =>
              setForm({ ...form, kind: e.target.value as NewRuleForm["kind"] })
            }
            className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
          >
            <option value="max_annual_rate">최대 연이율(%)</option>
            <option value="min_ctr_threshold_krw">최소 임계값 (원)</option>
            <option value="forbidden_pattern">금지 패턴 (정규식)</option>
            <option value="policy">정책 (키워드 매칭만)</option>
            <option value="convention">컨벤션</option>
          </select>
        </Field>
        <Field label="위반 시 동작">
          <select
            value={form.severity}
            onChange={(e) =>
              setForm({ ...form, severity: e.target.value as "block" | "warn" })
            }
            className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
          >
            <option value="block">차단 (block)</option>
            <option value="warn">경고 (warn)</option>
          </select>
        </Field>
        {form.kind === "max_annual_rate" && (
          <Field label="상한 (%)">
            <Input
              type="number"
              step="0.1"
              value={form.limit_percent ?? 0}
              onChange={(e) =>
                setForm({ ...form, limit_percent: Number(e.target.value) })
              }
            />
          </Field>
        )}
        {form.kind === "min_ctr_threshold_krw" && (
          <Field label="임계값 (원)">
            <Input
              type="number"
              value={form.limit_value ?? 0}
              onChange={(e) =>
                setForm({ ...form, limit_value: Number(e.target.value) })
              }
            />
          </Field>
        )}
        {form.kind === "forbidden_pattern" && (
          <Field label="정규식">
            <Input
              value={form.pattern ?? ""}
              onChange={(e) => setForm({ ...form, pattern: e.target.value })}
              placeholder="예: \\b(float|double)\\s+(amount|fee)"
            />
          </Field>
        )}
        <Field label="메시지 (한국어)">
          <Input
            value={form.message_ko}
            onChange={(e) => setForm({ ...form, message_ko: e.target.value })}
          />
        </Field>
      </div>
      <div className="mt-4">
        <div className="mb-2 text-xs text-neutral-500">매칭 키워드</div>
        <div className="flex flex-wrap gap-1.5">
          {form.applies_to_keywords.map((kw, i) => (
            <span
              key={`${kw}-${i}`}
              className="inline-flex items-center gap-1 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs"
            >
              {kw}
              <button
                onClick={() =>
                  setForm({
                    ...form,
                    applies_to_keywords: form.applies_to_keywords.filter((_, j) => j !== i),
                  })
                }
                className="text-neutral-500 hover:text-red-400"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <Input
            value={kwInput}
            onChange={(e) => setKwInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && kwInput.trim()) {
                setForm({
                  ...form,
                  applies_to_keywords: [...form.applies_to_keywords, kwInput.trim()],
                });
                setKwInput("");
                e.preventDefault();
              }
            }}
            placeholder="키워드 입력 후 Enter"
          />
          <Button
            variant="secondary"
            onClick={() => {
              if (kwInput.trim()) {
                setForm({
                  ...form,
                  applies_to_keywords: [...form.applies_to_keywords, kwInput.trim()],
                });
                setKwInput("");
              }
            }}
          >
            추가
          </Button>
        </div>
      </div>
      <div className="mt-4 flex gap-2 border-t border-neutral-800 pt-3">
        <Button onClick={submit}>추가</Button>
        <Button variant="ghost" onClick={onCancel}>
          취소
        </Button>
      </div>
    </Card>
  );
}
