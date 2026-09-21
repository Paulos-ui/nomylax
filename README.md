# Nomylax

**Financial control plane for autonomous AI agents. Base native.**

> Give AI agents money. Not unlimited power.

Nomylax gives autonomous AI agents controlled financial authority on Base
through budgets, policies, risk controls, treasury monitoring, execution rules,
and verifiable audit trails.

```
Human treasury  ->  Nomylax  ->  AI agent
   owns capital     enforces     does work
```

Setup commands: **[START_HERE.md](./START_HERE.md)**
Engineering status: **[FINAL_HANDOFF.md](./FINAL_HANDOFF.md)**

---

## Problem

Agent frameworks solved capability and skipped authority. An agent holding a
private key inherits the full authority of its owner. One malformed loop, one
prompt injection, one hallucinated recipient, and the loss is the size of the
treasury rather than the size of the mistake.

## Solution

Nomylax evaluates every economic intent before it settles. The agent proposes.
The server decides, using limits the owner wrote and stored. No language model
participates in enforcement, so no prompt can raise a ceiling.

## How autonomy works

```
OBSERVE -> UNDERSTAND -> ASSESS RISK -> CHECK POLICY
        -> SIMULATE -> EXECUTE -> VERIFY -> RECORD
```

The AI controls whether to act, what to buy, from whom, at what price. It cannot
override transaction and budget ceilings, the recipient allowlist, the reserve
floor, the risk threshold, Safe Mode, or whether anything settles.

## Financial Constitution

Per agent: maximum transaction, daily and monthly budgets, allowed assets,
approved recipients, unknown recipient behaviour, emergency reserve, failure
threshold, velocity threshold, risk threshold, permission expiry.

Editing appends a new version with a SHA-256 hash over the canonical policy.
Nothing is replaced in place, so every decision traces to the exact rules in
force when it was made.

Checks run in fixed order. A hard failure blocks. A soft failure is held for
owner review.

```
1 allowed asset      5 recipient allowlist   9  spend velocity
2 transaction limit  6 emergency reserve     10 risk threshold
3 daily budget       7 agent state           11 simulation
4 monthly budget     8 failure threshold
```

## Risk engine

Seven weighted signals produce NRS, a value from 0 to 100.

| Band | Range |  | Factor | Weight |
|---|---|---|---|---|
| LOW | 0-29 | | Unknown recipient | 0.22 |
| MODERATE | 30-54 | | Policy deviation | 0.19 |
| HIGH | 55-74 | | Amount anomaly | 0.14 |
| CRITICAL | 75-100 | | Spend velocity | 0.14 |
| | | | Contract risk | 0.12 |
| | | | Liquidity risk | 0.10 |
| | | | Operational failures | 0.09 |

A severity floor prevents benign signals from diluting a dangerous one: one
extreme signal floors the score at HIGH, two or more at CRITICAL. Every score
reports its components and any escalation applied.

## Base integration

```
preflight -> simulated -> submitted -> confirmed -> verified
```

Simulation runs before signing and a failure stops the request. The RPC chain ID
is checked against the configured chain. After confirmation the recipient
balance is compared against the approved amount; a mismatch is reported as
unverified, never as success. Amounts are `bigint` base units throughout.

Network is environment driven:

```
NEXT_PUBLIC_BASE_NETWORK=base-sepolia   # development
NEXT_PUBLIC_BASE_NETWORK=base           # production
```

A testnet deployment shows a standing banner. No code path can produce a
transaction hash that did not come from the network.

## Shadow Mode

The agent runs real logic against real policy with simulated settlement.
Budgets deplete on a copy, so limits behave exactly as in production while no
capital moves. The report gives requested value, approvals, blocks, violations,
critical events, projected burn, and the point at which the agent would have
entered Safe Mode.

## Safe Mode

```
AUTONOMOUS -> WATCH -> SAFE MODE
```

Downward transitions are automatic on a critical risk event, the failure
threshold, or a velocity breach. The upward transition is an owner action only.
An agent can enter Safe Mode and can never leave it.

## Security model

Full detail in [docs/SECURITY.md](./docs/SECURITY.md).

- The owner keeps custody. No seed phrase is requested, no custody contract is
  deployed, no unrestricted key reaches the browser.
- A connected address is not proof of ownership. Sign in requires a signature
  over a single use server challenge.
- The server is authoritative. Policy sent by a caller is ignored.
- Agent endpoints load from storage and pass an SSRF guard. A URL in a request
  body is never used.
- Everything fails closed.

## Development

```bash
npm ci
cp .env.example .env.local     # set SESSION_SECRET
npm run typecheck
npm run lint
npm run test
npm run build
npm run dev
```

## Testing

82 tests across 5 files.

| File | Covers |
|---|---|
| `tests/policy.test.ts` | Every limit, Safe Mode, Shadow Mode, versioning, determinism |
| `tests/api-security.test.ts` | Auth, ownership, client policy override, SSRF, validation |
| `tests/url-guard.test.ts` | Private ranges, metadata endpoints, IPv4-mapped IPv6 |
| `tests/auth.test.ts` | Signatures, tampering, expiry, replay |
| `tests/money.test.ts` | BigInt parsing, precision, float avoidance |

## API

| Route | Purpose |
|---|---|
| `POST /api/auth/nonce` | Issue a signing challenge |
| `POST /api/auth/verify` | Verify signature, issue session |
| `POST /api/auth/logout` | Clear session |
| `POST /api/decisions` | Evaluate an intent, execute if approved |
| `POST /api/shadow` | Simulate, never settles |
| `POST /api/agents/intents` | Fetch intents from a registered agent |

Full reference: [docs/API.md](./docs/API.md).

## Documentation

[Architecture](./docs/ARCHITECTURE.md) ·
[Security](./docs/SECURITY.md) ·
[Threat model](./docs/THREAT_MODEL.md) ·
[Risk model](./docs/RISK_MODEL.md) ·
[Economics](./docs/ECONOMICS.md) ·
[Agent strategy](./docs/AGENT_STRATEGY.md) ·
[Incident response](./docs/INCIDENT_RESPONSE.md) ·
[API](./docs/API.md) ·
[Base integration](./docs/BASE_INTEGRATION.md) ·
[Product strategy](./docs/PRODUCT_STRATEGY.md) ·
[Business model](./docs/BUSINESS_MODEL.md)

Public routes: `/trust` and `/docs`.

## Control Copilot

Nomylax includes an optional Groq-backed **Control Copilot** at `/app/copilot`. It explains policy outcomes, risk signals, Safe Mode, Shadow Mode and the transaction lifecycle. It is deliberately outside the authorization boundary: its output can never approve, sign or execute a transaction. Set `GROQ_API_KEY` server-side to enable it.

## Product strategy and business model

The initial wedge is bounded financial authority for autonomous agents: register an agent, define a Financial Constitution, gate economic intent, and retain an auditable decision trail. Expansion can add agent-framework integrations, protocol adapters, team policy administration and enterprise monitoring. See [Product strategy](./docs/PRODUCT_STRATEGY.md).

Commercial packaging is planned around free/test, developer, pro, team/enterprise and infrastructure tiers. This repository does **not** claim existing customers or revenue. Token, revenue-share percentage and funding target are **not declared** and must not be fabricated. See [Business model](./docs/BUSINESS_MODEL.md).

Submission evidence: [SUBMISSION_EVIDENCE.md](./SUBMISSION_EVIDENCE.md) · readiness checklist: [HACKATHON_READINESS.md](./HACKATHON_READINESS.md).

## Known limitations

Stated in full in [FINAL_HANDOFF.md](./FINAL_HANDOFF.md).

1. Base spend permissions are designed but not wired. The executor uses a funded
   account.
2. Postgres is not wired. `Repository` is the boundary; development storage is
   process local and production refuses to start without `DATABASE_URL`.
3. The landing page is still static HTML served by a rewrite.
4. No real Base transaction has been executed and verified yet.
5. Sessions cannot be revoked before expiry.
6. Rate limits count per instance.
7. No independent audit. The Trust Center says so.

Built for the Orion Agents Builder Hackathon.
