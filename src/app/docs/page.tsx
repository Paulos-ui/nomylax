import Link from 'next/link';
import { BrandLockup } from '@/components/ui/Mark';
import { clientNetwork } from '@/lib/network';

export const metadata = {
  title: 'Documentation — Nomylax',
  description: 'How Nomylax evaluates, blocks and executes financial intents on Base.',
};

const SECTIONS = [
  {
    id: 'model', title: 'The model',
    body: 'Nomylax sits between a human treasury and an autonomous agent. The human owns the capital. The agent proposes economic actions. Nomylax decides whether each one is financially permissible, and only then does anything settle. The agent may reason about money. It never holds unrestricted authority over money.',
  },
  {
    id: 'constitution', title: 'The Financial Constitution',
    body: 'Each agent has a constitution: maximum transaction, daily and monthly budgets, allowed assets, approved recipients, unknown recipient behaviour, emergency reserve, failure threshold, velocity threshold, risk threshold and permission expiry. Editing it appends a new version with a hash over the canonical policy. Nothing is replaced in place, so every decision can be traced to the exact rules that produced it.',
  },
  {
    id: 'enforcement', title: 'Enforcement order',
    list: [
      'Allowed asset', 'Single transaction limit', 'Daily budget', 'Monthly budget',
      'Recipient allowlist', 'Emergency reserve', 'Agent state', 'Failure threshold',
      'Spend velocity', 'Risk threshold', 'Transaction simulation',
    ],
    body: 'Checks run in a fixed order. A failed hard check blocks. A failed soft check is held for owner review. No model sits anywhere in this path: every check is a comparison against a value the owner wrote. A language model cannot approve a transaction that violates policy, because the model is never asked.',
  },
  {
    id: 'risk', title: 'Nomylax Risk Score',
    body: 'Seven weighted signals produce a single value from 0 to 100: unknown recipient, policy deviation, amount anomaly, spend velocity, contract risk, liquidity risk and operational failures. Bands are LOW below 30, MODERATE to 54, HIGH to 74 and CRITICAL above. A weighted mean can let benign signals dilute a dangerous one, so a severity floor applies: one extreme signal floors the score at HIGH, two or more floor it at CRITICAL. Every score reports its components and any escalation applied.',
  },
  {
    id: 'execution', title: 'Execution on Base',
    list: ['Simulate', 'Submit', 'Confirm', 'Verify state'],
    body: 'Simulation runs before signing and a failure stops the request. After confirmation the recipient balance is compared against the approved amount. A confirmed transaction whose state does not match is reported as unverified rather than as success. Financial operations fail closed: when the executor is not configured, the request is refused, never faked.',
  },
  {
    id: 'shadow', title: 'Shadow Mode',
    body: 'An agent runs its real logic against real policy with simulated settlement. Budgets deplete on a copy, so limits behave exactly as they would in production while no capital moves. The report gives requested value, what would be approved, what would be blocked, violations, critical events, projected burn, and the point at which the agent would have entered Safe Mode.',
  },
  {
    id: 'safe', title: 'Safe Mode',
    body: 'An agent moves itself down through the states AUTONOMOUS, WATCH and SAFE MODE on a critical risk event, on reaching its failure threshold, or on exceeding its velocity ceiling. It can never move itself back up. Recovery is an owner action. While Safe Mode is active, every request is refused before risk is even scored.',
  },
  {
    id: 'agents', title: 'Connecting an agent',
    body: 'Implement one method. An adapter returns pending intents; Nomylax does the rest. The endpoint is registered against the agent in storage and validated on every call. A URL in a request body is ignored, so credentials cannot be redirected to a host of the caller\u2019s choosing. Agents may also call the decision API directly and receive the same answer.',
  },
  {
    id: 'auth', title: 'Authentication',
    body: 'A connected wallet address proves nothing on its own. The owner signs a server issued challenge, the nonce is consumed on first use so a captured signature cannot be replayed, and the server issues an http only session cookie. Nomylax never asks for a seed phrase and never holds an unrestricted private key in the browser.',
  },
];

export default function Docs() {
  const net = clientNetwork();
  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: '32px 24px 96px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap', paddingBottom: 28, borderBottom: '1px solid var(--line)' }}>
        <Link href="/"><BrandLockup size={30} /></Link>
        <span className={`badge ${net.isTestnet ? 'warn' : 'gold'}`}><i />{net.label}</span>
      </header>

      <h1 className="display" style={{ fontSize: 40, marginTop: 44 }}>Documentation</h1>
      <p style={{ color: 'var(--text-2)', fontSize: 15, marginTop: 14, maxWidth: '62ch' }}>
        How Nomylax evaluates an intent, why a block cannot be argued with, and what happens
        between approval and settlement.
      </p>

      <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 30 }}>
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="badge" style={{ textTransform: 'none', letterSpacing: '0.04em', fontSize: 12, fontFamily: 'var(--font-ui)' }}>
            {s.title}
          </a>
        ))}
      </nav>

      {SECTIONS.map((s) => (
        <section key={s.id} id={s.id} style={{ marginTop: 52, scrollMarginTop: 24 }}>
          <h2 className="display" style={{ fontSize: 24 }}>{s.title}</h2>
          <p style={{ color: 'var(--text-2)', fontSize: 14.5, marginTop: 14, maxWidth: '68ch' }}>{s.body}</p>
          {s.list ? (
            <ol style={{ marginTop: 18, display: 'grid', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', listStyle: 'none', padding: 0 }}>
              {s.list.map((item, i) => (
                <li key={item} style={{ background: '#0B1020', padding: '11px 16px', display: 'flex', gap: 16, alignItems: 'baseline' }}>
                  <span className="num" style={{ fontSize: 11, color: '#D4AF37' }}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={{ fontSize: 13.5, color: '#E6EAF2' }}>{item}</span>
                </li>
              ))}
            </ol>
          ) : null}
        </section>
      ))}

      <section style={{ marginTop: 56, padding: 20, border: '1px solid var(--line-2)', borderLeft: '2px solid #D4AF37' }}>
        <h2 className="caps" style={{ fontSize: 11.5, color: '#D4AF37' }}>Repository documentation</h2>
        <p style={{ color: 'var(--text-3)', fontSize: 13.5, marginTop: 10 }}>
          Architecture, security, threat model, risk model, economics, agent strategy, incident
          response, API reference, Base integration and deployment notes live in the{' '}
          <code className="num">docs/</code> directory of the repository.
        </p>
      </section>

      <footer style={{ marginTop: 64, paddingTop: 24, borderTop: '1px solid var(--line)', display: 'flex', gap: 22, flexWrap: 'wrap', fontSize: 13 }}>
        <Link href="/" style={{ color: 'var(--text-3)' }}>Home</Link>
        <Link href="/trust" style={{ color: 'var(--text-3)' }}>Trust Center</Link>
        <Link href="/app" style={{ color: 'var(--text-3)' }}>Launch app</Link>
      </footer>
    </main>
  );
}
