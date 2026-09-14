import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { EventBus, HttpClient, type HttpClientOptions, MemoryStorage, type StorageAdapter } from '@richie696/react-framework';

/** Canonical event names emitted by framework services. */
export const FrameworkEventName = {
  Unauthorized: 'unauthorized',
  RuleUpdated: 'ruleUpdated',
  ConnectionChanged: 'connectionChanged',
} as const;

/** Payload map for the framework event bus. */
export interface FrameworkEvents {
  /** Emitted after an unauthorized response is normalized. */
  readonly unauthorized: { readonly requestId?: string };
  /** Emitted when a rule version changes. */
  readonly ruleUpdated: { readonly resource: string; readonly version: string };
  /** Emitted when a transport connection changes state. */
  readonly connectionChanged: { readonly connected: boolean };
}

/** Provider options shared by the HTTP client and browser/SSR storage. */
export interface ReactFrameworkOptions extends HttpClientOptions { readonly storage?: StorageAdapter; }
/** Services made available to descendant React components. */
export interface ReactFrameworkContextValue { readonly http: HttpClient; readonly storage: StorageAdapter; readonly events: EventBus<FrameworkEvents>; }

const FrameworkContext = createContext<ReactFrameworkContextValue | null>(null);

/** Provides framework services and disposes them when the provider unmounts. */
export function ReactFrameworkProvider({ options, children }: { readonly options?: ReactFrameworkOptions; readonly children: ReactNode }): ReactNode {
  const value = useMemo<ReactFrameworkContextValue>(() => ({ http: new HttpClient(options), storage: options?.storage ?? new MemoryStorage(), events: new EventBus<FrameworkEvents>() }), [options]);
  useEffect(() => () => {
    value.http.cleanup();
    value.events.clear();
  }, [value]);
  return <FrameworkContext.Provider value={value}>{children}</FrameworkContext.Provider>;
}

/** Reads framework services from the nearest provider. */
export function useReactFramework(): ReactFrameworkContextValue {
  const value = useContext(FrameworkContext);
  if (!value) throw new Error('useReactFramework must be used inside ReactFrameworkProvider');
  return value;
}
