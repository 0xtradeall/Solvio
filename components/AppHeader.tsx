'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { SolvioLogo } from './SolvioLogo';
import { Home, Copy, LogOut, Check, ChevronDown } from 'lucide-react';

export default function AppHeader() {
  const { publicKey, connected, disconnect } = useWallet();
  const { connection } = useConnection();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const short = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}…${publicKey.toBase58().slice(-4)}`
    : '';

  const rpc = connection?.rpcEndpoint ?? '';
  const isDevnet = rpc.includes('devnet');
  const networkLabel = isDevnet ? 'Devnet' : 'Mainnet';
  const networkColor = isDevnet ? 'text-amber-400' : 'text-green-400';

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

        {/* Home link */}
        <Link
          href="/"
          className="flex items-center gap-1.5 text-gray-400 hover:text-primary-600 transition-colors text-sm font-medium cursor-pointer"
        >
          <Home size={15} />
          <span className="hidden sm:inline">Home</span>
        </Link>

        {/* Centred logo */}
        <Link href="/" className="absolute left-1/2 -translate-x-1/2 cursor-pointer">
          <SolvioLogo size={26} wordmarkColor="text-gray-900" />
        </Link>

        {/* Wallet status badge */}
        <div className="flex items-center gap-2">
          {connected && publicKey ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setOpen(o => !o)}
                className={`flex items-center gap-1.5 bg-gray-900/85 backdrop-blur-sm border border-white/10 rounded-full pl-2.5 pr-2 py-1.5 transition-all hover:bg-gray-900 ${open ? 'bg-gray-900' : ''}`}
              >
                {/* Pulsing green dot */}
                <span className="relative flex items-center justify-center flex-shrink-0">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse-dot block" />
                </span>

                {/* "Connected" — hidden below 390px */}
                <span className="hidden min-[390px]:inline text-xs text-gray-300 font-medium leading-none">
                  Connected
                </span>

                {/* Divider */}
                <span className="hidden min-[390px]:inline w-px h-3 bg-white/20 flex-shrink-0" />

                {/* Network label */}
                <span className={`hidden min-[390px]:inline text-xs font-semibold leading-none ${networkColor}`}>
                  {networkLabel}
                </span>

                {/* Divider */}
                <span className="w-px h-3 bg-white/20 flex-shrink-0" />

                {/* Address */}
                <span className="text-xs font-mono text-white/90 leading-none tracking-tight">
                  {short}
                </span>

                <ChevronDown
                  size={12}
                  className={`text-white/50 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}
                />
              </button>

              {open && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
                  {/* Full address row */}
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                    <p className="text-xs text-gray-400 mb-0.5">Connected wallet</p>
                    <p className="text-xs font-mono text-gray-700 break-all">{publicKey.toBase58()}</p>
                  </div>
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
            /* Disconnected pill */
            <div className="flex items-center gap-1.5 bg-gray-900/60 backdrop-blur-sm border border-white/10 rounded-full pl-2.5 pr-3 py-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
              <span className="hidden min-[390px]:inline text-xs text-gray-400 font-medium leading-none">
                Not connected
              </span>
              <span className="hidden min-[390px]:inline w-px h-3 bg-white/20 flex-shrink-0" />
              <span className="hidden min-[390px]:inline text-xs text-gray-500 leading-none">--</span>
              <span className="w-px h-3 bg-white/20 flex-shrink-0" />
              <span className="text-xs text-gray-400 leading-none">Connect wallet</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
