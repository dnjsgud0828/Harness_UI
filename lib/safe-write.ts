// 결정성·복구 가능성 우선: 백업 → atomic write → 검증 콜백 실패 시 자동 롤백.
// "저장은 했는데 시스템이 깨졌다"는 상황을 만들지 않는다.
import fs from "node:fs/promises";
import path from "node:path";

const BACKUP_ROOT = process.env.HARNESS_BACKUP_DIR ?? path.join(process.cwd(), ".harness-backups");

export interface SafeWriteResult {
  ok: boolean;
  written?: string;
  backup?: string;
  error?: string;
  verifyOutput?: unknown;
}

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

function ts() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export async function backupFile(filePath: string): Promise<string | null> {
  try {
    const rel = path.relative("/", filePath).replace(/\//g, "_");
    const backupPath = path.join(BACKUP_ROOT, `${ts()}__${rel}.bak`);
    await ensureDir(BACKUP_ROOT);
    try {
      await fs.copyFile(filePath, backupPath);
    } catch {
      return null; // 원본 부재 시 백업 없이 진행 (신규 파일)
    }
    return backupPath;
  } catch {
    return null;
  }
}

export async function restoreFromBackup(filePath: string, backupPath: string) {
  await fs.copyFile(backupPath, filePath);
}

export async function safeWrite(
  filePath: string,
  content: string,
  verify?: () => Promise<{ ok: boolean; detail?: unknown }>,
): Promise<SafeWriteResult> {
  const backup = await backupFile(filePath);
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  try {
    await ensureDir(path.dirname(filePath));
    await fs.writeFile(tmp, content, "utf-8");
    await fs.rename(tmp, filePath); // atomic on same fs

    if (verify) {
      const v = await verify();
      if (!v.ok) {
        if (backup) {
          await restoreFromBackup(filePath, backup);
        } else {
          await fs.unlink(filePath).catch(() => {});
        }
        return {
          ok: false,
          error: "verification failed — rolled back",
          backup: backup ?? undefined,
          verifyOutput: v.detail,
        };
      }
    }
    return { ok: true, written: filePath, backup: backup ?? undefined };
  } catch (e) {
    try {
      await fs.unlink(tmp);
    } catch {
      // ignore
    }
    if (backup) {
      try {
        await restoreFromBackup(filePath, backup);
      } catch {
        // ignore
      }
    }
    return { ok: false, error: e instanceof Error ? e.message : String(e), backup: backup ?? undefined };
  }
}

export function backupRoot() {
  return BACKUP_ROOT;
}
