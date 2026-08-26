# Agent strategy

## The loop

    OBSERVE     agent perceives a need to spend
    UNDERSTAND  agent forms an intent: amount, recipient, purpose
    ASSESS RISK Nomylax scores seven signals into NRS
    CHECK POLICY deterministic evaluation against the constitution
    SIMULATE    the call is simulated before signing
    EXECUTE     approved actions submit to Base
    VERIFY      settled state is checked against the approved intent
    RECORD      decision, policy version and outcome are written

## What the AI controls

Whether to act, what to buy, from whom, at what price, when, and how to
sequence its work. All of the judgement.

## What the AI cannot override

Transaction and budget ceilings, the allowlist, the reserve floor, the risk
threshold, Safe Mode, and whether anything settles at all. No model participates
in enforcement, so there is no prompt that changes a limit. An agent asking
politely and an agent under attack receive the same answer.

## Why the split

The model is the part most likely to be wrong, and it is also the part that
cannot be inspected. Putting it in the decision path would mean a persuasive
input could authorise a payment. Keeping it out means an agent can be wrong
without being expensive.

## Failure behaviour

Everything fails closed. Unconfigured executor: refuse. Failed simulation:
refuse. Unreachable RPC: refuse. Wrong chain: refuse. Unverified state after
confirmation: flag, never report success.
