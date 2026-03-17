'use client';

import { useState } from 'react';
import MagicEmailLogin from './MagicEmailLogin';
import { useRouter } from 'next/navigation';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Mail, Wallet } from 'lucide-react';
import Image from 'next/image';

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


  // Placeholder: handle Magic email wallet connection
  const handleMagicConnected = (publicKey: string) => {
    // TODO: Store publicKey in wallet state or context
    onClose();
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
          <>
            <div className="space-y-3">
              {/* Phantom Wallet */}
              <WalletOption
                name="Phantom"
                iconSrc="/phantom-icon.png"
                onConnect={handleWalletConnect}
                installUrl="https://phantom.app"
                recommended
              />
              {/* Solflare Wallet */}
              <WalletOption
                name="Solflare"
                iconSrc="/solflare-icon.png"
                onConnect={handleWalletConnect}
                installUrl="https://solflare.com"
              />
              {/* Backpack Wallet */}
              <WalletOption
                name="Backpack"
                iconSrc="/backpack-icon.png"
                onConnect={handleWalletConnect}
                installUrl="https://backpack.app"
              />
            </div>
          </>
        )}

        {activeTab === 'email' && (
          <div className="space-y-4">
            <MagicEmailLogin onConnected={handleMagicConnected} />
            <button
              onClick={() => setActiveTab('wallet')}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium py-3 px-4 rounded-xl transition-all"
            >
              Back to wallet options
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

  // WalletOption component (inline for simplicity)
  function WalletOption({ name, iconSrc, onConnect, installUrl, description, recommended, highlight }: any) {
    // Simulate detection (in real app, check window object for wallet)
    const detected = false;
    return (
      <div className={`flex items-center gap-3 border rounded-xl px-4 py-3 ${highlight ? 'border-purple-400' : 'border-gray-200'}`}>
        <div className="flex-shrink-0">
          {iconSrc ? (
            <Image src={iconSrc} alt={name + ' icon'} width={28} height={28} />
          ) : (
            <Wallet size={24} />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">{name}</span>
            {recommended && (
              <span className="ml-1 bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded font-medium">Recommended</span>
            )}
          </div>
          {description && <div className="text-xs text-gray-500 mt-0.5">{description}</div>}
        </div>
        {detected ? (
          <button
            onClick={onConnect}
            className="bg-primary-500 hover:bg-primary-600 text-white font-bold px-4 py-2 rounded-lg text-sm"
          >
            Connect Solana Wallet
          </button>
        ) : installUrl ? (
          <a
            href={installUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg text-sm"
          >
            Install
          </a>
        ) : (
          <button
            onClick={onConnect}
            className="bg-primary-500 hover:bg-primary-600 text-white font-bold px-4 py-2 rounded-lg text-sm"
          >
            Connect
          </button>
        )}
      </div>
    );
  }
}