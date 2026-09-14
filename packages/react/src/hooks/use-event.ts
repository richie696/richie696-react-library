import { useEffect } from 'react';
import { useReactFramework, type FrameworkEvents } from '../context/provider.js';

/** Subscribes a React component to one typed framework event. */
export function useEvent<K extends keyof FrameworkEvents>(name: K, handler: (event: FrameworkEvents[K]) => void): void {
  const { events } = useReactFramework();
  useEffect(() => events.on(name, handler), [events, handler, name]);
}
