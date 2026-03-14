'use client';

import { useState, useCallback, useRef } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Share2, Download, CheckCircle, Loader2, RefreshCw, ExternalLink } from 'lucide-react';
import WalletConnectButton from '@/components/WalletConnectButton';
import { generatePaymentUrl, pollForIncomingPayment, getTransactionExplorerUrl } from '@/lib/transactions';
import { validateAmount } from '@/lib/validators';
import { saveReceipt } from '@/lib/storage';
import { generateReceiptPDF } from '@/lib/pdf';
import { Receipt, Currency } from '@/types';

type PollStatus = 'idle' | 'polling' | 'received' | 'timeout';

export default function RequestPage() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('SOL');
  const [note, setNote] = useState('');
  const [paymentUrl, setPaymentUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [amountError, setAmountError] = useState('');
  const [pollStatus, setPollStatus] = useState<PollStatus>('idle');
  const [incomingTxId, setIncomingTxId] = useState<string | null>(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const pollCancelRef = useRef<boolean>(false);

  const receiverAddress = publicKey?.toBase58() ?? '';

  const handleGenerate = useCallback(() => {
    if (!validateAmount(amount)) {
      setAmountError('Please enter a valid amount greater than 0');
      return;
    }
    setAmountError('');
    pollCancelRef.current = true;
    setPollStatus('idle');
    setIncomingTxId(null);

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const url = generatePaymentUrl(baseUrl, parseFloat(amount), currency, receiverAddress, note);
    setPaymentUrl(url);

    const receipt: Receipt = {
      id: Date.now().toString(),
      type: 'request',
      amount: parseFloat(amount),
      currency,
      date: new Date().toISOString(),
      note,
      fromAddress: receiverAddress,
      toAddress: receiverAddress,
    };
    if (publicKey) saveReceipt(publicKey.toBase58(), receipt);

    setTimeout(() => startPolling(parseFloat(amount), receiverAddress, receipt.id), 500);
  }, [amount, currency, note, receiverAddress, publicKey]);

  const startPolling = useCallback(async (amt: number, addr: string, receiptId: string) => {
    pollCancelRef.current = false;
    setPollStatus('polling');

    const txId = await pollForIncomingPayment(connection, addr, amt, 120000);

    if (pollCancelRef.current) return;

    if (txId) {
      setIncomingTxId(txId);
      setPollStatus('received');
      if (publicKey) {
        const updatedReceipt: Receipt = {
          id: receiptId,
          type: 'request',
          amount: amt,
          currency,
          date: new Date().toISOString(),
          note,
          fromAddress: receiverAddress,
          toAddress: receiverAddress,
          txId,
        };
        saveReceipt(publicKey.toBase58(), updatedReceipt);
        setPdfGenerating(true);
        try {
          await generateReceiptPDF(updatedReceipt);
        } catch (e) {
          console.error('PDF error:', e);
        }
        setPdfGenerating(false);
      }
    } else {
      setPollStatus('timeout');
    }
  }, [connection, currency, note, receiverAddress, publicKey]);

  const handleCopy = async () => {
    if (!paymentUrl) return;
    try {
      await navigator.clipboard.writeText(paymentUrl);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = paymentUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!paymentUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Pay me ${amount} ${currency} via Solvio`,
          text: note ? `Note: ${note}` : undefined,
          url: paymentUrl,
        });
        return;
      } catch { }
    }
    handleCopy();
  };

  const handleDownloadPDF = async () => {
    if (!publicKey) return;
    setPdfGenerating(true);
    const receipt: Receipt = {
      id: Date.now().toString(),
      type: 'request',
      amount: parseFloat(amount),
      currency,
      date: new Date().toISOString(),
      note,
      fromAddress: receiverAddress,
      toAddress: receiverAddress,
      txId: incomingTxId ?? undefined,
    };
    try {
      await generateReceiptPDF(receipt);
    } catch (e) {
      console.error('PDF error:', e);
    }
    setPdfGenerating(false);
  };

  return (
    <div className="p-4 space-y-5 pb-20">
      <div className="pt-4">
        <h1 className="text-2xl font-bold text-gray-900">Request Payment</h1>
        <p className="text-sm text-gray-500 mt-0.5">Create a shareable link or QR code</p>
      </div>

      {!connected ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center space-y-4">
          <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl">👻</span>
          </div>
          <p className="text-gray-600 font-medium">Connect your Phantom wallet to get started</p>
          <WalletConnectButton />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Receiving Wallet</label>
              <div className="bg-gray-50 rounded-xl p-3 text-sm font-mono text-gray-600 break-all border border-gray-100">
                {receiverAddress}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Amount</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setAmountError(''); }}
                  placeholder="0.00"
                  min="0"
                  step="any"
                  className={`flex-1 border-2 rounded-xl p-3 text-xl font-bold focus:outline-none transition-colors ${
                    amountError ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-primary-400'
                  }`}
                />
                <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                  {(['SOL', 'USDC'] as Currency[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => setCurrency(c)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        currency === c
                          ? 'bg-white shadow-sm text-primary-600 ring-1 ring-primary-200'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              {amountError && <p className="text-red-500 text-xs mt-1">{amountError}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Note (optional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 200))}
                placeholder="e.g., Invoice #123, Freelance design work..."
                rows={2}
                className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-primary-400 transition-colors"
              />
              <p className="text-xs text-gray-400 text-right">{note.length}/200</p>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!amount || parseFloat(amount) <= 0}
              className="w-full bg-primary-500 hover:bg-primary-600 active:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-colors text-base shadow-sm shadow-primary-200"
            >
              Generate Request
            </button>
          </div>

          {paymentUrl && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 space-y-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="text-primary-600" size={18} />
                  </div>
                  <h2 className="font-bold text-gray-900">Payment Request Ready</h2>
                </div>

                <div className="flex justify-center py-3 bg-gray-50 rounded-2xl">
                  <div className="p-4 bg-white rounded-xl shadow-md border border-gray-100">
                    <QRCodeSVG
                      value={paymentUrl}
                      size={260}
                      fgColor="#7c3aed"
                      bgColor="#ffffff"
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-600">{amount} {currency}</p>
                  {note && <p className="text-sm text-gray-500 mt-0.5">"{note}"</p>}
                </div>

                <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                  <p className="text-xs font-mono text-gray-500 truncate flex-1">{paymentUrl}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleCopy}
                    className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-colors min-h-[48px]"
                  >
                    <Copy size={16} />
                    {copied ? '✓ Copied!' : 'Copy Link'}
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex items-center justify-center gap-2 bg-secondary-500 hover:bg-secondary-600 text-white font-semibold py-3 rounded-xl transition-colors min-h-[48px]"
                  >
                    <Share2 size={16} />
                    Share
                  </button>
                </div>
              </div>

              <div className={`px-5 pb-5 ${pollStatus !== 'idle' ? 'border-t border-gray-100 pt-4' : ''}`}>
                {pollStatus === 'polling' && (
                  <div className="flex items-center gap-3 text-sm text-gray-600 bg-yellow-50 rounded-xl p-3 border border-yellow-100">
                    <Loader2 size={16} className="animate-spin text-yellow-600 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-yellow-800">Waiting for payment...</p>
                      <p className="text-xs text-yellow-600 mt-0.5">Will auto-detect payment and generate PDF receipt</p>
                    </div>
                  </div>
                )}

                {pollStatus === 'received' && incomingTxId && (
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200 space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="text-green-500" size={20} />
                      <p className="font-bold text-green-800">Payment Received!</p>
                    </div>
                    <a
                      href={getTransactionExplorerUrl(incomingTxId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-secondary-600 hover:underline"
                    >
                      <ExternalLink size={12} />
                      View on Solscan
                    </a>
                    <button
                      onClick={handleDownloadPDF}
                      disabled={pdfGenerating}
                      className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors"
                    >
                      {pdfGenerating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                      {pdfGenerating ? 'Generating PDF...' : 'Download Receipt PDF'}
                    </button>
                  </div>
                )}

                {pollStatus === 'timeout' && (
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 flex items-center justify-between">
                    <p className="text-sm text-gray-600">Detection timed out</p>
                    <button
                      onClick={() => startPolling(parseFloat(amount), receiverAddress, Date.now().toString())}
                      className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      <RefreshCw size={14} />
                      Retry
                    </button>
                  </div>
                )}

                {pollStatus === 'idle' && (
                  <button
                    onClick={handleDownloadPDF}
                    disabled={pdfGenerating}
                    className="w-full flex items-center justify-center gap-2 border-2 border-primary-200 text-primary-600 hover:bg-primary-50 font-semibold py-3 rounded-xl transition-colors"
                  >
                    {pdfGenerating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    {pdfGenerating ? 'Generating...' : 'Download Request PDF'}
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
