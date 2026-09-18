/**
 * Route level authentication tests.
 *
 * These exercise /api/auth/nonce and /api/auth/verify as HTTP handlers rather
 * than testing the SIWE primitives in isolation, because the vulnerability this
 * file exists to pin shut lived in the route, not in the crypto: the primitives
 * were correct and the route simply did not use them.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { privateKeyToAccount } from 'viem/accounts';
import { setRepository } from '@/server/repo';
import { resetNonces } from '@/server/auth/siwe';
import { resetRateLimits } from '@/server/security/rate-limit';
import { POST as nonceRoute } from '@/app/api/auth/nonce/route';
import { POST as verifyRoute } from '@/app/api/auth/verify/route';

const account = privateKeyToAccount('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d');
const attacker = privateKeyToAccount(`0x${'2'.repeat(64)}` as `0x${string}`);

/**
 * Each request gets a distinct forwarded address. The limiter allows ten
 * attempts per key per minute and these tests make more than ten calls, so a
 * shared key would turn later assertions into 429s.
 */
const post = (url: string, body: unknown) =>
  new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.9`,
    },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  process.env.SESSION_SECRET = 'c'.repeat(48);
  process.env.NEXT_PUBLIC_APP_URL = 'https://nomylax.vercel.app';
  process.env.NEXT_PUBLIC_BASE_NETWORK = 'base-sepolia';
  delete process.env.DATABASE_URL;
  setRepository(null); // force getRepository() to re-select, as a cold lambda would
  resetNonces();
  resetRateLimits();
});

async function challengeFor(address: string) {
  const res = await nonceRoute(post('http://x/api/auth/nonce', { address }));
  expect(res.status).toBe(200);
  return res.json() as Promise<{ nonce: string; message: string }>;
}

const verify = (body: unknown) => verifyRoute(post('http://x/api/auth/verify', body));

describe('sign in, happy path', () => {
  it('accepts a signature over the issued challenge and sets a session cookie', async () => {
    const { nonce, message } = await challengeFor(account.address);
    const signature = await account.signMessage({ message });

    const res = await verify({ address: account.address, message, signature, nonce });
    expect(res.status).toBe(200);
    expect((await res.json()).address).toBe(account.address.toLowerCase());

    // Case insensitively, because cookie attribute casing is the serializer's
    // choice and not something this test should pin.
    const cookie = (res.headers.get('set-cookie') ?? '').toLowerCase();
    expect(cookie).toContain('nomylax_session=');
    expect(cookie).toContain('httponly');
    expect(cookie).toContain('samesite=lax');
  });

  it('still signs in when DATABASE_URL is set but Postgres is unimplemented', async () => {
    // Storage selection used to throw here, after the signature had already been
    // validated, which surfaced as an unexplained 500 on an otherwise correct
    // sign in. Durability is degraded in this state; availability must not be.
    process.env.DATABASE_URL = 'postgresql://user:pw@ep-x.neon.tech/neondb?sslmode=require';
    setRepository(null);

    const { nonce, message } = await challengeFor(account.address);
    const signature = await account.signMessage({ message });

    const res = await verify({ address: account.address, message, signature, nonce });
    expect(res.status).toBe(200);
  });
});

describe('sign in refuses a signature the server did not ask for', () => {
  /**
   * The account takeover this guards against. /api/auth/nonce hands a valid
   * challenge to any anonymous caller for any address, so an attacker can mint
   * one for a victim, present the victim arbitrary text that happens to carry
   * the nonce, and replay the resulting signature here. The route once accepted
   * it, because its only check was that the message contained the nonce.
   */
  it('rejects a genuine signature over attacker chosen text carrying the nonce', async () => {
    const { nonce } = await challengeFor(account.address);
    const decoy = `Claim your NOMYLAX allocation. Reference code: ${nonce}. No funds will move.`;
    const signature = await account.signMessage({ message: decoy });

    const res = await verify({ address: account.address, message: decoy, signature, nonce });
    expect(res.status).toBe(400);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('rejects a challenge with an appended instruction', async () => {
    const { nonce, message } = await challengeFor(account.address);
    const tampered = `${message}\nResources: https://evil.example/drain`;
    const signature = await account.signMessage({ message: tampered });

    const res = await verify({ address: account.address, message: tampered, signature, nonce });
    expect(res.status).toBe(400);
  });

  it('rejects a challenge bound to a different domain', async () => {
    const { nonce, message } = await challengeFor(account.address);
    const signature = await account.signMessage({ message });

    // The same wallet, the same live nonce, but the deployment now answers for a
    // different host, so the challenge it would have issued no longer matches.
    process.env.NEXT_PUBLIC_APP_URL = 'https://nomylax-preview.vercel.app';

    const res = await verify({ address: account.address, message, signature, nonce });
    expect(res.status).toBe(400);
  });

  it('rejects a challenge bound to a different chain', async () => {
    const { nonce, message } = await challengeFor(account.address);
    const signature = await account.signMessage({ message });

    process.env.NEXT_PUBLIC_BASE_NETWORK = 'base';

    const res = await verify({ address: account.address, message, signature, nonce });
    expect(res.status).toBe(400);
  });
});

describe('sign in refuses a mismatched wallet or a spent challenge', () => {
  it('rejects a signature produced by another wallet', async () => {
    const { nonce, message } = await challengeFor(account.address);
    const signature = await attacker.signMessage({ message });

    const res = await verify({ address: account.address, message, signature, nonce });
    expect(res.status).toBe(401);
  });

  it('rejects a challenge issued to a different address', async () => {
    const { nonce, message } = await challengeFor(account.address);
    const signature = await attacker.signMessage({ message });

    const res = await verify({ address: attacker.address, message, signature, nonce });
    expect(res.status).toBe(401);
  });

  it('rejects the second use of a challenge', async () => {
    const { nonce, message } = await challengeFor(account.address);
    const signature = await account.signMessage({ message });

    expect((await verify({ address: account.address, message, signature, nonce })).status).toBe(200);

    const replay = await verify({ address: account.address, message, signature, nonce });
    expect(replay.status).toBe(401);
    expect(replay.headers.get('set-cookie')).toBeNull();
  });

  it('spends the challenge even when the message does not match, so it cannot be retried', async () => {
    const { nonce, message } = await challengeFor(account.address);
    const decoy = `Unrelated text that still carries the reference ${nonce} inside it.`;

    const first = await verify({
      address: account.address,
      message: decoy,
      signature: await account.signMessage({ message: decoy }),
      nonce,
    });
    expect(first.status).toBe(400);

    // Correct message, correct signature, but the challenge is already spent.
    const second = await verify({
      address: account.address,
      message,
      signature: await account.signMessage({ message }),
      nonce,
    });
    expect(second.status).toBe(401);
  });

  it('rejects an unknown challenge', async () => {
    const { message } = await challengeFor(account.address);
    const forged = 'f'.repeat(57);

    const res = await verify({
      address: account.address,
      message,
      signature: await account.signMessage({ message }),
      nonce: forged,
    });
    expect(res.status).toBe(401);
  });
});

describe('sign in input handling', () => {
  it('rejects a malformed address before doing any work', async () => {
    const res = await verify({
      address: '0xnot-an-address', message: 'x'.repeat(64), signature: '0xabcdef', nonce: 'a'.repeat(57),
    });
    expect(res.status).toBe(400);
  });

  it('rejects a non JSON body', async () => {
    const res = await verifyRoute(new Request('http://x/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.9.9.9' },
      body: 'not json',
    }));
    expect(res.status).toBe(400);
  });
});
