/**
 * Money is never a JavaScript float in Nomylax.
 *
 * Every settled value is a bigint in the token's smallest unit. Display code
 * may format to a string; nothing else converts back to Number. The policy
 * engine compares bigints, so 0.1 + 0.2 problems cannot reach a limit check.
 */

export interface TokenSpec {
  symbol: string;
  decimals: number;
  /** Contract address per chain id. Native assets use the zero sentinel. */
  addresses: Record<number, `0x${string}`>;
}

export const NATIVE = '0x0000000000000000000000000000000000000000' as const;

export const TOKENS: Record<string, TokenSpec> = {
  USDC: {
    symbol: 'USDC',
    decimals: 6,
    addresses: {
      8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    },
  },
  ETH: { symbol: 'ETH', decimals: 18, addresses: { 8453: NATIVE, 84532: NATIVE } },
};

export function tokenSpec(symbol: string): TokenSpec {
  const t = TOKENS[symbol.toUpperCase()];
  if (!t) throw new MoneyError(`Unsupported token: ${symbol}`);
  return t;
}

export class MoneyError extends Error {}

/**
 * Parse a decimal string into base units without touching Number.
 * "4.50" at 6 decimals becomes 4500000n.
 */
export function parseAmount(input: string | number, decimals: number): bigint {
  const raw = typeof input === 'number' ? decimalFromNumber(input) : input.trim();
  if (!/^\d+(\.\d+)?$/.test(raw)) throw new MoneyError(`Malformed amount: ${input}`);

  const [whole, frac = ''] = raw.split('.');
  if (frac.length > decimals) {
    throw new MoneyError(`Amount has more precision than ${decimals} decimals: ${input}`);
  }
  return BigInt(whole + frac.padEnd(decimals, '0'));
}

/** Format base units back to a decimal string. Display only. */
export function formatAmount(units: bigint, decimals: number, dp = decimals): string {
  const neg = units < 0n;
  const abs = neg ? -units : units;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const frac = (abs % base).toString().padStart(decimals, '0').slice(0, dp);
  const s = dp > 0 ? `${whole}.${frac}` : whole.toString();
  return neg ? `-${s}` : s;
}

/** Grouped display, e.g. 1234500000n at 6dp becomes "1,234.50". */
export function displayAmount(units: bigint, decimals: number, dp = 2): string {
  const s = formatAmount(units, decimals, dp);
  const [w, f] = s.split('.');
  const grouped = w.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return f ? `${grouped}.${f}` : grouped;
}

/** Numbers coming from JSON payloads are converted through a string first. */
function decimalFromNumber(n: number): string {
  if (!Number.isFinite(n)) throw new MoneyError(`Amount is not finite: ${n}`);
  if (n < 0) throw new MoneyError('Amount cannot be negative');
  // toFixed(18) then trim keeps us clear of exponential notation.
  return n.toFixed(18).replace(/0+$/, '').replace(/\.$/, '') || '0';
}

export const sum = (...v: bigint[]) => v.reduce((a, b) => a + b, 0n);
export const max = (a: bigint, b: bigint) => (a > b ? a : b);
export const min = (a: bigint, b: bigint) => (a < b ? a : b);

/** Percentage of a against b, returned as an integer percent. Safe when b is 0. */
export function percentOf(a: bigint, b: bigint): number {
  if (b === 0n) return a > 0n ? 100_000 : 0;
  return Number((a * 10000n) / b) / 100;
}
