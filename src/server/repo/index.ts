import { MemoryRepository } from './memory';
import type { Repository } from './types';

let instance: Repository | null = null;

/**
 * Returns the active repository.
 *
 * Postgres is selected when DATABASE_URL is present. In production a missing
 * DATABASE_URL is a hard failure rather than a silent downgrade to memory,
 * because process local storage would lose the audit trail on every restart.
 */
let warned = false;

function warnOnce(message: string) {
  if (warned) return;
  warned = true;
  console.error(`[nomylax] STORAGE_DEGRADED ${message}`);
}

export function getRepository(): Repository {
  if (instance) return instance;

  // A configured DATABASE_URL used to throw here, and every route that touches
  // storage threw with it, including /api/auth/verify after the wallet signature
  // had already been validated. That surfaced as an unexplained 500 on sign in.
  //
  // The Postgres implementation is still outstanding, so this cannot honour the
  // variable. It degrades to process local storage and says so on every cold
  // start rather than taking the whole application down for a gap that only
  // affects durability.
  if (process.env.DATABASE_URL) {
    warnOnce(
      'DATABASE_URL is set but the Postgres repository is not implemented. '
      + 'Using process local storage: workspaces, decisions and the audit trail '
      + 'do not persist across instances or restarts.',
    );
  } else if (process.env.NODE_ENV === 'production') {
    warnOnce(
      'DATABASE_URL is not set. Using process local storage: workspaces, decisions '
      + 'and the audit trail do not persist across instances or restarts.',
    );
  }

  instance = new MemoryRepository();
  return instance;
}

export function setRepository(r: Repository | null) { instance = r; }
export { MemoryRepository };
export type { Repository };
