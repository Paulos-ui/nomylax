# Nomylax — Submission Evidence Map

Use this document to point judges to verifiable evidence. It deliberately does not predict or claim a judging score.

## Innovation / uniqueness
**Claim:** Nomylax is a financial control plane between autonomous-agent intent and financial execution, rather than a trading strategy generator.

**Evidence:** `src/lib/policy-engine.ts`, `src/lib/risk-engine.ts`, `docs/ARCHITECTURE.md`, `README.md`.

## Technical feasibility
**Evidence:** server-side decision API, agent registry/routes, SIWE-style authentication, deterministic policy engine, risk engine, execution pipeline, repository abstraction, Shadow Mode and automated tests.

Key paths: `src/app/api/`, `src/server/`, `src/lib/policy-engine.ts`, `tests/`.

## Security
**Boundary:** LLM output is explanation-only and cannot authorize transactions. The Groq-backed Control Copilot is isolated behind `/api/copilot`; deterministic code remains authoritative.

**Evidence:** `docs/SECURITY.md`, `docs/THREAT_MODEL.md`, `src/server/security/`, `src/app/api/copilot/route.ts`, `tests/api-security.test.ts`.

## Base integration
**Evidence:** environment-selected Base/Base Sepolia configuration, chain-ID checks, RPC execution pipeline and post-confirmation verification design in `src/server/execution/` and `docs/BASE_INTEGRATION.md`.

**Limitation:** do not claim a verified real transaction until one has actually been executed and recorded.

## Risk management
**Evidence:** weighted risk engine, policy checks, Safe Mode, failure/velocity controls, risk UI and risk-model documentation.

## Auditability
**Evidence:** audit API and UI, decision records, constitution versioning/hash design and transaction lifecycle documentation.

## Product execution
**Evidence:** application routes for overview, treasury, agents, transactions, risk, policies, monitoring, audit, settings and Control Copilot.

## Market / strategy
Nomylax's initial wedge is teams and developers giving autonomous agents bounded financial authority. Expansion paths include agent-framework integrations, protocol adapters, richer policy management, monitoring and enterprise controls. This is a product strategy, not a claim of current customers or partnerships.

## Business model
Planned packaging can include free/test usage, developer/API tiers, advanced policy/monitoring tiers and team/enterprise controls. No revenue, customers or pricing should be represented as existing unless independently true and added by the builder.

## Completeness fields
- Token symbol: **not declared**. Do not invent one.
- Revenue share: **not declared**. Do not invent a percentage.
- Funding target: **not declared**. Add only the builder's real target if one exists.
- Advisors/partners: **none should be inferred from this repository**.
- Independent audit: **not performed / not evidenced**.
- Team biography: requires factual builder-provided information.

## Public evidence
- Repository: https://github.com/paulos-ui/Nomylax
- Product site: https://nomylax.vercel.app
- Project X: https://x.com/Nomylax
