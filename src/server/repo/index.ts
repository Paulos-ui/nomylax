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
export function getRepository(): Repository {
  if (instance) return instance;

  const hasDb = !!process.env.DATABASE_URL;
  if (!hasDb && process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is required in production. Refusing to run on process local storage.');
  }
  if (hasDb) {
    // Postgres implementation lands with the migration work. Until then this
    // is an explicit failure rather than a pretence of persistence.
    throw new Error(
      'DATABASE_URL is set but the Postgres repository is not wired up yet. Unset it to use development storage.',
    );
  }

  instance = new MemoryRepository();
  return instance;
}

export function setRepository(r: Repository | null) { instance = r; }
export { MemoryRepository };
export type { Repository };
