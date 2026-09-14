import { useSyncExternalStore } from 'react';
import type { ReadonlyStore } from '@richie696/react-framework';

export function useExternalSnapshot<T>(store: ReadonlyStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
