# Incident response

## 1. Detection

Sources: a critical NRS event, repeated failures, velocity breach, an execution
whose verified state does not match the approved intent, or an owner report.

## 2. Safe Mode first

Move affected agents into Safe Mode before investigating. Spending stops
immediately; nothing is lost by pausing an agent that turns out to be healthy.

## 3. Containment

- Pause the agent.
- Revoke the Base spend permission if the executor may be affected.
- Rotate `AGENT_API_KEY` if an endpoint or credential is implicated.
- Rotate `SESSION_SECRET` if session compromise is suspected. This invalidates
  every session immediately, which is the intended effect.

## 4. Owner notification

State what happened, which agents are affected, what was spent, what was
prevented, and what the owner must do. Do not wait for a complete picture.

## 5. Investigation

Work from the audit trail. Each decision records the constitution version and
hash, so the exact rules in force at the time are recoverable.

## 6. Recovery

Only the owner clears Safe Mode. Before clearing: confirm the cause, adjust the
constitution if the limits were wrong, and run Shadow Mode to confirm the agent
behaves within the corrected policy.

## 7. Post incident record

Record timeline, cause, impact, response, and the control that would have
prevented it. Where that control does not exist, add it to the threat model
with an owner.
