import { toBytes, type BinaryInput } from './encoding.js';

/** Computes a lowercase SHA-256 hexadecimal digest using Web Crypto. */
export async function sha256Hex(value: BinaryInput, cryptoApi: Crypto = globalThis.crypto): Promise<string> {
  if (!cryptoApi?.subtle) throw new Error('Web Crypto API is unavailable');
  const digest = await cryptoApi.subtle.digest('SHA-256', toBytes(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
