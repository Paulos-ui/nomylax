import { NextResponse } from 'next/server';
import { z } from 'zod';
import { issueNonce, buildChallenge } from '@/server/auth/siwe';
import { addressString, guard, parse } from '@/server/api';
import { activeNetwork } from '@/server/execution/chain';

export const runtime = 'nodejs';

/** Issue a single use challenge for the wallet to sign. */
export async function POST(req: Request) {
  const limited = guard(req, 'auth-nonce', 10);
  if (limited) return limited;

  const parsed = await parse(req, z.object({ address: addressString }));
  if (!parsed.ok) return parsed.response;

  const domain = new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://nomylax.app').host;
  const nonce = issueNonce(parsed.data.address);
  const message = buildChallenge({
    domain, address: parsed.data.address, nonce, chainId: activeNetwork().chainId,
  });

  return NextResponse.json({ nonce, message });
}
