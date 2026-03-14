'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Download, Share2, FileText, ChevronDown, ChevronUp, ExternalLink, Loader2 } from 'lucide-react';
import WalletConnectButton from '@/components/WalletConnectButton';
import { getReceipts } from '@/lib/storage';
import { generateReceiptPDF } from '@/lib/pdf';
import { getTransactionExplorerUrl } from '@/lib/transactions';
import { Receipt } from '@/types';
import { format } from 'date-fns';

export default function ReceiptsPage() {
  const { publicKey, connected } = useWallet();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (publicKey) {
      setReceipts(getReceipts(publicKey.toBase58()));
    } else {
      setReceipts([]);
    }
  }, [publicKey]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDownload = async (receipt: Receipt) => {
    setDownloading(prev => ({ ...prev, [receipt.id]: true }));
    try {
      await generateReceiptPDF(receipt);
    } catch (e) {
      console.error('PDF error:', e);
    }
    setDownloading(prev => ({ ...prev, [receipt.id]: false }));
  };

  const handleShare = (receipt: Receipt) => {
    const amtStr = `${receipt.amount} ${receipt.currency}`;
    const dateStr = format(new Date(receipt.date), 'MMM d, yyyy');
    const txLink = receipt.txId ? `\nTx: ${getTransactionExplorerUrl(receipt.txId)}` : '';
    const noteStr = receipt.note ? `\n"${receipt.note}"` : '';
    const typeLabel = receipt.type === 'split' ? 'Bill split' : 'Payment';
    const msg = `${typeLabel}: ${amtStr} — ${dateStr}${noteStr}${txLink}\nVia Solvio`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  const typeLabel = (r: Receipt) => r.type === 'split' ? 'Split' : 'Request';
  const typeBg = (r: Receipt) => r.type === 'split'
    ? 'bg-secondary-100 text-secondary-700'
    : 'bg-primary-100 text-primary-700';

  return (
    <div className="p-4 space-y-5 pb-20">
      <div className="pt-4">
        <h1 className="text-2xl font-bold text-gray-900">Receipts</h1>
        <p className="text-sm text-gray-500 mt-0.5">Transaction history stored on this device</p>
      </div>

      {!connected ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center space-y-4">
          <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto">
            <FileText className="text-primary-400" size={28} />
          </div>
          <p className="text-gray-600 font-medium">Connect your wallet to view receipts</p>
          <p className="text-sm text-gray-400">Receipts are stored locally, tied to your wallet address.</p>
          <WalletConnectButton />
        </div>
      ) : receipts.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center space-y-3">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
            <FileText className="text-gray-400" size={28} />
          </div>
          <p className="text-gray-700 font-semibold">No receipts yet</p>
          <p className="text-sm text-gray-400">Make a payment request or split a bill to generate your first receipt.</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-400">{receipts.length} receipt{receipts.length !== 1 ? 's' : ''} stored locally</p>
          <div className="space-y-3">
            {receipts.map((receipt) => (
              <div key={receipt.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg font-bold text-gray-900">{receipt.amount} {receipt.currency}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${typeBg(receipt)}`}>
                          {typeLabel(receipt)}
                        </span>
                        {receipt.txId && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex-shrink-0">
                            Confirmed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {format(new Date(receipt.date), "MMM d, yyyy '·' h:mm a")}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleExpand(receipt.id)}
                      className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 mt-1"
                    >
                      {expanded[receipt.id] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>

                  {receipt.note && (
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2 italic">
                      "{receipt.note}"
                    </p>
                  )}

                  {expanded[receipt.id] && (
                    <div className="space-y-2 border-t border-gray-100 pt-3">
                      <div className="grid grid-cols-1 gap-1.5 text-xs">
                        <div className="flex gap-2">
                          <span className="font-semibold text-gray-500 w-14 flex-shrink-0">From:</span>
                          <span className="font-mono text-gray-600 break-all">{receipt.fromAddress}</span>
                        </div>
                        {receipt.toAddress && receipt.toAddress !== 'multiple' && (
                          <div className="flex gap-2">
                            <span className="font-semibold text-gray-500 w-14 flex-shrink-0">To:</span>
                            <span className="font-mono text-gray-600 break-all">{receipt.toAddress}</span>
                          </div>
                        )}
                        {receipt.txId && (
                          <div className="flex gap-2 items-start">
                            <span className="font-semibold text-gray-500 w-14 flex-shrink-0">Tx:</span>
                            <a
                              href={getTransactionExplorerUrl(receipt.txId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-secondary-600 underline break-all flex items-center gap-1"
                            >
                              {receipt.txId.slice(0, 20)}...
                              <ExternalLink size={10} className="flex-shrink-0" />
                            </a>
                          </div>
                        )}
                      </div>

                      {receipt.participants && receipt.participants.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Participants</p>
                          {receipt.participants.map((p, i) => (
                            <div key={i} className="flex items-center justify-between gap-2 bg-gray-50 rounded-xl p-2.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-5 h-5 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-xs font-bold flex-shrink-0">
                                  {i + 1}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-gray-700 truncate">{p.nickname || `Person ${i + 1}`}</p>
                                  <p className="text-xs font-mono text-gray-400 truncate">{p.address.slice(0, 14)}...</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-xs font-semibold text-gray-600">{p.amount} {receipt.currency}</span>
                                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                                  p.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                  p.status === 'failed' ? 'bg-red-100 text-red-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {p.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleDownload(receipt)}
                      disabled={downloading[receipt.id]}
                      className="flex-1 flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white text-sm font-semibold py-3 rounded-xl transition-colors min-h-[44px]"
                    >
                      {downloading[receipt.id]
                        ? <><Loader2 size={14} className="animate-spin" />Generating…</>
                        : <><Download size={14} />Download PDF</>
                      }
                    </button>
                    <button
                      onClick={() => handleShare(receipt)}
                      className="flex-1 flex items-center justify-center gap-2 border-2 border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold py-3 rounded-xl transition-colors min-h-[44px]"
                    >
                      <Share2 size={14} />
                      WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
