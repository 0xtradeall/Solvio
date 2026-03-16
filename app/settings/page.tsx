'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { Wallet, Trash2, Info, ExternalLink, AlertTriangle, Shield, Smartphone } from 'lucide-react';
import WalletConnectButton from '@/components/WalletConnectButton';
import WalletConnectModal from '@/components/WalletConnectModal';
import DevnetBanner from '@/components/DevnetBanner';
import { clearReceipts, getReceipts } from '@/lib/storage';

export default function SettingsPage() {
  const { publicKey, connected, disconnect } = useWallet();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    if (!connected) {
      setModalOpen(true);
    } else {
      setModalOpen(false);
    }
  }, [connected]);

  const handleClearReceipts = () => {
    if (publicKey) {
      clearReceipts(publicKey.toBase58());
      setCleared(true);
      setShowClearConfirm(false);
      setTimeout(() => setCleared(false), 3000);
    }
  };

  const addr = publicKey?.toBase58();
  const receiptCount = addr ? getReceipts(addr).length : 0;

  return (
    <div className="p-4 space-y-5 pb-20">
      {!connected ? (
        <WalletConnectModal isOpen={modalOpen} onClose={() => { setModalOpen(false); router.push('/'); }} />
      ) : (
        <>
          <DevnetBanner />
          <div className="pt-4">
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage your wallet and app preferences</p>
          </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center gap-2 font-bold text-gray-800">
          <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
            <Wallet size={16} className="text-primary-600" />
          </div>
          Wallet
        </div>

        {connected && addr ? (
          <>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Connected Address</p>
              <p className="text-sm font-mono bg-gray-50 rounded-xl p-3 break-all text-gray-700 border border-gray-100">{addr}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`https://solscan.io/account/${addr}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 border-2 border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                <ExternalLink size={14} />
                Solscan
              </a>
              <button
                onClick={() => disconnect()}
                className="flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                <Wallet size={14} />
                Disconnect
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">Connect Phantom wallet to use Solvio</p>
            <WalletConnectButton />
          </div>
        )}
      </div>

      {connected && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center gap-2 font-bold text-gray-800">
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
              <Trash2 size={16} className="text-red-500" />
            </div>
            Data & Storage
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Stored receipts</p>
              <p className="text-xs text-gray-400">{receiptCount} receipt{receiptCount !== 1 ? 's' : ''} on this device</p>
            </div>
            <span className="text-2xl font-bold text-primary-500">{receiptCount}</span>
          </div>

          <p className="text-sm text-gray-400">
            Receipts are stored locally in your browser, tied to your wallet address. They are never uploaded anywhere.
          </p>

          {cleared && (
            <div className="bg-green-50 text-green-700 text-sm rounded-xl p-3 font-medium">
              ✅ All receipts cleared successfully.
            </div>
          )}

          {!showClearConfirm ? (
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={receiptCount === 0}
              className="w-full flex items-center justify-center gap-2 border-2 border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold py-3 rounded-xl transition-colors"
            >
              <Trash2 size={16} />
              Clear All Receipts
            </button>
          ) : (
            <div className="bg-red-50 rounded-2xl p-4 space-y-3 border-2 border-red-200">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700 font-semibold">
                  This will permanently delete all {receiptCount} receipt{receiptCount !== 1 ? 's' : ''} for this wallet. This cannot be undone.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 bg-white border-2 border-gray-200 text-gray-700 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearReceipts}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                >
                  Delete All
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center gap-2 font-bold text-gray-800">
          <div className="w-8 h-8 bg-secondary-50 rounded-lg flex items-center justify-center">
            <Shield size={16} className="text-secondary-600" />
          </div>
          Security & Privacy
        </div>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-start gap-2">
            <span className="text-green-500 font-bold mt-0.5">✓</span>
            <span>Private keys never leave Phantom. Solvio only reads your public address.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-500 font-bold mt-0.5">✓</span>
            <span>All data stored locally on this device only. No cloud sync.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-500 font-bold mt-0.5">✓</span>
            <span>No backend server. All transactions happen directly on Solana.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-500 font-bold mt-0.5">✓</span>
            <span>No personal data collected. Zero analytics. GDPR-ready.</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
        <div className="flex items-center gap-2 font-bold text-gray-800">
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
            <Info size={16} className="text-gray-600" />
          </div>
          About Solvio
        </div>
        <div className="space-y-2">
          {[
            ['Version', '1.0 MVP'],
            ['Network', 'Solana Devnet'],
            ['Storage', 'Browser localStorage'],
            ['Backend', 'None — fully client-side'],
            ['Wallet Support', 'Phantom (MVP)'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-500">{label}</span>
              <span className={`text-sm font-semibold ${label === 'Network' ? 'text-secondary-600' : 'text-gray-800'}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-r from-primary-500 to-secondary-500 rounded-2xl p-5 text-white space-y-2">
        <div className="flex items-center gap-2 font-bold">
          <Smartphone size={18} />
          Install as App
        </div>
        <p className="text-sm text-white/80">
          Add Solvio to your home screen for the best mobile experience. In your browser, tap Share → Add to Home Screen.
        </p>
      </div>
      </>
    )}
  </div>
);
}
