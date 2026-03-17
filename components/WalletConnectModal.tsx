'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Mail, Wallet } from 'lucide-react';

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WalletConnectModal({ isOpen, onClose }: WalletConnectModalProps) {
  const [activeTab, setActiveTab] = useState<'wallet' | 'email'>('wallet');
  const { setVisible } = useWalletModal();
  const router = useRouter();

  const handleWalletConnect = () => {
    setVisible(true);
    onClose();
  };

  const handleOpenTipLink = () => {
    window.open('https://tiplink.io', '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-center mb-6">Connect wallet to continue</h2>

        <div className="flex mb-6">
          <button
            onClick={() => setActiveTab('wallet')}
            className={`flex-1 py-2 px-4 rounded-l-xl font-medium transition-colors ${
              activeTab === 'wallet' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            I have a wallet
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`flex-1 py-2 px-4 rounded-r-xl font-medium transition-colors ${
              activeTab === 'email' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Create with email
          </button>
        </div>

        {activeTab === 'wallet' && (
          <div className="space-y-4">
            <button
              onClick={handleWalletConnect}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-xl transition-all"
            >
              <Wallet className="inline mr-2" size={18} />
              Connect Phantom Wallet
            </button>
            {/* Add other wallet options if needed */}
          </div>
        )}

        {activeTab === 'email' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              We're redirecting you to TipLink — a free Solana wallet you can create with just your email. Once created, come back and connect using the 'I have a wallet' tab.
            </p>
            <button
              onClick={handleOpenTipLink}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 px-4 rounded-xl transition-all"
            >
              Open TipLink →
            </button>
            <button
              onClick={() => setActiveTab('wallet')}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium py-3 px-4 rounded-xl transition-all"
            >
              I already have TipLink, connect now
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            ← Back to homepage
          </button>
        </div>
      </div>
    </div>
  );
}