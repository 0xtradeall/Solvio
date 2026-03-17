import { useState, useEffect } from 'react';
import { getMagic } from '../lib/magic';
import { useWalletAddress } from './WalletAddressContext';

interface Props {
  onConnected: (publicKey: string) => void;
}

export default function MagicEmailLogin({ onConnected }: Props) {
  const { setWalletAddress } = useWalletAddress();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const magic = getMagic();
        if (!magic) return;
        const isLoggedIn = await magic.user.isLoggedIn();
        if (isLoggedIn) {
          const metadata = await magic.user.getMetadata();
          if (metadata.publicAddress) {
            setWalletAddress(metadata.publicAddress);
            onConnected(metadata.publicAddress);
          }
        }
      } catch (err) {
        console.error('Session check failed:', err);
      }
    };
    checkExistingSession();
  }, [onConnected, setWalletAddress]);

  const handleLogin = async () => {
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      const magic = getMagic();
      if (!magic) throw new Error('Magic not initialized');
      await magic.auth.loginWithMagicLink({ email });
      const metadata = await magic.user.getMetadata();
      if (metadata.publicAddress) {
        localStorage.setItem('magicWalletAddress', metadata.publicAddress);
        setWalletAddress(metadata.publicAddress);
        onConnected(metadata.publicAddress);
      }
    } catch (err: any) {
      console.error('Magic login error:', err);
      setError(err?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      <input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border rounded-lg px-4 py-2 text-sm w-full"
      />
      <button
        onClick={handleLogin}
        disabled={loading}
        className="bg-purple-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {loading ? 'Sending magic link...' : 'Continue with Email'}
      </button>
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}
