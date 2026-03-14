'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Wallet, Trash2, Info, ExternalLink, AlertTriangle } from 'lucide-react';
import WalletConnectButton from '@/components/WalletConnectButton';
import { clearReceipts } from '@/lib/storage';

export default function SettingsPage() {
  const { publicKey, connected, disconnect } = useWallet();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [cleared, setCleared] = useState(false);

  const handleClearReceipts = () => {
    if (publicKey) {
      clearReceipts(publicKey.toBase58());
      setCleared(true);
      setShowClearConfirm(false);
      setTimeout(() => setCleared(false), 3000);
    }
  };

  const addr = publicKey?.toBase58();

  return (
    <div className="p-4 space-y-6">
      <div className="pt-4">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your wallet and preferences</p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center gap-2 text-gray-700 font-semibold">
          <Wallet size={18} className="text-primary-500" />
          Wallet
        </div>

        {connected && addr ? (
          <>
            <div>
              <p className="text-xs text-gray-500 mb-1">Connected Address</p>
              <p className="text-sm font-mono bg-gray-50 rounded-xl p-3 break-all text-gray-700">{addr}</p>
            </div>
            <div className="flex gap-2">
              <a
                href={`https://solscan.io/account/${addr}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium py-2.5 rounded-xl transition-colors"
              >
                <ExternalLink size={15} />
                View on Solscan
              </a>
              <button
                onClick={() => disconnect()}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-xl transition-colors"
              >
                Disconnect
              </button>
            </div>
          </>
        ) : (
          <WalletConnectButton />
        )}
      </div>

      {connected && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center gap-2 text-gray-700 font-semibold">
            <Trash2 size={18} className="text-red-500" />
            Data & Storage
          </div>

          <p className="text-sm text-gray-500">Receipts are stored locally on this device tied to your wallet address. Clearing them cannot be undone.</p>

          {cleared && (
            <div className="bg-green-50 text-green-700 text-sm rounded-xl p-3">
              ✅ Receipts cleared successfully.
            </div>
          )}

          {!showClearConfirm ? (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 font-medium py-3 rounded-xl transition-colors"
            >
              <Trash2 size={16} />
              Clear All Receipts
            </button>
          ) : (
            <div className="bg-red-50 rounded-2xl p-4 space-y-3 border border-red-200">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700 font-medium">Are you sure? This will permanently delete all receipts for this wallet on this device.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 bg-white border border-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearReceipts}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
                >
                  Delete All
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
        <div className="flex items-center gap-2 text-gray-700 font-semibold">
          <Info size={18} className="text-secondary-500" />
          About Solvio
        </div>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span className="text-gray-500">Version</span>
            <span className="font-medium">1.0 MVP</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Network</span>
            <span className="font-medium text-secondary-600">Solana Devnet</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Storage</span>
            <span className="font-medium">Local device only</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Backend</span>
            <span className="font-medium">None (client-side only)</span>
          </div>
        </div>
        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-400">Solvio never stores your private keys. All transaction signing occurs in Phantom wallet.</p>
        </div>
      </div>
    </div>
  );
}
