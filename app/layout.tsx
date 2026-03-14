import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SolvioWalletProvider } from '@/components/providers/WalletProvider';
import BottomNav from '@/components/BottomNav';

export const metadata: Metadata = {
  metadataBase: new URL('https://solvio.replit.app'),
  title: 'Solvio — Solana Payment Hub',
  description: 'Mobile-first Solana payment hub. Request payments, split bills, generate receipts.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Solvio',
  },
  openGraph: {
    title: 'Solvio — Solana Payment Hub',
    description: 'Request payments, split bills, generate receipts on Solana.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#7C3AED',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <SolvioWalletProvider>
          <main className="min-h-screen pb-16 max-w-lg mx-auto">
            {children}
          </main>
          <BottomNav />
        </SolvioWalletProvider>
      </body>
    </html>
  );
}
