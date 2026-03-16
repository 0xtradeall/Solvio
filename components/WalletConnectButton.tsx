'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Wallet, LogOut } from 'lucide-react';
import WalletConnectModal from './WalletConnectModal';

interface Props {
  className?: string;
  showAddress?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export default function WalletConnectButton({ className = '', showAddress = false, onConnect, onDisconnect }: Props) {
  const { publicKey, connected, disconnect } = useWallet();
  const [modalOpen, setModalOpen] = useState(false);

  const handleConnect = () => {
    setModalOpen(true);
    onConnect?.();
  };

  const handleDisconnect = async () => {
    await disconnect();
    onDisconnect?.();
  };

  if (connected && publicKey) {
    const addr = publicKey.toBase58();
    const short = `${addr.slice(0, 4)}...${addr.slice(-4)}`;
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {showAddress && (
          <span className="text-sm text-secondary-500 font-mono">{short}</span>
        )}
        <button
          onClick={handleDisconnect}
          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors min-h-[44px]"
        >
          <LogOut size={16} />
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleConnect}
        className={`flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors min-h-[44px] w-full ${className}`}
      >
        <Wallet size={18} />
        Connect Wallet
      </button>
      <WalletConnectModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
