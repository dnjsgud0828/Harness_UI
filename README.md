# Harness Studio

폐쇄망 사내 vLLM 기반 바이브코딩 하네스를 도메인 개발자가 관리·사용하는 Next.js 웹 UI.
삼중 안전망(자동 회귀 + 백업 + 자동 롤백)으로 비AI 사용자도 안전하게 룰을 편집·되돌릴 수 있다.

## 진행 상태 (v0.2.0)

### Phase 1 — MVP 골격 ✅
- 🏠 Playground (라우팅·가드 결과 시각화)
- 🤖 AI 엔진 (vLLM/Ollama 연결 테스트)
- 🔌 사내 자원 (AI 서버·플러그인 자동 발견)
- 📋 설정 보기 (현재 적용 설정 한눈 뷰)

### Phase 2 — Claude Code 쓰기 ✅
- 🛡️ 안전 가드 폼 편집 + **신규 추가/삭제** + 저장 시 12케이스 자동 회귀
- 🎯 작업 분류 칩 UI + **새 도메인 추가** + 6케이스 자동 회귀
- 🤖 에이전트 모델 (opus/sonnet/haiku) 선택 — Claude Code frontmatter surgical edit
- 🕘 변경 이력 (`/history`) — 백업 목록 + 1클릭 복원 (복원도 자동 회귀)
- 모든 저장: **타임스탬프 백업 + atomic write + 자동 회귀 + FAIL 시 자동 롤백**

### Phase 3+ 예정
- 📦 플러그인 import/export (사내 표준 팩 공유)
- ⚙️ 고급 (임계값 슬라이더·라우팅 예시·온톨로지 편집)
- 평가셋 실행·정확도 차트
- 온보딩 위저드

### 별도 트랙
- `/harness` 슬래시 명령 (Claude Code CLI 통합) — 계획서: `Documents/Harness_CLI_Slash_Commands_Plan.md`
- Phase 4 Registry 백엔드 (FastAPI + PostgreSQL + Template/Overlay 모델) — 로드맵: `Documents/Harness_Roadmap_Now_vs_Future.md`

## 사전 요구

- Node.js 22+ / npm
- Python 3.13+ (기존 `triage.py`, `check_guard.py` 호출)
- `~/.claude/skills/{triage-routing,input-guardrails,...}` 트리
- `~/.claude/agents/*.md` (에이전트 모델 변경용)

## 로컬 개발

### 빠른 시작 (foreground)

```bash
cd ~/Documents/20_project/24_practice/harness-ui
npm install
npm run dev
# → http://localhost:3000
```

> **HMR(Hot Module Replacement) 내장** — 한 번 실행하면 코드 저장만으로 브라우저가 자동 갱신됩니다. 다시 `npm run dev` 칠 필요 없음.

### 항상 켜두기 (background)

매번 `npm run dev` 치는 게 번거로우면 백그라운드 모드 사용:

```bash
npm run dev:bg       # 백그라운드 시작 (이미 켜져 있으면 무시)
npm run dev:status   # 상태 확인 (pid, 포트, 최근 로그)
npm run dev:logs     # 실시간 로그 (Ctrl+C로 빠짐)
npm run dev:stop     # 종료
npm run dev:restart  # 재시작
npm run dev:watch    # 크래시 시 자동 재시작 감시 (foreground, Ctrl+C 종료)
```

PID는 `.dev.pid`, 로그는 `.dev.log` (모두 `.gitignore`).

### macOS 로그인 시 자동 시작

```bash
./scripts/install-autostart.sh install     # 등록 + 즉시 시작
./scripts/install-autostart.sh uninstall   # 해제
```

`~/Library/LaunchAgents/com.harness-ui.dev.plist` 가 생성됩니다. KeepAlive 설정으로 크래시 시 자동 재시작.

환경변수 (선택):
- `HARNESS_SKILLS_DIR` — 스킬 디렉터리 (기본 `~/.claude/skills`)
- `HARNESS_AGENTS_DIR` — 에이전트 디렉터리 (기본 `~/.claude/agents`)
- `HARNESS_BACKUP_DIR` — 백업 저장 위치 (기본 `./.harness-backups`)
- `HARNESS_AI_SERVERS` — AI 서버 자동 발견 후보 URL (콤마구분)
- `FIN_EMBED_ENDPOINT` · `FIN_EMBED_MODEL` · `FIN_EMBED_VERSION` — 기존 Python 라우터 호환

## Docker (사내 배포)

```bash
docker compose up -d
# → http://localhost:3000
```

호스트의 `~/.claude/skills` 트리가 컨테이너 `/opt/harness-config`에 자동 마운트됩니다.
폐쇄망에서는 사내 컨테이너 미러 레지스트리(`NODE_IMAGE`, `PY_IMAGE`)로 교체하세요.

## 아키텍처

```
Next.js 15 (App Router · standalone 빌드)
  ├ app/                     UI 페이지 (서버·클라이언트 컴포넌트)
  ├ app/api/                 Python spawn + 파일 안전 쓰기
  │   ├ triage, guard          (조회: triage.py · check_guard.py 호출)
  │   ├ triage/rules, guard/rules, agents  (쓰기: 폼 → JSON/frontmatter)
  │   ├ backups, backups/restore           (롤백)
  │   ├ embed/test                          (vLLM 연결 테스트)
  │   ├ discover                            (AI 서버·플러그인·MCP)
  │   ├ settings                            (전체 설정 한눈)
  │   └ health
  ├ components/ui/           최소 UI 프리미티브 (button·card·input·badge)
  └ lib/
     ├ paths.ts              스킬 디렉터리 추상화
     ├ python-bridge.ts      child_process.spawn 래퍼
     ├ safe-write.ts         atomic write + 백업 + verify 콜백 + 자동 롤백
     ├ regression.ts         test_guard.py / test_triage.py 실행 + 결과 파싱
     └ cn.ts                 Tailwind merge
```

### 안전망 (모든 룰 저장 시 공통)

```
[저장] → 백업 생성 → .tmp 쓰기 → atomic rename → 자동 회귀 실행
                                                    ├ PASS → 확정 + 백업 보존
                                                    └ FAIL → 백업에서 복구 + 409 응답
```

### Claude Code 즉시 반영

기존 Python 스크립트는 수정 없이 그대로 호출, 룰 파일은 매 호출 시 다시 읽음:
- `triage.py` / `check_guard.py` → 다음 호출부터 새 룰 자동 사용
- `~/.claude/agents/*.md` 의 `model:` → 다음 `Agent()` 호출부터 새 모델

## 폐쇄망 보장

- Next.js telemetry off (`NEXT_TELEMETRY_DISABLED=1`)
- 외부 API 호출 없음 (디스커버는 사내 후보 URL만 ping)
- 임베딩 엔드포인트는 사내 vLLM 또는 로컬 Ollama만 지원
- 외부 통신 강제 차단 모드 (`HARNESS_CLOSED_NETWORK=1`) — Phase 3 예정

## 헬스체크

```
GET /api/health
→ { ok, triage_script_present, guard_script_present, node, closed_network_mode }
```

## 관련 문서 (`docs/` 폴더)

[docs/README.md](docs/README.md) 에 인덱스가 있습니다.

- [Harness_UI_Tool_Plan.md](docs/Harness_UI_Tool_Plan.md) — Studio 초기 계획·UX 원칙
- [Harness_Agent_Models_And_Flow.md](docs/Harness_Agent_Models_And_Flow.md) — 에이전트 세션·통신·시퀀스 다이어그램
- [Harness_Hybrid_Routing_Plan.md](docs/Harness_Hybrid_Routing_Plan.md) — 3층 라우팅 설계
- [Harness_Triage_Ontology_Roadmap.md](docs/Harness_Triage_Ontology_Roadmap.md) — 온톨로지 진화 (YAML → 그래프DB)
- [Harness_CLI_Slash_Commands_Plan.md](docs/Harness_CLI_Slash_Commands_Plan.md) — `/harness` 슬래시 명령
- [Harness_Roadmap_Now_vs_Future.md](docs/Harness_Roadmap_Now_vs_Future.md) — 전체 로드맵 (지금/다음/추후)

> 외부 모태 문서: `Documents/Harness_Implementation_Plan.md` (Harness B 원본) — 이 프로젝트 외부에 보존.
