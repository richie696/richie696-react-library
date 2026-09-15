import { base64ToBytes, bytesToBase64, pemToBytes, resolveWebCrypto, toBytes, type BinaryInput } from './encoding.js';

/** Signs an opaque message and returns a standard Base64 signature. */
export interface MessageSigner {
  readonly algorithm: string;
  sign(value: BinaryInput): Promise<string>;
}

/** Verifies a standard Base64 signature for an opaque message. */
export interface MessageVerifier {
  readonly algorithm: string;
  verify(value: BinaryInput, signature: string): Promise<boolean>;
}

/** HMAC-SHA256 signer and verifier backed by a non-extractable Web Crypto key. */
export class HmacSha256Signer implements MessageSigner, MessageVerifier {
  readonly algorithm = 'HMAC-SHA-256';
  private readonly key: Promise<CryptoKey>;

  constructor(secret: string | Uint8Array, private readonly cryptoApi: Crypto = resolveWebCrypto()) {
    const keyBytes = typeof secret === 'string' ? new TextEncoder().encode(secret) : Uint8Array.from(secret);
    if (keyBytes.byteLength === 0) throw new TypeError('HMAC secret must not be empty');
    this.key = this.cryptoApi.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  }

  async sign(value: BinaryInput): Promise<string> {
    const signature = await this.cryptoApi.subtle.sign('HMAC', await this.key, toBytes(value));
    return bytesToBase64(new Uint8Array(signature));
  }

  async verify(value: BinaryInput, signature: string): Promise<boolean> {
    try {
      return await this.cryptoApi.subtle.verify('HMAC', await this.key, base64ToBytes(signature), toBytes(value));
    } catch {
      return false;
    }
  }
}

/** RSA-PSS SHA-256 signer using a caller-owned private key. */
export class RsaPssSha256Signer implements MessageSigner {
  readonly algorithm = 'RSA-PSS-SHA-256';

  constructor(
    private readonly privateKey: CryptoKey,
    private readonly saltLength = 32,
    private readonly cryptoApi: Crypto = resolveWebCrypto(),
  ) {
    if (saltLength < 0) throw new RangeError('RSA-PSS salt length must not be negative');
  }

  async sign(value: BinaryInput): Promise<string> {
    const signature = await this.cryptoApi.subtle.sign({ name: 'RSA-PSS', saltLength: this.saltLength }, this.privateKey, toBytes(value));
    return bytesToBase64(new Uint8Array(signature));
  }
}

/** RSA-PSS SHA-256 verifier using a caller-owned public key. */
export class RsaPssSha256Verifier implements MessageVerifier {
  readonly algorithm = 'RSA-PSS-SHA-256';

  constructor(
    private readonly publicKey: CryptoKey,
    private readonly saltLength = 32,
    private readonly cryptoApi: Crypto = resolveWebCrypto(),
  ) {
    if (saltLength < 0) throw new RangeError('RSA-PSS salt length must not be negative');
  }

  async verify(value: BinaryInput, signature: string): Promise<boolean> {
    try {
      return await this.cryptoApi.subtle.verify({ name: 'RSA-PSS', saltLength: this.saltLength }, this.publicKey, base64ToBytes(signature), toBytes(value));
    } catch {
      return false;
    }
  }
}

/** Imports a PKCS#8 RSA private key for RSA-PSS SHA-256 signing. */
export async function importRsaPssPrivateKey(value: string | Uint8Array, cryptoApi: Crypto = resolveWebCrypto()): Promise<CryptoKey> {
  const bytes = typeof value === 'string' ? pemToBytes(value) : Uint8Array.from(value);
  return cryptoApi.subtle.importKey('pkcs8', bytes, { name: 'RSA-PSS', hash: 'SHA-256' }, false, ['sign']);
}

/** Imports an SPKI RSA public key for RSA-PSS SHA-256 verification. */
export async function importRsaPssPublicKey(value: string | Uint8Array, cryptoApi: Crypto = resolveWebCrypto()): Promise<CryptoKey> {
  const bytes = typeof value === 'string' ? pemToBytes(value) : Uint8Array.from(value);
  return cryptoApi.subtle.importKey('spki', bytes, { name: 'RSA-PSS', hash: 'SHA-256' }, false, ['verify']);
}
