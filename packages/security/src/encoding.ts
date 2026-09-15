/** Binary inputs accepted by digest and signature operations. */
export type BinaryInput = string | ArrayBuffer | ArrayBufferView;

/** Converts text and buffer-like inputs to an owned byte array. */
export function toBytes(value: BinaryInput): Uint8Array<ArrayBuffer> {
  if (typeof value === 'string') return new TextEncoder().encode(value);
  if (value instanceof ArrayBuffer) return new Uint8Array(value.slice(0));
  return Uint8Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
}

/** Encodes bytes using standard padded Base64. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return globalThis.btoa(binary);
}

/** Decodes standard Base64 to bytes. */
export function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = globalThis.atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

/** Decodes a PEM block or raw Base64 key body. */
export function pemToBytes(value: string): Uint8Array<ArrayBuffer> {
  const body = value.replace(/-----BEGIN [^-]+-----/g, '').replace(/-----END [^-]+-----/g, '').replace(/\s+/g, '');
  if (!body) throw new TypeError('The PEM key body is empty');
  return base64ToBytes(body);
}

/** Resolves a standards-based Web Crypto implementation. */
export function resolveWebCrypto(value?: Crypto): Crypto {
  const cryptoApi = value ?? globalThis.crypto;
  if (!cryptoApi?.subtle) throw new Error('Web Crypto API is unavailable');
  return cryptoApi;
}
