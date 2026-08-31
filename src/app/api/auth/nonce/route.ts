import { NextResponse } from 'next/server';
import { z } from 'zod';
import { issueNonce, buildChallenge } from '@/server/auth/siwe';
import { SessionError } from '@/server/auth/session';
import { ChainConfigError, activeNetwork } from '@/server/execution/chain';
import { authLog, noncePreview } from '@/server/auth/diagnostics';
import { addressString, configError, guard, parse, serverError } from '@/server/api';

export const runtime = 'nodejs';

/** Issue a single use challenge for the wallet to sign. */
export async function POST(req: Request) {
  const limited = guard(req, 'auth-nonce', 10);
  if (limited) return limited;

  const parsed = await parse(req, z.object({ address: addressString }));
  if (!parsed.ok) return parsed.response;
  const { address } = parsed.data;

  // The nonce is now authenticated under SESSION_SECRET and the network is read
  // from configuration, so both can fail on a misconfigured deployment. Neither
  // should surface as an unexplained 500.
  try {
    const domain = new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://nomylax.app').host;
    const chainId = activeNetwork().chainId;
    const nonce = issueNonce(address);
    const message = buildChallenge({ domain, address, nonce, chainId });

    authLog('AUTH_NONCE_ISSUE', 'ok', {
      address, domain, chainId, nonce: noncePreview(nonce),
    });

    return NextResponse.json({ nonce, message });
  } catch (e) {
    authLog('AUTH_NONCE_ISSUE', 'fail', {
      address,
      cause: e instanceof Error ? e.name : 'unknown',
    });
    if (e instanceof SessionError || e instanceof ChainConfigError) {
      return configError(e, 'Sign in is temporarily unavailable. The server is misconfigured.');
    }
    return serverError(e, 'A challenge could not be issued');
  }
}
