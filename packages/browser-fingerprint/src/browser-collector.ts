import { sha256Hex } from '@richie696/react-framework-security';
import { FingerprintUnavailableError, type HardwareFingerprint, type HardwareFingerprintCollector } from './types.js';

interface NavigatorWithMemory extends Navigator { readonly deviceMemory?: number; }

/** Browser API boundary, injectable for tests and non-window hosts. */
export interface BrowserFingerprintEnvironment {
  readonly document: Document;
  readonly navigator: NavigatorWithMemory;
  readonly screen: Screen;
  readonly devicePixelRatio: number;
  readonly crypto?: Crypto;
}

/** Collects Canvas, WebGL and coarse browser/device signals on explicit invocation. */
export class BrowserHardwareFingerprintCollector implements HardwareFingerprintCollector {
  constructor(private readonly suppliedEnvironment?: BrowserFingerprintEnvironment) {}

  async collect(signal?: AbortSignal): Promise<HardwareFingerprint> {
    assertNotAborted(signal);
    const environment = this.suppliedEnvironment ?? resolveBrowserEnvironment();
    const canvas = await collectCanvasHash(environment, signal);
    const webgl = await collectWebGlHash(environment, signal);
    assertNotAborted(signal);

    let timezone = '';
    try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''; } catch { timezone = ''; }

    return {
      canvas,
      webgl,
      screen: `${environment.screen.width}x${environment.screen.height}`,
      timezone,
      language: environment.navigator.language ?? '',
      hardwareConcurrency: environment.navigator.hardwareConcurrency ?? 0,
      ...(environment.navigator.deviceMemory === undefined ? {} : { deviceMemory: environment.navigator.deviceMemory }),
      colorDepth: environment.screen.colorDepth ?? 0,
      pixelRatio: environment.devicePixelRatio || 1,
      platform: environment.navigator.platform ?? '',
    };
  }
}

/** Convenience function for one-off browser collection. */
export async function generateHardwareFingerprint(signal?: AbortSignal): Promise<HardwareFingerprint> {
  return new BrowserHardwareFingerprintCollector().collect(signal);
}

/** Returns a user-facing browser/device label without parsing it as a security claim. */
export function getDeviceName(navigatorApi: Navigator = globalThis.navigator): string {
  const userAgent = navigatorApi.userAgent;
  const device = /iPhone/.test(userAgent) ? 'iPhone'
    : /iPad/.test(userAgent) ? 'iPad'
      : /Android/.test(userAgent) ? 'Android Device'
        : /Windows/.test(userAgent) ? 'Windows PC'
          : /Mac/.test(userAgent) ? 'Mac'
            : /Linux/.test(userAgent) ? 'Linux PC'
              : /Mobile/.test(userAgent) ? 'Mobile Device' : 'Desktop';
  const browser = /Edg/.test(userAgent) ? 'Edge'
    : /OPR/.test(userAgent) ? 'Opera'
      : /Chrome/.test(userAgent) ? 'Chrome'
        : /Firefox/.test(userAgent) ? 'Firefox'
          : /Safari/.test(userAgent) ? 'Safari' : 'Unknown Browser';
  return `${browser} on ${device}`;
}

function resolveBrowserEnvironment(): BrowserFingerprintEnvironment {
  if (typeof document === 'undefined' || typeof navigator === 'undefined' || typeof screen === 'undefined') {
    throw new FingerprintUnavailableError('Browser fingerprint APIs are unavailable in this host');
  }
  return {
    document,
    navigator,
    screen,
    devicePixelRatio: globalThis.devicePixelRatio ?? 1,
    crypto: globalThis.crypto,
  };
}

async function collectCanvasHash(environment: BrowserFingerprintEnvironment, signal?: AbortSignal): Promise<string> {
  try {
    const canvas = environment.document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const context = canvas.getContext('2d');
    if (!context) return '';
    context.textBaseline = 'top';
    context.font = '14px Arial';
    context.fillText('Hardware fingerprint', 2, 2);
    assertNotAborted(signal);
    return sha256Hex(canvas.toDataURL(), environment.crypto);
  } catch (error) {
    if (signal?.aborted) throw error;
    return '';
  }
}

async function collectWebGlHash(environment: BrowserFingerprintEnvironment, signal?: AbortSignal): Promise<string> {
  try {
    const canvas = environment.document.createElement('canvas');
    const context = canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl');
    const webgl = context as WebGLRenderingContext | null;
    if (!webgl) return '';
    const debugInfo = webgl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return '';
    const vendor = String(webgl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) ?? '');
    const renderer = String(webgl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ?? '');
    assertNotAborted(signal);
    return sha256Hex(`${vendor}|${renderer}`, environment.crypto);
  } catch (error) {
    if (signal?.aborted) throw error;
    return '';
  }
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw signal.reason instanceof Error ? signal.reason : new DOMException('Fingerprint collection was aborted', 'AbortError');
}
