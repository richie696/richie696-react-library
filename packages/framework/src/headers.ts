export class ManagedHeadersStore {
  private readonly headers = new Headers();

  set(name: string, value: string): void { this.headers.set(name, value); }
  get(name: string): string | null { return this.headers.get(name); }
  delete(name: string): void { this.headers.delete(name); }
  clear(): void { this.headers.forEach((_, name) => this.headers.delete(name)); }
  snapshot(): Headers { return new Headers(this.headers); }
}
