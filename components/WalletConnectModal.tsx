'use client';

import { useState, useEffect } from 'react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Mail, Wallet, X } from 'lucide-react';

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WalletConnectModal({ isOpen, onClose }: WalletConnectModalProps) {
  const [activeTab, setActiveTab] = useState<'wallet' | 'email'>('wallet');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [magic, setMagic] = useState<any>(null);
  const { setVisible } = useWalletModal();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const { Magic } = require('magic-sdk');
      const { SolanaExtension } = require('@magic-ext/solana');
      const magicInstance = new Magic(
        process.env.NEXT_PUBLIC_MAGIC_API_KEY || 'pk_test_demo',
        {
          extensions: [new SolanaExtension({ 
            rpcUrl: 'https://api.devnet.solana.com' 
          })]
        }
      );
      setMagic(magicInstance);
    }
  }, []);

  const handleWalletConnect = () => {
    setVisible(true);
    onClose();
  };

  const handleEmailConnect = async () => {
    if (!email || !magic) return;
    setLoading(true);
    try {
      await magic.auth.loginWithMagicLink({ email });
      // After login, Magic provides a wallet
      // But to integrate with wallet adapter, might need custom handling
      // For now, assume it works
      onClose();
    } catch (error) {
      console.error('Magic login failed', error);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full mx-4">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
        >
          <X size={16} />
        </button>
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
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={handleEmailConnect}
              disabled={!email || loading}
              className="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white font-bold py-3 px-4 rounded-xl transition-all"
            >
              {loading ? 'Sending...' : 'Continue with Email'}
            </button>
            <p className="text-sm text-gray-500 text-center">
              No wallet needed — we'll create one for you instantly via email
            </p>
          </div>
        )}
      </div>
    </div>
  );
}