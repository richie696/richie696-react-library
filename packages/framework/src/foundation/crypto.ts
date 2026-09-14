/** Computes a lowercase SHA-256 hexadecimal digest using Web Crypto. */
export async function sha256Hex(value: string | ArrayBuffer): Promise<string> {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Maintains an ephemeral ECDH/AES-GCM session with a gateway. */
export class EccCryptoSession {
  private keyPair?: CryptoKeyPair;
  private sharedKey?: CryptoKey;
  private _gatewayKeyId?: string;

  /** Identifier assigned by the remote gateway after a successful exchange. */
  get gatewayKeyId(): string | undefined { return this._gatewayKeyId; }
  /** Indicates whether a shared encryption key is currently available. */
  get initialized(): boolean { return this.sharedKey !== undefined && this._gatewayKeyId !== undefined; }

  /** Performs the initial P-256 key exchange with the gateway. */
  async exchange(baseUrl: string, clientId: string, path = '/api/crypto/exchange', protocolVersion = '1', fetcher: typeof fetch = fetch): Promise<void> {
    const cryptoApi = this.crypto();
    this.keyPair = await cryptoApi.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey']);
    const clientPublicKey = await cryptoApi.subtle.exportKey('spki', this.keyPair.publicKey);
    const endpoint = /^https?:\/\//i.test(path) ? path : `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
    const response = await fetcher(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', 'x-client-id': clientId, 'x-client-public-key': toBase64(new Uint8Array(clientPublicKey)), 'x-gateway-protocol-version': protocolVersion } });
    if (!response.ok) throw new Error(`Key exchange failed with status ${response.status}`);
    const payload = await response.json() as { keyId?: unknown; gatewayPublicKey?: unknown };
    if (typeof payload.keyId !== 'string' || typeof payload.gatewayPublicKey !== 'string') throw new TypeError('Key exchange response is missing keyId or gatewayPublicKey');
    await this.reHandshake(payload.keyId, payload.gatewayPublicKey);
  }

  /** Replaces the remote key and derives a new AES-GCM session key. */
  async reHandshake(keyId: string, gatewayPublicKey: string): Promise<void> {
    if (!this.keyPair) throw new Error('Local ECDH key pair is not initialized');
    const encoded = fromBase64(gatewayPublicKey);
    const keyData = encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength) as ArrayBuffer;
    const remoteKey = await this.crypto().subtle.importKey('spki', keyData, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    this.sharedKey = await this.crypto().subtle.deriveKey({ name: 'ECDH', public: remoteKey }, this.keyPair.privateKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    this._gatewayKeyId = keyId;
  }

  /** Encrypts a UTF-8 string and returns an encoded payload containing its IV. */
  async encrypt(value: string): Promise<string> {
    if (!this.sharedKey) throw new Error('Shared encryption key is not initialized');
    const iv = this.crypto().getRandomValues(new Uint8Array(12));
    const ciphertext = await this.crypto().subtle.encrypt({ name: 'AES-GCM', iv }, this.sharedKey, new TextEncoder().encode(value));
    const output = new Uint8Array(iv.length + ciphertext.byteLength); output.set(iv); output.set(new Uint8Array(ciphertext), iv.length); return toBase64(output);
  }

  /** Decrypts a payload produced by {@link encrypt}. */
  async decrypt(value: string): Promise<string> {
    if (!this.sharedKey) throw new Error('Shared encryption key is not initialized');
    const combined = fromBase64(value); if (combined.length < 28) throw new TypeError('Encrypted payload is too short');
    const plaintext = await this.crypto().subtle.decrypt({ name: 'AES-GCM', iv: combined.slice(0, 12) }, this.sharedKey, combined.slice(12));
    return new TextDecoder().decode(plaintext);
  }

  /** Discards all local key material. */
  clear(): void { this.keyPair = undefined; this.sharedKey = undefined; this._gatewayKeyId = undefined; }

  private crypto(): Crypto { if (!globalThis.crypto?.subtle) throw new Error('Web Crypto API is unavailable'); return globalThis.crypto; }
}

function toBase64(bytes: Uint8Array): string { return btoa(String.fromCharCode(...bytes)); }
function fromBase64(value: string): Uint8Array { return Uint8Array.from(atob(value), (character) => character.charCodeAt(0)); }
