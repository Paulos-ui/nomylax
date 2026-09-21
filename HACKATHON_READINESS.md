# Nomylax — Orion Hackathon Readiness

This file is an evidence checklist, not a score claim. Items are marked only when the repository itself supports them.

## Product and demo
- [x] Product positioning is explicit: financial control plane for autonomous AI agents.
- [x] Dashboard routes cover treasury, agents, transactions, risk, policies, monitoring and audit.
- [x] Shadow Mode provides non-settling policy evaluation.
- [x] Safe Mode and deterministic policy enforcement are implemented in application logic.
- [x] Control Copilot adds Groq-backed explanation without granting the LLM authorization authority.
- [ ] Production URL manually smoke-tested after this release.

## Security and technical evidence
- [x] Wallet signature authentication routes exist.
- [x] Policy and risk engines are separated from AI interpretation.
- [x] SSRF guard, route validation and rate limiting exist.
- [x] Security, threat model, risk model, Base integration and incident-response docs exist.
- [x] Tests cover authentication, policy, money handling, agent routes and API security.
- [ ] Independent security audit — not performed; do not claim one.

## Base and DeFi
- [x] Base/Base Sepolia network configuration is environment driven.
- [x] Execution pipeline and chain validation are documented.
- [x] Protocol-control architecture is documented as an extensible control layer.
- [ ] Live protocol adapters are not claimed unless implemented and verified.
- [ ] A real Base transaction must be executed and verified before claiming live transaction evidence.

## Submission fields
- [x] Features are documented in README and product UI.
- [x] Product strategy is documented.
- [x] Business model is documented as planned packaging, not existing revenue.
- [x] Token status is explicit: **not declared / no token should be inferred from this repository**.
- [x] Revenue share status is explicit: **not declared**.
- [x] Funding target status is explicit: **not declared**.
- [ ] Founder biography/credentials require real builder-provided information.
- [x] GitHub is a public evidence source.
- [x] X can be linked where the official project account is confirmed.
- [ ] Discord/community hub requires a real link; do not fabricate one.

## Release gate
Run all of these before submission:

```bash
npm ci
npm run typecheck
npm run lint
npm run test
npm run build
```

Then manually verify wallet sign-in, onboarding, policy editing, Shadow Mode, blocked/review/execute outcomes, audit records, Control Copilot, mobile layout and production environment configuration.
