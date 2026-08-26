'use client';

import { useState } from 'react';
import { useWorkspace } from '@/lib/store';
import { createAdapter } from '@/lib/adapters';
import { PageHead, VerdictBadge, Empty } from '@/components/ui/Bits';
import { FactorBars } from '@/components/charts/Charts';
import { usd, clock } from '@/lib/format';
import type { Decision } from '@/lib/types';
import Link from 'next/link';

/**
 * The live enforcement surface. Submit an intent by hand or let the adapter
 * generate one — either way it runs through the same engine the API uses.
 */
export default function Monitoring() {
  const { agents, submit, ready } = useWorkspace();
  const [agentId, setAgentId] = useState('');
  const [amount, setAmount] = useState('4.50');
  const [recipient, setRecipient] = useState('');
  const [purpose, setPurpose] = useState('Market dataset');
  const [last, setLast] = useState<Decision | null>(null);
  const [busy, setBusy] = useState(false);

  if (!ready) return null;
  if (!agents.length) {
    return <Empty title="No agents to monitor" body="Connect an agent first. The enforcement path needs a constitution to evaluate against." action={<Link className="btn btn-primary" href="/app/onboarding">Start onboarding</Link>} />;
  }

  const active = agents.find((a) => a.id === agentId) ?? agents[0];

  const send = (over?: Partial<{ amount: number; recipient: string; purpose: string }>) => {
    const d = submit({
      agentId: active.id,
      amount: over?.amount ?? Number(amount),
      token: active.constitution.allowedTokens[0] ?? 'USDC',
      recipient: over?.recipient ?? (recipient || active.constitution.approvedRecipients[0] || '0xunknown'),
      purpose: over?.purpose ?? purpose,
    });
    if (d) setLast(d);
  };

  const generate = async () => {
    setBusy(true);
    try {
      const adapter = createAdapter({ kind: active.endpoint ? 'http' : 'demo', type: active.type, endpoint: active.endpoint });
      const [draft] = await adapter.nextIntents(active.id, 1);
      if (draft) {
        setAmount(String(draft.amount));
        setRecipient(draft.recipient);
        setPurpose(draft.purpose);
        send({ amount: draft.amount, recipient: draft.recipient, purpose: draft.purpose });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHead title="Monitoring" sub="Submit an economic intent and watch the decision path resolve. This is the same evaluation the API performs." />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.25fr)', gap: 18, alignItems: 'start' }}>
        <div className="card">
          <div className="card-hd"><span className="label">Submit intent</span></div>
          <div className="card-bd" style={{ display: 'grid', gap: 16 }}>
            <label className="field"><span style={{ fontSize: 13 }}>Agent</span>
              <select className="select" value={active.id} onChange={(e) => setAgentId(e.target.value)}>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.mode}</option>)}
              </select>
              <span className="hint">Daily remaining: {usd(Math.max(active.constitution.dailyLimit - active.spentToday, 0))} · Max tx {usd(active.constitution.maxTransaction)}</span>
            </label>

            <label className="field"><span style={{ fontSize: 13 }}>Amount</span>
              <input className="input num-input" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>

            <label className="field"><span style={{ fontSize: 13 }}>Recipient</span>
              <input className="input num-input" style={{ fontSize: 12 }} placeholder={active.constitution.approvedRecipients[0] ?? '0x…'} value={recipient} onChange={(e) => setRecipient(e.target.value)} />
              <span className="hint">Leave blank to use an approved address. Type anything else to test the allowlist.</span>
            </label>

            <label className="field"><span style={{ fontSize: 13 }}>Purpose</span>
              <input className="input" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
            </label>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => send()}>Submit intent</button>
              <button className="btn btn-ghost" onClick={generate} disabled={busy}>{busy ? 'Asking agent…' : 'Ask the agent'}</button>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => send({ amount: active.constitution.maxTransaction * 4, recipient: '0xdeadBeef00000000000000000000000000badF00', purpose: 'Unverified transfer' })}>
                Test a violation
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-hd">
            <span className="label">Decision trace</span>
            {last ? <VerdictBadge v={last.verdict} /> : <span className="badge">Idle</span>}
          </div>
          {last ? (
            <div className="card-bd anim-in" key={last.id}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 14, paddingBottom: 16, borderBottom: '1px solid var(--line)' }}>
                <div><div className="label">Amount</div><div className="num" style={{ marginTop: 6 }}>{usd(last.request.amount)}</div></div>
                <div><div className="label">Risk</div><div className="num" style={{ marginTop: 6, color: last.risk.band === 'low' ? '#3FD08A' : last.risk.band === 'critical' ? '#FF5C6C' : '#E8B04B' }}>{last.risk.score} · {last.risk.band.toUpperCase()}</div></div>
                <div><div className="label">Time</div><div className="num" style={{ marginTop: 6, fontSize: 13 }}>{clock(last.ts)}</div></div>
                <div><div className="label">Settlement</div><div className="num" style={{ marginTop: 6, fontSize: 12 }}>{last.txHash ?? (last.simulated ? 'Simulated' : '—')}</div></div>
              </div>

              <div style={{ marginTop: 6 }}>
                {last.checks.map((c, i) => (
                  <div key={c.id} className="anim-in" style={{ animationDelay: `${i * 60}ms`, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                    <span style={{
                      width: 16, height: 16, borderRadius: '50%', flex: 'none',
                      border: `1px solid ${c.passed ? 'rgba(63,208,138,0.6)' : 'rgba(255,92,108,0.6)'}`,
                      background: c.passed ? 'rgba(63,208,138,0.14)' : 'rgba(255,92,108,0.14)',
                      display: 'grid', placeItems: 'center',
                    }}>
                      <i style={{ width: 5, height: 5, borderRadius: '50%', background: c.passed ? '#3FD08A' : '#FF5C6C', display: 'block' }} />
                    </span>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text-2)' }}>{c.name}</span>
                    <span className="num" style={{ fontSize: 12, color: c.passed ? '#3FD08A' : '#FF5C6C' }}>{c.detail}</span>
                  </div>
                ))}
              </div>

              <div style={{
                marginTop: 18, padding: 16, borderRadius: 2,
                border: `1px solid ${last.verdict === 'execute' ? 'rgba(63,208,138,0.35)' : last.verdict === 'review' ? 'rgba(232,176,75,0.35)' : 'rgba(255,92,108,0.35)'}`,
                background: last.verdict === 'execute' ? 'rgba(63,208,138,0.06)' : last.verdict === 'review' ? 'rgba(232,176,75,0.06)' : 'rgba(255,92,108,0.06)',
              }}>
                <div className="caps" style={{ fontSize: 15, color: last.verdict === 'execute' ? '#3FD08A' : last.verdict === 'review' ? '#E8B04B' : '#FF5C6C' }}>
                  {last.verdict === 'execute' ? 'Execute' : last.verdict === 'review' ? 'Held for review' : 'Blocked'}
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 8 }}>{last.reason}</p>
                {last.protectedValue > 0 ? <p className="num" style={{ fontSize: 13, color: '#D4AF37', marginTop: 8 }}>{usd(last.protectedValue)} kept in treasury</p> : null}
              </div>

              <div style={{ marginTop: 20 }}>
                <div className="label" style={{ marginBottom: 10 }}>Risk factors</div>
                <FactorBars factors={last.risk.factors} />
              </div>
            </div>
          ) : (
            <div className="card-bd" style={{ color: 'var(--text-3)', fontSize: 13 }}>
              Submit an intent to see every check, in the order the engine runs them.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
