import { erc20Abi, type Address, type Hash } from 'viem';
import { publicClient, executorClient, activeNetwork, isExecutionConfigured, ChainConfigError } from './chain';
import { tokenSpec, NATIVE } from '@/lib/money';

/**
 * Real Base execution.
 *
 * Every stage can refuse. Nothing in this file can produce a transaction hash
 * that did not come back from the network, and no stage is skipped when the
 * previous one fails.
 *
 *   SIMULATE -> SUBMIT -> CONFIRM -> VERIFY STATE
 */

export type ExecutionStage =
  | 'preflight' | 'simulated' | 'submitted' | 'confirmed' | 'verified' | 'failed';

export interface ExecutionRequest {
  token: string;
  /** Base units. Never a float. */
  amount: bigint;
  recipient: Address;
}

export interface ExecutionResult {
  stage: ExecutionStage;
  ok: boolean;
  chainId: number;
  network: string;
  txHash?: Hash;
  blockNumber?: string;
  gasUsed?: string;
  effectiveGasPrice?: string;
  confirmedAt?: number;
  /** Recipient balance before and after, proving the transfer landed. */
  verification?: { before: string; after: string; delta: string; matched: boolean };
  error?: string;
}

export class ExecutionError extends Error {
  constructor(message: string, public stage: ExecutionStage) {
    super(message);
    this.name = 'ExecutionError';
  }
}

export async function execute(req: ExecutionRequest): Promise<ExecutionResult> {
  const net = activeNetwork();
  const base = { chainId: net.chainId, network: net.label };

  if (!isExecutionConfigured()) {
    return {
      ...base, stage: 'preflight', ok: false,
      error: 'Live execution is not configured. Set BASE_RPC_URL and EXECUTOR_PRIVATE_KEY, or run the agent in shadow mode.',
    };
  }

  const spec = tokenSpec(req.token);
  const tokenAddress = spec.addresses[net.chainId];
  if (!tokenAddress) {
    return { ...base, stage: 'preflight', ok: false, error: `${spec.symbol} has no configured address on ${net.label}` };
  }
  if (req.amount <= 0n) {
    return { ...base, stage: 'preflight', ok: false, error: 'Amount must be greater than zero' };
  }

  const pub = publicClient();
  let wallet, executor: Address;
  try {
    const c = executorClient();
    wallet = c.wallet;
    executor = c.address;
  } catch (e) {
    const msg = e instanceof ChainConfigError ? e.message : 'Executor unavailable';
    return { ...base, stage: 'preflight', ok: false, error: msg };
  }

  // Confirm the RPC is on the chain we believe we are on.
  const liveChainId = await pub.getChainId().catch(() => null);
  if (liveChainId === null) {
    return { ...base, stage: 'preflight', ok: false, error: 'Base RPC is unreachable' };
  }
  if (liveChainId !== net.chainId) {
    return {
      ...base, stage: 'preflight', ok: false,
      error: `RPC reports chain ${liveChainId} but Nomylax is configured for ${net.chainId}. Refusing to execute.`,
    };
  }

  const isNative = tokenAddress === NATIVE;
  const balanceOf = async (who: Address): Promise<bigint> =>
    isNative
      ? pub.getBalance({ address: who })
      : (pub.readContract({ address: tokenAddress, abi: erc20Abi, functionName: 'balanceOf', args: [who] }) as Promise<bigint>);

  const before = await balanceOf(req.recipient);

  // ---- SIMULATE. A failure here stops everything. ----
  try {
    if (isNative) {
      const bal = await pub.getBalance({ address: executor });
      if (bal < req.amount) throw new Error('Executor balance is below the requested amount');
      await pub.estimateGas({ account: executor, to: req.recipient, value: req.amount });
    } else {
      const bal = (await pub.readContract({
        address: tokenAddress, abi: erc20Abi, functionName: 'balanceOf', args: [executor],
      })) as bigint;
      if (bal < req.amount) throw new Error('Executor token balance is below the requested amount');
      await pub.simulateContract({
        account: executor, address: tokenAddress, abi: erc20Abi,
        functionName: 'transfer', args: [req.recipient, req.amount],
      });
    }
  } catch (e: any) {
    return { ...base, stage: 'simulated', ok: false, error: `Simulation failed, nothing was submitted: ${short(e)}` };
  }

  // ---- SUBMIT ----
  let txHash: Hash;
  try {
    txHash = isNative
      ? await wallet.sendTransaction({
          account: wallet.account!, chain: net.chain, to: req.recipient, value: req.amount,
        })
      : await wallet.writeContract({
          account: wallet.account!, chain: net.chain, address: tokenAddress,
          abi: erc20Abi, functionName: 'transfer', args: [req.recipient, req.amount],
        });
  } catch (e: any) {
    return { ...base, stage: 'submitted', ok: false, error: `Submission failed: ${short(e)}` };
  }

  // ---- CONFIRM ----
  let receipt;
  try {
    receipt = await pub.waitForTransactionReceipt({ hash: txHash, timeout: 90_000, confirmations: 1 });
  } catch {
    return {
      ...base, stage: 'submitted', ok: false, txHash,
      error: 'Transaction was submitted but did not confirm within 90 seconds. Verify on the explorer before retrying.',
    };
  }

  if (receipt.status !== 'success') {
    return {
      ...base, stage: 'confirmed', ok: false, txHash,
      blockNumber: receipt.blockNumber.toString(),
      gasUsed: receipt.gasUsed.toString(),
      error: 'Transaction reverted on chain',
    };
  }

  // ---- VERIFY STATE. Confirmation alone is not success. ----
  const after = await balanceOf(req.recipient);
  const delta = after - before;
  const matched = delta === req.amount;

  return {
    ...base,
    stage: matched ? 'verified' : 'confirmed',
    ok: matched,
    txHash,
    blockNumber: receipt.blockNumber.toString(),
    gasUsed: receipt.gasUsed.toString(),
    effectiveGasPrice: receipt.effectiveGasPrice?.toString(),
    confirmedAt: Date.now(),
    verification: {
      before: before.toString(), after: after.toString(),
      delta: delta.toString(), matched,
    },
    error: matched
      ? undefined
      : 'Transaction confirmed but the recipient balance did not change by the expected amount. Flagged for review.',
  };
}

const short = (e: any) => String(e?.shortMessage ?? e?.message ?? e).slice(0, 220);
