import { describe, it, expect, beforeEach } from 'vitest';
import { privateKeyToAccount } from 'viem/accounts';
import { MemoryRepository, setRepository } from '@/server/repo';
import { signSession, newSession, SESSION_COOKIE } from '@/server/auth/session';
import { resetRateLimits } from '@/server/security/rate-limit';
import { nextVersion } from '@/server/repo/constitution';
import { PROFILE_TEMPLATES } from '@/lib/constitutions';
import { POST as decisions } from '@/app/api/decisions/route';
import { POST as agentIntents } from '@/app/api/agents/intents/route';
import { POST as shadow } from '@/app/api/shadow/route';
import type { StoredAgent } from '@/server/repo/types';

const owner = privateKeyToAccount('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d');
const intruder = privateKeyToAccount(('0x' + '3'.repeat(64)) as `0x${string}`);
const APPROVED = '0xaaa0000000000000000000000000000000000001';

let repo: MemoryRepository;

const agentRecord = (over: Partial<StoredAgent> = {}): StoredAgent => ({
  id: 'agt_test', name: 'Research Scout', type: 'research', mode: 'live', state: 'autonomous',
  constitution: { ...PROFILE_TEMPLATES.conservative, approvedRecipients: [APPROVED] },
  spentToday: 0, spentMonth: 0, failedCount: 0, riskScore: 0, createdAt: Date.now(),
  workspaceId: 'ws_1', ownerAddress: owner.address, enabled: true, constitutionVersion: 1, ...over,
});

async function seed(over: Partial<StoredAgent> = {}) {
  const agent = agentRecord(over);
  await repo.saveAgent(agent);
  await repo.appendConstitutionVersion(
    nextVersion(agent.id, null, agent.constitution, owner.address),
  );
  await repo.saveTreasury('ws_1', { total: 5000, available: 5000, allocated: 0, reserve: 100 });
  return agent;
}

const post = (url: string, body: unknown, session?: string) =>
  new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': `10.${Math.floor(Math.random() * 250)}.0.1`,
      ...(session ? { cookie: `${SESSION_COOKIE}=${session}` } : {}),
    },
    body: JSON.stringify(body),
  });

const ownerSession = () => signSession(newSession(owner.address, 'ws_1'));
const intruderSession = () => signSession(newSession(intruder.address, 'ws_2'));

const validIntent = (over: Record<string, unknown> = {}) => ({
  agentId: 'agt_test',
  intent: { type: 'payment', token: 'USDC', amount: '4.50', recipient: APPROVED, purpose: 'Market dataset', ...over },
});

beforeEach(() => {
  process.env.SESSION_SECRET = 'b'.repeat(48);
  delete process.env.EXECUTOR_PRIVATE_KEY;
  repo = new MemoryRepository();
  setRepository(repo);
  resetRateLimits();
});

describe('authentication is enforced', () => {
  it('refuses an unauthenticated decision', async () => {
    const res = await decisions(post('http://x/api/decisions', validIntent()));
    expect(res.status).toBe(401);
  });

  it('refuses a forged session cookie', async () => {
    const res = await decisions(post('http://x/api/decisions', validIntent(), 'forged.token'));
    expect(res.status).toBe(401);
  });

  it('refuses an expired session', async () => {
    await seed();
    const stale = signSession(newSession(owner.address, 'ws_1', Date.now() - 24 * 60 * 60 * 1000));
    const res = await decisions(post('http://x/api/decisions', validIntent(), stale));
    expect(res.status).toBe(401);
  });

  it('refuses another wallet access to the agent, without disclosing it exists', async () => {
    await seed();
    const res = await decisions(post('http://x/api/decisions', validIntent(), intruderSession()));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('Agent not found');
  });
});

describe('server is the source of truth', () => {
  it('ignores limits supplied by the caller', async () => {
    await seed(); // maxTransaction is 10 in storage
    const res = await decisions(post('http://x/api/decisions', {
      ...validIntent({ amount: '500.00' }),
      // A compromised client attempting to raise its own ceiling.
      agent: { constitution: { maxTransaction: 100000, dailyLimit: 100000, riskThreshold: 100 } },
      constitution: { maxTransaction: 100000 },
      treasury: { total: 1e9, available: 1e9, allocated: 0, reserve: 0 },
    }, ownerSession()));

    const body = await res.json();
    expect(body.decision.verdict).toBe('blocked');
    expect(body.decision.reason).toContain('Single transaction limit');
    expect(body.decision.checks.find((c: any) => c.id === 'maxTx').detail).toContain('$10.00');
  });

  it('records the constitution version that produced the decision', async () => {
    await seed();
    const res = await decisions(post('http://x/api/decisions', validIntent(), ownerSession()));
    const body = await res.json();
    expect(body.constitution.version).toBe(1);
    expect(body.constitution.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('refuses an agent with no active constitution', async () => {
    await repo.saveAgent(agentRecord());
    await repo.saveTreasury('ws_1', { total: 5000, available: 5000, allocated: 0, reserve: 100 });
    const res = await decisions(post('http://x/api/decisions', validIntent(), ownerSession()));
    expect(res.status).toBe(409);
  });

  it('refuses a disabled agent', async () => {
    await seed({ enabled: false });
    expect((await decisions(post('http://x/api/decisions', validIntent(), ownerSession()))).status).toBe(409);
  });

  it('blocks execution while safe mode is active', async () => {
    await seed({ state: 'safe' });
    const body = await (await decisions(post('http://x/api/decisions', validIntent(), ownerSession()))).json();
    expect(body.decision.verdict).toBe('blocked');
    expect(body.decision.reason).toContain('Safe mode');
  });
});

describe('no synthetic execution', () => {
  it('never returns a transaction hash when the executor is unconfigured', async () => {
    await seed();
    const body = await (await decisions(post('http://x/api/decisions', validIntent(), ownerSession()))).json();
    expect(body.decision.txHash).toBeUndefined();
    expect(body.execution.ok).toBe(false);
    expect(body.execution.stage).toBe('preflight');
    expect(body.execution.error).toContain('not configured');
    // An approved decision that could not execute is not reported as executed.
    expect(body.decision.verdict).toBe('blocked');
  });

  it('reports the active network on every decision', async () => {
    await seed();
    const body = await (await decisions(post('http://x/api/decisions', validIntent(), ownerSession()))).json();
    expect(body.network.chainId).toBe(84532);
    expect(body.network.testnet).toBe(true);
  });
});

describe('input validation', () => {
  it('rejects a malformed body', async () => {
    const req = new Request('http://x/api/decisions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', cookie: `${SESSION_COOKIE}=${ownerSession()}` },
      body: 'not json',
    });
    expect((await decisions(req)).status).toBe(400);
  });

  it('rejects a non address recipient', async () => {
    await seed();
    const res = await decisions(post('http://x/api/decisions', validIntent({ recipient: 'not-an-address' }), ownerSession()));
    expect(res.status).toBe(400);
  });

  it('rejects a float amount and negative values', async () => {
    await seed();
    expect((await decisions(post('http://x/api/decisions', validIntent({ amount: 4.5 }), ownerSession()))).status).toBe(400);
    expect((await decisions(post('http://x/api/decisions', validIntent({ amount: '-4.50' }), ownerSession()))).status).toBe(400);
    expect((await decisions(post('http://x/api/decisions', validIntent({ amount: '0' }), ownerSession()))).status).toBe(400);
  });
});

describe('agent gateway cannot be redirected', () => {
  it('ignores any endpoint in the request body', async () => {
    await seed({ endpoint: 'https://agent.example.com/intents' });
    process.env.AGENT_API_KEY = 'secret-key';
    const res = await agentIntents(post('http://x/api/agents/intents', {
      agentId: 'agt_test',
      endpoint: 'https://attacker.example.com/steal', // must be ignored
    }, ownerSession()));
    // Reaches the registered host, which does not resolve in tests.
    expect([502, 404]).toContain(res.status);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain('attacker');
  });

  it('refuses a registered endpoint that points at internal infrastructure', async () => {
    await seed({ endpoint: 'http://169.254.169.254/latest/meta-data/' });
    process.env.AGENT_API_KEY = 'secret-key';
    const res = await agentIntents(post('http://x/api/agents/intents', { agentId: 'agt_test' }, ownerSession()));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('refused');
  });

  it('requires authentication', async () => {
    await seed({ endpoint: 'https://agent.example.com/intents' });
    expect((await agentIntents(post('http://x/api/agents/intents', { agentId: 'agt_test' }))).status).toBe(401);
  });

  it('refuses a paused agent', async () => {
    await seed({ endpoint: 'https://agent.example.com/intents', mode: 'paused' });
    process.env.AGENT_API_KEY = 'secret-key';
    const res = await agentIntents(post('http://x/api/agents/intents', { agentId: 'agt_test' }, ownerSession()));
    expect(res.status).toBe(409);
  });
});

describe('shadow route', () => {
  it('requires authentication', async () => {
    expect((await shadow(post('http://x/api/shadow', { agentId: 'agt_test' }))).status).toBe(401);
  });

  it('never settles and never returns a hash', async () => {
    await seed();
    const body = await (await shadow(post('http://x/api/shadow', { agentId: 'agt_test' }, ownerSession()))).json();
    expect(body.report.decisions.every((d: any) => d.simulated)).toBe(true);
    expect(body.report.decisions.every((d: any) => d.txHash === undefined)).toBe(true);
  });

  it('refuses another wallet', async () => {
    await seed();
    expect((await shadow(post('http://x/api/shadow', { agentId: 'agt_test' }, intruderSession()))).status).toBe(404);
  });
});
