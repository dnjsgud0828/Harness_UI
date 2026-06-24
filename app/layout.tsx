import type { Metadata } from "next";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Harness Studio",
  description: "폐쇄망 사내 vLLM 기반 바이브코딩 하네스 관리",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="flex">
          <Sidebar />
          <main className="min-h-screen flex-1 overflow-y-auto">
            <div className="mx-auto max-w-5xl px-8 py-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
