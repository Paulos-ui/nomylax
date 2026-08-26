'use client';

import { usePathname } from 'next/navigation';
import { useWorkspace } from '@/lib/store';
import { useWallet } from '@/hooks/useWallet';
import { shortAddr } from '@/lib/format';
import { NetworkBadge } from './NetworkBanner';

const TITLES: Record<string, string> = {
  '/app/overview': 'Control plane overview',
  '/app/treasury': 'Treasury',
  '/app/agents': 'Agents',
  '/app/transactions': 'Transactions',
  '/app/risk': 'Risk & compliance',
  '/app/policies': 'Policies',
  '/app/monitoring': 'Monitoring',
  '/app/audit': 'Audit log',
  '/app/settings': 'Settings',
};

export function Topbar() {
  const path = usePathname();
  const { workspace, agents } = useWorkspace();
  const { address, status, chainName, connect, switchNetwork } = useWallet();

  const title = TITLES[path] ?? (path.startsWith('/app/agents/') ? 'Agent detail' : 'Nomylax');
  const owner = address ?? workspace?.owner ?? null;
  const halted = agents.some((a) => a.state === 'safe');

  return (
    <header
      style={{
        height: 60, borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 24px', gap: 16,
        position: 'sticky', top: 0, background: 'rgba(11,16,32,0.85)', backdropFilter: 'blur(12px)', zIndex: 40,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        <span style={{ fontSize: 15, color: '#E6EAF2' }}>{title}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: halted ? '#FF5C6C' : 'var(--text-3)' }}>
          <i className="pulse-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: halted ? '#FF5C6C' : '#3FD08A', display: 'block' }} />
          {halted ? 'An agent is in safe mode' : 'All systems operational'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <NetworkBadge />
        {status === 'wrong-network' ? (
          <button className="btn btn-danger btn-sm" onClick={switchNetwork}>Switch to {chainName}</button>
        ) : owner ? (
          <span className="badge gold" title={owner}>{shortAddr(owner)}</span>
        ) : (
          <button className="btn btn-ghost btn-sm" onClick={connect}>Connect wallet</button>
        )}
      </div>
    </header>
  );
}
