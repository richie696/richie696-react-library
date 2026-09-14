import { useSyncExternalStore } from 'react';

const subscribe = (listener: () => void): (() => void) => {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => { window.removeEventListener('online', listener); window.removeEventListener('offline', listener); };
};
const getSnapshot = (): boolean => typeof navigator === 'undefined' || navigator.onLine;

/** Returns the browser online state with an SSR-safe fallback. */
export function useOnlineStatus(): boolean { return useSyncExternalStore(subscribe, getSnapshot, () => true); }
