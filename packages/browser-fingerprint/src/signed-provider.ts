import { bytesToBase64, HmacSha256Signer, resolveWebCrypto, type MessageSigner } from '@richie696/react-framework-security';
import { BrowserHardwareFingerprintCollector } from './browser-collector.js';
import type { HardwareFingerprintCollector, SecureHardwareFingerprint } from './types.js';

/** Configuration for signed, replay-resistant fingerprint header values. */
export interface SignedHardwareFingerprintProviderOptions {
  readonly crypto?: Crypto;
  readonly now?: () => number;
  readonly nonceByteLength?: number;
}

/** Produces `{fingerprint JSON}.{Base64 signature}` for explicit HTTP injection. */
export class SignedHardwareFingerprintProvider {
  private readonly cryptoApi: Crypto;
  private readonly now: () => number;
  private readonly nonceByteLength: number;

  constructor(
    private readonly collector: HardwareFingerprintCollector,
    private readonly signer: MessageSigner,
    options: SignedHardwareFingerprintProviderOptions = {},
  ) {
    this.cryptoApi = resolveWebCrypto(options.crypto);
    this.now = options.now ?? Date.now;
    this.nonceByteLength = options.nonceByteLength ?? 16;
    if (!Number.isInteger(this.nonceByteLength) || this.nonceByteLength < 8) throw new RangeError('Fingerprint nonce must contain at least 8 bytes');
  }

  /** Creates one fresh signed value. No value is persisted by this provider. */
  async getHeaderValue(signal?: AbortSignal): Promise<string> {
    assertNotAborted(signal);
    const fingerprint = await this.collector.collect(signal);
    const nonce = this.cryptoApi.getRandomValues(new Uint8Array(this.nonceByteLength));
    const payload: SecureHardwareFingerprint = { ...fingerprint, timestamp: this.now(), nonce: bytesToBase64(nonce) };
    const json = JSON.stringify(payload);
    const signature = await this.signer.sign(json);
    assertNotAborted(signal);
    return `${json}.${signature}`;
  }
}

/** Creates the standard browser collector plus HMAC-SHA256 signed provider. */
export function createHmacHardwareFingerprintProvider(
  secret: string | Uint8Array,
  options: SignedHardwareFingerprintProviderOptions & { readonly collector?: HardwareFingerprintCollector } = {},
): SignedHardwareFingerprintProvider {
  const cryptoApi = resolveWebCrypto(options.crypto);
  return new SignedHardwareFingerprintProvider(
    options.collector ?? new BrowserHardwareFingerprintCollector(),
    new HmacSha256Signer(secret, cryptoApi),
    { ...options, crypto: cryptoApi },
  );
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw signal.reason instanceof Error ? signal.reason : new DOMException('Fingerprint signing was aborted', 'AbortError');
}
