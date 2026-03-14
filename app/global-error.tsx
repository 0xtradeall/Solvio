'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Solvio] Global error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          backgroundColor: '#f9fafb',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '360px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚡</div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
              Solvio needs to reload
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 24px' }}>
              A critical error occurred. Your stored data is safe in your browser.
            </p>
            <button
              onClick={reset}
              style={{
                width: '100%',
                padding: '12px',
                background: '#7c3aed',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: '12px',
              }}
            >
              Reload app
            </button>
            <a
              href="/"
              style={{ display: 'block', fontSize: '13px', color: '#9ca3af', textDecoration: 'none' }}
            >
              Return to home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
