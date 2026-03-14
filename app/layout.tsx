import type { Metadata } from 'next';
import './globals.css';
import { SolvioWalletProvider } from '@/components/providers/WalletProvider';
import BottomNav from '@/components/BottomNav';

export const metadata: Metadata = {
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
    <html lang="en">
      <head>
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
