"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  Home,
  Shield,
  Target,
  Bot,
  Cpu,
  Plug,
  ClipboardList,
  History,
  Package,
  Settings,
} from "lucide-react";

const items = [
  { href: "/", label: "Playground", icon: Home, hint: "요청을 보내고 결과 확인" },
  { href: "/guards", label: "안전 가드", icon: Shield, hint: "법령 상한·금지 패턴" },
  { href: "/routing", label: "작업 분류", icon: Target, hint: "키워드·경로 규칙" },
  { href: "/agents", label: "에이전트 모델", icon: Bot, hint: "Claude Code 에이전트" },
  { href: "/models", label: "AI 엔진", icon: Cpu, hint: "vLLM 연결·모델 선택" },
  { href: "/solutions", label: "사내 자원", icon: Plug, hint: "AI 서버·MCP·플러그인" },
  { href: "/settings", label: "설정 보기", icon: ClipboardList, hint: "현재 적용된 설정" },
  { href: "/history", label: "변경 이력", icon: History, hint: "백업 복원" },
  { href: "/plugins", label: "플러그인", icon: Package, hint: "설치·관리" },
  { href: "/advanced", label: "고급", icon: Settings, hint: "임계값·온톨로지" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-neutral-900 bg-neutral-950 p-3">
      <div className="px-2 py-3">
        <div className="text-sm font-semibold tracking-tight">Harness Studio</div>
        <div className="text-[11px] text-neutral-500">폐쇄망 · 사내 vLLM</div>
      </div>
      <nav className="mt-2 flex flex-col gap-0.5">
        {items.map(({ href, label, icon: Icon, hint }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-start gap-3 rounded-md px-3 py-2 text-sm transition",
                active
                  ? "bg-neutral-900 text-neutral-50"
                  : "text-neutral-400 hover:bg-neutral-900/70 hover:text-neutral-100",
              )}
            >
              <Icon size={16} className="mt-0.5 shrink-0" />
              <span className="flex flex-col">
                <span>{label}</span>
                <span className="text-[11px] text-neutral-600">{hint}</span>
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-2 py-3 text-[11px] text-neutral-600">v0.1.0 (Phase 1)</div>
    </aside>
  );
}
