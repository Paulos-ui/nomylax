import { createPublicClient, createWalletClient, http, type PublicClient, type WalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';

/**
 * Chain configuration is entirely environment driven. No network is hardcoded
 * into application logic, so moving from Sepolia to mainnet is a variable
 * change and a redeploy.
 */

export type NetworkName = 'base-sepolia' | 'base';

export interface NetworkConfig {
  name: NetworkName;
  chain: typeof base | typeof baseSepolia;
  chainId: number;
  label: string;
  isTestnet: boolean;
  explorer: string;
}

export const NETWORKS: Record<NetworkName, NetworkConfig> = {
  'base-sepolia': {
    name: 'base-sepolia', chain: baseSepolia, chainId: 84532,
    label: 'Base Sepolia', isTestnet: true, explorer: 'https://sepolia.basescan.org',
  },
  base: {
    name: 'base', chain: base, chainId: 8453,
    label: 'Base', isTestnet: false, explorer: 'https://basescan.org',
  },
};

export function activeNetwork(): NetworkConfig {
  const raw = (process.env.NEXT_PUBLIC_BASE_NETWORK ?? 'base-sepolia') as NetworkName;
  const cfg = NETWORKS[raw];
  if (!cfg) throw new ChainConfigError(`NEXT_PUBLIC_BASE_NETWORK must be base-sepolia or base, received: ${raw}`);
  return cfg;
}

export class ChainConfigError extends Error {}

export function publicClient(): PublicClient {
  const net = activeNetwork();
  const rpc = process.env.BASE_RPC_URL || net.chain.rpcUrls.default.http[0];
  return createPublicClient({ chain: net.chain, transport: http(rpc) }) as PublicClient;
}

/**
 * The executor account. Absent configuration this throws rather than falling
 * back to anything synthetic: financial operations fail closed.
 */
export function executorClient(): { wallet: WalletClient; address: `0x${string}` } {
  const key = process.env.EXECUTOR_PRIVATE_KEY;
  if (!key) {
    throw new ChainConfigError(
      'EXECUTOR_PRIVATE_KEY is not configured. Live execution is disabled until an executor account is provided.',
    );
  }
  if (!/^0x[a-fA-F0-9]{64}$/.test(key)) {
    throw new ChainConfigError('EXECUTOR_PRIVATE_KEY must be a 32 byte hex string prefixed with 0x');
  }

  const net = activeNetwork();
  const rpc = process.env.BASE_RPC_URL || net.chain.rpcUrls.default.http[0];
  const account = privateKeyToAccount(key as `0x${string}`);
  return {
    wallet: createWalletClient({ account, chain: net.chain, transport: http(rpc) }),
    address: account.address,
  };
}

export function isExecutionConfigured(): boolean {
  return !!process.env.EXECUTOR_PRIVATE_KEY && !!process.env.BASE_RPC_URL;
}

export const txUrl = (hash: string) => `${activeNetwork().explorer}/tx/${hash}`;
