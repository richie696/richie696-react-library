import { useCallback, useEffect, useRef, useState } from 'react';
import { AppError, type RequestOptions, type Url } from '@richie696/react-framework';
import { useReactFramework } from './provider.js';

export interface RequestState<T> { readonly data?: T; readonly error?: AppError; readonly loading: boolean; }

export function useHttpClient() { return useReactFramework().http; }

export function useRequest<T>(url: Url | string, body?: unknown, options?: RequestOptions): RequestState<T> & { readonly execute: () => Promise<T | undefined>; readonly cancel: () => void } {
  const client = useHttpClient(); const controller = useRef<AbortController | undefined>(undefined); const [state, setState] = useState<RequestState<T>>({ loading: false });
  const cancel = useCallback(() => controller.current?.abort(), []);
  const execute = useCallback(async (): Promise<T | undefined> => {
    cancel(); controller.current = new AbortController(); setState({ loading: true });
    try { const result = await client.request<T>(url, body, { ...options, signal: controller.current.signal }); setState({ data: result, loading: false }); return result; }
    catch (error) { const normalized = AppError.fromUnknown(error); if (normalized.kind !== 'cancelled') setState({ error: normalized, loading: false }); return undefined; }
  }, [body, cancel, client, options, url]);
  useEffect(() => () => controller.current?.abort(), []);
  return { ...state, execute, cancel };
}

export function useEvent<K extends string, T>(name: K, handler: (event: T) => void): void {
  const { events } = useReactFramework();
  useEffect(() => events.on(name, handler as (event: unknown) => void), [events, handler, name]);
}
