# Start here

Exact commands. Run them in order.

## 1. Extract and enter

```bash
cd ~/projects
unzip ~/Downloads/nomylax-final.zip -d nomylax
cd nomylax
```

Run from the Linux filesystem, not `/mnt/c/...`. The Windows mount is what
causes slow rebuilds and font timeouts under WSL.

## 2. Install

```bash
npm ci
```

## 3. Environment

```bash
cp .env.example .env.local
openssl rand -hex 32
```

Open `.env.local` and set **one required value**:

| Variable | Value |
|---|---|
| `SESSION_SECRET` | Paste the output of the `openssl` command above |

Everything else works as shipped. Two are optional:

| Variable | When you need it |
|---|---|
| `EXECUTOR_PRIVATE_KEY` | Only for real Base transactions. See step 7. |
| `AGENT_API_KEY` | Only to connect an external agent endpoint. |

Without `EXECUTOR_PRIVATE_KEY`, approved decisions are **refused**, not faked.
Shadow Mode works fully.

## 4. Verify

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

All four must pass. 82 tests.

## 5. Run

```bash
npm run dev
```

| Route | Purpose |
|---|---|
| http://localhost:3000 | Landing page |
| http://localhost:3000/app | Application, redirects to onboarding |
| http://localhost:3000/trust | Trust Center |
| http://localhost:3000/docs | Documentation |

## 6. Walk the product

1. `/app/onboarding`, connect your wallet, then **Sign in with this wallet**.
   The signature costs no gas and grants no spending authority.
2. Create a workspace. Choose **Try a demo agent**, then Research Scout.
3. On the constitution step, set **Maximum transaction** to `5`.
4. Run Shadow Mode. It will flag violations. That is the product working.
5. Activate, then go to `/app/monitoring` and press **Test a violation**.
   Watch the checks resolve in order and the block name the exact failing rule.
6. `/app/audit`, export the JSON.

## 7. Base Sepolia execution

Only when you want real transactions.

```bash
# Create a throwaway account. Never use a personal wallet.
node -e "const {generatePrivateKey,privateKeyToAccount}=require('viem/accounts');const k=generatePrivateKey();console.log('KEY',k);console.log('ADDRESS',privateKeyToAccount(k).address)"
```

1. Put `KEY` in `.env.local` as `EXECUTOR_PRIVATE_KEY`.
2. Fund `ADDRESS` with Base Sepolia ETH from a faucet.
3. Send it test USDC at `0x036CbD53842c5426634e7929541eC2318f3dCF7e`.
4. Restart: `npm run dev`.
5. Submit an intent from `/app/monitoring` within the agent's limits.
6. The response carries a real transaction hash. Check it on
   https://sepolia.basescan.org

If the executor is unconfigured or underfunded, the request is refused with the
reason. Nothing is invented.

## 8. Deploy to Vercel

```bash
npm i -g vercel
vercel login
vercel
vercel --prod
```

Set in the Vercel dashboard, Project Settings, Environment Variables:

| Variable | Notes |
|---|---|
| `SESSION_SECRET` | A **different** value from local |
| `NEXT_PUBLIC_APP_URL` | Your production URL |
| `NEXT_PUBLIC_BASE_NETWORK` | `base-sepolia` first |
| `BASE_RPC_URL` | Sepolia RPC |
| `EXECUTOR_PRIVATE_KEY` | Server scope only. Never `NEXT_PUBLIC_`. |

## 9. Mainnet, only after Sepolia works end to end

Set `NEXT_PUBLIC_BASE_NETWORK=base`, a mainnet `BASE_RPC_URL`, and a **fresh**
executor account with a small balance. Start with a low maximum transaction,
execute one small real transaction, verify it, then raise limits.

## Troubleshooting

| Symptom | Cause |
|---|---|
| `SESSION_SECRET must be set` | Step 3 was skipped |
| Sign in button does nothing | No injected wallet in this browser |
| `Wrong network` | Wallet is not on the chain in `NEXT_PUBLIC_BASE_NETWORK` |
| `Live execution is not configured` | Expected without `EXECUTOR_PRIVATE_KEY` |
| Workspace resets | Development storage is process local |
