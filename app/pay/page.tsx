'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useState } from 'react';
import { CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react';
import WalletConnectButton from '@/components/WalletConnectButton';
import { sendSOLPayment, getTransactionExplorerUrl } from '@/lib/transactions';
import { saveReceipt } from '@/lib/storage';
import { Receipt } from '@/types';

function PayPageContent() {
  const searchParams = useSearchParams();
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'confirmed' | 'failed'>('idle');
  const [txId, setTxId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const amount = parseFloat(searchParams.get('amount') || '0');
  const currency = (searchParams.get('currency') || 'SOL') as 'SOL' | 'USDC';
  const toAddress = searchParams.get('to') || '';
  const note = searchParams.get('note') || '';

  const handlePay = async () => {
    if (!publicKey || !signTransaction) return;
    setError(null);
    setTxStatus('pending');

    const result = await sendSOLPayment(
      connection,
      publicKey,
      signTransaction,
      toAddress,
      amount,
      (status) => {
        setTxStatus(status.status);
        if (status.signature) setTxId(status.signature);
        if (status.error) setError(status.error);
      }
    );

    if (result.status === 'confirmed' && result.signature) {
      const receipt: Receipt = {
        id: Date.now().toString(),
        type: 'request',
        amount,
        currency,
        date: new Date().toISOString(),
        note,
        fromAddress: publicKey.toBase58(),
        toAddress,
        txId: result.signature,
      };
      saveReceipt(publicKey.toBase58(), receipt);
    }
  };

  if (!toAddress || amount <= 0) {
    return (
      <div className="p-4 pt-8 text-center space-y-3">
        <p className="text-red-500 font-medium">Invalid payment link</p>
        <p className="text-sm text-gray-500">This payment link appears to be malformed or expired.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="pt-4 text-center">
        <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-3xl">💸</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Payment Request</h1>
        <p className="text-sm text-gray-500 mt-1">Someone is requesting a payment from you</p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
        <div className="text-center py-3">
          <p className="text-4xl font-bold text-primary-600">{amount} {currency}</p>
          {note && <p className="text-sm text-gray-500 mt-2">"{note}"</p>}
        </div>

        <div className="space-y-2 text-sm text-gray-500">
          <div className="flex gap-2">
            <span className="font-medium w-6">To:</span>
            <span className="font-mono text-gray-700">{toAddress.slice(0, 12)}...{toAddress.slice(-6)}</span>
          </div>
        </div>
      </div>

      {!connected ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 text-center">Connect your wallet to complete this payment</p>
          <WalletConnectButton />
        </div>
      ) : txStatus === 'idle' ? (
        <button
          onClick={handlePay}
          className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-4 rounded-2xl transition-colors"
        >
          Pay {amount} {currency}
        </button>
      ) : txStatus === 'pending' ? (
        <div className="flex items-center justify-center gap-3 py-6">
          <Loader2 className="animate-spin text-primary-500" size={24} />
          <span className="text-gray-700 font-medium">Processing payment...</span>
        </div>
      ) : txStatus === 'confirmed' ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center space-y-3">
          <CheckCircle className="text-green-500 mx-auto" size={40} />
          <p className="text-green-700 font-semibold text-lg">Payment Confirmed!</p>
          {txId && (
            <a
              href={getTransactionExplorerUrl(txId)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-sm text-secondary-600 underline"
            >
              View on Solscan <ExternalLink size={14} />
            </a>
          )}
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center space-y-3">
          <XCircle className="text-red-500 mx-auto" size={40} />
          <p className="text-red-700 font-semibold">Payment Failed</p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={() => { setTxStatus('idle'); setError(null); }}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-3 rounded-xl transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

export default function PayPage() {
  return (
    <Suspense fallback={<div className="p-4 pt-8 text-center text-gray-500">Loading...</div>}>
      <PayPageContent />
    </Suspense>
  );
}
