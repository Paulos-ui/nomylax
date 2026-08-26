'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HelmetMark } from '@/components/ui/Mark';
import { useWorkspace } from '@/lib/store';

const NAV = [
  ['Overview', '/app/overview'],
  ['Treasury', '/app/treasury'],
  ['Agents', '/app/agents'],
  ['Transactions', '/app/transactions'],
  ['Risk & compliance', '/app/risk'],
  ['Policies', '/app/policies'],
  ['Monitoring', '/app/monitoring'],
  ['Audit log', '/app/audit'],
  ['Settings', '/app/settings'],
] as const;

export function Sidebar() {
  const path = usePathname();
  const { agents } = useWorkspace();
  const guardian = agents.some((a) => a.state === 'safe')
    ? { text: 'Safe mode', color: '#FF5C6C' }
    : agents.some((a) => a.state === 'watch')
      ? { text: 'Watching', color: '#E8B04B' }
      : { text: 'Active', color: '#66E1FF' };

  return (
    <aside
      style={{
        width: 232, flex: 'none', borderRight: '1px solid var(--line)', background: '#0D1220',
        display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh',
      }}
    >
      <div style={{ padding: '18px 18px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--line)' }}>
        <HelmetMark size={26} />
        <span className="caps" style={{ fontSize: 13 }}>Nomylax</span>
      </div>

      <nav style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 2, flex: 1, overflowY: 'auto' }}>
        {NAV.map(([label, href]) => {
          const active = path === href || (href !== '/app/overview' && path.startsWith(href));
          return (
            <Link
              key={href} href={href}
              style={{
                padding: '9px 12px', borderRadius: 3, fontSize: 13.5,
                color: active ? '#E6EAF2' : 'var(--text-3)',
                background: active ? 'rgba(41,98,255,0.12)' : 'transparent',
                boxShadow: active ? 'inset 0 0 0 1px rgba(41,98,255,0.25)' : 'none',
                transition: 'all 0.2s var(--ease)',
              }}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: 12, borderTop: '1px solid var(--line)' }}>
        <div className="card" style={{ padding: 14, background: '#0B1020' }}>
          <div className="label">Guardian status</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <span className="pulse-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: guardian.color, boxShadow: `0 0 10px ${guardian.color}` }} />
            <span style={{ fontSize: 13, color: guardian.color }}>{guardian.text}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>
            {agents.length} agent{agents.length === 1 ? '' : 's'} under policy
          </div>
        </div>
      </div>
    </aside>
  );
}
