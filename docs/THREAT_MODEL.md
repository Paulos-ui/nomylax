# Threat model

| Threat | Attack path | Impact | Mitigation | Residual risk |
|---|---|---|---|---|
| Compromised agent | Agent submits large or hostile intents | Treasury drain | Deterministic limits, allowlist, reserve floor, risk threshold | Loss bounded by the daily limit |
| Prompt injection | Poisoned input makes the agent request an attacker payment | Funds to attacker | Enforcement path contains no model; unknown recipient blocked by default | If the owner allowlists a hostile address, policy permits it |
| Credential theft via SSRF | Caller supplies an endpoint that receives the bearer token | `AGENT_API_KEY` stolen | Endpoint loaded from storage, never the body; `assertSafeUrl`; redirects refused | DNS rebinding after validation is not yet mitigated |
| Client policy override | Attacker sends inflated limits with the request | Unlimited spend | Server loads policy from storage and ignores caller values | None while storage is trusted |
| Wallet impersonation | Attacker claims an address they do not control | Account takeover | Signature over a server nonce | Compromised wallet is out of scope |
| Replay | Captured signature resubmitted | Session issued to attacker | Single use nonce, five minute expiry | None for the sign in path |
| Session theft | Cookie exfiltrated | Attacker acts as owner | `httpOnly`, `secure`, `sameSite`, twelve hour expiry | Cannot revoke before expiry |
| Unauthorised policy change | Another wallet edits a constitution | Limits widened | Ownership check on every agent read; version history records the actor | None while sessions hold |
| Overspend through races | Concurrent intents each pass the daily check | Limit exceeded | Sequential evaluation per agent | Concurrent writes need a DB transaction; open until Postgres lands |
| Malicious recipient | Agent pays a hostile address | Loss | Allowlist, unknown recipient rule, recipient signal weighted highest | Owner error remains possible |
| RPC failure | Base RPC unreachable or wrong chain | Wrong chain execution | Chain ID compared before submitting; unreachable RPC refuses | None |
| Simulation disagreement | Simulation passes, execution reverts | Gas lost, no transfer | Receipt status checked, balance verified | Gas is not recovered |
| Confirmation timeout | Submitted, not mined in 90s | Unknown state | Reported as unverified with the hash, never as success | Owner must check the explorer |
| Risk engine failure | Scoring throws | Unscored execution | Exception propagates and the decision fails closed | None |
| Database failure | Storage unreachable | No authoritative policy | Route returns 5xx; nothing executes | Availability loss |
| Frontend compromise | Malicious script in the browser | Forged requests | Server ignores client policy; damage bounded by the constitution | Session actions within limits are possible |
