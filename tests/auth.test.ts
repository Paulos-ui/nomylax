import { describe, it, expect, beforeEach } from 'vitest';
import { privateKeyToAccount } from 'viem/accounts';
import { signSession, verifySession, newSession, SESSION_TTL_MS } from '@/server/auth/session';
import { issueNonce, consumeNonce, buildChallenge, verifyChallenge, resetNonces, NONCE_TTL_MS } from '@/server/auth/siwe';

const KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
const account = privateKeyToAccount(KEY);

beforeEach(() => {
  process.env.SESSION_SECRET = 'a'.repeat(48);
  resetNonces();
});

describe('sessions', () => {
  it('round trips a signed session', () => {
    const s = newSession(account.address, 'ws_1');
    expect(verifySession(signSession(s))?.address).toBe(account.address.toLowerCase());
  });

  it('rejects a tampered payload', () => {
    const token = signSession(newSession(account.address, 'ws_1'));
    const [body, tag] = token.split('.');
    const forged = Buffer.from(JSON.stringify({
      address: '0x' + '9'.repeat(40), workspaceId: 'ws_evil',
      issuedAt: Date.now(), expiresAt: Date.now() + 1e6,
    })).toString('base64url');
    expect(verifySession(`${forged}.${tag}`)).toBeNull();
    expect(verifySession(`${body}.${'x'.repeat(tag.length)}`)).toBeNull();
  });

  it('rejects an expired session', () => {
    const s = newSession(account.address, null, Date.now() - SESSION_TTL_MS - 1000);
    expect(verifySession(signSession(s))).toBeNull();
  });

  it('rejects garbage and empty tokens', () => {
    expect(verifySession(undefined)).toBeNull();
    expect(verifySession('')).toBeNull();
    expect(verifySession('nonsense')).toBeNull();
  });

  it('refuses to sign without an adequate secret', () => {
    process.env.SESSION_SECRET = 'short';
    expect(() => signSession(newSession(account.address, null))).toThrow();
  });
});

describe('wallet ownership proof', () => {
  it('verifies a genuine signature over the challenge', async () => {
    const nonce = issueNonce(account.address);
    const message = buildChallenge({ domain: 'nomylax.app', address: account.address, nonce, chainId: 84532 });
    const signature = await account.signMessage({ message });
    expect(await verifyChallenge({ address: account.address, message, signature })).toBe(true);
    expect(consumeNonce(nonce, account.address)).toEqual({ ok: true });
  });

  it('rejects a signature from a different wallet', async () => {
    const other = privateKeyToAccount('0x' + '2'.repeat(64) as `0x${string}`);
    const nonce = issueNonce(account.address);
    const message = buildChallenge({ domain: 'nomylax.app', address: account.address, nonce, chainId: 84532 });
    const signature = await other.signMessage({ message });
    expect(await verifyChallenge({ address: account.address, message, signature })).toBe(false);
  });

  it('rejects a replayed nonce', () => {
    const nonce = issueNonce(account.address);
    expect(consumeNonce(nonce, account.address).ok).toBe(true);
    expect(consumeNonce(nonce, account.address)).toEqual({ ok: false, reason: 'replayed' });
  });

  it('rejects an expired nonce', () => {
    const now = Date.now();
    const nonce = issueNonce(account.address, now);
    expect(consumeNonce(nonce, account.address, now + NONCE_TTL_MS + 1)).toEqual({ ok: false, reason: 'expired' });
  });

  it('rejects a nonce issued to a different address', () => {
    const nonce = issueNonce(account.address);
    expect(consumeNonce(nonce, '0x' + '7'.repeat(40))).toEqual({ ok: false, reason: 'wrong-address' });
  });

  it('rejects an unknown nonce', () => {
    expect(consumeNonce('deadbeef', account.address)).toEqual({ ok: false, reason: 'unknown' });
  });

  it('states plainly that no funds move', () => {
    const msg = buildChallenge({ domain: 'nomylax.app', address: account.address, nonce: 'n', chainId: 84532 });
    expect(msg).toContain('does not grant Nomylax permission to move funds');
  });
});
