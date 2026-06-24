import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import fs from "node:fs";
import path from "node:path";
import { SKILLS_DIR, TRIAGE_DIR, GUARD_DIR, ONTOLOGY_DIR } from "@/lib/paths";

export const dynamic = "force-dynamic";

function safeRead<T>(p: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function listJsonl(p: string): number {
  try {
    return fs.readFileSync(p, "utf-8").split("\n").filter(Boolean).length;
  } catch {
    return 0;
  }
}

interface Rule {
  domain: string;
  force_full?: { keywords?: string[]; paths?: string[] };
}
interface Guard {
  thresholds?: { id: string; severity: string; law: string }[];
}

export default function SettingsPage() {
  const rulesDir = path.join(TRIAGE_DIR, "rules");
  const routesDir = path.join(TRIAGE_DIR, "routes");
  const rules: Rule[] = (() => {
    try {
      return fs
        .readdirSync(rulesDir)
        .filter((f) => f.endsWith(".rules.json"))
        .map((f) => safeRead<Rule>(path.join(rulesDir, f), { domain: "?" }));
    } catch {
      return [];
    }
  })();
  const routes = (() => {
    try {
      return fs
        .readdirSync(routesDir)
        .filter((f) => f.endsWith(".routes.jsonl"))
        .map((f) => ({
          domain: f.replace(".routes.jsonl", ""),
          count: listJsonl(path.join(routesDir, f)),
        }));
    } catch {
      return [];
    }
  })();
  const guard = safeRead<Guard>(path.join(GUARD_DIR, "rules", "finance-thresholds.json"), {});
  const ontology = (() => {
    try {
      return fs.readdirSync(ONTOLOGY_DIR).filter((f) => f.endsWith(".yaml"));
    } catch {
      return [];
    }
  })();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">설정 보기</h1>
        <p className="mt-1 text-sm text-neutral-400">
          현재 적용된 모든 설정을 한눈에 확인합니다. (편집은 각 화면에서)
        </p>
        <div className="mt-2 text-xs text-neutral-500">
          위치: <code>{SKILLS_DIR}</code>
        </div>
      </div>

      <Card>
        <CardHeader hint={`${rules.length}개 도메인`}>작업 분류 규칙</CardHeader>
        <ul className="flex flex-col gap-2">
          {rules.map((r) => (
            <li
              key={r.domain}
              className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-sm"
            >
              <span className="text-neutral-200">{r.domain}</span>
              <span className="text-xs text-neutral-500">
                키워드 {r.force_full?.keywords?.length ?? 0} · 경로{" "}
                {r.force_full?.paths?.length ?? 0}
              </span>
            </li>
          ))}
          {rules.length === 0 && (
            <li className="text-sm text-neutral-500">규칙 파일이 없습니다.</li>
          )}
        </ul>
      </Card>

      <Card>
        <CardHeader hint="L2 임베딩 라우터 예시 문장">라우팅 예시</CardHeader>
        <ul className="flex flex-col gap-2">
          {routes.map((r) => (
            <li
              key={r.domain}
              className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-sm"
            >
              <span className="text-neutral-200">{r.domain}</span>
              <span className="text-xs text-neutral-500">{r.count}개 예시</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader hint={`${guard.thresholds?.length ?? 0}개 룰`}>안전 가드</CardHeader>
        <ul className="flex flex-col gap-2">
          {guard.thresholds?.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <Badge tone={t.severity === "block" ? "danger" : "warn"}>{t.severity}</Badge>
                <code className="text-neutral-300">{t.id}</code>
              </div>
              <span className="text-xs text-neutral-500">{t.law}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader hint="finance.seed.yaml 등">도메인 온톨로지</CardHeader>
        {ontology.length === 0 ? (
          <div className="text-sm text-neutral-500">온톨로지 파일이 없습니다.</div>
        ) : (
          <ul className="flex flex-col gap-1 text-sm text-neutral-300">
            {ontology.map((f) => (
              <li key={f}>
                <code>{f}</code>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
