"use client";
import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, ShieldOff, ArrowRight } from "lucide-react";

interface Violation {
  rule: string;
  severity: string;
  law: string;
  matched_value: string;
  limit: string;
  message: string;
}
interface GuardResult {
  status: "pass" | "warn" | "block";
  violations: Violation[];
}
interface TriageResult {
  domain: string;
  tier: string;
  decision: string;
  decided_by: string;
  matched?: { force?: unknown[]; core_risk?: string[] };
}

export default function Home() {
  const [request, setRequest] = useState("연체수수료 계산 함수 추가 — 이율 20%, ACT/365, HALF_UP");
  const [files, setFiles] = useState("fineract-charge/src/main/java/.../LateFeeCalculator.java");
  const [loading, setLoading] = useState(false);
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [guard, setGuard] = useState<GuardResult | null>(null);

  async function analyze() {
    setLoading(true);
    setTriage(null);
    setGuard(null);
    try {
      const filesArr = files.split(/\s+/).filter(Boolean);
      const [t, g] = await Promise.all([
        fetch("/api/triage", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ request, files: filesArr }),
        }).then((r) => r.json()),
        fetch("/api/guard", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ request, files: filesArr }),
        }).then((r) => r.json()),
      ]);
      if (t.ok) setTriage(t.data);
      if (g.ok) setGuard(g.data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Playground</h1>
        <p className="mt-1 text-sm text-neutral-400">
          요청 한 줄을 입력하면 우리 하네스가 어떻게 처리할지 보여줍니다.
        </p>
      </div>

      <Card>
        <CardHeader hint="자연어로 적으세요. 예: '대출 이자 재계산 로직 수정'">
          요청 입력
        </CardHeader>
        <Textarea
          rows={3}
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          placeholder="요청을 적으세요"
        />
        <div className="mt-3">
          <div className="mb-1 text-xs text-neutral-500">대상 파일 (공백 구분, 선택)</div>
          <Textarea
            rows={2}
            value={files}
            onChange={(e) => setFiles(e.target.value)}
          />
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={analyze} disabled={loading}>
            {loading ? "분석 중…" : "분석 시작"}
            {!loading && <ArrowRight size={14} />}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setRequest("");
              setFiles("");
              setTriage(null);
              setGuard(null);
            }}
          >
            초기화
          </Button>
        </div>
      </Card>

      {triage && (
        <Card>
          <CardHeader hint={`결정자: ${triage.decided_by} · 도메인: ${triage.domain}`}>
            1단계 — 작업 분류
          </CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              tone={
                triage.decision.startsWith("B-")
                  ? "warn"
                  : triage.decision === "A"
                    ? "ok"
                    : "info"
              }
            >
              {decisionLabel(triage.decision)}
            </Badge>
            <Badge tone="muted">위험도 {tierLabel(triage.tier)}</Badge>
          </div>
          {triage.matched?.force && triage.matched.force.length > 0 && (
            <div className="mt-3 text-xs text-neutral-400">
              매치 근거: <code>{JSON.stringify(triage.matched.force)}</code>
            </div>
          )}
        </Card>
      )}

      {guard && (
        <Card>
          <CardHeader
            hint={
              guard.status === "block"
                ? "법령/정책 위반 — 사용자 확인 필요"
                : guard.status === "warn"
                  ? "경고가 있습니다"
                  : "안전 가드 통과"
            }
          >
            2단계 — 안전 가드
          </CardHeader>
          <div className="flex items-center gap-2">
            {guard.status === "block" ? (
              <>
                <ShieldOff size={16} className="text-red-400" />
                <Badge tone="danger">차단</Badge>
              </>
            ) : guard.status === "warn" ? (
              <>
                <AlertTriangle size={16} className="text-amber-400" />
                <Badge tone="warn">경고</Badge>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} className="text-emerald-400" />
                <Badge tone="ok">통과</Badge>
              </>
            )}
          </div>
          {guard.violations.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2">
              {guard.violations.map((v, i) => (
                <li
                  key={i}
                  className="rounded-md border border-neutral-800 bg-neutral-950/50 p-3 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Badge tone={v.severity === "block" ? "danger" : "warn"}>{v.severity}</Badge>
                    <span className="text-neutral-300">{v.law}</span>
                  </div>
                  <div className="mt-1 text-neutral-300">{v.message}</div>
                  <div className="mt-1 text-xs text-neutral-500">
                    값: <code>{v.matched_value}</code> · 한도: <code>{v.limit}</code>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {triage && guard && guard.status !== "block" && (
        <Card>
          <CardHeader hint="다음에 실행될 단계">3단계 — 처리 계획</CardHeader>
          <p className="text-sm text-neutral-300">
            {triage.decision === "A"
              ? "경량 처리 (작성 → 정적 리뷰 → 결정적 게이트). 빠르고 토큰 비용 작음."
              : "전체 검증 (작성 → 게이트 → 정적/보안/규제 병렬 리뷰 → 동적 검증). 안전 우선."}
          </p>
        </Card>
      )}
    </div>
  );
}

function decisionLabel(d: string) {
  if (d === "A") return "빠른 처리";
  if (d.startsWith("B-")) return `전체 검증 (${d.slice(2)})`;
  if (d === "gray") return "회색지대 (LLM 위임)";
  return d;
}
function tierLabel(t: string) {
  return t === "high" ? "높음" : t === "medium" ? "중간" : "낮음";
}
