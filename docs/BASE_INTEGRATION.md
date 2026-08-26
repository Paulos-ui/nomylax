# Base integration

## Network selection

Nothing is hardcoded. Both the server executor and the browser badge read the
same variable, so the interface cannot disagree with the chain being targeted.

    NEXT_PUBLIC_BASE_NETWORK=base-sepolia   # development, demonstration
    NEXT_PUBLIC_BASE_NETWORK=base           # production
    BASE_RPC_URL=https://sepolia.base.org

Base Sepolia is chain 84532. Base mainnet is 8453. A testnet deployment shows a
standing banner so a test environment is never mistaken for mainnet.

## Execution stages

    preflight -> simulated -> submitted -> confirmed -> verified

- **preflight** — executor configured, token has an address on this chain,
  amount positive, RPC reachable, RPC chain ID matches the configured chain.
- **simulated** — balance sufficient and the call simulates. A failure here
  stops everything; nothing is submitted.
- **submitted** — a hash exists but proves nothing yet.
- **confirmed** — one confirmation, receipt status `success`. A revert is
  reported as a failure with the hash.
- **verified** — the recipient balance moved by exactly the approved amount.

A confirmed transaction whose state does not match is returned as
`stage: confirmed, ok: false` and flagged for review. It is never reported as
success.

## Tokens

USDC at 6 decimals, addressed per chain. ETH at 18 decimals via the native
sentinel. Amounts are `bigint` base units throughout.

## Executor account

`EXECUTOR_PRIVATE_KEY` is a dedicated account holding only operating funds.
Never a personal wallet. Absent it, live execution is refused and Shadow Mode
still works.

## Spend permissions

The intended grant is a Base spend permission (token, allowance, period, start,
expiry, revocation) so authority is bounded onchain rather than by application
logic alone. **This is not yet wired.** The executor currently uses a funded
account. See `FINAL_HANDOFF.md`.

## Moving to mainnet

1. Complete Sepolia testing with real confirmed transactions.
2. Set `NEXT_PUBLIC_BASE_NETWORK=base` and a mainnet `BASE_RPC_URL`.
3. Fund a fresh executor account with a small operating balance.
4. Set conservative constitutions. Start with a low maximum transaction.
5. Execute one small real transaction and verify it on the explorer.
6. Only then raise limits.
