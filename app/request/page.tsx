'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Share2, Download, CheckCircle } from 'lucide-react';
import WalletConnectButton from '@/components/WalletConnectButton';
import { generatePaymentUrl } from '@/lib/transactions';
import { validateAmount } from '@/lib/validators';
import { saveReceipt } from '@/lib/storage';
import { Receipt, Currency } from '@/types';

export default function RequestPage() {
  const { publicKey, connected } = useWallet();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('SOL');
  const [note, setNote] = useState('');
  const [paymentUrl, setPaymentUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [amountError, setAmountError] = useState('');

  const receiverAddress = publicKey?.toBase58() ?? '';

  const handleGenerate = () => {
    if (!validateAmount(amount)) {
      setAmountError('Please enter a valid amount greater than 0');
      return;
    }
    setAmountError('');
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const url = generatePaymentUrl(baseUrl, parseFloat(amount), currency, receiverAddress, note);
    setPaymentUrl(url);
  };

  const handleCopy = async () => {
    if (!paymentUrl) return;
    try {
      await navigator.clipboard.writeText(paymentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = paymentUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (!paymentUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Pay me ${amount} ${currency} via Solvio`,
          url: paymentUrl,
        });
      } catch {
      }
    } else {
      handleCopy();
    }
  };

  const handleSaveReceipt = () => {
    if (!publicKey || !paymentUrl) return;
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
    saveReceipt(publicKey.toBase58(), receipt);
    alert('Request saved to receipts!');
  };

  return (
    <div className="p-4 space-y-6">
      <div className="pt-4">
        <h1 className="text-2xl font-bold text-gray-900">Request Payment</h1>
        <p className="text-sm text-gray-500 mt-1">Generate a payment link or QR code</p>
      </div>

      {!connected ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center space-y-4">
          <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl">👻</span>
          </div>
          <p className="text-gray-600 font-medium">Connect your Phantom wallet to generate payment requests</p>
          <WalletConnectButton />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Your Wallet Address</label>
              <div className="bg-gray-50 rounded-xl p-3 text-sm font-mono text-gray-600 break-all">
                {receiverAddress}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Amount</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setAmountError('');
                  }}
                  placeholder="0.00"
                  min="0"
                  step="any"
                  className={`flex-1 border rounded-xl p-3 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500 ${amountError ? 'border-red-400' : 'border-gray-200'}`}
                />
                <div className="flex bg-gray-100 rounded-xl p-1">
                  {(['SOL', 'USDC'] as Currency[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => setCurrency(c)}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${currency === c ? 'bg-white shadow text-primary-600' : 'text-gray-500'}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              {amountError && <p className="text-red-500 text-xs mt-1">{amountError}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Note (optional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 200))}
                placeholder="e.g., Invoice #123, Dinner split..."
                rows={2}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{note.length}/200</p>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!amount}
              className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors min-h-[44px]"
            >
              Generate Link & QR Code
            </button>
          </div>

          {paymentUrl && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-5">
              <div className="flex items-center gap-2">
                <CheckCircle className="text-secondary-500" size={20} />
                <h2 className="font-semibold text-gray-900">Your Payment Request</h2>
              </div>

              <div className="flex justify-center py-2">
                <div className="p-4 bg-white border-2 border-primary-100 rounded-2xl shadow-sm">
                  <QRCodeSVG
                    value={paymentUrl}
                    size={220}
                    fgColor="#7c3aed"
                    bgColor="#ffffff"
                    level="M"
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 text-xs font-mono text-gray-600 break-all">
                {paymentUrl}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCopy}
                  className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl transition-colors min-h-[44px]"
                >
                  <Copy size={16} />
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 bg-secondary-500 hover:bg-secondary-600 text-white font-medium py-3 rounded-xl transition-colors min-h-[44px]"
                >
                  <Share2 size={16} />
                  Share
                </button>
              </div>

              <button
                onClick={handleSaveReceipt}
                className="w-full flex items-center justify-center gap-2 border border-primary-200 text-primary-600 hover:bg-primary-50 font-medium py-3 rounded-xl transition-colors min-h-[44px]"
              >
                <Download size={16} />
                Save to Receipts
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
