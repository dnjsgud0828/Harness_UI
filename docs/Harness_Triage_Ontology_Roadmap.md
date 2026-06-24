---
title: Triage → 온톨로지 진화 로드맵 (금융·보험·계리)
project: AXL SI LLMOps
author: AXL-Tech1
created: 2026-06-23
base: Harness_Hybrid_Routing_Plan.md / Harness_Insurance_Actuarial_Expansion.md / Harness FI
status: roadmap
tags: [harness, triage, ontology, neuro-symbolic, finance, insurance, actuarial, roadmap]
---

# Triage → 온톨로지 진화 로드맵

> [!info] 두 지평(horizon)
> - **단기**: 앞서 설계한 **3단계 triage(L1 규칙 → L2 임베딩 → L3 LLM)** 를 먼저 구현·운영.
> - **장기**: triage 자산을 씨앗 삼아 **온톨로지(뉴로-심볼릭)** 로 고도화하고 **금융·보험·계리** 도메인으로 확장.

> [!important] 진화 1원칙 — "버리지 않고 격상한다"
> 각 단계의 산출물은 다음 단계의 **입력**이 된다. triage의 rules/routes/규제refs는 폐기되지 않고
> 온톨로지의 **개념·관계 시드**로 재사용된다. 빅뱅 재작성 금지, 점진적 진화.

---

## Stage 0 — 현재 상태 (완료/계획)

| 항목 | 상태 |
|---|---|
| 금융 하네스(Harness FI) 골격: 에이전트 6 + 스킬 6 | ✅ 구축 |
| 3단계 triage 설계 (`Harness_Hybrid_Routing_Plan.md`) | ✅ 계획 |
| 보험·계리 확장 명세 (`Harness_Insurance_Actuarial_Expansion.md`) | ✅ 계획 |
| 코어/도메인팩 분리 아키텍처 | ✅ 계획 |

---

## Stage 1 — 3단계 Triage 구현 (금융 우선) 〔단기·최우선〕

> 목표: 규칙 기반 결정성 + 임베딩 보강 + LLM 회색지대. **온톨로지 없이 운영 가능한 완결된 시스템.**

상세 설계는 `Harness_Hybrid_Routing_Plan.md` §4 참조. 구현 산출물:

- [ ] **코어 일반화 + A 레인**: `code-writer`/`code-reviewer` 도메인 무관화, 경량 레인 정식화
- [ ] **L1 결정적 규칙**: `triage-routing` 스킬 + `triage.py` + `rules/finance.rules.json`
- [ ] **L2 시맨틱 라우터**: `embed_client.py`(사내 vLLM, 미설정 시 skip-safe) + `routes/finance.routes.jsonl` + 피드백 루프 + 드리프트 모니터
- [ ] **L3 LLM 회색지대**: 오케스트레이터 P-1 연동 (비대칭 규칙: 위험은 올리기만)
- [ ] **금융 팩 재정렬**: `fin-regulatory` + `finance-domain-rules` 묶음
- [ ] **테스트**: triage 결정성 단위테스트 + A/B 오분류율 측정 + 감사 기록

**Exit criteria:** 금융 작업이 경량/풀로 결정적·재현 가능하게 분기되고, 모든 분기 근거가 audit-trail에 남는다.

---

## Stage 2 — 보험·계리 도메인 팩 확장 〔중기〕

> 목표: 같은 triage·코어 위에 도메인을 **3종 세트 추가**만으로 확장. (코드 수정 0)

상세는 `Harness_Insurance_Actuarial_Expansion.md`. 도메인당 추가물:

| 레이어 | 보험 | 계리 |
|---|---|---|
| 팩(에이전트·스킬) | `ins-regulatory` + `insurance-domain-rules` | `actuarial-engine`/`actuarial-validator` + `actuarial-calc` |
| L1 규칙 | `rules/insurance.rules.json` | `rules/actuarial.rules.json` |
| L2 예시 | `routes/insurance.routes.jsonl` | `routes/actuarial.routes.jsonl` |

- [ ] 오케스트레이터 B 분기에 보험 경로 + Human Gate 보험 트리거 추가
- [ ] 드리프트 모니터가 신규 도메인 등장(보험·계리 패턴)을 자연 포착하는지 확인

**Exit criteria:** 금융/보험/계리 3도메인이 한 triage로 정확히 라우팅되고, 확장 시 triage.py를 안 건드린다.

---

## Stage 3 — 경량 온톨로지 (매핑 테이블) 〔온톨로지 진입점〕

> 목표: triage의 평면 규칙을 **개념 중심 매핑 테이블**로 구조화. 풀 그래프 없이 "유도 경로 감사" 효과의 80%.

### 3-1. 경량 온톨로지 스키마 (개념 → 규제 → 게이트 → 리뷰어)

```
개념        | 도메인 | 상위개념   | 규제                | 게이트       | 리뷰어
정산        | 금융   | 자금이동   | 특금법,전자금융감독 | money-flow  | fin-regulatory, security
이자        | 금융   | 금전계산   | 전자금융감독규정    | money-flow  | fin-regulatory, qa
한도        | 금융   | 여신통제   | 신용정보법          | money-flow  | fin-regulatory
보험료      | 계리   | 계리계산   | IFRS17,K-ICS        | actuarial   | actuarial-validator
책임준비금  | 계리   | 계리계산   | IFRS17,K-ICS        | actuarial   | actuarial-validator
청구심사    | 보험   | 보험금지급 | 보험업법,금소법     | claim       | ins-regulatory
```

### 3-2. 씨앗은 이미 존재 — Stage 1·2 자산 재사용

| triage 자산 | → 온톨로지 요소 |
|---|---|
| `rules/*.json` 키워드 | 개념 노드 후보 |
| `routes/*.jsonl` 예시 | 개념 동의어·표현 변형 |
| 규제 refs (`aml.md`, `efinance.md`, `ifrs17.md`...) | 개념→규제 매핑 |
| `*-domain-rules` 비즈니스 룰 | 개념→게이트 매핑 |

### 3-3. LLM 역할 전환

- 기존: LLM이 "A/B?"를 통째 판단(비결정).
- 전환: **LLM은 "요청에 등장한 개념"만 추출**(제약된 검증가능 작업) → 매핑 테이블이 **도메인·위험·규제·게이트·리뷰어를 결정적으로 유도**.
- 비결정 영역이 "개념 매핑" 한 점으로 축소. L2 임베딩은 개념 후보 검색을 보조.

### 3-4. SSOT 효과

매핑 테이블 하나가 **라우팅 + 규제 ref 로딩 + 리뷰어 소집 + Human Gate 판정**을 동시 구동.
지금 흩어진 rules/팩/refs 매핑이 단일 진실원천으로 수렴.

- [ ] 경량 온톨로지 스토어(`ontology/concepts.csv` 수준) + 개념 추출 프롬프트
- [ ] triage.py에 "개념 추출 → 매핑 유도" 경로 추가(기존 L1/L2와 공존, 점진 전환)
- [ ] 유도 경로를 audit-trail에 기록(감사 가능한 "왜")

**Exit criteria:** "정산 작업 → 자금이동 → 특금법 → money-flow 게이트" 식 유도 경로가 감사 로그에 남는다.

**ROI 게이트:** Stage 3 이후 효과(설명가능성·일관성)가 유지비용을 정당화할 때만 Stage 4로.

---

## Stage 4 — 본격 뉴로-심볼릭 온톨로지 〔장기·ROI 증명 후〕

> 목표: 매핑 테이블을 **관계 그래프 + 추론**으로 확장. 미등록 용어를 상위개념 포섭으로 정확히 유도.

### 4-1. 지식 소스 (별도 질의 필요)

| 소스 | 비고 |
|---|---|
| **업계 표준 온톨로지** | 금융 **FIBO**, 보험 **ACORD**, 회계 **XBRL/IFRS 택소노미** — 밑바닥부터 안 짬 |
| **사내 표준용어사전** | 표준단어·표준도메인 사전 → 개념 노드 시드 (보유 여부 확인 필요) |
| 규제 문서 | Stage 1~3에서 쌓인 refs 재사용 |
| ERD·데이터 카탈로그·OpenAPI | 개념·속성·관계 추출 |
| 코드·PR·티켓 이력 | 실사용 용어·위험 패턴 |

### 4-2. 구축 방식 — 하이브리드

```
FIBO/ACORD 표준 + 사내 표준용어사전     ← 골격(재사용)
        ↓
규제·ERD·코드에서 LLM 개념·관계 추출    ← 자동 시드 (사내 vLLM)
        ↓
계리·컴플라이언스 전문가 검수·확정       ← 정확성 보증(필수)
```

### 4-3. 폐쇄망·컴플라이언스

- 온톨로지는 **스키마/개념 수준 → 실고객 PII 미포함** (데이터 격리 자연 부합)
- 추출 LLM·임베딩 모두 사내 vLLM, 외부 전송 금지
- 도메인별 서브그래프(금융/보험/계리)로 분리 관리 → 확장은 서브그래프 추가

- [ ] FIBO/ACORD 베이스 도입 + 사내 용어 매핑
- [ ] LLM 개념·관계 추출 파이프라인 + 전문가 검수 워크플로우
- [ ] 추론 엔진(상위개념 포섭) → 미등록 용어 자동 유도
- [ ] 보험·계리 서브그래프 확장

**Exit criteria:** 규칙·예시에 없던 신규 용어("후불결제" 등)도 그래프 포섭으로 도메인·위험·게이트가 유도된다.

---

## 진화 매핑 — 무엇이 무엇으로 격상되나

| Stage 1~2 (triage) | → | Stage 3 (경량 온톨로지) | → | Stage 4 (그래프) |
|---|---|---|---|---|
| rules 키워드 | → | 개념 노드 | → | is-a 계층 |
| routes 예시 | → | 개념 동의어 | → | 임베딩 보조 매핑 |
| 규제 refs | → | 개념→규제 행 | → | regulated-by 관계 |
| 도메인 룰 | → | 개념→게이트 행 | → | requires-gate 관계 |
| 도메인 팩 | → | 개념→리뷰어 행 | → | 서브그래프 |

> 한 줄: **triage는 온톨로지의 1차원 투영(flat projection)**. 같은 지식을 점점 더 구조화할 뿐, 다시 짜지 않는다.

---

## 리스크·전제

| 리스크 | 완화 |
|---|---|
| 온톨로지 과설계(빅뱅) | Stage 3 경량 테이블에서 멈추고 ROI 게이트로 Stage 4 판단 |
| NL→개념 매핑 실패 | L1 규칙 하한 유지(결정성 보장), 임베딩 보조 |
| 전문가 검수 병목 | LLM 초안 추출 + 전문가는 검수만 |
| 표준용어사전 부재 | 있으면 시드 활용, 없으면 FIBO/ACORD + 코드/규제 마이닝으로 대체 |

---

## 결정성 일관성 (전 Stage 공통)

위험한 결정(B 강제·Human Gate)은 **항상 결정적 경로**(L1 규칙 / 온톨로지 유도)로 내린다.
임베딩·LLM은 "놓침 방지(recall)"로 위험을 **올리기만** 한다 — 전 단계에서 불변.
원본 Harness B 원칙("결정적 도구 우선, LLM 보조") 유지.

---

## 다음 행동

1. **지금**: Stage 1 구현 시작 (코어 일반화 → triage L1 → L2 → 오케스트레이터 연동)
2. 사내 **표준용어사전 보유 여부** 확인 → Stage 3/4 시드 전략 확정
3. Stage 2(보험·계리)는 Stage 1 안정화 후 팩 추가

---

## 변경 이력
| 일자 | 작성자 | 내용 |
|---|---|---|
| 2026-06-23 | AXL-Tech1 | triage→온톨로지 4단계 진화 로드맵 초안 (금융·보험·계리) |
