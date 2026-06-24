// 룰 저장 직후 자동 회귀 테스트 — 깨지면 롤백.
import { spawn } from "node:child_process";
import path from "node:path";
import { TRIAGE_DIR, GUARD_DIR } from "./paths";

export interface RegressionResult {
  ok: boolean;
  fails: number;
  total: number;
  raw: string;
}

function runPyTest(script: string): Promise<RegressionResult> {
  return new Promise((resolve) => {
    const child = spawn("python3", [script]);
    let out = "";
    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (out += d.toString()));
    const timer = setTimeout(() => child.kill("SIGKILL"), 30_000);
    child.on("close", (code) => {
      clearTimeout(timer);
      // test 스크립트 출력 마지막 줄 형식 예: "ALL PASS (12 cases)" 또는 "3 FAILED (12 cases)"
      const lastLine =
        out
          .trim()
          .split("\n")
          .reverse()
          .find((l) => l.includes("PASS") || l.includes("FAIL")) ?? "";
      const totalMatch = lastLine.match(/\((\d+)\s+cases\)/);
      const failMatch = lastLine.match(/(\d+)\s+FAILED/);
      const total = totalMatch ? Number(totalMatch[1]) : 0;
      const fails = failMatch ? Number(failMatch[1]) : 0;
      const ok = code === 0 && lastLine.includes("ALL PASS");
      resolve({ ok, fails, total, raw: out });
    });
  });
}

export const runGuardRegression = () =>
  runPyTest(path.join(GUARD_DIR, "scripts", "test_guard.py"));

export const runTriageRegression = () =>
  runPyTest(path.join(TRIAGE_DIR, "scripts", "test_triage.py"));
