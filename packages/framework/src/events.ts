export type EventHandler<T> = (event: T) => void;
export class EventBus<Events extends object> {
  private readonly listeners = new Map<keyof Events, Set<EventHandler<unknown>>>();
  on<K extends keyof Events>(name: K, handler: EventHandler<Events[K]>): () => void {
    const handlers = this.listeners.get(name) ?? new Set<EventHandler<unknown>>(); handlers.add(handler as EventHandler<unknown>); this.listeners.set(name, handlers); return () => handlers.delete(handler as EventHandler<unknown>);
  }
  emit<K extends keyof Events>(name: K, event: Events[K]): void { for (const handler of this.listeners.get(name) ?? []) { try { handler(event); } catch (error) { console.warn(`[EventBus] observer failed for ${String(name)}`, error); } } }
  clear(): void { this.listeners.clear(); }
}
