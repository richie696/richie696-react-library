import assert from 'node:assert/strict';
import test from 'node:test';
import { EventBus, HttpMethod, MemoryStorage, SingleFlight, Translator, Url, sha256Hex } from '../packages/framework/dist/index.js';

test('Url resolves path parameters and query values without magic URL strings', () => {
  const url = new Url('/users/{id}', { method: HttpMethod.GET });
  assert.equal(url.resolve(['a/b'], { query: { page: 2, active: true, omitted: undefined } }), '/users/a%2Fb?page=2&active=true');
  assert.equal(url.method, HttpMethod.GET);
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
