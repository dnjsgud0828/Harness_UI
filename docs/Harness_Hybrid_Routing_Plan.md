---
title: 하이브리드 라우팅 하네스 계획 (Triage + 도메인 팩 확장형)
project: AXL SI LLMOps
author: AXL-Tech1
created: 2026-06-22
base: Harness FI(금융) + Harness B 원칙
status: plan
tags: [harness, triage, routing, hybrid, finance, insurance, actuarial, extensible]
---

# 하이브리드 라우팅 하네스 계획

> [!info] 목표
> 단순 작업은 **경량 레인(작성+리뷰 CI/CD)** 으로, 도메인 전문 작업은 **풀 하네스**로 자동 분기.
> 분기는 **결정적 triage(하한) + LLM 판단(회색지대)** 하이브리드.
> 금융을 먼저 완성하되, **보험·계리는 "도메인 팩"만 추가하면 붙도록** 확장형으로 설계.

---

## 1. 핵심 아키텍처 — 코어 / 도메인 팩 / 라우터 3분리

확장성의 열쇠는 **도메인 무관 공통부와 도메인 전문부를 분리**하는 것이다.

```
                    ┌──────────────────────────────┐
   작업 요청 ──────▶│  Triage 라우터 (결정적+LLM)   │
                    └──────────────┬───────────────┘
            ┌──────────────────────┼──────────────────────┐
            ▼ 경량(A)              ▼ 금융(B)               ▼ 보험·계리(B) [추후]
    ┌───────────────┐     ┌───────────────────┐   ┌───────────────────────┐
    │ 공통 코어      │     │ 공통 코어          │   │ 공통 코어              │
    │ writer+review │     │  + 금융 팩         │   │  + 보험 팩 + 계리 팩   │
    └───────────────┘     └───────────────────┘   └───────────────────────┘
```

### 1-1. 공통 코어 (도메인 무관 — 모든 레인이 재사용)

| 구분 | 항목 | 역할 |
|---|---|---|
| 에이전트 | `code-writer` | 코드 작성 (도메인 룰은 스킬로 주입받음) |
| 에이전트 | `code-reviewer` | 정적 리뷰 (가독·설계·컨벤션·성능) |
| 에이전트 | `security-auditor` | 보안 (CCE·OWASP) |
| 에이전트 | `qa-verifier` | 동적 검증·계산 정합성 |
| 스킬 | `deterministic-gate` | lint·type·SAST·SBOM·라이선스 |
| 스킬 | `dynamic-verification` | 테스트 피라미드 + golden |
| 스킬 | `audit-trail` | 감사 추적 |
| 스킬 | `triage-routing` | 라우팅 (아래 4장) |

> 현재 `fin-backend`/`fin-code-reviewer` 등은 이 코어로 **일반화(리네이밍)** 한다.
> 금융 색깔은 에이전트에 박지 않고 **도메인 팩 스킬로 주입**한다 → 보험도 같은 코어를 그대로 쓴다.

### 1-2. 도메인 팩 (도메인별로 추가)

| 팩 | 전용 에이전트 | 전용 스킬 | 상태 |
|---|---|---|---|
| **금융 팩** | `fin-regulatory` | `finance-domain-rules`, `finance-security-audit(refs)` | ✅ 구축 |
| **보험 팩** | `ins-regulatory` | `insurance-domain-rules` (보험업법·금소법·표준약관) | ⏳ 추후 |
| **계리 팩** | `actuarial-engine`, `actuarial-validator` | `actuarial-calc` (IFRS17·K-ICS·산출식) | ⏳ 추후 |

> **확장 = 팩 추가 + triage 규칙파일 1개 추가.** 코어·라우터 로직은 안 건드린다.

---

## 2. 레인(Lane) 정의

| 레인 | 구성 | 게이트 | 용도 |
|---|---|---|---|
| **A (경량 CI/CD)** | code-writer → code-reviewer → deterministic-gate | 결정적 게이트만 | 단순 함수·컴포넌트·CRUD·리팩터링 |
| **B-금융 (풀)** | 코어 전체 + 금융 팩 + Human Gate | 다층 | 정산·이자·한도·AML·인증 |
| **B-보험 (풀)** [추후] | 코어 전체 + 보험 팩 + (계리 팩) + Human Gate | 다층 | 보험료·청구·언더라이팅·준비금 |

A는 **멀티 에이전트지만 최소(2)**, B는 **전문 에이전트 풀가동(5~7)**. 둘 다 에이전트 팀이되 규모가 다르다.

---

## 3. 라우팅 = 2축 분류

triage는 **독립된 두 축**을 동시에 판정한다.

- **축1 — 위험도(Tier)**: LOW → A 후보 / HIGH → B 강제 / MED → 회색(LLM)
- **축2 — 도메인(Domain)**: generic / finance / insurance / actuarial

### 라우팅 매트릭스

| 도메인 신호 | 위험도 | → 결정 |
|---|---|---|
| 없음(generic) | LOW | **레인 A** |
| 없음 | MED | LLM 회색 판단 → A 또는 B-generic |
| finance | HIGH | **B-금융 강제** |
| finance | LOW/MED | LLM 회색 (대개 A + 금융 컨텍스트, 또는 B) |
| insurance/actuarial | HIGH | **B-보험 강제** [추후] |

---

## 4. Triage 조건 설계 (상세) — 핵심

### 4-0. 라우팅 3층 구조 (규칙 → 임베딩 → LLM)

문자열 규칙만으로는 프로젝트마다 다른 명명(`payment` vs `pay` vs `billing` vs `결제`)을 못 잡는다.
그래서 **결정적 규칙(L1) → 시맨틱 라우터(L2) → LLM(L3)** 3층으로 쌓아 누락을 막는다.

```
요청
 │
[L1 결정적 규칙]   paths/keywords 정확 매칭 → 강한 신호 (per-project config, 4-2)
 │  (안 걸림)
[L2 시맨틱 라우터] 임베딩 유사도 → 명명 변형·신규 표현을 '의미'로 포착 (4-6)
 │  (둘 다 애매)
[L3 LLM 판단]      최종 회색지대 (4-7)
```

> [!danger] 금융 비대칭 규칙 (절대 준수)
> - **"B 강제(위험 확정)"는 오직 L1 규칙이 담당** — 결정적·감사 가능해야 하므로.
> - **L2 임베딩은 recall 보강 전용** — L1이 놓친 의심 케이스를 **B/도메인으로 끌어올리는 방향으로만**.
>   임베딩으로 위험을 낮추는(B→A) 판정은 **금지**(준결정적이라 감사·재현 곤란).
> - 결과: 위험한 결정은 100% 결정적, 임베딩·LLM은 "놓침 방지"에만 기여.

### 4-1. 결정적이려면 "규칙을 데이터로" 둔다

triage 로직을 코드에 하드코딩하지 않고 **도메인별 규칙 파일(JSON)** 로 분리한다.
→ 보험 추가 = `insurance.rules.json` 한 개 드롭. 스크립트 수정 0.

```
triage-routing/
├── SKILL.md
├── scripts/
│   ├── triage.py            # L1 규칙 점수 + L2 임베딩 유사도 통합 (도메인 무관)
│   └── embed_client.py      # on-prem 임베딩 서빙(vLLM) 호출 래퍼
├── rules/                   # L1 결정적 규칙 (도메인별)
│   ├── finance.rules.json    # ✅
│   ├── insurance.rules.json  # ⏳ 추후 추가
│   └── actuarial.rules.json  # ⏳ 추후 추가
├── routes/                  # L2 시맨틱 라우터 예시 문장 (도메인별, append-only)
│   ├── finance.routes.jsonl    # ✅  "이자 계산","정산 배치","한도 체크"...
│   ├── insurance.routes.jsonl  # ⏳  "보험료 산출","청구 심사","해지환급금"...
│   └── actuarial.routes.jsonl  # ⏳  "책임준비금 평가","K-ICS 지급여력"...
└── feedback/
    └── routing_feedback.jsonl  # 확정/사람교정 라우팅 누적 → L2 지속 학습
```

> **확장 = `*.rules.json` + `*.routes.jsonl` 한 쌍 추가.** triage.py·embed_client는 안 건드린다.

### 4-2. 규칙 파일 스키마

```json
{
  "domain": "finance",
  "orchestrator": "finance-harness-orchestrator",
  "force_full": {
    "paths":    ["payment/","settlement/","aml/","auth/","account/","loan/","deposit/"],
    "keywords": ["이자","interest","한도","limit","정산","settlement","transaction",
                 "AML","자금세탁","KYC","암호화","encrypt","password","token","인증","인가"]
  },
  "domain_signal": {
    "paths":    ["finance/","bank/"],
    "keywords": ["여수신","예금","대출","송금","환율"]
  },
  "weights": { "path": 3, "keyword": 1 }
}
```

- `force_full`: 매칭되면 **위험도 무조건 HIGH** → 해당 도메인 B 강제 (LLM이 못 내림)
- `domain_signal`: 도메인 판정용 약한 신호 (위험도는 안 올림)
- 도메인 결정: 도메인별 `Σ(path매칭×3 + keyword매칭×1)` 최댓값. 동점이면 path 우선.

### 4-3. 도메인 무관 위험 신호 (코어 규칙 — 규칙파일과 별개)

규칙파일과 무관하게 **항상 HIGH로 올리는** 공통 신호:

| 신호 | 판정 |
|---|---|
| DB 스키마 변경 (마이그레이션·DDL·특히 PII 컬럼) | HIGH |
| 의존성 추가/변경 | HIGH |
| 외부 통신 변경 (API 엔드포인트·큐·파일전송) | HIGH |
| IaC destroy/replace | HIGH |
| PR 라벨 `security`/`hotfix` | HIGH |

### 4-4. 위험도(Tier) 결정 로직

```
1. force_full(도메인별) OR 코어 위험신호(4-3) 매칭  → HIGH  (즉시 확정, 종료)
2. 변경 규모 작음(파일≤N, 라인≤M) AND 위 신호 0     → LOW
3. 그 외                                            → MEDIUM (회색)
```
임계값 N·M은 설정값. 초기엔 **보수적으로** (작게 잡아 B로 더 보냄), 6개월마다 조정.

### 4-5. triage 출력 (결정적 산출물 → 감사 대상)

```json
{
  "domain": "finance",
  "tier": "high",
  "decision": "B-finance",        // 또는 "A", "gray"
  "decided_by": "L1",             // L1(규칙) | L2(임베딩) | L3(LLM)
  "matched": {
    "force_full.paths": ["payment/"],
    "core_risk": ["schema_change"]
  },
  "l2_similarity": {"finance": 0.83, "insurance": 0.21},  // L2 참고용(있으면)
  "force_reason": "payment/ 경로 + 스키마 변경",
  "needs_llm": false              // gray일 때만 true → 오케스트레이터가 LLM 판단
}
```

### 4-6. L2 시맨틱 라우터 (임베딩 유사도) — 명명 변형·신규 표현 포착

L1 규칙이 빗나갈 때(폴더명이 비표준이거나 요청 문구가 키워드와 안 맞을 때) **의미로** 잡는 층.
검증된 패턴(semantic-router / vLLM Semantic Router)을 따른다.

**동작:**
1. 각 도메인 `routes/*.routes.jsonl`에 대표 예시 문장 수십 개를 둔다(경로당 라벨 예시).
2. 요청(+변경 코드 요약)을 **on-prem 임베딩**으로 벡터화 → 도메인별 예시 임베딩과 **코사인 유사도**.
3. 최고 유사 도메인이 **임계값 θ 이상**이면 그 도메인으로 라우팅(아래면 무시).

**점수 → 위험도 반영(비대칭):**
| 상황 | 처리 |
|---|---|
| L1 미매칭 + L2 유사도 ≥ θ_high (예: 정산·이자 의미와 매우 가까움) | **B 후보로 승격**(recall 보강) |
| L1 미매칭 + θ_low ≤ 유사도 < θ_high | gray → L3로 |
| L2 < θ_low | 도메인 신호 없음 |

> L2는 **올리기만** 한다. L1이 HIGH로 확정한 건을 L2가 못 내린다(4-0 비대칭 규칙).

**지속 학습(continuous) — 사용자님 요청 핵심:**
1. 매 실행 후 최종 라우팅(특히 **사람이 교정한** 결과)을 `feedback/routing_feedback.jsonl`에 적재.
2. 주기적으로 해당 예시를 도메인 `routes/*.routes.jsonl`에 **append**(재학습 불필요, kNN/centroid 자동 개선).
3. **드리프트 모니터**: 어느 도메인에도 θ_low 미만으로만 붙는 요청이 군집화되면
   "신규 패턴/신규 도메인 후보"로 사람에게 알림 → 보험·계리 같은 신규 도메인 등장도 자연 포착.

**폐쇄망 전제:** 임베딩 모델은 사내 vLLM으로 on-prem 서빙(`embed_client.py`). 예시 수십~수백 개라
벡터 저장은 초경량(SQLite/인메모리로 충분, 대형 벡터DB 불필요). 외부 임베딩 API 금지.

### 4-7. LLM은 "회색지대"에서만 개입

- `decision != "gray"` → triage(L1/L2) 결과 그대로 따른다 (LLM 재판단 금지 = 결정성 보장).
- `decision == "gray"`(tier=MED, 또는 L2가 θ_low~θ_high) → 오케스트레이터가 의미 판단으로 A/B·도메인 최종 결정.
  - 판단 후 **근거를 audit-trail에 기록** (재현 위해 입력·결론 보존).
- 안전 편향: 회색에서 애매하면 **B 쪽으로** (도메인 누락이 토큰낭비보다 치명적).

### 4-8. 승격(escalation)

A로 시작했더라도 진행 중 force_full 신호(금전·인증·스키마)가 드러나면 즉시 B로 승격하고 audit-trail에 기록.

---

## 5. 구현 순서

### Phase 1 — 코어 일반화 + A 레인 (금융 무관)
- [ ] `fin-backend`→`code-writer`, `fin-code-reviewer`→`code-reviewer`, `fin-security-auditor`→`security-auditor`, `fin-qa-verifier`→`qa-verifier` 리네이밍·일반화 (금융 색깔 제거, 도메인 룰은 스킬 주입)
- [ ] 스킬 일반화: `finance-deterministic-gate`→`deterministic-gate` 등 (도메인 무관부)
- [ ] **A 레인 정식화**: writer + reviewer + 결정적 게이트만 도는 경량 팀

### Phase 2 — Triage 라우터 (L1 결정적 하한)
- [ ] `triage-routing` 스킬 + `scripts/triage.py` + `rules/finance.rules.json`
- [ ] 코어 위험신호(4-3) + 도메인 규칙(4-2) → tier·domain·decision 산출
- [ ] 오케스트레이터 P-1을 "triage 결과 소비 + 회색만 LLM" 으로 교체

### Phase 2.5 — L2 시맨틱 라우터 (임베딩)
- [ ] `embed_client.py` (사내 vLLM 임베딩 서빙 연동) + `routes/finance.routes.jsonl`(예시 문장)
- [ ] triage.py에 L2 통합: L1 미매칭 시 임베딩 유사도로 도메인/B 후보 보강(비대칭: 올리기만)
- [ ] 임계값 θ_low/θ_high 튜닝 + `feedback/routing_feedback.jsonl` 피드백 루프 + 드리프트 모니터

### Phase 3 — 금융 팩 재정렬
- [ ] `fin-regulatory` + `finance-domain-rules`(refs) 를 "금융 팩"으로 분리 유지
- [ ] B-금융 = 코어 + 금융 팩 + Human Gate 로 오케스트레이터 정리

### Phase 4 — 검증
- [ ] triage 단위 테스트: 경로/키워드/규모별 입력 → 기대 decision (결정성 확인)
- [ ] should-trigger / should-NOT(near-miss) + A/B 오분류율 측정
- [ ] CLAUDE.md 갱신 + 변경 이력

### Phase 5 — 보험·계리 확장 (추후, 기존 확장 모드)
- [ ] 보험 팩 추가: `ins-regulatory` + `insurance-domain-rules`
- [ ] 계리 팩 추가: `actuarial-engine`/`actuarial-validator` + `actuarial-calc`
- [ ] **L1: `rules/insurance.rules.json`, `rules/actuarial.rules.json` 드롭** ← triage 자동 인식
- [ ] **L2: `routes/insurance.routes.jsonl`, `routes/actuarial.routes.jsonl` 드롭** (예시 문장 수십 개) ← 시맨틱 라우터 자동 인식
- [ ] 오케스트레이터 B 분기에 보험 경로 추가, Human Gate 보험 트리거 추가
- [ ] (상세 명세: `Harness_Insurance_Actuarial_Expansion.md`)

> [!tip] 확장 시 안 바뀌는 것
> 공통 코어, triage.py/embed_client, A 레인, 라우팅 매트릭스, 3층 구조.
> **새 도메인 = 팩 + `*.rules.json` + `*.routes.jsonl` 3종 세트만 추가.** 코드 수정 0.

---

## 6. 결정성·감사 요약

| 단계 | 메커니즘 | 결정성 | 방향 | 감사 |
|---|---|---|---|---|
| L1 force_full / 코어 위험신호 | 규칙(스크립트) | ✅ 완전 | B 강제 가능 | matched 규칙 기록 |
| L1 도메인 판정 | 점수 규칙 | ✅ 완전 | — | 점수·신호 기록 |
| L2 시맨틱 라우터 | 임베딩 유사도 | ⚠️ 준결정(θ·모델 고정 시 재현↑) | **올리기만**(recall 보강) | 유사도·임계값 기록 |
| L3 회색지대 A/B | LLM 판단 | ⚠️ 보조 | 회색만 | 입력·결론 기록 |

→ **위험한 결정(B 강제)은 100% L1 결정적.** L2 임베딩·L3 LLM은 "놓침 방지"로만 위험을 **올릴 뿐** 내리지 못한다.
원본 Harness B 원칙("결정적 도구 우선, LLM 보조") 충실 + 명명 변형·신규 표현까지 흡수.

---

## 7. 변경 이력
| 일자 | 작성자 | 내용 |
|---|---|---|
| 2026-06-22 | AXL-Tech1 | 하이브리드 라우팅 + 도메인 팩 확장형 계획 초안 |
| 2026-06-22 | AXL-Tech1 | L2 시맨틱 라우터(임베딩 유사도) 층 + 지속학습·드리프트 모니터 반영, 보험·계리 routes 확장 포함 |
