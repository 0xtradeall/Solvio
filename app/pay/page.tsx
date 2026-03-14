'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { CheckCircle, XCircle, Loader2, ExternalLink, AlertCircle, Download, AlertTriangle, RefreshCw, Smartphone } from 'lucide-react';
import WalletConnectButton from '@/components/WalletConnectButton';
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
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center space-y-6">
        <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto">
          <Smartphone className="text-primary-500" size={36} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">You need a Solana wallet</h2>
          <p className="text-sm text-gray-500 mt-2">To complete this payment, you need a wallet that supports Solana.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <a
            href="https://phantom.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-2 p-4 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl transition-colors active:scale-95"
          >
            <span className="text-2xl">👻</span>
            <span className="font-bold text-sm">Get Phantom</span>
            <span className="text-xs text-primary-200 text-center">Most popular, 2 min setup</span>
          </a>
          <a
            href="https://tiplink.io"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-2 p-4 bg-secondary-500 hover:bg-secondary-600 text-white rounded-2xl transition-colors active:scale-95"
          >
            <span className="text-2xl">🔗</span>
            <span className="font-bold text-sm">Pay via TipLink</span>
            <span className="text-xs text-secondary-200 text-center">No wallet needed, pay with email</span>
          </a>
        </div>
        <p className="text-xs text-gray-400">Already have a wallet? Refresh this page after installing.</p>
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
  const { publicKey, connected } = wallet;
  const hasPhantom = usePhantomDetection();

  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'confirmed' | 'failed'>('idle');
  const [txId, setTxId] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [wrongNetwork, setWrongNetwork] = useState(false);

  const amount = parseFloat(searchParams.get('amount') || '0');
  const currency = (searchParams.get('currency') || 'SOL') as Currency;
  const toAddress = searchParams.get('to') || '';
  const note = searchParams.get('note') || '';
  const isValid = validateSolanaAddress(toAddress) && validateAmount(amount);

  useEffect(() => {
    if (connected && publicKey) {
      const rpc = connection.rpcEndpoint;
      const isDevnet = rpc.includes('devnet');
      if (!isDevnet) setWrongNetwork(true);
    }
  }, [connected, publicKey, connection]);

  const handlePay = async () => {
    if (!publicKey) return;
    setTxError(null);
    const result = await sendPayment(connection, wallet, toAddress, amount, currency, (status) => {
      setTxStatus(status.status);
      if (status.signature) setTxId(status.signature);
      if (status.error) setTxError(status.error);
    });
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

        {!connected ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 text-center">Connect your wallet to make this payment</p>
            <WalletConnectButton />
          </div>
        ) : wrongNetwork ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center">
            <p className="text-yellow-800 font-semibold text-sm">Please switch to Devnet to continue</p>
          </div>
        ) : txStatus === 'idle' ? (
          <button onClick={handlePay} className="w-full bg-primary-500 hover:bg-primary-600 active:scale-95 text-white font-bold py-4 rounded-2xl transition-all text-lg shadow-sm shadow-primary-200">
            Pay {amount} {currency}
          </button>
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
