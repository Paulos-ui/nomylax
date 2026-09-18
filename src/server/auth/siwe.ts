import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { getAddress, verifyMessage } from 'viem';
import { authSecret } from './session';

/**
 * Wallet ownership proof.
 *
 * A wallet address sent by a browser proves nothing. The owner must sign a
 * challenge containing a server issued nonce.
 *
 * The nonce is a self authenticating token rather than a row in a process local
 * Map. /api/auth/nonce and /api/auth/verify are separate serverless invocations
 * and are routinely served by different instances, so an instance local Map made
 * the challenge unrecognisable to the instance that had to verify it. The token
 * therefore carries its own expiry and an address binding, authenticated by an
 * HMAC under SESSION_SECRET, and any instance can validate it without shared
 * state.
 *
 * Replay: the token is marked used in an instance local set, which stops replay
 * against the same instance but not across the fleet. Within the five minute
 * window a captured signature could be replayed against a different instance.
 * That is a smaller exposure than the previous behaviour, which failed sign in
 * outright, and it is removed entirely by moving the used set to Postgres or
 * Redis. Recorded as a known limitation rather than left implicit.
 */

export const NONCE_TTL_MS = 5 * 60 * 1000;

const RAND_LEN = 16; // 8 random bytes as hex
const EXP_LEN = 9; // expiry in ms, base36, zero padded
const FP_LEN = 8; // address binding
const TAG_LEN = 24; // 96 bit authentication tag
const NONCE_LEN = RAND_LEN + EXP_LEN + FP_LEN + TAG_LEN; // 57, inside the 8..64 schema bound
const NONCE_SHAPE = new RegExp(`^[0-9a-z]{${NONCE_LEN}}$`);

/** Domain separated so a nonce tag can never be confused with a session tag. */
const hmac = (label: string, data: string) =>
  createHmac('sha256', authSecret()).update(`${label}|${data}`).digest('hex');

const fingerprint = (address: string) =>
  hmac('nomylax-nonce-fp:v1', address.toLowerCase()).slice(0, FP_LEN);

const tagFor = (rand: string, exp: string, fp: string) =>
  hmac('nomylax-nonce:v1', `${rand}${exp}${fp}`).slice(0, TAG_LEN);

/** Instance local, best effort replay rejection. Not the integrity mechanism. */
const used = new Map<string, number>();

export function issueNonce(address: string, now = Date.now()): string {
  sweepNonces(now);
  const rand = randomBytes(RAND_LEN / 2).toString('hex');
  const exp = (now + NONCE_TTL_MS).toString(36).padStart(EXP_LEN, '0');
  const fp = fingerprint(address);
  return `${rand}${exp}${fp}${tagFor(rand, exp, fp)}`;
}

export type NonceFailure = 'unknown' | 'expired' | 'replayed' | 'wrong-address';

export function consumeNonce(
  nonce: string, address: string, now = Date.now(),
): { ok: true } | { ok: false; reason: NonceFailure } {
  if (typeof nonce !== 'string' || !NONCE_SHAPE.test(nonce)) return { ok: false, reason: 'unknown' };

  const rand = nonce.slice(0, RAND_LEN);
  const exp = nonce.slice(RAND_LEN, RAND_LEN + EXP_LEN);
  const fp = nonce.slice(RAND_LEN + EXP_LEN, RAND_LEN + EXP_LEN + FP_LEN);
  const tag = nonce.slice(RAND_LEN + EXP_LEN + FP_LEN);

  // Not issued by this deployment, or altered in transit.
  const expected = Buffer.from(tagFor(rand, exp, fp));
  const given = Buffer.from(tag);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { ok: false, reason: 'unknown' };
  }

  const expiresAt = parseInt(exp, 36);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) {
    used.delete(nonce);
    return { ok: false, reason: 'expired' };
  }

  if (fp !== fingerprint(address)) return { ok: false, reason: 'wrong-address' };

  if (used.has(nonce)) return { ok: false, reason: 'replayed' };
  used.set(nonce, expiresAt);
  return { ok: true };
}

export function sweepNonces(now = Date.now()) {
  for (const [k, expiresAt] of used) if (expiresAt <= now) used.delete(k);
}

/**
 * Recovers the millisecond at which a nonce was issued.
 *
 * The expiry segment is written as issue time + NONCE_TTL_MS, so the issue time
 * is recoverable from the token itself with no shared state. This is what lets
 * /api/auth/verify rebuild the challenge instead of trusting the message the
 * client submits.
 *
 * Call this only on a nonce that consumeNonce has already accepted. The expiry
 * segment is covered by the HMAC tag, but this function does not check the tag,
 * so on its own it is reading unauthenticated input.
 */
export function nonceIssuedAt(nonce: string): number | null {
  if (typeof nonce !== 'string' || !NONCE_SHAPE.test(nonce)) return null;
  const expiresAt = parseInt(nonce.slice(RAND_LEN, RAND_LEN + EXP_LEN), 36);
  if (!Number.isFinite(expiresAt)) return null;
  return expiresAt - NONCE_TTL_MS;
}

export function resetNonces() { used.clear(); }

/**
 * Builds the exact text the wallet is asked to sign.
 *
 * Every field is derived from the nonce, the deployment's own configuration, or
 * the address the nonce is bound to. Nothing here may depend on request content
 * that a caller could vary, because /api/auth/verify rebuilds this string and
 * requires a byte for byte match before it will accept a signature over it.
 *
 * The address is EIP-55 checksummed so the same wallet yields the same
 * challenge whatever casing the client sent.
 */
export function buildChallenge(params: {
  domain: string; address: string; nonce: string; chainId: number; issuedAt?: string;
}): string {
  const issuedAt = params.issuedAt ?? new Date().toISOString();
  const address = getAddress(params.address);
  return [
    `${params.domain} wants you to sign in with your Ethereum account:`,
    address,
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
