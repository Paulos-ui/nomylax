# API

Every route runs on the Node runtime, validates with Zod, and is rate limited.
All financial routes require an authenticated session.

## POST /api/auth/nonce

    { "address": "0x..." }
    -> { "nonce": "...", "message": "..." }

Issues a single use challenge. Five minute expiry.

## POST /api/auth/verify

    { "address", "message", "signature", "nonce" }
    -> { "address", "workspaceId" }   sets nomylax_session cookie

Verifies the signature, consumes the nonce, issues a twelve hour session.

Errors: `401` unknown, expired, replayed, wrong address, or bad signature.

## POST /api/auth/logout

Clears the session cookie.

## POST /api/decisions

    {
      "agentId": "agt_123",
      "intent": {
        "type": "payment",
        "token": "USDC",
        "amount": "4.50",
        "recipient": "0x...",
        "purpose": "market_data"
      }
    }

`amount` is a decimal **string**. A float is rejected.

Response:

    {
      "decision": { verdict, checks[], risk{}, reason, protectedValue, txHash? },
      "execution": { stage, ok, txHash?, blockNumber?, verification? } | null,
      "network": { name, chainId, testnet },
      "constitution": { version, hash }
    }

The agent, its constitution and the treasury load from storage. Any policy
object in the request body is ignored. `txHash` appears only when the network
returned a receipt and the resulting state was verified.

Errors: `401` unauthenticated, `404` unknown agent or not owned by the caller,
`409` disabled agent or missing constitution, `400` validation, `429` rate
limited.

## POST /api/shadow

    { "agentId": "agt_123", "requests": 14 }
    -> { "report": {...}, "constitution": { version, hash } }

Simulation only. Every decision is marked `simulated` and no `txHash` is ever
returned.

## POST /api/agents/intents

    { "agentId": "agt_123", "count": 5 }
    -> { "intents": [...] }

The endpoint is loaded from storage against the `agentId`. **A URL in the
request body is ignored.** The registered endpoint is validated against the
SSRF guard before contact, and redirects are refused.

Your agent should answer:

    {
      "intents": [
        {
          "amount": 4.5,
          "token": "USDC",
          "recipient": "0x...",
          "purpose": "Market dataset",
          "contractRisk": 18,
          "recipientVerified": true
        }
      ]
    }
