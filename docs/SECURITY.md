# Security

Nomylax controls other people's money. This document states what is enforced,
what is assumed, and what is not yet finished.

## Least privilege

The owner keeps custody. Nomylax never asks for a seed phrase, never holds an
unrestricted private key in the browser, and deploys no custody contract.
Bounded authority is granted through Base spend permissions: a token, an
allowance, a period and an expiry, revocable by the owner at any time.

## Wallet authentication

A connected address is not proof of ownership. Any page can report any address.

    request nonce -> server issues challenge -> wallet signs
    -> server verifies signature -> session cookie issued

The nonce is single use and expires in five minutes, so a captured signature
cannot be replayed. Signature verification uses `viem.verifyMessage`. Sessions
are HMAC-SHA256 signed, `httpOnly`, `sameSite=lax`, `secure` in production, and
expire after twelve hours.

Covered by `tests/auth.test.ts`.

## Server authority

The client never supplies policy. A caller sends an `agentId` and an intent.
The server loads the agent, the active constitution, the treasury and the safe
mode state from storage. Limits in a request body are ignored.

`tests/api-security.test.ts` submits a request carrying an inflated
`maxTransaction` and asserts the stored limit still blocks it.

## Endpoint protection and SSRF

Nomylax attaches a bearer token to outbound agent calls, so a caller who can
choose the destination can steal it. Two controls apply:

1. The destination is loaded from storage against the `agentId`. A URL in the
   request body is ignored entirely.
2. Every outbound URL passes `assertSafeUrl`, which rejects non-HTTP protocols,
   embedded credentials, loopback, private and reserved IPv4 ranges, IPv6
   unique local and link local addresses, IPv4-mapped and NAT64-embedded
   private addresses, `.internal` and `.local` namespaces, and cloud metadata
   endpoints. Redirects are refused, since a redirect can point somewhere the
   guard already rejected.

The IPv4-mapped case matters: the WHATWG URL parser rewrites
`::ffff:127.0.0.1` as `::ffff:7f00:1`, so a dotted-quad check alone is
bypassable. The guard expands IPv6 to eight groups before deciding, and an
IPv6 address it cannot parse is refused rather than trusted.

Covered by `tests/url-guard.test.ts`.

## Secrets

Server variables: `SESSION_SECRET`, `EXECUTOR_PRIVATE_KEY`, `AGENT_API_KEY`,
`BASE_RPC_URL`, `DATABASE_URL`. None carry the `NEXT_PUBLIC_` prefix, so none
reach the browser bundle. `SESSION_SECRET` shorter than 32 characters is a hard
failure rather than a warning.

## Rate limits

Fixed window, applied to authentication, decisions, shadow runs and agent
polling. Errors return `429` with `Retry-After`.

## Policy enforcement

Enforcement is deterministic. Every check compares a request value against a
value the owner wrote. No model participates, so no amount of agent reasoning
can approve a request that violates policy. Order is fixed and a hard failure
stops evaluation before simulation.

## Execution verification

Simulation runs before signing; a failure stops the request. The RPC chain ID
is compared against the configured chain before anything is submitted. After
confirmation the recipient balance is compared against the approved amount, and
a mismatch is reported as unverified rather than as success. When the executor
is unconfigured, execution is refused. Nothing in the codebase can produce a
transaction hash that did not come back from the network.

## Safe Mode

Triggered by a critical risk event, reaching the failure threshold, or
exceeding the velocity ceiling. While active, every request is refused before
risk is scored. An agent can enter Safe Mode and can never leave it; recovery
is an owner action.

## Known limitations

- **No independent audit.** No third party has reviewed this code.
- **Sessions cannot be revoked before expiry.** They are stateless and signed,
  so a stolen cookie is valid until it expires. Twelve hours bounds it.
- **Rate limits are per instance.** A serverless fleet raises the real ceiling.
  Move to a shared store before meaningful traffic.
- **Development storage is process local.** Postgres persistence is in progress;
  production refuses to start without `DATABASE_URL`.
- **Spend permission integration is partial.** The executor uses a funded
  account; the Base spend permission grant flow is not yet wired.

## Reporting

Open a private security advisory on the repository. Do not open a public issue
for an exploitable finding.
