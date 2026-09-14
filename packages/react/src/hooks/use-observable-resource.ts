import { useCallback, useEffect } from 'react';
import { ObservableResource, type ResourceLoader, type ResourceSnapshot } from '@richie696/react-framework';
import { useExternalSnapshot } from './use-external-snapshot.js';

export function useObservableResource<T>(resource: ObservableResource<T>): ResourceSnapshot<T> & { readonly load: (loader: ResourceLoader<T>, timeoutMs?: number) => Promise<T>; readonly cancel: () => void; readonly reset: () => void } {
  const snapshot = useExternalSnapshot(resource);
  const load = useCallback((loader: ResourceLoader<T>, timeoutMs?: number) => resource.load(loader, timeoutMs === undefined ? undefined : { timeoutMs }), [resource]);
  useEffect(() => () => resource.cancel(), [resource]);
  return { ...snapshot, load, cancel: resource.cancel.bind(resource), reset: resource.reset.bind(resource) };
}
