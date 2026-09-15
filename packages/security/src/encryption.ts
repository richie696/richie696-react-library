import { base64ToBytes, bytesToBase64, resolveWebCrypto } from './encoding.js';

/** Maintains an ephemeral ECDH/AES-GCM session with a gateway. */
export class EccCryptoSession {
  private keyPair?: CryptoKeyPair;
  private sharedKey?: CryptoKey;
  private gatewayKey?: string;

  constructor(private readonly suppliedCrypto?: Crypto) {}

  get gatewayKeyId(): string | undefined { return this.gatewayKey; }
  get initialized(): boolean { return this.sharedKey !== undefined && this.gatewayKey !== undefined; }

  /** Performs the initial P-256 key exchange with the gateway. */
  async exchange(baseUrl: string, clientId: string, path = '/api/crypto/exchange', protocolVersion = '1', fetcher: typeof fetch = globalThis.fetch.bind(globalThis)): Promise<void> {
    const cryptoApi = this.crypto();
    this.keyPair = await cryptoApi.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey']);
    const clientPublicKey = await cryptoApi.subtle.exportKey('spki', this.keyPair.publicKey);
    const endpoint = /^https?:\/\//i.test(path) ? path : `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
    const response = await fetcher(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', 'x-client-id': clientId, 'x-client-public-key': bytesToBase64(new Uint8Array(clientPublicKey)), 'x-gateway-protocol-version': protocolVersion } });
    if (!response.ok) throw new Error(`Key exchange failed with status ${response.status}`);
    const payload = await response.json() as { keyId?: unknown; gatewayPublicKey?: unknown };
    if (typeof payload.keyId !== 'string' || typeof payload.gatewayPublicKey !== 'string') throw new TypeError('Key exchange response is missing keyId or gatewayPublicKey');
    await this.reHandshake(payload.keyId, payload.gatewayPublicKey);
  }

  /** Replaces the remote key and derives a new AES-GCM session key. */
  async reHandshake(keyId: string, gatewayPublicKey: string): Promise<void> {
    if (!this.keyPair) throw new Error('Local ECDH key pair is not initialized');
    const cryptoApi = this.crypto();
    const remoteKey = await cryptoApi.subtle.importKey('spki', base64ToBytes(gatewayPublicKey), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    this.sharedKey = await cryptoApi.subtle.deriveKey({ name: 'ECDH', public: remoteKey }, this.keyPair.privateKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    this.gatewayKey = keyId;
  }

  /** Encrypts a UTF-8 string and returns a Base64 payload containing its IV. */
  async encrypt(value: string): Promise<string> {
    if (!this.sharedKey) throw new Error('Shared encryption key is not initialized');
    const cryptoApi = this.crypto();
    const iv = cryptoApi.getRandomValues(new Uint8Array(12));
    const ciphertext = await cryptoApi.subtle.encrypt({ name: 'AES-GCM', iv }, this.sharedKey, new TextEncoder().encode(value));
    const output = new Uint8Array(iv.length + ciphertext.byteLength);
    output.set(iv);
    output.set(new Uint8Array(ciphertext), iv.length);
    return bytesToBase64(output);
  }

  /** Decrypts a payload produced by {@link encrypt}. */
  async decrypt(value: string): Promise<string> {
    if (!this.sharedKey) throw new Error('Shared encryption key is not initialized');
    const cryptoApi = this.crypto();
    const combined = base64ToBytes(value);
    if (combined.length < 28) throw new TypeError('Encrypted payload is too short');
    const plaintext = await cryptoApi.subtle.decrypt({ name: 'AES-GCM', iv: combined.slice(0, 12) }, this.sharedKey, combined.slice(12));
    return new TextDecoder().decode(plaintext);
  }

  /** Discards all local key material. */
  clear(): void {
    this.keyPair = undefined;
    this.sharedKey = undefined;
    this.gatewayKey = undefined;
  }

  private crypto(): Crypto { return resolveWebCrypto(this.suppliedCrypto); }
}
