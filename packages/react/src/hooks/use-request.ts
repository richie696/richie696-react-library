import { useCallback, useEffect, useRef, useState } from 'react';
import { AppError, type RequestOptions, type Url } from '@richie696/react-framework';
import { useReactFramework } from '../context/provider.js';

export interface RequestState<T> { readonly data?: T; readonly error?: AppError; readonly loading: boolean; }

export function useHttpClient() { return useReactFramework().http; }

export function useRequest<T>(url: Url | string, body?: unknown, options?: RequestOptions): RequestState<T> & { readonly execute: () => Promise<T | undefined>; readonly cancel: () => void } {
  const client = useHttpClient();
  const controller = useRef<AbortController | undefined>(undefined);
  const runId = useRef(0);
  const mounted = useRef(true);
  const [state, setState] = useState<RequestState<T>>({ loading: false });
  const cancel = useCallback(() => {
    runId.current += 1;
    controller.current?.abort();
    controller.current = undefined;
    if (mounted.current) setState((current) => ({ ...current, loading: false }));
  }, []);
  const execute = useCallback(async (): Promise<T | undefined> => {
    cancel();
    const requestId = runId.current;
    const requestController = new AbortController();
    controller.current = requestController;
    setState((current) => ({ ...current, error: undefined, loading: true }));
    try {
      const result = await client.requestData<T>(url, body, { ...options, signal: requestController.signal });
      if (requestId === runId.current && mounted.current) setState({ data: result, loading: false });
      return result;
    }
    catch (error) {
      const normalized = AppError.fromUnknown(error);
      if (requestId !== runId.current || !mounted.current) return undefined;
      if (normalized.kind !== 'cancelled') setState((current) => ({ ...current, error: normalized, loading: false }));
      return undefined;
    }
  }, [body, cancel, client, options, url]);
  useEffect(() => () => {
    mounted.current = false;
    runId.current += 1;
    controller.current?.abort();
    controller.current = undefined;
  }, []);
  return { ...state, execute, cancel };
}
