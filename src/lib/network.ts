/**
 * Client visible network identity. Derived from the same variable the server
 * uses, so the badge in the interface can never disagree with the chain the
 * executor targets.
 */
export interface ClientNetwork {
  name: string;
  label: string;
  chainId: number;
  isTestnet: boolean;
  explorer: string;
}

const TABLE: Record<string, ClientNetwork> = {
  'base-sepolia': {
    name: 'base-sepolia', label: 'Base Sepolia', chainId: 84532,
    isTestnet: true, explorer: 'https://sepolia.basescan.org',
  },
  base: {
    name: 'base', label: 'Base', chainId: 8453,
    isTestnet: false, explorer: 'https://basescan.org',
  },
};

export function clientNetwork(): ClientNetwork {
  return TABLE[process.env.NEXT_PUBLIC_BASE_NETWORK ?? 'base-sepolia'] ?? TABLE['base-sepolia'];
}

export const txUrl = (hash: string) => `${clientNetwork().explorer}/tx/${hash}`;
