// 하네스 설정 트리 위치 추상화.
// 컨테이너: /opt/harness-config (볼륨 마운트)
// 로컬 개발: ~/.claude/skills
import path from "node:path";
import os from "node:os";

export const SKILLS_DIR =
  process.env.HARNESS_SKILLS_DIR ?? path.join(os.homedir(), ".claude", "skills");

export const TRIAGE_DIR = path.join(SKILLS_DIR, "triage-routing");
export const GUARD_DIR = path.join(SKILLS_DIR, "input-guardrails");
export const ONTOLOGY_DIR = path.join(SKILLS_DIR, "finance-domain-rules", "ontology");

export const TRIAGE_SCRIPT = path.join(TRIAGE_DIR, "scripts", "triage.py");
export const GUARD_SCRIPT = path.join(GUARD_DIR, "scripts", "check_guard.py");
