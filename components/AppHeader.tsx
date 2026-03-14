'use client';

import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { SolvioLogo } from './SolvioLogo';
import { Home } from 'lucide-react';

export default function AppHeader() {
  const { publicKey, connected } = useWallet();
  const short = publicKey ? `${publicKey.toBase58().slice(0, 4)}…${publicKey.toBase58().slice(-4)}` : '';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-1.5 text-gray-500 hover:text-primary-600 transition-colors text-sm font-medium">
          <Home size={15} />
          <span className="hidden sm:inline">Home</span>
        </Link>

        <Link href="/" className="absolute left-1/2 -translate-x-1/2">
          <SolvioLogo size={26} wordmarkColor="text-gray-900" />
        </Link>

        <div className="flex items-center gap-2">
          {connected && publicKey ? (
            <span className="text-xs bg-green-50 text-green-700 border border-green-200 font-mono px-2 py-1 rounded-lg">
              {short}
            </span>
          ) : (
            <span className="text-xs bg-gray-100 text-gray-400 px-2 py-1 rounded-lg">Not connected</span>
          )}
        </div>
      </div>
    </header>
  );
}
