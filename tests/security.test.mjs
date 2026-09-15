import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HmacSha256Signer,
  importRsaPssPrivateKey,
  importRsaPssPublicKey,
  RsaPssSha256Signer,
  RsaPssSha256Verifier,
} from '../packages/security/dist/index.js';

test('HmacSha256Signer matches the standard SHA-256 vector and rejects tampering', async () => {
  const signer = new HmacSha256Signer('key');
  const message = 'The quick brown fox jumps over the lazy dog';
  const signature = await signer.sign(message);
  assert.equal(signature, '97yD9DBThCSxMpjmqm+xQ+9NWaFJRhdZl0edvC0aPNg=');
  assert.equal(await signer.verify(message, signature), true);
  assert.equal(await signer.verify(`${message}.`, signature), false);
  assert.equal(await signer.verify(message, 'invalid-base64'), false);
});

test('RSA-PSS signers interoperate with exported and re-imported Web Crypto keys', async () => {
  const pair = await globalThis.crypto.subtle.generateKey(
    { name: 'RSA-PSS', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  );
  const privateBytes = new Uint8Array(await globalThis.crypto.subtle.exportKey('pkcs8', pair.privateKey));
  const publicBytes = new Uint8Array(await globalThis.crypto.subtle.exportKey('spki', pair.publicKey));
  const privateKey = await importRsaPssPrivateKey(privateBytes);
  const publicKey = await importRsaPssPublicKey(publicBytes);
  const signer = new RsaPssSha256Signer(privateKey);
  const verifier = new RsaPssSha256Verifier(publicKey);
  const signature = await signer.sign('signed message');
  assert.equal(await verifier.verify('signed message', signature), true);
  assert.equal(await verifier.verify('tampered message', signature), false);
});
