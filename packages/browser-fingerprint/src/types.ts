/** Browser signals used to construct an opt-in hardware fingerprint. */
export interface HardwareFingerprint {
  readonly canvas: string;
  readonly webgl: string;
  readonly screen: string;
  readonly timezone: string;
  readonly language: string;
  readonly hardwareConcurrency: number;
  readonly deviceMemory?: number;
  readonly colorDepth: number;
  readonly pixelRatio: number;
  readonly platform: string;
}

/** A fingerprint payload with replay-resistant request metadata. */
export interface SecureHardwareFingerprint extends HardwareFingerprint {
  readonly timestamp: number;
  readonly nonce: string;
}

/** Collects hardware signals without coupling callers to browser globals. */
export interface HardwareFingerprintCollector {
  collect(signal?: AbortSignal): Promise<HardwareFingerprint>;
}

/** Raised when browser fingerprint APIs are unavailable, such as during SSR. */
export class FingerprintUnavailableError extends Error {
  override readonly name = 'FingerprintUnavailableError';
}
