# Harness — 지금 구현 vs 추후 확장 로드맵

> 사용자 결정 반영: 별도 백엔드(FastAPI 권장) + PostgreSQL + Studio 클라이언트 + 템플릿/오버레이 모델 + 문서 레지스트리.
> 기준: 2026-06-24

---

## 0. 한 줄 정리

> **지금**은 흩어진 파일들을 모아 **명시적 템플릿 + 개인 오버레이** 구조로 정착시키고 CLI 슬래시까지 연결. **추후**는 온톨로지 그래프화·옵저버빌리티·다중 어시스턴트로 확장.

---

## 1. 현재 자산 (이미 완성)

| 영역 | 완성도 | 비고 |
|---|---|---|
| 멀티 에이전트 하네스 (코어 + 금융 팩) | ✅ | 6개 에이전트, 4개 스킬 |
| 3층 라우팅 (L1 룰 + L2 임베딩 + L3 LLM) | ✅ | 정확도 100% (시드 17건) |
| 입력 가드레일 + 결정적 회귀 (12 케이스) | ✅ | |
| 금융 온톨로지 시드 (YAML) | ✅ | concepts·formulas·regulations |
| Harness Studio Phase 1 (Next.js) | ✅ | Playground·Models·Solutions·Settings |
| Studio Phase 2A (쓰기 + 자동 회귀·롤백) | ✅ | guard·triage·agents |

---

## 2. 지금 구현할 항목 (Near-term, 1~2주)

### 2-1. Studio Phase 2 마무리 (1~2일)

| 작업 | 산출물 | 우선 |
|---|---|---|
| 가드 룰 **신규 추가** UI (모달 + 동적 필드) | `/guards` `+ 새 룰` 버튼 | 🔴 |
| 가드 룰 **삭제** UI (휴지통 + 확인) | 카드 우상단 | 🔴 |
| 트리아지 **새 도메인 추가** UI | `/routing` `+ 새 도메인` 버튼 | 🟡 |
| **Rollback UI** (백업 목록 + 1클릭 복원) | `/history` 페이지 | 🔴 |
| Git auto-commit 옵션 (env 토글) | `simple-git` 통합 | 🟢 (단독 사용은 불필요) |

### 2-2. CLI 통합 — `/harness` 슬래시 명령 (1일)

| 작업 | 산출물 |
|---|---|
| `~/.claude/commands/harness.md` (7개 의도) | 메인 슬래시 |
| Studio API 확장 (백업 목록·복원·단건 CRUD·변경 로그) | 7개 새 라우트 |
| API 토큰 인증 | middleware |

### 2-3. 합계
**약 2~3일 작업**. 끝나면:
- Studio에서 룰 신규/삭제·이력 관리 완비
- CLI에서 `/harness ...` 한 줄로 동일 작업 가능

---

## 3. 다음 단계 (Mid-term, 2~4주)

### 3-1. Phase 4 — Registry + Template + Overlay 시스템

**목적**: 사내 표준 템플릿을 중앙에서 관리·배포, 개인은 오버레이로 추가.

| 작업 | 산출물 | 시간 |
|---|---|---|
| **Registry 백엔드 골격** (FastAPI + PostgreSQL) | 별도 프로젝트 `harness-registry/` | 2일 |
| **DB 스키마** (templates, items, documents, overlays, locks, change_log) | 마이그레이션 | 1일 |
| **템플릿 분리·등록** (현재 파일들을 `core-pack v1.0`, `finance-pack v1.0` 등으로 분리) | 일회성 마이그레이션 스크립트 | 1일 |
| **Studio → 클라이언트 모드** (Registry pull, lock, compile, file export) | Studio 재구성 | 2일 |
| **Overlay 엔진** (템플릿 + 개인 변경 → 최종 컴파일) | `lib/compile-config.ts` | 1~2일 |
| **버전 업그레이드 위저드** (diff 미리보기 + 충돌 해결) | `/upgrade` 페이지 | 1일 |

### 3-2. Phase 4 — 문서 레지스트리

| 작업 | 산출물 | 시간 |
|---|---|---|
| 문서 종류 정의 (확정 후 진행) | 합의 |
| 문서 업로드·메타데이터 (관리자) | `/admin/documents` | 1일 |
| FTS 검색 (PostgreSQL FTS) | `/documents` 검색 | 1일 |
| 룰 카드에서 §클릭 → 본문 사이드 패널 | UI 통합 | 1일 |

### 3-3. LiteLLM 프록시 도입

| 작업 | 산출물 | 시간 |
|---|---|---|
| 사내 LiteLLM 인스턴스 1대 | 설정 | 반나절 |
| `FIN_EMBED_ENDPOINT`를 LiteLLM 가리키도록 | 환경변수 | 30분 |
| Studio Models 화면에서 LiteLLM 모델 목록 자동 발견 | 통합 | 반나절 |

**Mid-term 합계: 약 2~3주**

---

## 4. 추후 확장 (Long-term, 1~3개월+)

### 4-1. Phase 5 — 온톨로지 진화

| 단계 | 작업 | 도구 |
|---|---|---|
| 5A | 문서 → LLM 추출 → 후보 개념 → 사람 승인 → YAML 누적 | Python 추출 스크립트 + Studio UI 검토 (Langflow는 프로토타입 옵션) |
| 5B | YAML → 그래프DB 승격 | **Neo4j** 권장 |
| 5C | 그래프 쿼리·시각화 (룰 ↔ 개념 ↔ 법령 트래버스) | Neo4j Bloom, WebVOWL |
| 5D | 그래프 기반 코드 생성 컨텍스트 자동 추출 | 코드 생성 시 관련 개념·법령 자동 첨부 |

### 4-2. 협업·운영 (Phase 6)

| 작업 | 도구 |
|---|---|
| 룰 변경 PR 워크플로 (사내 GitLab 연동) | 사내 표준 |
| 권한·승인 (관리자/일반/도메인 리더) | RBAC |
| 감사 대시보드 (누가 언제 무엇을 바꿨나) | 자체 또는 Grafana |
| 사용 통계 (도메인별 풀검증 빈도·차단율) | 자체 |

### 4-3. 옵저버빌리티 (Phase 7)

| 작업 | 도구 |
|---|---|
| LLM 호출 트레이싱·토큰 비용·프롬프트 관리 | **Langfuse** (사내 self-host) |
| A/B 프롬프트 실험 | Langfuse |
| 평가셋 자동 확장 (실제 라우팅 이력 → routes/*.jsonl) | 자체 학습 루프 |

### 4-4. 다중 어시스턴트 지원 (Phase 8, 보류 중)

사용자가 현재 제외했으나 미래에 필요해지면:
- Continue, Aider, Gemini CLI 어댑터
- Cursor 룰 export
- 어댑터 인터페이스 표준화

### 4-5. 도메인 확장

| 도메인 | 현재 | 추후 |
|---|---|---|
| 금융 | 풀 팩 완성 | 유지·고도화 |
| 보험 | 라우팅 룰만 | 풀 팩 (가드·도메인룰·전용 에이전트) |
| 계리 | 라우팅 룰만 | 풀 팩 (IFRS17·K-ICS 룰·계산 골든) |
| 사내 자체 도메인 | 없음 | 사용자가 직접 추가 (Phase 4 템플릿 시스템 활용) |

---

## 5. 시점별 인프라 요구

| 시점 | 신규 인프라 | 환경 |
|---|---|---|
| 지금 | 0 (로컬) | 단독 개발자 |
| 2~3일 후 | 0 추가 | 단독 + CLI 통합 |
| 2~3주 후 | **PostgreSQL** + **FastAPI** 서버 1대 + **LiteLLM** 서버 1대 | 5~20인 팀 |
| 1~2개월 후 | **Neo4j** + **Langfuse** | 20~50인 |
| 3개월+ | 사내 GitLab 통합, 감사 시스템 | 전사 표준화 |

---

## 6. 우선순위 표 (정리)

### 🔴 지금 (Near, 1~2주)
1. Studio Phase 2 마무리 (룰 추가/삭제, Rollback UI)
2. `/harness` 슬래시 + Studio API 확장
3. (선택) Git auto-commit 옵션화

### 🟡 다음 (Mid, 2~4주)
4. Phase 4 Registry 백엔드 (FastAPI + Postgres)
5. Template/Overlay 모델
6. Document Registry (규제·디렉터리)
7. LiteLLM 도입

### 🟢 추후 (Long, 1~3개월+)
8. 온톨로지 Phase 5 (Neo4j 승격, LLM 추출 파이프라인)
9. 협업 (PR 워크플로·승인·감사)
10. Langfuse 옵저버빌리티
11. 보험·계리 풀 팩 (사용자가 문서 제공 시)
12. 다중 어시스턴트 어댑터 (보류 → 필요 시 부활)

---

## 7. 결정 사항 추적

| 결정 | 상태 |
|---|---|
| 백엔드 — 별도 + Studio 클라이언트 | ✅ |
| DB — PostgreSQL | ✅ |
| 백엔드 언어 — FastAPI (Python 친화) | 권장 (확정 필요) |
| 템플릿 분리 — 도메인 단위 + core-pack | 권장 (확정 필요) |
| 문서 범위 — (a)/(b)/(c) | ❓ 확인 필요 |
| 문서 형식 — MD 표준 + PDF 추출 | 권장 (확정 필요) |
| Meilisearch — PostgreSQL FTS로 시작 | 권장 (확장 시 도입) |
| LiteLLM — 도입 | 권장 (확정 필요) |
| Langfuse — 추후 | 권장 |
| Langflow — 채택 안 함, 온톨로지엔 Neo4j+코드 | ✅ |

---

## 8. 다음 액션 후보 (택일)

### (A) 지금 항목부터 진행
- Studio Phase 2 마무리 + `/harness` 슬래시 (2~3일)
- 결과: 운영 가능한 1인용 도구 완성

### (B) Phase 4 Registry 골격 먼저
- FastAPI + Postgres + 마이그레이션 스크립트 (3~4일)
- 결과: 팀 협업 인프라 골격

### (C) (A)+(B) 직렬
- 순서대로 둘 다 (1~2주)
- 결과: 단독 + 팀 둘 다 사용 가능

### (D) 사용자 결정 답변 후 진행
- 위 결정 사항(특히 문서 범위·LiteLLM·FastAPI) 확정 후 작업

---

## 9. 관련 문서

- `Harness_Implementation_Plan.md` — 모태 (Harness B)
- `Harness_Agent_Models_And_Flow.md` — 에이전트 세션·통신
- `Harness_Hybrid_Routing_Plan.md` — 라우팅 3층
- `Harness_Triage_Ontology_Roadmap.md` — 온톨로지 진화 (5A~5D 상세는 이 문서 참조)
- `Harness_UI_Tool_Plan.md` — Studio UI 초기 계획
- `Harness_CLI_Slash_Commands_Plan.md` — `/harness` 슬래시 명령
- `Harness_FinInsurance_Plan.md`, `Harness_Insurance_Actuarial_Expansion.md` — 도메인 확장
