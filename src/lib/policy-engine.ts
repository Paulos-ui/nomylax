import { scoreRisk } from './risk-engine';
import { uid } from './format';
import type { Agent, Decision, IntentRequest, PolicyCheck, Treasury, Verdict } from './types';

/**
 * The enforcement path. Deterministic by design — every check is a comparison
 * against a value the owner wrote into the constitution. No inference here.
 *
 * Order matters and is fixed: asset, size, budget, recipient, reserve, state,
 * failures, then risk, then simulation.
 */
export function evaluate(
  agent: Agent,
  req: IntentRequest,
  treasury: Treasury,
  opts: { simulated?: boolean } = {},
): Decision {
  const c = agent.constitution;
  const checks: PolicyCheck[] = [];
  const known = c.approvedRecipients.some(
    (r) => r.trim().toLowerCase() === req.recipient.trim().toLowerCase(),
  );

  const tokenOk = c.allowedTokens.includes(req.token);
  checks.push({
    id: 'asset',
    name: 'Allowed asset',
    detail: tokenOk ? req.token : `${req.token} not permitted`,
    passed: tokenOk,
    hard: true,
  });

  const txOk = req.amount <= c.maxTransaction;
  checks.push({
    id: 'maxTx',
    name: 'Single transaction limit',
    detail: `$${req.amount.toFixed(2)} / $${c.maxTransaction.toFixed(2)}`,
    passed: txOk,
    hard: true,
  });

  const dayRemaining = c.dailyLimit - agent.spentToday;
  const dayOk = req.amount <= dayRemaining;
  checks.push({
    id: 'daily',
    name: 'Daily budget remaining',
    detail: `$${Math.max(dayRemaining, 0).toFixed(2)} of $${c.dailyLimit.toFixed(2)}`,
    passed: dayOk,
    hard: true,
  });

  const monthRemaining = c.monthlyLimit - agent.spentMonth;
  const monthOk = req.amount <= monthRemaining;
  checks.push({
    id: 'monthly',
    name: 'Monthly budget remaining',
    detail: `$${Math.max(monthRemaining, 0).toFixed(2)} of $${c.monthlyLimit.toFixed(2)}`,
    passed: monthOk,
    hard: true,
  });

  const recipientOk = known || c.unknownRecipient === 'allow';
  const recipientSoft = !known && c.unknownRecipient === 'review';
  checks.push({
    id: 'recipient',
    name: 'Recipient allowlist',
    detail: known ? 'Match found' : `No match · rule is ${c.unknownRecipient.toUpperCase()}`,
    passed: recipientOk,
    hard: !recipientSoft,
  });

  const reserveOk = treasury.available - req.amount >= c.emergencyReserve;
  checks.push({
    id: 'reserve',
    name: 'Emergency reserve',
    detail: reserveOk
      ? `$${c.emergencyReserve.toFixed(2)} untouched`
      : `Would breach $${c.emergencyReserve.toFixed(2)}`,
    passed: reserveOk,
    hard: true,
  });

  const stateOk = agent.state !== 'safe' && agent.mode !== 'paused';
  checks.push({
    id: 'state',
    name: 'Agent state',
    detail: stateOk ? `${agent.state} · ${agent.mode}` : 'Safe mode — spending halted',
    passed: stateOk,
    hard: true,
  });

  const failuresOk = agent.failedCount < c.failedTxThreshold;
  checks.push({
    id: 'failures',
    name: 'Failed transaction threshold',
    detail: `${agent.failedCount} of ${c.failedTxThreshold}`,
    passed: failuresOk,
    hard: true,
  });

  const velocity = ((agent.spentToday + req.amount) / Math.max(c.dailyLimit, 1)) * 100;
  const velocityOk = velocity <= c.velocityThreshold;
  checks.push({
    id: 'velocity',
    name: 'Spend velocity',
    detail: `${velocity.toFixed(0)}% of ${c.velocityThreshold}% ceiling`,
    passed: velocityOk,
    hard: true,
  });

  const risk = scoreRisk(agent, req, treasury);
  const riskOk = risk.score <= c.riskThreshold;
  checks.push({
    id: 'risk',
    name: 'Risk score',
    detail: `${risk.score} · ${risk.band.toUpperCase()} (limit ${c.riskThreshold})`,
    passed: riskOk,
    hard: true,
  });

  const hardFail = checks.find((k) => !k.passed && k.hard);
  const softFail = checks.find((k) => !k.passed && !k.hard);

  // This engine is pure and never touches the network, so it cannot simulate
  // anything. Real simulation happens in the executor, which runs estimateGas
  // or simulateContract and refuses to submit when either fails. This row
  // records that the gate is in force. It previously read "No unexpected state
  // change" on every pass, asserting the result of a simulation that had not
  // been performed and would not be performed at all in shadow mode.
  const clearedForSimulation = !hardFail;
  checks.push({
    id: 'simulation',
    name: 'Execution simulation',
    detail: !clearedForSimulation
      ? 'Not reached'
      : opts.simulated
        ? 'Not performed — shadow mode settles nothing on chain'
        : 'Required before submission; the executor refuses to submit if it fails',
    passed: clearedForSimulation,
    hard: true,
  });

  let verdict: Verdict = 'execute';
  let reason = 'All checks passed';
  if (hardFail) {
    verdict = 'blocked';
    reason = `${hardFail.name}: ${hardFail.detail}`;
  } else if (softFail) {
    verdict = 'review';
    reason = `${softFail.name}: held for owner review`;
  }

  return {
    id: uid('dec'),
    ts: Date.now(),
    agentId: agent.id,
    agentName: agent.name,
    request: req,
    checks,
    risk,
    verdict,
    reason,
    protectedValue: verdict === 'blocked' ? req.amount : 0,
    simulated: !!opts.simulated,
    // No transaction hash is invented here. A hash only ever arrives from the
    // executor after the network returns a receipt.
    txHash: undefined,
  };
}

/**
 * State machine for autonomy. Recovery is always an owner action —
 * an agent can move itself down, never up.
 */
export function nextState(agent: Agent, decision: Decision): Agent['state'] {
  const c = agent.constitution;
  if (agent.state === 'safe') return 'safe';
  if (decision.risk.band === 'critical') return 'safe';
  if (agent.failedCount + (decision.verdict === 'blocked' ? 1 : 0) >= c.failedTxThreshold) return 'safe';
  const velocity = ((agent.spentToday + decision.request.amount) / Math.max(c.dailyLimit, 1)) * 100;
  if (velocity >= c.velocityThreshold) return 'safe';
  if (decision.verdict === 'review' || decision.risk.band === 'high') return 'watch';
  return agent.state === 'watch' ? 'watch' : 'autonomous';
}
