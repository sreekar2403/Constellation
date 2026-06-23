import React, { createContext, useContext, useEffect, useState } from 'react';
import { detectWebGL, prefersReducedMotion, type WebGLInfo } from './WebGLDetector';

interface AccessibilityContextValue {
  /** Whether WebGL is available */
  webglSupported: boolean;
  /** WebGL info including renderer */
  webglInfo: WebGLInfo;
  /** Whether user prefers reduced motion */
  reducedMotion: boolean;
  /** Whether to show fallback view */
  useFallback: boolean;
  /** Force fallback mode */
  setUseFallback: (use: boolean) => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue>({
  webglSupported: true,
  webglInfo: { supported: true },
  reducedMotion: false,
  useFallback: false,
  setUseFallback: () => {},
});

export const useAccessibility = () => useContext(AccessibilityContext);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [webglInfo, setWebglInfo] = useState<WebGLInfo>({ supported: true });
  const [reducedMotion, setReducedMotion] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    // Detect WebGL
    const info = detectWebGL();
    setWebglInfo(info);

    if (!info.supported) {
      setUseFallback(true);
    }

    // Detect reduced motion preference
    setReducedMotion(prefersReducedMotion());

    // Listen for changes in reduced-motion preference
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <AccessibilityContext.Provider
      value={{
        webglSupported: webglInfo.supported,
        webglInfo,
        reducedMotion,
        useFallback,
        setUseFallback,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};
