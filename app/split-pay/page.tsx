'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { CheckCircle, XCircle, Loader2, ExternalLink, AlertCircle, Download, Home } from 'lucide-react';
import WalletConnectButton from '@/components/WalletConnectButton';
import DevnetBanner from '@/components/DevnetBanner';
import { sendPayment, getTransactionExplorerUrl } from '@/lib/transactions';
import { validateSolanaAddress, validateAmount } from '@/lib/validators';
import { saveReceipt } from '@/lib/storage';
import { generateReceiptPDF } from '@/lib/pdf';
import { updateSplitParticipantStatus } from '@/lib/storage';
import { updateParticipantStatusDB } from '@/lib/db';
import { Receipt, Currency } from '@/types';

async function detectWalletNetwork(publicKeyBase58: string): Promise<'devnet' | 'mainnet-beta' | 'unknown'> {
  try {
    const solanaWeb3 = await import('@solana/web3.js');
    const { Connection, PublicKey, clusterApiUrl } = solanaWeb3;
    const devnetConn = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const mainnetConn = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');

    const [devnetHash, mainnetHash] = await Promise.all([
      devnetConn.getGenesisHash(),
      mainnetConn.getGenesisHash(),
    ]);

    const provider = (window as any).solana;
    const endpoint = provider?.connection?.rpcEndpoint || provider?._rpcEndpoint;
    if (endpoint) {
      try {
        const walletConn = new Connection(endpoint, 'confirmed');
        const walletHash = await walletConn.getGenesisHash();
        if (walletHash === devnetHash) return 'devnet';
        if (walletHash === mainnetHash) return 'mainnet-beta';
      } catch {
        // Fall back to balance-based probe below.
      }
    }

    const key = new PublicKey(publicKeyBase58);
    const probe = async (conn: InstanceType<typeof Connection>) => {
      try {
        await conn.getBalance(key, 'confirmed');
        return true;
      } catch {
        return false;
      }
    };

    const [devnetOk, mainnetOk] = await Promise.all([probe(devnetConn), probe(mainnetConn)]);
    if (devnetOk && !mainnetOk) return 'devnet';
    if (mainnetOk && !devnetOk) return 'mainnet-beta';
  } catch (e) {
    // ignore
  }
  return 'unknown';
}

function NetworkWarning({
  onDismiss,
  onManualRecheck,
  isChecking,
}: {
  onDismiss: () => void,
  onManualRecheck: () => Promise<void>,
  isChecking: boolean,
}) {
  const [showManual, setShowManual] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handleSwitch = async () => {
    setSwitching(true);
    try {
      const phantom = (window as any).phantom?.solana || (window as any).solana;
      if (phantom?.request) {
        await phantom.request({ method: 'wallet_switchNetwork', params: { network: 'devnet' } });
        onDismiss();
      } else {
        setShowManual(true);
      }
    } catch {
      setShowManual(true);
    }
    setSwitching(false);
  };

  const handleManualRecheck = async () => {
    await onManualRecheck();
  };

  return (
    <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-4 space-y-3 mx-4 mt-4">
      <div className="flex items-start gap-2">
        <span className="text-yellow-600 flex-shrink-0 mt-0.5">⚠️</span>
        <div>
          <p className="font-bold text-yellow-800 text-sm">Your wallet is on the wrong network</p>
          <p className="text-xs text-yellow-700 mt-0.5">Please switch to Solana <strong>Devnet</strong> to continue.</p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {!showManual ? (
          <button
            onClick={handleSwitch}
            disabled={switching}
            className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
          >
            {switching ? 'Switching…' : 'How to switch to Devnet'}
          </button>
        ) : (
          <div className="bg-yellow-100 rounded-xl p-3 space-y-1">
            <p className="text-xs font-semibold text-yellow-800">In Phantom: tap the network icon at the top → select Devnet.<br/>In Solflare: go to Settings → Network → Devnet.</p>
          </div>
        )}
        <button
          onClick={handleManualRecheck}
          disabled={isChecking}
          className="border border-primary-500 text-primary-700 hover:bg-primary-50 rounded-lg px-3 py-1 text-xs font-semibold mt-1"
          style={{ width: 'fit-content', alignSelf: 'center' }}
        >
          {isChecking ? 'Checking...' : 'I have switched — Re-check'}
        </button>
      </div>
    </div>
  );
}

function SplitPayPageContent() {
  const searchParams = useSearchParams();
  const wallet = useWallet();
  const { connection } = useConnection();
  const { publicKey, connected, disconnect } = wallet;

  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'confirmed' | 'failed'>('idle');
  const [txId, setTxId] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [wrongNetwork, setWrongNetwork] = useState(false);
  const [isCheckingNetwork, setIsCheckingNetwork] = useState(false);

  const splitId = searchParams.get('splitId') || '';
  const participant = searchParams.get('participant') || '';
  const amount = parseFloat(searchParams.get('amount') || '0');
  const currency = (searchParams.get('currency') || 'SOL') as Currency;
  const description = searchParams.get('description') || '';
  const sender = searchParams.get('sender') || '';

  const isValid = validateSolanaAddress(participant) && validateAmount(amount) && splitId && sender;

  // Wallet match enforcement
  useEffect(() => {
    if (connected && publicKey && participant) {
      const connectedAddr = publicKey.toBase58();
      if (participant && connectedAddr !== participant) {
        setIsBlocked(true);
      } else {
        setIsBlocked(false);
      }
    } else {
      setIsBlocked(false);
    }
  }, [connected, publicKey, participant]);

  const checkNetwork = async (): Promise<void> => {
    setIsCheckingNetwork(true);
    if (connected && publicKey) {
      const net = await detectWalletNetwork(publicKey.toBase58());
      if (net === 'mainnet-beta') {
        setWrongNetwork(true);
      } else {
        setWrongNetwork(false);
      }
    } else {
      setWrongNetwork(false);
    }
    setIsCheckingNetwork(false);
  };

  useEffect(() => {
    void checkNetwork();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey]);

  const handlePay = async () => {
    if (!publicKey || !sender) return;

    // Robust network check before proceeding
    const net = await detectWalletNetwork(publicKey.toBase58());
    if (net === 'mainnet-beta') {
      setWrongNetwork(true);
      setTxError('Wrong network detected. Your wallet is on Solana Mainnet. Please switch to Devnet in Phantom settings: Settings → Developer Settings → Network → Devnet.');
      return;
    }

    setTxError(null);
    const result = await sendPayment(
      connection, wallet, sender, amount, currency,
      (status) => {
        setTxStatus(status.status);
        if (status.signature) setTxId(status.signature);
        if (status.error) setTxError(status.error);
      }
    );
    if (result.status === 'confirmed' && result.signature) {
      const receipt: Receipt = {
        id: Date.now().toString(),
        type: 'request',
        amount, currency,
        date: new Date().toISOString(),
        note: description,
        fromAddress: publicKey.toBase58(),
        toAddress: sender,
        txId: result.signature,
      };
      saveReceipt(publicKey.toBase58(), receipt);
      // Update Supabase first, localStorage as fallback
      updateParticipantStatusDB(splitId, participant, 'confirmed', result.signature)
        .catch(e => console.error('Supabase update failed:', e));
      updateSplitParticipantStatus(sender, splitId, participant, 'confirmed', result.signature);
    }
  };

  const handleDownloadPDF = async () => {
    if (!publicKey || !txId) return;
    setPdfLoading(true);
    const receipt: Receipt = {
      id: Date.now().toString(), type: 'request', amount, currency,
      date: new Date().toISOString(), note: description,
      fromAddress: publicKey.toBase58(), toAddress: sender, txId,
    };
    try { await generateReceiptPDF(receipt); } catch (e) { console.error(e); }
    setPdfLoading(false);
  };

  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center space-y-4 max-w-sm w-full">
          <AlertCircle className="text-red-400 mx-auto" size={40} />
          <p className="text-red-600 font-semibold">Invalid Split Link</p>
          <p className="text-sm text-gray-500">This split payment link is malformed or missing required fields.</p>
        </div>
      </div>
    );
  }

  const shortParticipant = participant
    ? `${participant.slice(0, 6)}…${participant.slice(-4)}`
    : '';
  const shortConnected = publicKey
    ? `${publicKey.toBase58().slice(0, 6)}…${publicKey.toBase58().slice(-4)}`
    : '';

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <DevnetBanner />
      <div className="p-4 space-y-5 max-w-md mx-auto">
        <div className="pt-4 text-center">
          <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">💸</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Split Payment</h1>
          <p className="text-sm text-gray-500 mt-0.5">Pay your share of the bill</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <div className="text-center py-3 border-b border-gray-100">
            <p className="text-5xl font-extrabold text-primary-600">{amount}</p>
            <p className="text-2xl font-bold text-primary-500 mt-1">{currency}</p>
            {description && <p className="text-sm text-gray-500 mt-2 italic">"{description}"</p>}
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex gap-3">
              <span className="text-gray-500 font-semibold w-12 flex-shrink-0">From:</span>
              <span className="font-mono text-gray-700 break-all">{sender}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-gray-500 font-semibold w-12 flex-shrink-0">Via:</span>
              <span className="text-gray-600">Solana {currency} (Devnet)</span>
            </div>
          </div>
        </div>

        {/* ── No wallet connected yet: show connect prompt ── */}
        {!connected ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 text-center">Connect your wallet to make this payment</p>
            <WalletConnectButton />
          </div>

        /* ── Wrong network: BLOCK payment completely ── */
        ) : wrongNetwork ? (
          <NetworkWarning onDismiss={() => setWrongNetwork(false)} onManualRecheck={checkNetwork} isChecking={isCheckingNetwork} />

        /* ── Wrong wallet: BLOCK payment completely ── */
        ) : isBlocked ? (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-3xl">🔒</span>
            </div>
            <div className="space-y-1.5">
              <p className="text-red-700 font-extrabold text-lg leading-snug">This split request is not for your wallet</p>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                This payment was requested specifically from wallet
              </p>
              <p className="text-sm font-mono font-semibold text-gray-800 bg-gray-100 rounded-lg px-3 py-1.5 inline-block">
                {shortParticipant}
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

        /* ── Correct wallet: payment form ── */
        ) : txStatus === 'idle' ? (
          <div className="space-y-4">
            <div className="bg-primary-50 border border-primary-200 rounded-2xl px-4 py-3 flex items-center gap-2.5">
              <span className="text-xl flex-shrink-0">👋</span>
              <p className="text-sm font-semibold text-primary-800">This split payment request was sent to you</p>
            </div>
            <button
              onClick={handlePay}
              className="w-full bg-primary-500 hover:bg-primary-600 active:scale-95 text-white font-bold py-4 rounded-2xl transition-all text-lg shadow-sm shadow-primary-200"
              disabled={wrongNetwork}
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

export default function SplitPayPage() {
  return (
    <Suspense fallback={<div className="p-4 pt-8 flex justify-center"><Loader2 className="animate-spin text-primary-400" size={28} /></div>}>
      <SplitPayPageContent />
    </Suspense>
  );
}