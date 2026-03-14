'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { SolvioLogo } from './SolvioLogo';
import { Home, Copy, LogOut, Check } from 'lucide-react';

export default function AppHeader() {
  const { publicKey, connected, disconnect } = useWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const short = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}…${publicKey.toBase58().slice(-4)}`
    : '';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleCopy = async () => {
    if (!publicKey) return;
    try {
      await navigator.clipboard.writeText(publicKey.toBase58());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = publicKey.toBase58();
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-purple-100/60 shadow-sm shadow-purple-100/40">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-gray-400 hover:text-primary-600 transition-colors text-sm font-medium"
        >
          <Home size={15} />
          <span className="hidden sm:inline">Home</span>
        </Link>

        <Link href="/" className="absolute left-1/2 -translate-x-1/2">
          <SolvioLogo size={26} wordmarkColor="text-gray-900" />
        </Link>

        <div className="flex items-center gap-2">
          {connected && publicKey ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setOpen(o => !o)}
                className={`text-xs font-mono px-2.5 py-1.5 rounded-lg border transition-all ${
                  open
                    ? 'bg-green-100 text-green-800 border-green-300'
                    : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                }`}
              >
                {short}
              </button>

              {open && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
                  <button
                    onClick={handleCopy}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                  >
                    {copied
                      ? <Check size={15} className="text-green-500 flex-shrink-0" />
                      : <Copy size={15} className="text-gray-400 flex-shrink-0" />}
                    <span>{copied ? 'Copied!' : 'Copy address'}</span>
                  </button>
                  <div className="h-px bg-gray-100 mx-3" />
                  <button
                    onClick={handleDisconnect}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                  >
                    <LogOut size={15} className="flex-shrink-0" />
                    <span>Disconnect wallet</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <span className="text-xs bg-gray-100 text-gray-400 px-2 py-1 rounded-lg">
              Not connected
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
