'use client';

import { useState } from 'react';
import { useWorkspace } from '@/lib/store';
import { AreaChart, Donut, Bars } from '@/components/charts/Charts';
import { PageHead, Stat } from '@/components/ui/Bits';
import { TREASURY_SERIES, ALLOCATION, DAILY_BURN } from '@/lib/seed';
import { usd, usdCompact } from '@/lib/format';

const RANGES = ['24H', '7D', '30D', 'ALL'];

export default function TreasuryPage() {
  const { treasury, agents, decisions, ready } = useWorkspace();
  const [range, setRange] = useState('7D');
  if (!ready) return null;

  const dailyBurn = agents.reduce((s, a) => s + a.spentToday, 0);
  const monthlyBurn = agents.reduce((s, a) => s + a.spentMonth, 0);
  const runway = dailyBurn > 0 ? Math.floor((treasury.available - treasury.reserve) / dailyBurn) : Infinity;
  const outbound = decisions.filter((d) => d.verdict === 'execute').reduce((s, d) => s + d.request.amount, 0);
  const slice = range === '24H' ? TREASURY_SERIES.slice(-4) : range === '30D' ? TREASURY_SERIES : TREASURY_SERIES.slice(-7);

  return (
    <>
      <PageHead
        title="Treasury"
        sub="Capital under Nomylax control, how it is allocated, and how long it lasts at the current rate."
        actions={
          <div style={{ display: 'inline-flex', border: '1px solid var(--line-2)', borderRadius: 3, padding: 3 }}>
            {RANGES.map((r) => (
              <button key={r} className="btn btn-sm" style={{ background: range === r ? '#1F2433' : 'transparent', color: range === r ? '#E6EAF2' : 'var(--text-3)' }} onClick={() => setRange(r)}>{r}</button>
            ))}
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
        <div style={{ background: '#151A26' }}><Stat label="Total treasury" value={usdCompact(treasury.total)} /></div>
        <div style={{ background: '#151A26' }}><Stat label="Available" value={usd(treasury.available)} /></div>
        <div style={{ background: '#151A26' }}><Stat label="Allocated" value={usd(treasury.allocated)} sub="Committed to agents" /></div>
        <div style={{ background: '#151A26' }}><Stat label="Protected reserve" value={usd(treasury.reserve)} tone="gold" sub="Outside agent authority" /></div>
        <div style={{ background: '#151A26' }}><Stat label="Daily burn" value={usd(dailyBurn)} /></div>
        <div style={{ background: '#151A26' }}><Stat label="Runway" value={Number.isFinite(runway) ? `${runway}d` : '—'} /></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: 18, marginTop: 18 }}>
        <div className="card">
          <div className="card-hd">
            <div><span className="label">Historical performance · {range}</span><div className="num" style={{ fontSize: 24, marginTop: 8 }}>{usdCompact(treasury.total)}</div></div>
            <span className="num" style={{ color: '#3FD08A', fontSize: 12.5 }}>+7.42%</span>
          </div>
          <div className="card-bd"><AreaChart data={slice} /></div>
        </div>
        <div className="card">
          <div className="card-hd"><span className="label">Asset allocation</span></div>
          <div className="card-bd" style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <Donut slices={ALLOCATION} size={130} />
            <div style={{ flex: 1, minWidth: 140 }}>
              {ALLOCATION.map((s) => (
                <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--text-2)' }}><i style={{ width: 8, height: 8, borderRadius: 2, background: s.color, display: 'block' }} />{s.name}</span>
                  <span className="num" style={{ color: '#E6EAF2' }}>{s.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 18, marginTop: 18 }}>
        <div className="card">
          <div className="card-hd"><span className="label">Burn, last 7 days</span></div>
          <div className="card-bd"><Bars data={DAILY_BURN} /><div className="num" style={{ fontSize: 16, marginTop: 14 }}>{usd(DAILY_BURN[DAILY_BURN.length - 1], 0)} <span style={{ fontSize: 12, color: 'var(--text-3)' }}>most recent day</span></div></div>
        </div>
        <div className="card">
          <div className="card-hd"><span className="label">Allocation by agent</span></div>
          <div className="card-bd">
            {agents.map((a) => {
              const share = (a.constitution.dailyLimit / Math.max(agents.reduce((s, g) => s + g.constitution.dailyLimit, 0), 1)) * 100;
              return (
                <div key={a.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 7 }}>
                    <span style={{ color: 'var(--text-2)' }}>{a.name}</span>
                    <span className="num" style={{ color: '#E6EAF2' }}>{usd(a.constitution.dailyLimit, 0)}/day</span>
                  </div>
                  <div style={{ height: 2, background: '#1F2433' }}><div style={{ width: `${share}%`, height: '100%', background: '#2962FF' }} /></div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card">
          <div className="card-hd"><span className="label">Flow</span></div>
          <div className="card-bd">
            {([['Outbound, executed', usd(outbound), '#FF5C6C'], ['Refused, retained', usd(decisions.reduce((s, d) => s + d.protectedValue, 0)), '#D4AF37'], ['Monthly agent spend', usd(monthlyBurn), '#E6EAF2']] as [string, string, string][]).map(([k, v, c]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
                <span style={{ color: 'var(--text-3)' }}>{k}</span><span className="num" style={{ color: c }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
