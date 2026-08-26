# Final handoff

## Verification status

Run from a clean `npm ci`:

| Command | Result |
|---|---|
| `npm run typecheck` | Passes, no errors |
| `npm run lint` | Passes, 0 errors, 17 warnings (all `no-explicit-any` in error handlers) |
| `npm run test` | 82 tests passing across 5 files |
| `npm run build` | Passes, 22 routes |

**Not verified by me:** real Base transactions. The sandbox this was built in
has no network access to Base RPC, so the executor is implemented and typechecked
but has never signed a live transaction. Step 7 of `START_HERE.md` is the first
real test. Treat it as unproven until you run it.

**Not deployed.** Production ready for Vercel deployment. No production URL
exists and none was verified.

## Security fixes

### 1. Credential exfiltration through the agent endpoint

The old `/api/agents/poll` accepted an endpoint in the request body and attached
`AGENT_API_KEY` to it. Any caller could redirect Nomylax credentials to a host
they controlled.

Replaced by `/api/agents/intents`, which accepts an `agentId` only and loads the
approved endpoint from storage. The old route is deleted.

### 2. SSRF

`src/server/security/url-guard.ts` validates every outbound URL: protocol,
embedded credentials, loopback, private and reserved IPv4, IPv6 unique local and
link local, `.internal` and `.local`, and cloud metadata addresses. Redirects
are refused.

One finding worth your attention: the WHATWG URL parser rewrites
`::ffff:127.0.0.1` as `::ffff:7f00:1`, so a dotted-quad check is bypassable. The
first version of the guard had this bug and a test caught it. The guard now
expands IPv6 to eight groups before deciding, and refuses any IPv6 it cannot
parse rather than trusting it.

### 3. Client supplied policy

`/api/decisions` no longer accepts an agent, constitution or treasury from the
caller. It takes an `agentId` and an intent, and loads everything authoritative
from storage. A test submits a request carrying `maxTransaction: 100000` and
asserts the stored $10 limit still blocks it.

### 4. Synthetic transactions

`fakeHash()` is deleted. No code path can produce a transaction hash that did not
come back from the network. When the executor is unconfigured, an approved
decision is converted to blocked with the reason, never reported as executed.

### 5. Wallet authentication

Connecting is no longer treated as proof. Nonce, signature over a challenge,
verification with viem, then an `httpOnly` signed session. Nonces are single use
with a five minute expiry.

### 6. Risk calibration

An unknown recipient at 94 combined with a 95 contract risk scored 46, MODERATE,
because benign factors diluted it in the weighted mean. That is the shape of a
drain. A documented severity floor now applies: one extreme signal floors at
HIGH, two floor at CRITICAL, and the escalation is reported on the result.

## What changed

**New:** `src/lib/money.ts`, `src/lib/network.ts`, `src/server/` (security, auth,
execution, repo, api helpers), `src/app/api/auth/*`, `src/app/api/agents/intents`,
`src/app/trust`, `src/app/docs`, `src/components/shell/NetworkBanner.tsx`,
`docs/` (9 files), `tests/` (5 files), `eslint.config.mjs`, `vitest.config.mts`.

**Rewritten:** `src/app/api/decisions`, `src/app/api/shadow`,
`src/hooks/useWallet.ts`, `src/components/ui/Mark.tsx`.

**Deleted:** `src/app/api/agents/poll`, `fakeHash`.

**Preserved:** Direction B palette, typography, motion, all dashboard pages,
onboarding flow, the constitution builder, policy and risk logic, landing page
design.

## Brand

`Mark.tsx` now exports three variants: `HelmetMark` (sidebar, onboarding, shell),
`BrandLockup` (landing, footer, docs, trust), `MicroMark` (favicon, badges).
`GuardianMark` remains as an alias so nothing breaks. These are drawn in SVG from
the geometry of the supplied logo. **Replace with your actual asset** if you want
the rendered helmet rather than the geometric reduction.

## Known limitations, stated plainly

1. **Base spend permissions are not wired.** The executor uses a funded account.
   The grant flow (token, allowance, period, expiry, revocation) is designed in
   `docs/BASE_INTEGRATION.md` but not implemented. This is the largest remaining
   gap against the brief.
2. **Postgres is not wired.** `Repository` is the boundary and `MemoryRepository`
   satisfies it, but no schema or migration exists. Production refuses to start
   without `DATABASE_URL`, and setting it currently throws a clear error rather
   than pretending to persist. The app store (`src/lib/store.tsx`) still uses
   `localStorage` for the browser workspace, so the UI and the API do not yet
   share state.
3. **Landing page is still static HTML** at `public/landing.html`, served at `/`
   by a rewrite. Not migrated to components.
4. **No real Base transaction has been executed.**
5. **Sessions cannot be revoked before expiry.**
6. **Rate limits are per instance.**
7. **No independent audit.** The Trust Center says so.

## Files needing your values

| File | Value |
|---|---|
| `.env.local` | `SESSION_SECRET`, required |
| `.env.local` | `EXECUTOR_PRIVATE_KEY`, for real execution |
| `.env.local` | `AGENT_API_KEY`, for external agents |
| `public/landing.html` | GitHub URL, currently `https://github.com` |

## Orion submission order

1. Register for Orion with your Base wallet.
2. Wire Base spend permissions and Postgres. These are the two real gaps.
3. Test on Base Sepolia until transactions confirm and verify.
4. Deploy to Vercel and check the production environment.
5. Move the verified configuration to Base mainnet.
6. Perform a small legitimate mainnet transaction.
7. Populate the Trust Center with the real figures it now marks unestablished.
8. Prepare GitHub, site, socials and demo.
9. Submit through the official Orion interface.
10. Pay the ignition fee **only** through the official Orion submission
    interface. Nothing in this codebase sends that fee, and nothing should.
