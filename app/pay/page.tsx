'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { CheckCircle, XCircle, Loader2, ExternalLink, AlertCircle, Download } from 'lucide-react';
import WalletConnectButton from '@/components/WalletConnectButton';
import { sendSOLPayment, getTransactionExplorerUrl } from '@/lib/transactions';
import { validateSolanaAddress, validateAmount } from '@/lib/validators';
import { saveReceipt } from '@/lib/storage';
import { generateReceiptPDF } from '@/lib/pdf';
import { Receipt, Currency } from '@/types';

function PayPageContent() {
  const searchParams = useSearchParams();
  const wallet = useWallet();
  const { connection } = useConnection();
  const { publicKey, connected } = wallet;

  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'confirmed' | 'failed'>('idle');
  const [txId, setTxId] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const amount = parseFloat(searchParams.get('amount') || '0');
  const currency = (searchParams.get('currency') || 'SOL') as Currency;
  const toAddress = searchParams.get('to') || '';
  const note = searchParams.get('note') || '';

  const isValid = validateSolanaAddress(toAddress) && validateAmount(amount);

  const handlePay = async () => {
    if (!publicKey) return;
    setTxError(null);

    const result = await sendSOLPayment(
      connection,
      wallet,
      toAddress,
      amount,
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

  const handleDownloadPDF = async () => {
    if (!publicKey || !txId) return;
    setPdfLoading(true);
    const receipt: Receipt = {
      id: Date.now().toString(),
      type: 'request',
      amount,
      currency,
      date: new Date().toISOString(),
      note,
      fromAddress: publicKey.toBase58(),
      toAddress,
      txId,
    };
    try {
      await generateReceiptPDF(receipt);
    } catch (e) {
      console.error(e);
    }
    setPdfLoading(false);
  };

  if (!isValid) {
    return (
      <div className="p-4 pt-8 text-center space-y-4">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="text-red-400" size={28} />
        </div>
        <p className="text-red-600 font-semibold">Invalid Payment Link</p>
        <p className="text-sm text-gray-500">This payment link is malformed or missing required parameters.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5 pb-20">
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
      ) : txStatus === 'idle' ? (
        <button
          onClick={handlePay}
          className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-4 rounded-2xl transition-colors text-lg shadow-sm shadow-primary-200"
        >
          Pay {amount} {currency}
        </button>
      ) : txStatus === 'pending' ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 text-center space-y-3">
          <Loader2 className="animate-spin text-yellow-600 mx-auto" size={36} />
          <p className="text-yellow-800 font-semibold">Sending Payment…</p>
          <p className="text-xs text-yellow-600">Please approve the transaction in Phantom</p>
        </div>
      ) : txStatus === 'confirmed' ? (
        <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 text-center space-y-4">
          <CheckCircle className="text-green-500 mx-auto" size={48} />
          <div>
            <p className="text-green-700 font-extrabold text-xl">Payment Confirmed!</p>
            <p className="text-sm text-green-600 mt-1">{amount} {currency} sent successfully</p>
          </div>
          {txId && (
            <a
              href={getTransactionExplorerUrl(txId)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-sm text-secondary-600 underline"
            >
              <ExternalLink size={14} />
              View on Solscan
            </a>
          )}
          <button
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
            className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {pdfLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {pdfLoading ? 'Generating…' : 'Download Receipt PDF'}
          </button>
        </div>
      ) : (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 text-center space-y-4">
          <XCircle className="text-red-500 mx-auto" size={48} />
          <div>
            <p className="text-red-700 font-bold text-lg">Payment Failed</p>
            {txError && <p className="text-sm text-red-500 mt-1">{txError}</p>}
          </div>
          <button
            onClick={() => { setTxStatus('idle'); setTxError(null); }}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-xl transition-colors"
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
    <Suspense fallback={
      <div className="p-4 pt-16 text-center">
        <Loader2 className="animate-spin text-primary-500 mx-auto" size={32} />
        <p className="text-gray-500 mt-3">Loading payment…</p>
      </div>
    }>
      <PayPageContent />
    </Suspense>
  );
}
