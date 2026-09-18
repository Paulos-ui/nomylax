/**
 * Superseded. Delete this file.
 *
 * This was a temporary harness that reproduced the sign in 500 by asserting the
 * failure itself. The cause is fixed and the assertion inverted, so the harness
 * was the only thing keeping the suite red. The behaviour worth keeping —
 * sign in must survive a configured DATABASE_URL that Postgres cannot yet
 * honour — now lives in tests/auth-routes.test.ts alongside the rest of the
 * route level coverage.
 *
 * It is left here as a skipped suite only because this session had no shell to
 * remove it with.
 */
import { describe, it } from 'vitest';

describe.skip('superseded by tests/auth-routes.test.ts', () => {
  it('moved', () => {});
});
