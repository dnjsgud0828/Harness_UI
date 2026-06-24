export default function PluginsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">플러그인</h1>
      <p className="mt-1 text-sm text-neutral-400">
        ZIP·사내 Git URL로 설치, 활성화/비활성화 (Phase 2).
      </p>
      <p className="mt-4 text-sm text-neutral-500">
        Phase 1 — 발견된 플러그인은{" "}
        <a href="/solutions" className="text-blue-400 hover:underline">
          사내 자원
        </a>{" "}
        에서 확인하세요.
      </p>
    </div>
  );
}
