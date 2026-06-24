# Harness UI — 구현 계획 문서 모음

진행 순서·읽는 순서대로 정리.

| # | 문서 | 한 줄 |
|---|---|---|
| 1 | [Harness_UI_Tool_Plan.md](Harness_UI_Tool_Plan.md) | Studio (Next.js) 초기 설계 — 화면 구성·UX 원칙·Phase 1~4 |
| 2 | [Harness_Agent_Models_And_Flow.md](Harness_Agent_Models_And_Flow.md) | 멀티 에이전트의 세션 격리·컨텍스트 전달·시퀀스 다이어그램 |
| 3 | [Harness_Hybrid_Routing_Plan.md](Harness_Hybrid_Routing_Plan.md) | 3층 라우팅(L1 규칙·L2 임베딩·L3 LLM) 설계 |
| 4 | [Harness_Triage_Ontology_Roadmap.md](Harness_Triage_Ontology_Roadmap.md) | 라우팅·온톨로지의 단계적 진화 (시드 YAML → 그래프DB) |
| 5 | [Harness_CLI_Slash_Commands_Plan.md](Harness_CLI_Slash_Commands_Plan.md) | `/harness` 슬래시 명령 통합 — CLI에서 룰 조회·변경 |
| 6 | [Harness_Roadmap_Now_vs_Future.md](Harness_Roadmap_Now_vs_Future.md) | 전체 로드맵 — 지금/다음/추후 + 의사결정 추적 |

## 작성 의도

- **계획서 = 구현 직전의 설계 합의 문서**. 추측이 아니라 결정·근거·트레이드오프 기록.
- **시간 흐름**: 1 → 6 순서로 갈수록 통합·전체 그림이 명확해짐.
- **현재 위치**: Roadmap (#6) 에서 "지금 구현 중" 색상으로 표시.
