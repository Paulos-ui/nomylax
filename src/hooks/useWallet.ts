'use client';

import { useCallback, useEffect, useState } from 'react';
import { clientNetwork } from '@/lib/network';

/**
 * Wallet connection and sign in.
 *
 * Connecting proves nothing on its own. Ownership is established by signing a
 * server issued challenge, after which the server sets an http only session
 * cookie. Nothing here ever asks for a seed phrase or a private key.
 */
type Status = 'disconnected' | 'connecting' | 'connected' | 'wrong-network' | 'authenticating' | 'authenticated' | 'error';

interface Eip1193 {
  request: (a: { method: string; params?: unknown[] }) => Promise<any>;
  on?: (e: string, cb: (...a: any[]) => void) => void;
  removeListener?: (e: string, cb: (...a: any[]) => void) => void;
}

declare global {
  interface Window { ethereum?: Eip1193 }
}

export function useWallet() {
  const net = clientNetwork();
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>('disconnected');
  const [error, setError] = useState<string | null>(null);

  const hasProvider = typeof window !== 'undefined' && !!window.ethereum;

  const sync = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) return;
    const accounts: string[] = await window.ethereum.request({ method: 'eth_accounts' });
    const hex: string = await window.ethereum.request({ method: 'eth_chainId' });
    const id = parseInt(hex, 16);
    setChainId(id);
    if (accounts?.length) {
      setAddress(accounts[0]);
      setStatus((s) => (s === 'authenticated' ? s : id === net.chainId ? 'connected' : 'wrong-network'));
    } else {
      setAddress(null);
      setStatus('disconnected');
    }
  }, [net.chainId]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;
    sync();
    const handler = () => sync();
    window.ethereum.on?.('accountsChanged', handler);
    window.ethereum.on?.('chainChanged', handler);
    return () => {
      window.ethereum?.removeListener?.('accountsChanged', handler);
      window.ethereum?.removeListener?.('chainChanged', handler);
    };
  }, [sync]);

  const connect = useCallback(async () => {
    setError(null);
    if (!window.ethereum) {
      setStatus('error');
      setError('No wallet was found in this browser. Install a Base compatible wallet, then reload.');
      return;
    }
    try {
      setStatus('connecting');
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      await sync();
    } catch (e: any) {
      setStatus('error');
      setError(e?.code === 4001 ? 'You rejected the connection request.' : 'The wallet could not be connected.');
    }
  }, [sync]);

  /** Prove ownership by signing a server challenge. */
  const signIn = useCallback(async () => {
    if (!window.ethereum || !address) return false;
    setError(null);
    setStatus('authenticating');
    try {
      const nonceRes = await fetch('/api/auth/nonce', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      if (!nonceRes.ok) throw new Error((await nonceRes.json()).error ?? 'Challenge could not be issued');
      const { nonce, message } = await nonceRes.json();

      const signature: string = await window.ethereum.request({
        method: 'personal_sign', params: [message, address],
      });

      const verify = await fetch('/api/auth/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, message, signature, nonce }),
      });
      if (!verify.ok) throw new Error((await verify.json()).error ?? 'Signature could not be verified');

      setStatus('authenticated');
      return true;
    } catch (e: any) {
      setStatus('connected');
      setError(e?.code === 4001 ? 'You declined the signature request.' : e?.message ?? 'Sign in failed.');
      return false;
    }
  }, [address]);

  const signOut = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setStatus(address ? 'connected' : 'disconnected');
  }, [address]);

  const switchNetwork = useCallback(async () => {
    if (!window.ethereum) return;
    const hex = '0x' + net.chainId.toString(16);
    try {
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hex }] });
    } catch (e: any) {
      if (e?.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: hex, chainName: net.label,
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: [process.env.NEXT_PUBLIC_RPC_URL ?? 'https://sepolia.base.org'],
            blockExplorerUrls: [net.explorer],
          }],
        });
      } else {
        setError('The network could not be switched. Change it in your wallet, then reload.');
      }
    }
    await sync();
  }, [net, sync]);

  return {
    address, chainId, status, error, hasProvider,
    connect, signIn, signOut, switchNetwork,
    network: net,
    chainName: net.label,
    expectedChainId: net.chainId,
    isAuthenticated: status === 'authenticated',
  };
}
