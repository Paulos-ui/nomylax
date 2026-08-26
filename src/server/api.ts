import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifySession, SESSION_COOKIE, type SessionData } from './auth/session';
import { rateLimit, clientKey } from './security/rate-limit';

/**
 * Shared route helpers: uniform errors, validation, authentication and rate
 * limiting. Internal messages are never returned to the caller.
 */

export function fail(status: number, error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

export function serverError(e: unknown, publicMessage = 'The request could not be completed') {
  if (process.env.NODE_ENV !== 'production') console.error('[nomylax]', e);
  return fail(500, publicMessage);
}

export function requireSession(req: Request): SessionData | null {
  const cookie = req.headers.get('cookie') ?? '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return verifySession(match?.[1]);
}

export function guard(req: Request, scope: string, limit: number, windowMs = 60_000) {
  const r = rateLimit(clientKey(req, scope), limit, windowMs);
  if (r.ok) return null;
  return NextResponse.json(
    { error: 'Too many requests. Slow down and try again shortly.' },
    { status: 429, headers: { 'Retry-After': String(r.retryAfter) } },
  );
}

export async function parse<T extends z.ZodTypeAny>(
  req: Request, schema: T,
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; response: NextResponse }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { ok: false, response: fail(400, 'Request body must be valid JSON') };
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    const issue = result.error.issues[0];
    return {
      ok: false,
      response: fail(400, `Invalid request: ${issue.path.join('.') || 'body'} ${issue.message.toLowerCase()}`),
    };
  }
  return { ok: true, data: result.data };
}

/** Financial amounts arrive as decimal strings, never as floats. */
export const amountString = z
  .string()
  .regex(/^\d+(\.\d{1,18})?$/, 'must be a positive decimal string')
  .refine((v) => Number(v) > 0, 'must be greater than zero');

export const addressString = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'must be a 20 byte hex address');

export const intentSchema = z.object({
  agentId: z.string().min(3).max(64),
  intent: z.object({
    type: z.enum(['payment', 'swap', 'deposit']).default('payment'),
    token: z.string().min(2).max(12),
    amount: amountString,
    recipient: addressString,
    purpose: z.string().min(1).max(120),
  }),
  mode: z.enum(['live', 'shadow']).optional(),
});
