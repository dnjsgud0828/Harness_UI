// 기존 Python 스크립트(triage.py, check_guard.py 등) 호출 래퍼.
// child_process.spawn으로 결정성 보존(temperature·env 그대로).
import { spawn } from "node:child_process";

export interface PyResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  stderr?: string;
}

export async function runPython<T = unknown>(
  script: string,
  args: string[],
  opts: { timeoutMs?: number; env?: NodeJS.ProcessEnv } = {},
): Promise<PyResult<T>> {
  const timeout = opts.timeoutMs ?? 10_000;
  return new Promise((resolve) => {
    const child = spawn("python3", [script, ...args], {
      env: { ...process.env, ...(opts.env ?? {}) },
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve({ ok: false, error: `timeout after ${timeout}ms`, stderr });
    }, timeout);
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        resolve({ ok: false, error: `exit ${code}`, stderr });
        return;
      }
      try {
        resolve({ ok: true, data: JSON.parse(stdout) as T, stderr });
      } catch {
        resolve({ ok: false, error: "invalid JSON output", stderr: stdout + stderr });
      }
    });
  });
}
