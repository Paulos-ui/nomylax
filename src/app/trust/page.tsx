import Link from 'next/link';
import { BrandLockup } from '@/components/ui/Mark';
import { clientNetwork } from '@/lib/network';

export const metadata = {
  title: 'Trust Center — Nomylax',
  description: 'Operating status, security architecture and honest limitations.',
};

/**
 * Public trust centre. Every claim here is either verifiable or explicitly
 * marked as not yet established. Counters that require production data say so
 * rather than displaying an invented number.
 */
export default function TrustCenter() {
  const net = clientNetwork();

  const layers = [
    ['Owner authority', 'The human holds the keys and the capital. Everything below is delegated and revocable.'],
    ['Base permission', 'Onchain spend permission caps what the system can move, independent of application logic.'],
    ['Authentication', 'Wallet signature over a single use challenge. A connected address alone proves nothing.'],
    ['Authoritative policy', 'Limits load from server storage. Values sent by a caller are ignored.'],
    ['Risk engine', 'Seven weighted signals scored to NRS, with a severity floor so one extreme signal cannot be averaged away.'],
    ['Simulation', 'The call is simulated before signing. A failed simulation stops the request.'],
    ['Execution', 'Approved actions are submitted to Base under the granted permission scope.'],
    ['Verification', 'The settled result is checked against the approved intent. A mismatch is flagged, not reported as success.'],
    ['Audit', 'Request, decision, policy version and outcome are written to an append only record.'],
  ];

  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: '32px 24px 96px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap', paddingBottom: 28, borderBottom: '1px solid var(--line)' }}>
        <Link href="/"><BrandLockup size={30} /></Link>
        <span className={`badge ${net.isTestnet ? 'warn' : 'gold'}`}><i />{net.label}</span>
      </header>

      <h1 className="display" style={{ fontSize: 40, marginTop: 44 }}>Trust Center</h1>
      <p style={{ color: 'var(--text-2)', fontSize: 15, marginTop: 14, maxWidth: '62ch' }}>
        Nomylax controls other people&apos;s money, so the parts that are finished and the parts that are not
        should both be visible. This page states both.
      </p>

      <Section title="System status">
        <Grid rows={[
          ['Network', net.label, net.isTestnet ? 'warn' : 'ok'],
          ['Chain ID', String(net.chainId), 'plain'],
          ['Policy engine', 'Operational', 'ok'],
          ['Risk engine', 'Operational', 'ok'],
          ['Agent gateway', 'Operational', 'ok'],
          ['Executor', 'Configured per deployment', 'plain'],
          ['Database', 'Development storage', 'warn'],
        ]} />
      </Section>

      <Section title="Security architecture">
        <div style={{ border: '1px solid var(--line)' }}>
          {layers.map(([name, body], i) => (
            <div key={name} style={{
              display: 'grid', gridTemplateColumns: '42px minmax(0,200px) minmax(0,1fr)', gap: 18,
              padding: '15px 18px', borderBottom: i < layers.length - 1 ? '1px solid var(--line)' : 'none',
              background: '#0B1020', alignItems: 'baseline',
            }}>
              <span className="num" style={{ fontSize: 11, color: 'var(--text-3)' }}>L{i + 1}</span>
              <span className="caps" style={{ fontSize: 11.5, color: '#E6EAF2' }}>{name}</span>
              <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{body}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Operating record">
        <p style={{ color: 'var(--text-3)', fontSize: 13.5, marginBottom: 18, maxWidth: '62ch' }}>
          These counters populate from the audit trail of a production deployment. This instance has no
          production history, so they are shown as unestablished rather than filled with sample numbers.
        </p>
        <Grid rows={[
          ['Autonomous decisions', 'Not yet established', 'plain'],
          ['Approved decisions', 'Not yet established', 'plain'],
          ['Blocked decisions', 'Not yet established', 'plain'],
          ['Value executed', 'Not yet established', 'plain'],
          ['Value protected', 'Not yet established', 'plain'],
          ['Safe Mode events', 'Not yet established', 'plain'],
          ['Base executions', 'Not yet established', 'plain'],
        ]} />
      </Section>

      <Section title="Contracts">
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>
          Nomylax deploys no custody contract. Bounded authority is granted through Base spend
          permissions rather than by moving capital into a contract we wrote, which keeps the
          attack surface to code that has already been reviewed by others.
        </p>
      </Section>

      <Section title="Limitations">
        <ul style={{ color: 'var(--text-2)', fontSize: 14, paddingLeft: 20, display: 'grid', gap: 10 }}>
          <li>Nomylax has not been independently audited. No third party has reviewed this code.</li>
          <li>There are no production users and no mainnet operating history.</li>
          <li>Sessions are stateless and signed. They cannot be revoked before expiry, so they are kept short.</li>
          <li>Rate limiting counts per instance. A serverless fleet raises the effective ceiling.</li>
          <li>Development storage is process local. Durable Postgres persistence is in progress.</li>
          <li>Treasury figures shown outside a connected wallet are marked as demo data.</li>
        </ul>
      </Section>

      <Section title="Incident response">
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>
          Detection moves affected agents into Safe Mode first and investigates second. The full
          process, including permission revocation and owner notification, is documented in{' '}
          <code className="num">docs/INCIDENT_RESPONSE.md</code>.
        </p>
      </Section>

      <footer style={{ marginTop: 64, paddingTop: 24, borderTop: '1px solid var(--line)', display: 'flex', gap: 22, flexWrap: 'wrap', fontSize: 13 }}>
        <Link href="/" style={{ color: 'var(--text-3)' }}>Home</Link>
        <Link href="/docs" style={{ color: 'var(--text-3)' }}>Documentation</Link>
        <Link href="/app" style={{ color: 'var(--text-3)' }}>Launch app</Link>
      </footer>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 52 }}>
      <h2 className="caps" style={{ fontSize: 12, color: '#D4AF37', marginBottom: 18 }}>{title}</h2>
      {children}
    </section>
  );
}

function Grid({ rows }: { rows: [string, string, string][] }) {
  const color = (t: string) => ({ ok: '#3FD08A', warn: '#E8B04B', bad: '#FF5C6C', plain: '#E6EAF2' }[t] ?? '#E6EAF2');
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
      {rows.map(([k, v, t]) => (
        <div key={k} style={{ background: '#0B1020', padding: 16 }}>
          <div className="label">{k}</div>
          <div className="num" style={{ fontSize: 14, marginTop: 8, color: color(t) }}>{v}</div>
        </div>
      ))}
    </div>
  );
}
