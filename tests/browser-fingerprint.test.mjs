import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BrowserHardwareFingerprintCollector,
  calculateFingerprintSimilarity,
  createHmacHardwareFingerprintProvider,
  FingerprintUnavailableError,
  fingerprintFromString,
  fingerprintToHash,
  fingerprintToString,
} from '../packages/browser-fingerprint/dist/index.js';
import { HmacSha256Signer } from '../packages/security/dist/index.js';
import { HttpClient } from '../packages/framework/dist/index.js';

const fingerprint = Object.freeze({
  canvas: 'canvas-hash',
  webgl: 'webgl-hash',
  screen: '1920x1080',
  timezone: 'Asia/Shanghai',
  language: 'zh-CN',
  hardwareConcurrency: 8,
  deviceMemory: 16,
  colorDepth: 24,
  pixelRatio: 2,
  platform: 'Test Platform',
});

test('fingerprint serialization, hashing and similarity are deterministic', async () => {
  const serialized = fingerprintToString(fingerprint);
  assert.deepEqual(fingerprintFromString(serialized), fingerprint);
  assert.equal((await fingerprintToHash(fingerprint)).length, 64);
  assert.equal(calculateFingerprintSimilarity(fingerprint, fingerprint), 1);
  assert.throws(() => fingerprintFromString('{"canvas":true}'), TypeError);
});

test('browser collector fails explicitly in an SSR host', async () => {
  await assert.rejects(new BrowserHardwareFingerprintCollector().collect(), FingerprintUnavailableError);
});

test('browser collector hashes Canvas and WebGL signals through its browser adapter', async () => {
  const document = {
    createElement() {
      return {
        width: 0,
        height: 0,
        toDataURL: () => 'data:image/png;base64,test',
        getContext(kind) {
          if (kind === '2d') return { textBaseline: '', font: '', fillText() {} };
          if (kind === 'webgl') return {
            getExtension: () => ({ UNMASKED_VENDOR_WEBGL: 1, UNMASKED_RENDERER_WEBGL: 2 }),
            getParameter: (parameter) => parameter === 1 ? 'Test Vendor' : 'Test Renderer',
          };
          return null;
        },
      };
    },
  };
  const collector = new BrowserHardwareFingerprintCollector({
    document,
    navigator: { language: 'zh-CN', hardwareConcurrency: 8, deviceMemory: 16, platform: 'Test Platform' },
    screen: { width: 1920, height: 1080, colorDepth: 24 },
    devicePixelRatio: 2,
    crypto: globalThis.crypto,
  });
  const collected = await collector.collect();
  assert.equal(collected.canvas.length, 64);
  assert.equal(collected.webgl.length, 64);
  assert.equal(collected.screen, '1920x1080');
  assert.equal(collected.deviceMemory, 16);
});

test('signed provider adds timestamp and nonce and produces a verifiable HMAC value', async () => {
  const cryptoApi = {
    subtle: globalThis.crypto.subtle,
    getRandomValues(array) { array.fill(7); return array; },
  };
  const collector = { collect: async () => fingerprint };
  const provider = createHmacHardwareFingerprintProvider('test-secret', { collector, crypto: cryptoApi, now: () => 1_700_000_000_000 });
  const header = await provider.getHeaderValue();
  const separator = header.lastIndexOf('.');
  const payload = header.slice(0, separator);
  const signature = header.slice(separator + 1);
  const parsed = JSON.parse(payload);
  assert.equal(parsed.timestamp, 1_700_000_000_000);
  assert.equal(parsed.nonce, 'BwcHBwcHBwcHBwcHBwcHBw==');
  assert.equal(await new HmacSha256Signer('test-secret').verify(payload, signature), true);
});

test('HttpClient injects a configured signed fingerprint provider only when enabled', async () => {
  let received;
  let calls = 0;
  const client = new HttpClient({
    baseUrl: 'https://api.example.test',
    sendHardwareFingerprint: true,
    hardwareFingerprintProvider: { getHeaderValue: async () => { calls += 1; return 'signed-fingerprint'; } },
    fetch: async (request) => {
      received = request;
      return new Response(JSON.stringify({ success: true, data: true, code: 'OK', message: 'ok' }), { status: 200 });
    },
  });
  assert.equal(await client.requestData('/fingerprint'), true);
  assert.equal(received.headers.get('x-hardware-fingerprint'), 'signed-fingerprint');
  assert.equal(received.headers.has('x-device-id'), false);
  assert.equal(calls, 1);
});
