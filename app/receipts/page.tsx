'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Download, Share2, FileText, Trash2 } from 'lucide-react';
import WalletConnectButton from '@/components/WalletConnectButton';
import { getReceipts } from '@/lib/storage';
import { generateReceiptPDF } from '@/lib/pdf';
import { Receipt } from '@/types';
import { format } from 'date-fns';

export default function ReceiptsPage() {
  const { publicKey, connected } = useWallet();
  const [receipts, setReceipts] = useState<Receipt[]>([]);

  useEffect(() => {
    if (publicKey) {
      setReceipts(getReceipts(publicKey.toBase58()));
    }
  }, [publicKey]);

  const handleDownload = async (receipt: Receipt) => {
    try {
      await generateReceiptPDF(receipt);
    } catch (e) {
      console.error('PDF generation failed:', e);
      alert('Could not generate PDF. Please try again.');
    }
  };

  const handleShare = (receipt: Receipt) => {
    const amount = `${receipt.amount} ${receipt.currency}`;
    const date = format(new Date(receipt.date), 'MMM d, yyyy');
    const txLink = receipt.txId ? `https://solscan.io/tx/${receipt.txId}?cluster=devnet` : '';
    const message = `Solvio Receipt — ${amount} on ${date}${txLink ? `\nTx: ${txLink}` : ''}${receipt.note ? `\nNote: ${receipt.note}` : ''}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const getStatusColor = (type: string) => {
    return type === 'split' ? 'bg-secondary-100 text-secondary-700' : 'bg-primary-100 text-primary-700';
  };

  return (
    <div className="p-4 space-y-6">
      <div className="pt-4">
        <h1 className="text-2xl font-bold text-gray-900">Receipts</h1>
        <p className="text-sm text-gray-500 mt-1">Your transaction history on this device</p>
      </div>

      {!connected ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center space-y-4">
          <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto">
            <FileText className="text-primary-400" size={28} />
          </div>
          <p className="text-gray-600 font-medium">Connect your wallet to view receipts</p>
          <WalletConnectButton />
        </div>
      ) : receipts.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center space-y-3">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
            <FileText className="text-gray-400" size={28} />
          </div>
          <p className="text-gray-700 font-medium">No receipts yet</p>
          <p className="text-sm text-gray-400">Make a payment request or split a bill to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {receipts.map((receipt) => (
            <div key={receipt.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">
                      {receipt.amount} {receipt.currency}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(receipt.type)}`}>
                      {receipt.type === 'split' ? 'Split' : 'Request'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {format(new Date(receipt.date), 'MMM d, yyyy · h:mm a')}
                  </p>
                </div>
              </div>

              {receipt.note && (
                <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-2">
                  "{receipt.note}"
                </p>
              )}

              <div className="space-y-1 text-xs text-gray-500">
                <div className="flex gap-2">
                  <span className="font-medium w-8">From:</span>
                  <span className="font-mono">{receipt.fromAddress.slice(0, 12)}...{receipt.fromAddress.slice(-6)}</span>
                </div>
                {receipt.toAddress !== 'multiple' && (
                  <div className="flex gap-2">
                    <span className="font-medium w-8">To:</span>
                    <span className="font-mono">{receipt.toAddress.slice(0, 12)}...{receipt.toAddress.slice(-6)}</span>
                  </div>
                )}
                {receipt.txId && (
                  <div className="flex gap-2">
                    <span className="font-medium w-8">Tx:</span>
                    <a
                      href={`https://solscan.io/tx/${receipt.txId}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-secondary-600 underline"
                    >
                      {receipt.txId.slice(0, 12)}...
                    </a>
                  </div>
                )}
              </div>

              {receipt.participants && receipt.participants.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-500">Participants:</p>
                  {receipt.participants.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg p-2">
                      <span className="font-medium">{p.nickname || `Person ${i + 1}`}</span>
                      <span className="text-gray-500">{p.amount} {receipt.currency}</span>
                      <span className={`px-2 py-0.5 rounded-full font-medium ${
                        p.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                        p.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{p.status}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => handleDownload(receipt)}
                  className="flex-1 flex items-center justify-center gap-2 bg-secondary-500 hover:bg-secondary-600 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
                >
                  <Download size={15} />
                  Download PDF
                </button>
                <button
                  onClick={() => handleShare(receipt)}
                  className="flex-1 flex items-center justify-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium py-2.5 rounded-xl transition-colors"
                >
                  <Share2 size={15} />
                  WhatsApp
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
