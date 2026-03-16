'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function DevnetBanner() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Check if user dismissed the banner in this session
    const dismissed = sessionStorage.getItem('devnet-banner-dismissed');
    if (dismissed === 'true') {
      setIsVisible(false);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('devnet-banner-dismissed', 'true');
  };

  // Only show on devnet or always show for now
  const shouldShow = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet' || true;

  if (!shouldShow || !isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 h-8 bg-gradient-to-r from-amber-500 to-amber-600 text-amber-900 text-xs font-medium flex items-center justify-center z-[9999] overflow-hidden">
      <div className="flex items-center whitespace-nowrap animate-marquee">
        <span>
          ⚠️ DEVNET MODE — This app runs on Solana Devnet. No real money is used. Transactions use test SOL only. Do not send real funds. •
          ⚠️ DEVNET MODE — This app runs on Solana Devnet. No real money is used. Transactions use test SOL only. Do not send real funds. •
        </span>
      </div>
      <button
        onClick={handleDismiss}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-amber-700 hover:bg-amber-800 rounded-full flex items-center justify-center text-amber-100 transition-colors"
      >
        <X size={12} />
      </button>
    </div>
  );
}