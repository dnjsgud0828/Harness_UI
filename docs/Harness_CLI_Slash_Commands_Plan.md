# Harness `/harness` 슬래시 명령 — 계획

> Claude Code CLI에서 우리 하네스(트리아지·가드·에이전트·온톨로지)를 자연어로 조회·변경하는 단일 슬래시 명령 추가 계획.
> Harness Studio(웹 UI)와 **같은 백엔드**(파일·회귀·롤백)를 공유. 어디서 변경하든 즉시 자동 반영.
> 기준: 2026-06-24

---

## 0. 한 줄

> **CLI에서 흐름 끊지 않고** `/harness <자연어>` 한 줄로 하네스를 조회·변경. 안전망(자동 회귀·백업·롤백)은 Studio와 동일.

---

## 1. 목표·비목표

### 목표
- Claude Code CLI 사용 중 **창 전환 없이** 하네스 룰 확인·수정
- 자연어 인자 → 의도 분류 → 안전한 변경
- Studio와 **동일한 안전망** (회귀 자동·롤백·백업)
- 결정성·감사 추적 보장 (모든 변경은 백업 + audit-trail)

### 비목표
- LLM이 룰을 임의 생성·해석하지 않음 (자유 기술 금지 — 슬래시 안에서도 결정적 규칙 우선)
- Studio 대체가 아님 (시각화·일괄 편집·플레이그라운드는 Studio가 주력)
- 다른 어시스턴트(Cursor·Continue 등)는 별도 트랙

---

## 2. 인터페이스 — 단일 슬래시 + 의도 디스패치

### 명령
```
/harness <의도> [세부 인자…]
```

### 7가지 의도

| # | 의도 키워드 | 인자 | 동작 |
|---|---|---|---|
| 1 | `상태` / `status` | 없음 | 트리아지 도메인·가드 룰·에이전트 model 분포·최근 5개 변경 요약 |
| 2 | `시험` / `playground` | `"<요청 문장>" [파일...]` | triage + guard 호출 → 시각 결과 |
| 3 | `가드` / `guard` | `<룰id> <필드> <값>` 또는 `추가 "<설명>"` 또는 `삭제 <룰id>` | 가드 룰 R/U/D + 자동 회귀 |
| 4 | `트리아지` / `triage` | `<도메인> 키워드 추가/삭제 "<단어>"` 또는 `<도메인> 경로 추가/삭제 "<경로>"` | 도메인 룰 편집 + 자동 회귀 |
| 5 | `모델` / `model` | `<에이전트명> <opus|sonnet|haiku>` | frontmatter `model:` surgical edit |
| 6 | `백업` / `backup` | `목록` 또는 `복원 <백업id>` | 최근 백업 보기·복원 |
| 7 | `도움말` / `help` | 없음 | 사용법 요약 |

### 예시
```bash
/harness 상태
/harness 시험 "연체수수료 함수 추가" fineract-charge/.../LateFee.java
/harness 가드 iza_jehan_act_max_rate limit_percent 20.5
/harness 가드 추가 "보험 청구금 상한 1억"
/harness 트리아지 finance 키워드 추가 "송금"
/harness 트리아지 finance 경로 삭제 "old/legacy/"
/harness 모델 code-reviewer sonnet
/harness 백업 목록
/harness 백업 복원 2026-06-24T14-30-12_finance-thresholds
/harness 도움말
```

---

## 3. 파일 구조

```
~/.claude/commands/
├ harness.md            ← 메인 진입점 (의도 디스패치 지침 + 도구 사용 규칙)
├ harness-status.md     ← (선택) 자주 쓰는 의도를 별도 파일로 분리
└ harness-test.md       ← (선택) "시험" 의도 단축
```

**원칙**: 단일 진입점(`harness.md`) 권장 — 외우기 쉬움. 자주 쓰는 의도는 단축 슬래시로 추가.

### `harness.md` 구조 (요약)
```markdown
---
name: harness
description: 하네스 룰 조회·변경 — 7가지 의도(상태·시험·가드·트리아지·모델·백업·도움말)
---

# 행동 지침
1. 첫 토큰으로 의도 분류 (한국어/영어 키워드 매핑).
2. 분류 못 하면 도움말 출력.
3. 의도별 처리는 ## 섹션 참조.
4. 모든 파일 쓰기는 우리 백엔드 호출(절대 직접 편집 금지).

## 상태
... 정확한 절차 (어떤 파일 읽고 어떤 형식으로 출력할지)

## 시험
... triage.py / check_guard.py 호출 절차

## 가드
... API 호출 절차 (PUT /api/guard/rules 또는 safe-write 직접)

## 트리아지
...

## 모델
...

## 백업
...

## 도움말
...
```

---

## 4. 백엔드 통합 전략

### 전략 A — Studio API를 통한 통합 (권장)
```
/harness 가드 …  →  curl localhost:3000/api/guard/rules PUT  →  안전망 자동 적용
```

**장점**
- Studio와 100% 같은 안전망 (백업·회귀·롤백)
- 코드 중복 0
- Studio가 떠 있는 환경 가정 (사내 일반)

**단점**
- Studio가 떠 있어야 함

### 전략 B — Python 스크립트 직접 호출
```
/harness 가드 …  →  python3 ~/.claude/skills/.../write_rule.py  →  safe-write 라이브러리
```

**장점**
- Studio 무관하게 작동
- 오프라인 가능

**단점**
- 안전망 로직 Python으로 재구현 필요

### 권장 — A 우선, B 폴백
```bash
if curl -s http://localhost:3000/api/health > /dev/null; then
  # Studio API
else
  # Python 직접 (간소판)
fi
```

---

## 5. 의도별 상세 절차

### 5-1. 상태
```
1) GET /api/settings (도메인·가드·라우트 카운트)
2) GET /api/agents
3) 최근 변경 5건 (~/.claude/.recent-changes.md 마지막 5줄)
4) 표 형식 출력
```

### 5-2. 시험 (Playground)
```
1) python3 triage.py --request "..." --files ...
2) python3 check_guard.py --request "..." 
3) 1·2단계 카드 형식으로 결과 + 다음 단계 안내
```

### 5-3. 가드 변경
```
1) 자연어 인자 파싱: <룰id> <필드> <값>
   - 룰id 매칭 안 되면 → 모호 → 사용자 확인 요청
2) 현재 JSON 로드
3) 해당 룰의 필드 변경
4) PUT /api/guard/rules (자동 회귀·롤백)
5) 결과 보고:
   - PASS → "✓ 저장됨 (백업 경로 표시)"
   - FAIL → "✗ 회귀 N건 실패 → 롤백 완료"
```

### 5-4. 트리아지 변경
```
1) 자연어 인자 파싱: <도메인> <키워드|경로> <추가|삭제> "<값>"
2) 현재 도메인 룰 GET → 칩 수정
3) PUT /api/triage/rules → 자동 회귀·롤백
```

### 5-5. 모델 변경
```
1) PUT /api/agents {name, model}
2) frontmatter `model:` 1줄만 surgical edit
3) 결과: "✓ 다음 Agent() 호출부터 sonnet 적용"
```

### 5-6. 백업
```
목록: ls -t ~/Documents/.../harness-ui/.harness-backups | head -10
복원: cp <백업> <원본> + 회귀 실행
```

### 5-7. 도움말
```
사용 가능한 7개 의도 + 예시 출력
```

---

## 6. UX 원칙 (CLI 슬래시 전용)

| 원칙 | 적용 |
|---|---|
| **모호하면 묻기** | 룰id가 일부만 일치하면 후보 목록 제시 |
| **변경 전 미리보기** | "limit 20 → 20.5 로 변경합니다. 진행할까요? (y/N)" |
| **결과를 자연어로** | "✓ 저장됨" + 회귀 결과 + 백업 경로 |
| **실패 명시** | FAIL은 어떤 회귀가 깨졌는지 마지막 줄 표시 |
| **자연어 인자 결정적 파싱** | 정규식·키워드 우선, LLM 자유 해석 최소 |
| **단축 도움말** | `/harness` 단독 = 짧은 안내, `/harness 도움말` = 전체 |

---

## 7. 보안·결정성

| 항목 | 방어 |
|---|---|
| 룰 ID 인젝션 | 정규식 화이트리스트 (`^[a-z][a-z0-9_-]*$`) |
| 도메인 인젝션 | 같음 |
| 백업 복원 시 임의 경로 | 백업 디렉터리 prefix 강제 확인 |
| 모델 값 | `opus|sonnet|haiku` 허용 목록만 |
| 회귀 우회 시도 | 슬래시 안에서 우회 옵션 제공 X (안전망 강제) |
| 감사 추적 | 모든 변경 → `~/.claude/.recent-changes.md` append + audit-trail |

---

## 8. Studio 프로젝트에 추가 필요한 것

`/harness` 슬래시가 Studio API를 호출하므로 다음 보강 필요:

| # | 항목 | 위치 | 이유 |
|---|---|---|---|
| 1 | **API 토큰 인증** (단순 헤더 토큰) | `app/api/*` + 미들웨어 | CLI가 안전하게 PUT 호출 (Studio가 localhost 외 노출되면 필수) |
| 2 | **`GET /api/backups`** | `app/api/backups/route.ts` | 백업 목록 조회 |
| 3 | **`POST /api/backups/restore`** | 같은 폴더 | 백업 복원 + 회귀 |
| 4 | **`POST /api/guard/rules/add`, `delete`** | 새 라우트 | 룰 단건 추가·삭제 (현재는 전체 PUT만) |
| 5 | **`POST /api/triage/rules/keyword`** | 새 라우트 | 칩 단건 추가·삭제 |
| 6 | **`GET /api/changes/recent`** | 새 라우트 | `~/.claude/.recent-changes.md` 최근 N줄 |
| 7 | **`POST /api/changes/log`** | 새 라우트 | CLI에서 변경 시 변경 로그 기록 (공유) |
| 8 | **CORS 설정 (필요 시)** | `next.config.ts` | CLI가 fetch할 때 |
| 9 | **헬스체크에 버전·API 토큰 검증** 노출 | `app/api/health` | CLI가 Studio 가용 확인 |
| 10 | **(선택) WebSocket/SSE 브로드캐스트** | 새 라우트 | CLI 변경이 UI에도 즉시 반영 |

### 추가하지 않아도 되는 것
- 룰 편집기 UI (이미 있음)
- 자동 회귀·롤백 (이미 있음)
- 백업 (이미 있음)

---

## 9. 단계별 작업

### Phase 1 — 슬래시 명령 골격 (반나절)
- `~/.claude/commands/harness.md` 작성 (7개 의도 지침)
- `상태`·`시험`·`도움말` 3개 의도부터 동작 (조회 위주, 안전)
- Studio API 호출 또는 Python 직접 호출 분기

### Phase 2 — 변경 의도 (1일)
- `가드`·`트리아지`·`모델` 의도 처리
- Studio에 백업 목록/복원 API 추가 (위 표 #2,3)
- 변경 전 미리보기 + 확인 프롬프트

### Phase 3 — 안전·협업 (반나절)
- API 토큰 인증
- `~/.claude/.recent-changes.md` 통합 로그
- `백업` 의도 (목록·복원)

### Phase 4 — 단축 슬래시 (선택)
- 자주 쓰는 의도를 별도 슬래시로 (`/h-status`, `/h-test`)

---

## 10. 검증 시나리오

| # | 시나리오 | 기대 |
|---|---|---|
| 1 | `/harness 상태` | 현재 도메인·룰·에이전트 분포 표 |
| 2 | `/harness 시험 "이자 25%"` | guard block, triage B-finance |
| 3 | `/harness 가드 iza_jehan_act_max_rate limit_percent 20.5` | 미리보기 → y → 저장 + 회귀 PASS |
| 4 | `/harness 가드 iza_jehan_act_max_rate limit_percent 100` | 회귀 FAIL → 롤백 알림 |
| 5 | `/harness 모델 code-reviewer sonnet` | frontmatter 변경 |
| 6 | `/harness 백업 복원 <id>` | 복원 + 회귀 + 안내 |
| 7 | UI에서 변경 → CLI `/harness 상태` | UI 변경이 CLI에도 즉시 보임 |

---

## 11. 위험·완화

| 위험 | 완화 |
|---|---|
| 자연어 파싱 오해 | 정규식·키워드 우선, 모호 시 후보 제시·확인 요청 |
| Studio가 안 떠 있음 | Python 폴백 모드 (조회 위주) |
| 룰 ID 오타 | fuzzy 후보 제시 ("`iza_jeh...` — `iza_jehan_act_max_rate` 말씀이신가요?") |
| 의도 분류 토큰 비용 | 디스패치는 첫 토큰 위주 — 보통 50토큰 이하 |
| 회귀 오랜 시간 | 30초 타임아웃 (이미 `regression.ts`에 있음) |

---

## 12. 한 줄 정리

> **`/harness <자연어>` 단일 슬래시로 Studio API 통해 룰을 조회·변경.** Studio 안전망 그대로 활용 → 어디서 변경하든 자동 회귀·롤백·백업. Studio에는 API 7개(백업·단건 CRUD·변경 로그) 추가 필요.
