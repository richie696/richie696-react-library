import assert from 'node:assert/strict';
import test from 'node:test';
import { AppErrorKind, EventBus, HttpClient, HttpMethod, MemoryStorage, ObservableResource, PollingStore, ResourceStatus, SingleFlight, StateStore, TimeSeriesStore, Translator, Url, defineUrlCatalog, sha256Hex } from '../packages/framework/dist/index.js';

test('Url resolves path parameters and query values without magic URL strings', () => {
  const url = new Url('/users/{id}', { method: HttpMethod.GET });
  assert.equal(url.resolve(['a/b'], { query: { page: 2, active: true, omitted: undefined } }), '/users/a%2Fb?page=2&active=true');
  assert.equal(url.method, HttpMethod.GET);
});

test('defineUrlCatalog freezes endpoint metadata for reuse', () => {
  const endpoints = defineUrlCatalog({ users: new Url('/users', { method: HttpMethod.GET }) });
  assert.equal(Object.isFrozen(endpoints), true);
  assert.equal(endpoints.users.method, HttpMethod.GET);
});

test('EventBus isolates observer failures and supports unsubscribe', () => {
  const bus = new EventBus();
  const seen = [];
  const unsubscribe = bus.on('ready', (value) => seen.push(value));
  bus.on('ready', () => { throw new Error('observer failure'); });
  bus.emit('ready', 1);
  unsubscribe();
  bus.emit('ready', 2);
  assert.deepEqual(seen, [1]);
});

test('SingleFlight shares concurrent work and MemoryStorage preserves values', async () => {
  const flights = new SingleFlight();
  let calls = 0;
  const task = () => { calls += 1; return Promise.resolve('ok'); };
  assert.deepEqual(await Promise.all([flights.run('key', task), flights.run('key', task)]), ['ok', 'ok']);
  assert.equal(calls, 1);
  const storage = new MemoryStorage();
  await storage.set('answer', 42);
  assert.equal(await storage.get('answer'), 42);
});

test('Translator falls back by locale and interpolates typed values', () => {
  const translator = new Translator({ 'en-US': { greeting: 'Hello {name}' }, 'zh-CN': { greeting: '你好，{name}' } });
  assert.equal(translator.translate('greeting', 'zh-CN', { name: 'Richie' }), '你好，Richie');
  assert.equal(translator.translate('greeting', 'ja-JP', { name: 'Richie' }), 'Hello Richie');
});

test('sha256Hex produces the standard digest', async () => {
  assert.equal(await sha256Hex('hello'), '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
});

test('HttpClient maps GET objects to query parameters and unwraps API envelopes', async () => {
  let received;
  const client = new HttpClient({ baseUrl: 'https://api.example.test', fetch: async (request) => {
    received = request;
    return new Response(JSON.stringify({ success: true, data: { value: 7 }, code: 'OK', message: 'ok' }), { status: 200, headers: { 'content-type': 'application/json' } });
  } });
  const result = await client.requestData('/items', { page: 2, enabled: true });
  assert.deepEqual(result, { value: 7 });
  assert.equal(new URL(received.url).pathname, '/items');
  assert.equal(new URL(received.url).search, '?page=2&enabled=true');
  assert.equal(received.body, null);
});

test('HttpClient retries safe requests and normalizes unauthorized responses', async () => {
  let attempts = 0;
  const client = new HttpClient({ baseUrl: 'https://api.example.test', retryIntervalMs: 0, maxRetries: 2, fetch: async () => {
    attempts += 1;
    if (attempts === 1) return new Response('temporarily unavailable', { status: 503 });
    return new Response(JSON.stringify({ success: true, data: 'ok', code: 'OK', message: 'ok' }), { status: 200 });
  } });
  assert.equal(await client.requestData('/health'), 'ok');
  assert.equal(attempts, 2);

  let redirected;
  const unauthorized = new HttpClient({ baseUrl: 'https://api.example.test', onUnauthorized: (requestId) => { redirected = requestId; }, fetch: async () => new Response(JSON.stringify({ code: 'AUTH_EXPIRED', message: 'expired' }), { status: 401 }) });
  await assert.rejects(() => unauthorized.request('/private', undefined, { requestId: 'req-1' }), (error) => error.kind === AppErrorKind.UNAUTHORIZED && error.status === 401);
  assert.equal(redirected, 'req-1');
});

test('HttpClient prevents concurrent duplicate submissions and parses stream completion', async () => {
  let resolveFetch;
  const client = new HttpClient({ baseUrl: 'https://api.example.test', fetch: () => new Promise((resolve) => { resolveFetch = resolve; }) });
  const url = new Url('/commands', { method: HttpMethod.POST, needDuplicateCheck: true });
  const first = client.requestData(url, { action: 'reload' });
  await assert.rejects(() => client.requestData(url, { action: 'reload' }), (error) => error.kind === AppErrorKind.DUPLICATE);
  resolveFetch(new Response(JSON.stringify({ success: true, data: true, code: 'OK', message: 'ok' }), { status: 200 }));
  assert.equal(await first, true);
  await assert.rejects(() => client.requestData(url, { action: 'reload' }), (error) => error.kind === AppErrorKind.DUPLICATE);

  const streamClient = new HttpClient({ baseUrl: 'https://api.example.test', fetch: async () => new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('event: message\ndata: {"value":1}\n\nevent: message\ndata: {"kind":"done"}\n\n')); controller.close(); } }), { status: 200, headers: { 'content-type': 'text/event-stream' } }) });
  const values = [];
  for await (const value of streamClient.requestStream('/events')) values.push(value);
  assert.deepEqual(values, [{ value: 1 }]);
});

test('StateStore and TimeSeriesStore expose immutable snapshots for React external stores', () => {
  const initial = { value: 0 };
  const store = new StateStore(initial);
  const snapshots = [];
  const unsubscribe = store.subscribe(() => snapshots.push(store.getSnapshot()));
  const next = { value: 1 };
  store.set(next);
  store.set(next);
  unsubscribe();
  assert.deepEqual(snapshots, [{ value: 0 }, { value: 1 }]);

  const series = new TimeSeriesStore(2);
  series.append(1, 100);
  series.append(2, 200);
  series.append(3, 300);
  assert.deepEqual(series.getSnapshot(), [{ value: 2, at: 200 }, { value: 3, at: 300 }]);
});

test('ObservableResource and PollingStore prevent stale resource updates and overlapping polls', async () => {
  const resource = new ObservableResource();
  const loaded = await resource.load(async () => 'ready');
  assert.equal(loaded, 'ready');
  assert.equal(resource.getSnapshot().status, ResourceStatus.SUCCESS);
  assert.equal(resource.getSnapshot().data, 'ready');

  let active = 0;
  let maximumActive = 0;
  let calls = 0;
  const polling = new PollingStore();
  polling.start(async () => {
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 12));
    active -= 1;
    return calls;
  }, { intervalMs: 2, immediate: true });
  await new Promise((resolve) => setTimeout(resolve, 32));
  polling.stop();
  assert.equal(maximumActive, 1);
  assert.equal(polling.getSnapshot().status, ResourceStatus.SUCCESS);
  assert.ok(calls >= 2);
});

test('ObservableResource cancels the previous load before accepting a newer result', async () => {
  const resource = new ObservableResource();
  const first = resource.load(() => new Promise(() => undefined));
  const second = resource.load(async () => 'latest');
  await assert.rejects(first, (error) => error.kind === AppErrorKind.CANCELLED);
  assert.equal(await second, 'latest');
  assert.deepEqual(resource.getSnapshot().data, 'latest');
});

test('ObservableResource classifies timeout and empty loaders as stable errors', async () => {
  const timed = new ObservableResource();
  await assert.rejects(timed.load(() => new Promise(() => undefined), { timeoutMs: 1 }), (error) => error.kind === AppErrorKind.TIMEOUT);

  const empty = new ObservableResource();
  async function* noValues() { return; }
  await assert.rejects(empty.load(noValues), (error) => error.kind === AppErrorKind.PROTOCOL);
});

test('PollingStore rejects unsafe timing configuration before creating a poll loop', () => {
  const polling = new PollingStore();
  assert.throws(() => polling.start(async () => true, { intervalMs: 0 }), RangeError);
  assert.throws(() => polling.start(async () => true, { intervalMs: 100, retryCount: -1 }), RangeError);
});
