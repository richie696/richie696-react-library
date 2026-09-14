import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { EventBus, HttpClient, type HttpClientOptions, MemoryStorage, type StorageAdapter } from '@richie696/react-framework';

export interface ReactFrameworkOptions extends HttpClientOptions { readonly storage?: StorageAdapter; }
export interface ReactFrameworkContextValue { readonly http: HttpClient; readonly storage: StorageAdapter; readonly events: EventBus<Record<string, unknown>>; }

const FrameworkContext = createContext<ReactFrameworkContextValue | null>(null);

export function ReactFrameworkProvider({ options, children }: { readonly options?: ReactFrameworkOptions; readonly children: ReactNode }): ReactNode {
  const value = useMemo<ReactFrameworkContextValue>(() => ({ http: new HttpClient(options), storage: options?.storage ?? new MemoryStorage(), events: new EventBus<Record<string, unknown>>() }), [options]);
  return <FrameworkContext.Provider value={value}>{children}</FrameworkContext.Provider>;
}

export function useReactFramework(): ReactFrameworkContextValue {
  const value = useContext(FrameworkContext);
  if (!value) throw new Error('useReactFramework must be used inside ReactFrameworkProvider');
  return value;
}
