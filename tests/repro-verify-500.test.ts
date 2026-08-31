/** TEMPORARY reproduction harness. Deleted once the root cause is proven. */
import { describe, it, expect, beforeEach } from 'vitest';
import { privateKeyToAccount } from 'viem/accounts';
import { setRepository } from '@/server/repo';
import { resetRateLimits } from '@/server/security/rate-limit';
import { POST as nonceRoute } from '@/app/api/auth/nonce/route';
import { POST as verifyRoute } from '@/app/api/auth/verify/route';

const account = privateKeyToAccount('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d');

const post = (url: string, body: unknown) =>
  new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': `10.${Math.floor(Math.random() * 250)}.0.9`,
    },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  process.env.SESSION_SECRET = 'c'.repeat(48);
  process.env.NEXT_PUBLIC_APP_URL = 'https://nomylax.vercel.app';
  process.env.NEXT_PUBLIC_BASE_NETWORK = 'base-sepolia';
  setRepository(null); // force getRepository() to re-select, as a cold lambda would
  resetRateLimits();
});

async function fullSignIn() {
  const nRes = await nonceRoute(post('http://x/api/auth/nonce', { address: account.address }));
  const { nonce, message } = await nRes.json();
  const signature = await account.signMessage({ message });
  const vRes = await verifyRoute(
    post('http://x/api/auth/verify', { address: account.address, message, signature, nonce }),
  );
  return { nonceStatus: nRes.status, verify: vRes, body: await vRes.json() };
}

describe('production repro: DATABASE_URL is set (Neon connected on Vercel)', () => {
  it('reproduces nonce 200 / verify 500', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pw@ep-x.neon.tech/neondb?sslmode=require';
    const r = await fullSignIn();
    console.log('WITH DATABASE_URL  ->', r.nonceStatus, r.verify.status, JSON.stringify(r.body));
    expect(r.nonceStatus).toBe(200);
    expect(r.verify.status).toBe(500);
    expect(r.body.error).toBe('Sign in could not be completed');
  });

  it('succeeds with DATABASE_URL unset, isolating it as the trigger', async () => {
    delete process.env.DATABASE_URL;
    const r = await fullSignIn();
    console.log('WITHOUT DATABASE_URL ->', r.nonceStatus, r.verify.status, JSON.stringify(r.body));
    expect(r.verify.status).toBe(200);
  });
});
