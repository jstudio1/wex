'use client';

import { useEffect, useSyncExternalStore } from 'react';
import type { Permission } from '@/lib/pricing';

type WalletPermission = (NonNullable<Permission> & {
  id?: number | null;
  name?: string | null;
}) | null;

type WalletState = {
  points: number | null;
  permission: WalletPermission;
  permissionId: number | null;
  loading: boolean;
  lastUpdated: number | null;
};

const defaultState: WalletState = {
  points: null,
  permission: null,
  permissionId: null,
  loading: false,
  lastUpdated: null,
};

const listeners = new Set<() => void>();
let state: WalletState = { ...defaultState };
let initialized = false;
let intervalId: number | null = null;
let walletChangedHandler: (() => void) | null = null;
let focusHandler: (() => void) | null = null;
let isFetching = false;
let pendingFetch = false;

const notify = () => {
  listeners.forEach((listener) => listener());
};

const setState = (partial: Partial<WalletState>) => {
  state = { ...state, ...partial };
  notify();
};

const parsePoints = (value: unknown): number => {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

async function runFetch(): Promise<void> {
  if (typeof window === 'undefined') return;

  if (isFetching) {
    pendingFetch = true;
    return;
  }

  isFetching = true;
  setState({ loading: true });

  try {
    const res = await fetch('/api/wallet/balance', {
      cache: 'default',
      headers: { 'Cache-Control': 'max-age=10' },
    });
    if (!res.ok) throw new Error('wallet_balance');
    const data = await res.json();
    const permission = (data.permission ?? null) as WalletPermission;
    const permissionId = data.permission_id ?? permission?.id ?? null;

    setState({
      points: parsePoints(data.points),
      permission,
      permissionId: typeof permissionId === 'number' ? permissionId : permissionId ? Number(permissionId) : null,
      loading: false,
      lastUpdated: Date.now(),
    });
  } catch (err) {
    console.error('[useWalletBalance] Failed to fetch balance:', err);
    setState({ loading: false });
  } finally {
    isFetching = false;
    if (pendingFetch) {
      pendingFetch = false;
      runFetch();
    }
  }
}

const ensurePolling = () => {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  runFetch();
  walletChangedHandler = () => runFetch();
  focusHandler = () => runFetch();
  window.addEventListener('wallet:changed', walletChangedHandler);
  window.addEventListener('focus', focusHandler);
  intervalId = window.setInterval(runFetch, 15000);
};

const cleanupPolling = () => {
  if (!initialized || typeof window === 'undefined') return;
  initialized = false;
  if (intervalId !== null) {
    window.clearInterval(intervalId);
    intervalId = null;
  }
  if (walletChangedHandler) {
    window.removeEventListener('wallet:changed', walletChangedHandler);
    walletChangedHandler = null;
  }
  if (focusHandler) {
    window.removeEventListener('focus', focusHandler);
    focusHandler = null;
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  ensurePolling();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      cleanupPolling();
    }
  };
};

const noopSubscribe = () => () => {};

export function useWalletBalance(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;

  const snapshot = useSyncExternalStore(
    enabled ? subscribe : noopSubscribe,
    () => (enabled ? state : defaultState),
    () => defaultState
  );

  useEffect(() => {
    if (!enabled) return;
    ensurePolling();
    return () => {
      if (listeners.size === 0) {
        cleanupPolling();
      }
    };
  }, [enabled]);

  return enabled
    ? {
        ...snapshot,
        refresh: runFetch,
      }
    : {
        ...defaultState,
        refresh: () => {},
      };
}


