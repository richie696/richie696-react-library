import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { EventBus, HttpClient, type HttpClientOptions, MemoryStorage, type StorageAdapter } from '@richie696/react-framework';

export const FrameworkEventName = {
  Unauthorized: 'unauthorized',
  RuleUpdated: 'ruleUpdated',
  ConnectionChanged: 'connectionChanged',
} as const;

export interface FrameworkEvents {
  readonly unauthorized: { readonly requestId?: string };
  readonly ruleUpdated: { readonly resource: string; readonly version: string };
  readonly connectionChanged: { readonly connected: boolean };
}

export interface ReactFrameworkOptions extends HttpClientOptions { readonly storage?: StorageAdapter; }
export interface ReactFrameworkContextValue { readonly http: HttpClient; readonly storage: StorageAdapter; readonly events: EventBus<FrameworkEvents>; }

const FrameworkContext = createContext<ReactFrameworkContextValue | null>(null);

export function ReactFrameworkProvider({ options, children }: { readonly options?: ReactFrameworkOptions; readonly children: ReactNode }): ReactNode {
  const value = useMemo<ReactFrameworkContextValue>(() => ({ http: new HttpClient(options), storage: options?.storage ?? new MemoryStorage(), events: new EventBus<FrameworkEvents>() }), [options]);
  useEffect(() => () => {
    value.http.cleanup();
    value.events.clear();
  }, [value]);
  return <FrameworkContext.Provider value={value}>{children}</FrameworkContext.Provider>;
}

export function useReactFramework(): ReactFrameworkContextValue {
  const value = useContext(FrameworkContext);
  if (!value) throw new Error('useReactFramework must be used inside ReactFrameworkProvider');
  return value;
}
