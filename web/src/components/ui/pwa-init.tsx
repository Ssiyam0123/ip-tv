'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker for PWA offline support.
 * Must be rendered client-side, placed inside <body>.
 */
export function PwaInit() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });

        // Check for updates every 60 seconds when the app is open
        setInterval(() => registration.update(), 60_000);

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content available — could show a toast here
              console.log('[SW] New version available. Refresh to update.');
            }
          });
        });
      } catch (err) {
        console.warn('[SW] Registration failed:', err);
      }
    };

    // Defer registration until after page load for performance
    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }
  }, []);

  return null;
}
