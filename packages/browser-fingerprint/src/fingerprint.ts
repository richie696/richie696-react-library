import { sha256Hex } from '@richie696/react-framework-security';
import type { HardwareFingerprint } from './types.js';

/** Serializes a fingerprint using its stable public field order. */
export function fingerprintToString(fingerprint: HardwareFingerprint): string {
  return JSON.stringify(fingerprint);
}

/** Parses a serialized hardware fingerprint. */
export function fingerprintFromString(value: string): HardwareFingerprint {
  const parsed = JSON.parse(value) as unknown;
  if (!isHardwareFingerprint(parsed)) throw new TypeError('Invalid hardware fingerprint payload');
  return parsed;
}

/** Hashes a hardware fingerprint for compact comparison or storage. */
export async function fingerprintToHash(fingerprint: HardwareFingerprint, cryptoApi?: Crypto): Promise<string> {
  return sha256Hex(fingerprintToString(fingerprint), cryptoApi);
}

/** Calculates a weighted similarity score from zero to one. */
export function calculateFingerprintSimilarity(left: HardwareFingerprint, right: HardwareFingerprint): number {
  const weighted: readonly [boolean, number][] = [
    [left.canvas === right.canvas, 0.4],
    [left.webgl === right.webgl, 0.4],
    [left.screen === right.screen, 0.05],
    [left.timezone === right.timezone, 0.03],
    [left.language === right.language, 0.02],
    [left.hardwareConcurrency === right.hardwareConcurrency, 0.03],
    [left.colorDepth === right.colorDepth, 0.02],
    [Math.abs(left.pixelRatio - right.pixelRatio) < 0.1, 0.02],
    [left.platform === right.platform, 0.01],
  ];
  let score = 0;
  let total = 0;
  for (const [matches, weight] of weighted) {
    total += weight;
    if (matches) score += weight;
  }
  if (left.deviceMemory !== undefined && right.deviceMemory !== undefined) {
    total += 0.02;
    if (left.deviceMemory === right.deviceMemory) score += 0.02;
  }
  return total === 0 ? 0 : score / total;
}

function isHardwareFingerprint(value: unknown): value is HardwareFingerprint {
  if (value === null || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.canvas === 'string'
    && typeof item.webgl === 'string'
    && typeof item.screen === 'string'
    && typeof item.timezone === 'string'
    && typeof item.language === 'string'
    && typeof item.hardwareConcurrency === 'number'
    && (item.deviceMemory === undefined || typeof item.deviceMemory === 'number')
    && typeof item.colorDepth === 'number'
    && typeof item.pixelRatio === 'number'
    && typeof item.platform === 'string';
}
