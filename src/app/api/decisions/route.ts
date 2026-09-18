import { NextResponse } from 'next/server';
import { evaluate, nextState } from '@/lib/policy-engine';
import { getRepository } from '@/server/repo';
import { fail, guard, intentSchema, parse, requireSession, serverError } from '@/server/api';
import { parseAmount, tokenSpec, MoneyError } from '@/lib/money';
import { applyDecision, debitTreasury, rollCounters } from '@/lib/spend';
import { execute } from '@/server/execution/executor';
import { activeNetwork } from '@/server/execution/chain';

export const runtime = 'nodejs';

/**
 * Evaluate an economic intent.
 *
 * The caller sends an agentId and an intent, nothing more. The agent, its
 * constitution, the treasury and the safe mode state are all loaded from
 * storage. Limits supplied by a caller are ignored, so a compromised client
 * cannot raise its own ceiling.
 */
export async function POST(req: Request) {
  const limited = guard(req, 'decisions', 60);
  if (limited) return limited;

  const session = requireSession(req);
  if (!session) return fail(401, 'Authentication required');

  const parsed = await parse(req, intentSchema);
  if (!parsed.ok) return parsed.response;
  const { agentId, intent, mode } = parsed.data;

  try {
    const repo = getRepository();

    // One clock reading for the whole evaluation, so a request crossing a UTC
    // midnight cannot roll the counters against one boundary and write them
    // back against the next.
    const now = Date.now();

    // ---- Authoritative state. Nothing here comes from the request. ----
    const agent = await repo.getAgent(agentId);
    if (!agent) return fail(404, 'Agent not found');
    if (agent.ownerAddress.toLowerCase() !== session.address.toLowerCase()) {
      return fail(404, 'Agent not found');
    }
    if (!agent.enabled) return fail(409, 'This agent is disabled');

    const version = await repo.getActiveConstitution(agentId);
    if (!version) return fail(409, 'This agent has no active constitution. Create one before submitting intents.');

    const treasury = await repo.getTreasury(agent.workspaceId);
    if (!treasury) return fail(409, 'Workspace treasury is not initialised');

    // ---- Amount handling in base units. ----
    let units: bigint;
    try {
      units = parseAmount(intent.amount, tokenSpec(intent.token).decimals);
    } catch (e) {
      return fail(400, e instanceof MoneyError ? e.message : 'Amount could not be parsed');
    }

    const authoritative = { ...agent, ...rollCounters(agent, now), constitution: version.constitution };
    const simulated = mode === 'shadow' || agent.mode === 'shadow';

    const decision = evaluate(
      authoritative,
      {
        agentId,
        amount: Number(intent.amount),
        token: intent.token.toUpperCase(),
        recipient: intent.recipient,
        purpose: intent.purpose,
      },
      treasury,
      { simulated },
    );

    // ---- Execution only happens for an approved, non simulated decision. ----
    let execution = null;
    if (decision.verdict === 'execute' && !simulated) {
      execution = await execute({
        token: intent.token.toUpperCase(),
        amount: units,
        recipient: intent.recipient as `0x${string}`,
      });

      if (execution.ok && execution.txHash) {
        decision.txHash = execution.txHash;
      } else {
        // Execution refused or unverified: the decision does not stand.
        decision.verdict = 'blocked';
        decision.reason = execution.error ?? 'Execution could not be verified';
        decision.protectedValue = decision.request.amount;
      }
    }

    const updated = { ...authoritative, riskScore: decision.risk.score };
    updated.state = nextState(updated, decision);

    // Settled means value actually left the treasury. A hash only ever arrives
    // from the executor after the network returns a receipt, so requiring one
    // here keeps the counters tied to real movement rather than to approval.
    const settled = !simulated && decision.verdict === 'execute' && !!decision.txHash;
    const counters = applyDecision(authoritative, decision, { settled, now });

    await repo.saveAgent({
      ...agent, ...counters, riskScore: decision.risk.score, state: updated.state,
    });
    if (settled) {
      await repo.saveTreasury(agent.workspaceId, debitTreasury(treasury, decision.request.amount));
    }
    await repo.recordDecision(agent.workspaceId, decision);
    await repo.appendAudit({
      id: `aud_${decision.id}`,
      ts: Date.now(),
      actor: session.address,
      workspaceId: agent.workspaceId,
      agentId,
      action: `decision.${decision.verdict}`,
      detail: {
        amount: intent.amount, token: intent.token, purpose: intent.purpose,
        risk: decision.risk.score, constitutionVersion: version.version,
        constitutionHash: version.hash, simulated,
      },
      txHash: decision.txHash,
    });

    return NextResponse.json({
      decision,
      execution,
      network: { name: activeNetwork().label, chainId: activeNetwork().chainId, testnet: activeNetwork().isTestnet },
      constitution: { version: version.version, hash: version.hash },
    });
  } catch (e) {
    return serverError(e);
  }
}
