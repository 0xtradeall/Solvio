"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getMagic } from '../lib/magic';

interface WalletContextType {
  walletAddress: string | null;
  setWalletAddress: (address: string | null) => void;
  disconnectMagic: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function useWalletAddress() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWalletAddress must be used within WalletProvider');
  return ctx;
}

export function WalletAddressProvider({ children }: { children: ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    const checkMagic = async () => {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('magicWalletAddress') : null;
      if (!saved) return;
      const magic = getMagic();
      if (!magic) return;
      const isLoggedIn = await magic.user.isLoggedIn();
      if (isLoggedIn) {
        setWalletAddress(saved);
      } else {
        localStorage.removeItem('magicWalletAddress');
        setWalletAddress(null);
      }
    };
    checkMagic();
  }, []);

  const disconnectMagic = async () => {
    const magic = getMagic();
    if (magic) await magic.user.logout();
    localStorage.removeItem('magicWalletAddress');
    setWalletAddress(null);
  };

  return (
    <WalletContext.Provider value={{ walletAddress, setWalletAddress, disconnectMagic }}>
      {children}
    </WalletContext.Provider>
  );
}
