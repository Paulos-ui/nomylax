import { NextResponse } from 'next/server';
import { z } from 'zod';
import { consumeNonce, verifyChallenge } from '@/server/auth/siwe';
import { newSession, signSession, SESSION_COOKIE, sessionCookieOptions } from '@/server/auth/session';
import { getRepository } from '@/server/repo';
import { addressString, fail, guard, parse, serverError } from '@/server/api';

export const runtime = 'nodejs';

const schema = z.object({
  address: addressString,
  message: z.string().min(32).max(2000),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
  nonce: z.string().min(8).max(64),
});

/** Verify the signature, consume the nonce, issue a session. */
export async function POST(req: Request) {
  const limited = guard(req, 'auth-verify', 10);
  if (limited) return limited;

  const parsed = await parse(req, schema);
  if (!parsed.ok) return parsed.response;
  const { address, message, signature, nonce } = parsed.data;

  try {
    if (!message.includes(nonce)) {
      return fail(400, 'The signed message does not contain the issued challenge');
    }

    const consumed = consumeNonce(nonce, address);
    if (!consumed.ok) {
      const reason = {
        unknown: 'Challenge not recognised. Request a new one.',
        expired: 'Challenge expired. Request a new one.',
        replayed: 'This challenge has already been used.',
        'wrong-address': 'Challenge was issued to a different wallet.',
      }[consumed.reason];
      return fail(401, reason);
    }

    const valid = await verifyChallenge({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
    if (!valid) return fail(401, 'Signature does not match this wallet');

    const repo = getRepository();
    const workspace = await repo.getWorkspaceByOwner(address);
    const token = signSession(newSession(address, workspace?.id ?? null));

    await repo.appendAudit({
      id: `aud_login_${Date.now()}`,
      ts: Date.now(),
      actor: address.toLowerCase(),
      workspaceId: workspace?.id ?? null,
      agentId: null,
      action: 'auth.login',
      detail: { method: 'wallet-signature' },
    });

    const res = NextResponse.json({
      address: address.toLowerCase(),
      workspaceId: workspace?.id ?? null,
    });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  } catch (e) {
    return serverError(e, 'Sign in could not be completed');
  }
}
