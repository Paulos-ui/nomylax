import { verifyMessage } from 'viem';
import { newNonce } from './session';

/**
 * Wallet ownership proof.
 *
 * A wallet address sent by a browser proves nothing. The owner must sign a
 * challenge containing a server issued nonce, and the nonce is consumed on
 * first use so a captured signature cannot be replayed.
 */

export const NONCE_TTL_MS = 5 * 60 * 1000;

interface NonceRecord { address: string; expiresAt: number; used: boolean }
const nonces = new Map<string, NonceRecord>();

export function issueNonce(address: string, now = Date.now()): string {
  sweepNonces(now);
  const nonce = newNonce();
  nonces.set(nonce, { address: address.toLowerCase(), expiresAt: now + NONCE_TTL_MS, used: false });
  return nonce;
}

export type NonceFailure = 'unknown' | 'expired' | 'replayed' | 'wrong-address';

export function consumeNonce(
  nonce: string, address: string, now = Date.now(),
): { ok: true } | { ok: false; reason: NonceFailure } {
  const rec = nonces.get(nonce);
  if (!rec) return { ok: false, reason: 'unknown' };
  if (rec.used) return { ok: false, reason: 'replayed' };
  if (rec.expiresAt <= now) { nonces.delete(nonce); return { ok: false, reason: 'expired' }; }
  if (rec.address !== address.toLowerCase()) return { ok: false, reason: 'wrong-address' };
  rec.used = true;
  return { ok: true };
}

export function sweepNonces(now = Date.now()) {
  for (const [k, v] of nonces) if (v.expiresAt <= now) nonces.delete(k);
}

export function resetNonces() { nonces.clear(); }

export function buildChallenge(params: {
  domain: string; address: string; nonce: string; chainId: number; issuedAt?: string;
}): string {
  const issuedAt = params.issuedAt ?? new Date().toISOString();
  return [
    `${params.domain} wants you to sign in with your Ethereum account:`,
    params.address,
    '',
    'Sign in to Nomylax. This signature proves you control this wallet. It does not grant Nomylax permission to move funds and does not cost gas.',
    '',
    `URI: https://${params.domain}`,
    'Version: 1',
    `Chain ID: ${params.chainId}`,
    `Nonce: ${params.nonce}`,
    `Issued At: ${issuedAt}`,
  ].join('\n');
}

export async function verifyChallenge(params: {
  address: `0x${string}`; message: string; signature: `0x${string}`;
}): Promise<boolean> {
  try {
    return await verifyMessage({
      address: params.address,
      message: params.message,
      signature: params.signature,
    });
  } catch {
    return false;
  }
}
