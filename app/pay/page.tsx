'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { CheckCircle, XCircle, Loader2, ExternalLink, AlertCircle, Download, AlertTriangle, RefreshCw, Smartphone, Home, Mail } from 'lucide-react';
import WalletConnectButton from '@/components/WalletConnectButton';
import DevnetBanner from '@/components/DevnetBanner';
import { sendPayment, getTransactionExplorerUrl } from '@/lib/transactions';
import { validateSolanaAddress, validateAmount } from '@/lib/validators';
import { saveReceipt } from '@/lib/storage';
import { generateReceiptPDF } from '@/lib/pdf';
import { Receipt, Currency } from '@/types';

const DEVNET_RPC = 'https://api.devnet.solana.com';
const REQUIRED_NETWORK = 'devnet';

function usePhantomDetection() {
  const [hasPhantom, setHasPhantom] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () => {
      const phantom = (window as any).phantom?.solana || (window as any).solana;
      setHasPhantom(!!(phantom?.isPhantom));
    };
    if (document.readyState === 'complete') {
      check();
    } else {
      window.addEventListener('load', check, { once: true });
    }
    const t = setTimeout(check, 500);
    return () => clearTimeout(t);
  }, []);

  return hasPhantom;
}

function NoWalletScreen() {
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailConnect = async () => {
    if (!email) return;
    setLoading(true);
    try {
      // Use Magic here
      const magic = new (await import('magic-sdk')).Magic(process.env.NEXT_PUBLIC_MAGIC_API_KEY!, {
        extensions: [new (await import('@magic-ext/solana')).SolanaExtension({ rpcUrl: 'https://api.devnet.solana.com' })],
      });
      await magic.auth.loginWithMagicLink({ email });
      // Assume it connects
    } catch (error) {
      console.error('Magic login failed', error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center p-4">
      <DevnetBanner />
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center space-y-6">
        <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto">
          <Smartphone className="text-primary-500" size={36} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Connect wallet to continue</h2>
          <p className="text-sm text-gray-500 mt-2">Choose how you'd like to connect your Solana wallet.</p>
        </div>
        {!showEmail ? (
          <div className="space-y-3">
            <button
              onClick={() => window.open('https://phantom.app', '_blank')}
              className="w-full flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-2xl transition-colors active:scale-95 font-bold"
            >
              <span className="text-2xl">👻</span>
              Connect Phantom Wallet
            </button>
            <button
              onClick={() => setShowEmail(true)}
              className="w-full flex items-center justify-center gap-2 p-4 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl transition-colors active:scale-95 font-bold"
            >
              <Mail size={20} />
              Create with Email
            </button>
            <p className="text-xs text-gray-400">No wallet needed — we'll create one for you instantly via email</p>
          </div>
        ) : (
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
            <button
              onClick={() => setShowEmail(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function NetworkWarning({ onDismiss }: { onDismiss: () => void }) {
  const [showManual, setShowManual] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handleSwitch = async () => {
    setSwitching(true);
    try {
      const phantom = (window as any).phantom?.solana || (window as any).solana;
      if (phantom?.request) {
        await phantom.request({ method: 'switchNetwork', params: { network: REQUIRED_NETWORK } });
        onDismiss();
      } else {
        setShowManual(true);
      }
    } catch {
      setShowManual(true);
    }
    setSwitching(false);
  };

  return (
    <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-4 space-y-3 mx-4 mt-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={18} />
        <div>
          <p className="font-bold text-yellow-800 text-sm">Wrong network detected</p>
          <p className="text-xs text-yellow-700 mt-0.5">Solvio requires Solana <strong>Devnet</strong> for this transaction.</p>
        </div>
      </div>
      {!showManual ? (
        <button
          onClick={handleSwitch}
          disabled={switching}
          className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
        >
          {switching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Switch to Devnet
        </button>
      ) : (
        <div className="bg-yellow-100 rounded-xl p-3 space-y-1">
          <p className="text-xs font-semibold text-yellow-800">Switch manually in Phantom:</p>
          <ol className="text-xs text-yellow-700 space-y-0.5 list-decimal list-inside">
            <li>Open Phantom wallet</li>
            <li>Go to Settings → Developer Settings</li>
            <li>Enable Testnet Mode</li>
            <li>Select "Devnet"</li>
            <li>Return here and refresh</li>
          </ol>
        </div>
      )}
    </div>
  );
}

function PayPageContent() {
  const searchParams = useSearchParams();
  const wallet = useWallet();
  const { connection } = useConnection();
  const { publicKey, connected, disconnect, signTransaction } = wallet;
  const hasPhantom = usePhantomDetection();

  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'confirmed' | 'failed'>('idle');
  const [txId, setTxId] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [wrongNetwork, setWrongNetwork] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [polling, setPolling] = useState<NodeJS.Timeout | null>(null);
  const [magicReady, setMagicReady] = useState(false);
  const [checkingMagic, setCheckingMagic] = useState(true);

  // Stricter wallet connection check: must have publicKey and signTransaction, or valid Magic session
  useEffect(() => {
    let cancelled = false;
    async function checkMagic() {
      setCheckingMagic(true);
      try {
        if (typeof window !== 'undefined') {
          const { getMagic } = await import('@/lib/magic');
          const magic = getMagic();
          if (magic) {
            const isLoggedIn = await magic.user.isLoggedIn();
            if (!cancelled) setMagicReady(!!isLoggedIn);
          } else {
            if (!cancelled) setMagicReady(false);
          }
        }
      } catch {
        if (!cancelled) setMagicReady(false);
      }
      if (!cancelled) setCheckingMagic(false);
    }
    checkMagic();
    return () => { cancelled = true; };
  }, []);

  const isWalletReady = !!publicKey && typeof signTransaction === 'function';
  const isMagicReady = magicReady;
  const readyToPay = isWalletReady || isMagicReady;


  // Parse all params from both searchParams and window.location for robustness
  const getParam = (key: string) => {
    let val = searchParams.get(key) || '';
    if (typeof window !== 'undefined') {
      const fromWindow = new URLSearchParams(window.location.search).get(key) || '';
      if (fromWindow) val = fromWindow;
    }
    return val;
  };
  const amount = parseFloat(getParam('amount') || '0');
  const currency = (getParam('currency') || 'SOL') as Currency;
  const toAddress = getParam('to') || '';
  const note = getParam('note') || '';
  const recipient = getParam('recipient') || '';

  // Debug log for payment link parsing
  useEffect(() => {
    console.log('[Solvio] /pay page loaded');
    console.log('[Solvio] Full URL:', typeof window !== 'undefined' ? window.location.href : '');
    console.log('[Solvio] Parsed params:', { amount, currency, toAddress, note, recipient });
  }, [amount, currency, toAddress, note, recipient]);

  const isValid = validateSolanaAddress(toAddress) && validateAmount(amount);
  const isPersonalised = !!recipient && validateSolanaAddress(recipient);

  useEffect(() => {
    if (connected && publicKey && isPersonalised) {
      const connectedAddr = publicKey.toBase58();
      const urlParams = new URLSearchParams(window.location.search);
      const recipientParam = urlParams.get('recipient') || recipient;

      console.log('[Solvio] /pay enforcement check');
      console.log('[Solvio] Connected wallet:', connectedAddr);
      console.log('[Solvio] Recipient param:', recipientParam);
      console.log('[Solvio] Match:', connectedAddr === recipientParam);

      if (recipientParam && connectedAddr !== recipientParam) {
        setIsBlocked(true);
      } else {
        setIsBlocked(false);
      }
    } else {
      setIsBlocked(false);
    }
  }, [connected, publicKey, isPersonalised, recipient]);

  // Robust network check using getGenesisHash
  useEffect(() => {
    let cancelled = false;
    async function checkNetwork() {
      if (connected && publicKey) {
        try {
          const genesisHash = await connection.getGenesisHash();
          if (genesisHash !== 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG' && !cancelled) {
            setWrongNetwork(true);
          } else if (!cancelled) {
            setWrongNetwork(false);
          }
        } catch {
          if (!cancelled) setWrongNetwork(true);
        }
      } else {
        if (!cancelled) setWrongNetwork(false);
      }
    }
    checkNetwork();
    return () => { cancelled = true; };
  }, [connected, publicKey, connection]);

  const handlePay = async () => {
    if (!publicKey) return;

    // Check network before proceeding
    try {
      const genesisHash = await connection.getGenesisHash();
      if (genesisHash !== 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG') {
        setWrongNetwork(true);
        setTxError('Please switch your wallet to Solana Devnet to continue. In Phantom: Settings > Developer Settings > Change Network > Devnet.');
        return;
      }
    } catch {
      setWrongNetwork(true);
      setTxError('Unable to verify network. Please try again.');
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const recipientParam = urlParams.get('recipient') || '';
    if (recipientParam && validateSolanaAddress(recipientParam) && publicKey.toBase58() !== recipientParam) {
      setTxError('WALLET_MISMATCH: This payment link was not intended for your wallet.');
      return;
    }

    setTxError(null);
    const result = await sendPayment(
      connection, wallet, toAddress, amount, currency,
      (status) => {
        setTxStatus(status.status);
        if (status.signature) setTxId(status.signature);
        if (status.error) setTxError(status.error);
      },
      isPersonalised ? recipient : undefined
    );
    if (result.status === 'confirmed' && result.signature) {
      const receipt: Receipt = {
        id: Date.now().toString(),
        type: 'request',
        amount, currency,
        date: new Date().toISOString(),
        note,
        fromAddress: publicKey.toBase58(),
        toAddress,
        txId: result.signature,
      };
      saveReceipt(publicKey.toBase58(), receipt);
    }
  };

  // Poll for incoming payment if user is recipient
  useEffect(() => {
    if (!connected || !publicKey || !toAddress || !amount || txStatus === 'confirmed' || txStatus === 'failed') {
      if (polling) {
        clearInterval(polling);
        setPolling(null);
      }
      return;
    }
    // Only poll if user is the recipient (i.e., not the sender)
    if (publicKey.toBase58() === toAddress) {
      const solanaWeb3 = require('@solana/web3.js');
      const conn = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('devnet'));
      const interval = setInterval(async () => {
        try {
          const sigs = await conn.getSignaturesForAddress(new solanaWeb3.PublicKey(toAddress), { limit: 10 });
          for (const sig of sigs) {
            if (sig.confirmationStatus === 'confirmed') {
              const tx = await conn.getParsedTransaction(sig.signature, { commitment: 'confirmed' });
              if (tx && tx.meta && tx.meta.postBalances && tx.meta.preBalances) {
                const accountKeys = tx.transaction.message.accountKeys.map((k: any) => (typeof k === 'string' ? k : k.pubkey.toBase58 ? k.pubkey.toBase58() : k.pubkey));
                const idx = accountKeys.findIndex((k: string) => k === toAddress);
                if (idx >= 0) {
                  const delta = (tx.meta.postBalances[idx] - tx.meta.preBalances[idx]) / 1e9;
                  if (Math.abs(delta - amount) < 0.001) {
                    setTxStatus('confirmed');
                    setTxId(sig.signature);
                    clearInterval(interval);
                    setPolling(null);
                    return;
                  }
                }
              }
            }
          }
        } catch (e) {
          // ignore
        }
      }, 5000);
      setPolling(interval);
      return () => {
        clearInterval(interval);
        setPolling(null);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey, toAddress, amount, txStatus]);
  const handleDownloadPDF = async () => {
    if (!publicKey || !txId) return;
    setPdfLoading(true);
    const receipt: Receipt = {
      id: Date.now().toString(), type: 'request', amount, currency,
      date: new Date().toISOString(), note,
      fromAddress: publicKey.toBase58(), toAddress, txId,
    };
    try { await generateReceiptPDF(receipt); } catch (e) { console.error(e); }
    setPdfLoading(false);
  };

  if (hasPhantom === false) return <NoWalletScreen />;

  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center space-y-4 max-w-sm w-full">
          <AlertCircle className="text-red-400 mx-auto" size={40} />
          <p className="text-red-600 font-semibold">Invalid Payment Link</p>
          <p className="text-sm text-gray-500">This payment link is malformed or missing required fields.</p>
        </div>
      </div>
    );
  }

  const shortRecipient = recipient
    ? `${recipient.slice(0, 6)}…${recipient.slice(-4)}`
    : '';
  const shortConnected = publicKey
    ? `${publicKey.toBase58().slice(0, 6)}…${publicKey.toBase58().slice(-4)}`
    : '';

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {wrongNetwork && <NetworkWarning onDismiss={() => setWrongNetwork(false)} />}

      <div className="p-4 space-y-5 max-w-md mx-auto">
        <div className="pt-4 text-center">
          <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">💸</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Request</h1>
          <p className="text-sm text-gray-500 mt-0.5">Review and confirm before sending</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <div className="text-center py-3 border-b border-gray-100">
            <p className="text-5xl font-extrabold text-primary-600">{amount}</p>
            <p className="text-2xl font-bold text-primary-500 mt-1">{currency}</p>
            {note && <p className="text-sm text-gray-500 mt-2 italic">"{note}"</p>}
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex gap-3">
              <span className="text-gray-500 font-semibold w-8 flex-shrink-0">To:</span>
              <span className="font-mono text-gray-700 break-all">{toAddress}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-gray-500 font-semibold w-8 flex-shrink-0">Via:</span>
              <span className="text-gray-600">Solana {currency} (Devnet)</span>
            </div>
          </div>
        </div>

        {/* ── Not ready: show connect prompt for both wallet and Magic ── */}
        {!readyToPay ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 text-center">Connect your wallet to make this payment</p>
            <WalletConnectButton />
            <div className="flex items-center justify-center my-2 text-xs text-gray-400">or</div>
            <button
              onClick={() => window.open('/?magic=1', '_blank')}
              className="w-full flex items-center justify-center gap-2 p-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-colors font-bold"
              disabled={checkingMagic}
            >
              <Mail size={18} /> Pay with Email
            </button>
          </div>

        /* ── Wrong network ── */
        ) : wrongNetwork ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center">
            <p className="text-yellow-800 font-semibold text-sm">Please switch to Devnet to continue</p>
          </div>

        /* ── CASE 2 mismatch: BLOCK payment completely ── */
        ) : isBlocked ? (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-3xl">🔒</span>
            </div>
            <div className="space-y-1.5">
              <p className="text-red-700 font-extrabold text-lg leading-snug">This link is not for your wallet</p>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                This payment was requested specifically from wallet
              </p>
              <p className="text-sm font-mono font-semibold text-gray-800 bg-gray-100 rounded-lg px-3 py-1.5 inline-block">
                {shortRecipient}
              </p>
              <p className="text-sm text-gray-500 mt-1">You are connected as</p>
              <p className="text-sm font-mono font-semibold text-gray-700 bg-gray-100 rounded-lg px-3 py-1.5 inline-block">
                {shortConnected}
              </p>
              <p className="text-sm text-gray-500 mt-2">Please switch to the correct wallet.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => disconnect()}
                className="flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 active:scale-95 text-white font-semibold py-3 rounded-xl transition-all text-sm"
              >
                🔄 Switch Wallet
              </button>
              <Link
                href="/"
                className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-colors text-sm"
              >
                <Home size={15} /> Go Home
              </Link>
            </div>
          </div>

        /* ── CASE 1 / 2 match: payment form ── */
        ) : txStatus === 'idle' ? (
          <div className="space-y-4">
            {/* Friendly greeting for personalised links where wallet MATCHES */}
            {isPersonalised && (
              <div className="bg-primary-50 border border-primary-200 rounded-2xl px-4 py-3 flex items-center gap-2.5">
                <span className="text-xl flex-shrink-0">👋</span>
                <p className="text-sm font-semibold text-primary-800">This payment request was sent to you</p>
              </div>
            )}
            <button
              onClick={handlePay}
              className="w-full bg-primary-500 hover:bg-primary-600 active:scale-95 text-white font-bold py-4 rounded-2xl transition-all text-lg shadow-sm shadow-primary-200"
              disabled={!readyToPay}
            >
              Pay {amount} {currency}
            </button>
          </div>

        ) : txStatus === 'pending' ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 text-center space-y-3">
            <Loader2 className="animate-spin text-yellow-600 mx-auto" size={36} />
            <p className="text-yellow-800 font-semibold">Sending Payment…</p>
            <p className="text-xs text-yellow-600">Please approve in Phantom</p>
          </div>

        ) : txStatus === 'confirmed' ? (
          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 text-center space-y-4">
            <CheckCircle className="text-green-500 mx-auto" size={48} />
            <div>
              <p className="text-green-700 font-extrabold text-xl">Payment Confirmed!</p>
              <p className="text-sm text-green-600 mt-1">{amount} {currency} sent</p>
            </div>
            {txId && (
              <a href={getTransactionExplorerUrl(txId)} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-sm text-secondary-600 underline">
                <ExternalLink size={14} />View on Solscan
              </a>
            )}
            <button onClick={handleDownloadPDF} disabled={pdfLoading}
              className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 rounded-xl transition-colors">
              {pdfLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {pdfLoading ? 'Generating…' : 'Download Receipt PDF'}
            </button>
          </div>

        ) : (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 text-center space-y-4">
            <XCircle className="text-red-500 mx-auto" size={48} />
            <div>
              <p className="text-red-700 font-bold text-lg">Payment Failed</p>
              {txError && (
                <p className="text-sm text-red-500 mt-1">
                  {txError.replace('spl-token-faucet.vercel.app', '').trimEnd().replace(/\.$/, '')}
                  {txError.includes('spl-token-faucet.vercel.app') && (
                    <> — <a href="https://spl-token-faucet.vercel.app" target="_blank" rel="noopener noreferrer" className="underline font-semibold text-red-700">Get devnet USDC →</a></>
                  )}
                </p>
              )}
            </div>
            <button onClick={() => { setTxStatus('idle'); setTxError(null); }}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-xl transition-colors">
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    }>
      <PayPageContent />
    </Suspense>
  );
}
