# Architecture

    Human treasury  ->  Nomylax  ->  AI agent
       owns capital     enforces     does work

## Components

| Layer | Location | Role |
|---|---|---|
| Policy engine | `src/lib/policy-engine.ts` | Deterministic evaluation, fixed order |
| Risk engine | `src/lib/risk-engine.ts` | NRS scoring with severity floor |
| Shadow runner | `src/lib/shadow.ts` | Simulation against real policy |
| Money | `src/lib/money.ts` | BigInt base units, no float arithmetic |
| Executor | `src/server/execution/` | Simulate, submit, confirm, verify |
| URL guard | `src/server/security/url-guard.ts` | SSRF protection |
| Auth | `src/server/auth/` | Challenge, signature, session |
| Repository | `src/server/repo/` | Storage boundary |
| Adapters | `src/lib/adapters/` | Demo and HTTP agent connectivity |

## Decision path

    intent received
      -> authenticate session
      -> load agent from storage
      -> load active constitution version
      -> load treasury
      -> parse amount into base units
      -> score risk
      -> deterministic policy checks
      -> simulate
      -> execute on Base
      -> wait for receipt
      -> verify resulting state
      -> record decision
      -> append audit event

Any stage can refuse. A refusal at any point stops the ones after it.

## Trust model

The server is authoritative for every financial value. The client renders and
proposes; it never decides. An agent is a proposer with no privileges beyond
submitting an intent. The owner is the only actor who can widen authority,
change a constitution or clear Safe Mode.

## Storage

`Repository` is the single storage boundary. `MemoryRepository` serves
development and satisfies the same contract as the Postgres implementation, so
routes do not change between them. Production refuses to start on process local
storage, because an audit trail that disappears on restart is not an audit
trail.

## Money

Settled values are `bigint` in the token's smallest unit. `parseAmount` refuses
input with more precision than the token supports and refuses anything that is
not a positive decimal string. Display formatting is one directional: a
formatted string is never parsed back into a decision.

## State machine

    AUTONOMOUS -> WATCH -> SAFE MODE

Downward transitions are automatic. The upward transition is an owner action
only.
