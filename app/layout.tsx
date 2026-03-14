import type { Metadata } from 'next';
import './globals.css';
import { SolvioWalletProvider } from '@/components/providers/WalletProvider';
import AppShell from '@/components/AppShell';

export const metadata: Metadata = {
  metadataBase: new URL('https://solvio.replit.app'),
  title: 'Solvio — Solana Payment Hub',
  description: 'Mobile-first Solana payment hub. Request payments, split bills, generate receipts.',
  manifest: '/manifest.json',
  themeColor: '#7C3AED',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#7C3AED" />
      </head>
      <body>
        <SolvioWalletProvider>
          <AppShell>
            {children}
          </AppShell>
        </SolvioWalletProvider>
      </body>
    </html>
  );
}
