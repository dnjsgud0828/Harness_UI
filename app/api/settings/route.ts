import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { SKILLS_DIR, TRIAGE_DIR, GUARD_DIR } from "@/lib/paths";

export const dynamic = "force-dynamic";

export async function GET() {
  const rulesDir = path.join(TRIAGE_DIR, "rules");
  const routesDir = path.join(TRIAGE_DIR, "routes");

  function safeJson<T>(p: string, fb: T): T {
    try {
      return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
    } catch {
      return fb;
    }
  }

  const rules =
    fs.existsSync(rulesDir)
      ? fs
          .readdirSync(rulesDir)
          .filter((f) => f.endsWith(".rules.json"))
          .map((f) => safeJson(path.join(rulesDir, f), {}))
      : [];

  const routes =
    fs.existsSync(routesDir)
      ? fs
          .readdirSync(routesDir)
          .filter((f) => f.endsWith(".routes.jsonl"))
          .map((f) => ({
            domain: f.replace(".routes.jsonl", ""),
            count: fs
              .readFileSync(path.join(routesDir, f), "utf-8")
              .split("\n")
              .filter(Boolean).length,
          }))
      : [];

  const guard = safeJson(path.join(GUARD_DIR, "rules", "finance-thresholds.json"), {
    thresholds: [],
  });

  return NextResponse.json({
    ok: true,
    data: { skills_dir: SKILLS_DIR, rules, routes, guard },
  });
}
