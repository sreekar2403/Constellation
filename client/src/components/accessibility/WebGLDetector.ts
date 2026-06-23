/**
 * Detect if WebGL 2.0 is available in the browser.
 * Returns a promise that resolves with the WebGL info.
 */
export interface WebGLInfo {
  supported: boolean;
  renderer?: string;
  vendor?: string;
  maxTextureSize?: number;
  reason?: string;
}

export function detectWebGL(): WebGLInfo {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');

    if (!gl) {
      // Try WebGL 1.0 fallback
      const gl1 = canvas.getContext('webgl') || (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);

      if (!gl1) {
        return {
          supported: false,
          reason: 'WebGL is not supported by this browser or device.',
        };
      }

      const debugInfo = gl1.getExtension('WEBGL_debug_renderer_info');
      return {
        supported: true,
        renderer: debugInfo
          ? gl1.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
          : 'Unknown (WebGL 1.0)',
        vendor: debugInfo
          ? gl1.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
          : 'Unknown',
        maxTextureSize: gl1.getParameter(gl1.MAX_TEXTURE_SIZE),
      };
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      supported: true,
      renderer: debugInfo
        ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        : 'Unknown (WebGL 2.0)',
      vendor: debugInfo
        ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
        : 'Unknown',
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    };
  } catch (err) {
    return {
      supported: false,
      reason: err instanceof Error ? err.message : 'Unknown WebGL error',
    };
  }
}

/**
 * Check if the user has expressed a preference for reduced motion.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
