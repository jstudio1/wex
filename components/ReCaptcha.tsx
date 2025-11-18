'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

declare global {
  interface Window {
    grecaptcha: {
      render: (container: HTMLElement, options: {
        sitekey: string;
        callback: (token: string) => void;
        'expired-callback': () => void;
        'error-callback': () => void;
      }) => number;
      reset: (widgetId: number) => void;
      getResponse: (widgetId: number) => string;
    };
  }
}

interface ReCaptchaProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  disabled?: boolean;
}

export default function ReCaptcha({ siteKey, onVerify, onExpire, onError, disabled }: ReCaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRenderingRef = useRef(false);
  
  // Store callbacks in refs to prevent re-renders
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change
  useEffect(() => {
    onVerifyRef.current = onVerify;
    onExpireRef.current = onExpire;
    onErrorRef.current = onError;
  }, [onVerify, onExpire, onError]);

  useEffect(() => {
    if (!siteKey) {
      console.log('[ReCaptcha] No site key provided');
      return;
    }

    // Load reCaptcha script
    if (window.grecaptcha) {
      console.log('[ReCaptcha] Script already loaded');
      setScriptLoaded(true);
      return;
    }

    console.log('[ReCaptcha] Loading script...');
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('[ReCaptcha] Script loaded successfully');
      setScriptLoaded(true);
    };
    script.onerror = () => {
      console.error('[ReCaptcha] Script load error');
      setError('ไม่สามารถโหลด reCaptcha ได้');
      if (onError) onError();
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup script if component unmounts
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [siteKey, onError]);

  useEffect(() => {
    if (disabled) {
      console.log('[ReCaptcha] Disabled, skipping render');
      return;
    }

    if (!siteKey) {
      console.log('[ReCaptcha] No site key, skipping render');
      return;
    }

    if (!scriptLoaded) {
      console.log('[ReCaptcha] Script not loaded yet');
      return;
    }

    if (!containerRef.current) {
      console.log('[ReCaptcha] Container not ready');
      return;
    }

    // Don't render if widget already exists or is currently rendering
    if (widgetIdRef.current !== null || isRenderingRef.current) {
      console.log('[ReCaptcha] Widget already rendered or rendering, skipping');
      return;
    }

    console.log('[ReCaptcha] Rendering widget with site key:', siteKey);

    try {
      // Render reCaptcha
      if (window.grecaptcha && containerRef.current) {
        isRenderingRef.current = true;
        
        // Small delay to ensure container is ready
        const timeoutId = setTimeout(() => {
          if (!containerRef.current || !window.grecaptcha || widgetIdRef.current !== null) {
            isRenderingRef.current = false;
            return;
          }
          
          try {
            widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
              sitekey: siteKey,
              callback: (token: string) => {
                console.log('[ReCaptcha] Verified successfully');
                onVerifyRef.current(token);
              },
              'expired-callback': () => {
                console.log('[ReCaptcha] Token expired');
                if (onExpireRef.current) onExpireRef.current();
              },
              'error-callback': () => {
                console.error('[ReCaptcha] Error callback');
                setError('เกิดข้อผิดพลาดกับ reCaptcha');
                if (onErrorRef.current) onErrorRef.current();
              },
            });
            console.log('[ReCaptcha] Widget rendered with ID:', widgetIdRef.current);
            isRenderingRef.current = false;
          } catch (renderErr) {
            console.error('[ReCaptcha] Render error:', renderErr);
            isRenderingRef.current = false;
            // If render fails, clear the container
            if (containerRef.current) {
              containerRef.current.innerHTML = '';
            }
            widgetIdRef.current = null;
          }
        }, 100);

        return () => {
          clearTimeout(timeoutId);
          isRenderingRef.current = false;
        };
      }
    } catch (err) {
      console.error('[ReCaptcha] Setup error:', err);
      isRenderingRef.current = false;
      setError('ไม่สามารถแสดง reCaptcha ได้');
      if (onError) onError();
    }

    return () => {
      // Cleanup on unmount or dependency change
      if (widgetIdRef.current !== null && window.grecaptcha) {
        try {
          const widgetId = widgetIdRef.current;
          window.grecaptcha.reset(widgetId);
          // Clear container
          if (containerRef.current) {
            containerRef.current.innerHTML = '';
          }
          widgetIdRef.current = null;
        } catch {
          // ignore cleanup errors
        }
      }
      isRenderingRef.current = false;
    };
  }, [scriptLoaded, siteKey, disabled]);

  if (error) {
    return (
      <div className="text-sm text-red-400 p-2 border border-red-800 rounded">
        {error}
      </div>
    );
  }

  if (!siteKey) {
    return null;
  }

  return <div ref={containerRef} className="flex justify-center" />;
}

