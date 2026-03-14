'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Share2, Download, CheckCircle, Loader2, RefreshCw, ExternalLink, Users, X, Lock, Globe } from 'lucide-react';
import WalletConnectButton from '@/components/WalletConnectButton';
import SnsAddressInput from '@/components/SnsAddressInput';
import { generatePaymentUrl, pollForIncomingPayment, getTransactionExplorerUrl } from '@/lib/transactions';
import { validateAmount } from '@/lib/validators';
import { saveReceipt, getContacts } from '@/lib/storage';
import { generateReceiptPDF } from '@/lib/pdf';
import { Receipt, Currency, Contact } from '@/types';

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

  const [sendToInput, setSendToInput] = useState('');
  const [resolvedSendTo, setResolvedSendTo] = useState('');
  const [showContacts, setShowContacts] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const contactsDropdownRef = useRef<HTMLDivElement>(null);

  const receiverAddress = publicKey?.toBase58() ?? '';

  useEffect(() => {
    if (publicKey) setContacts(getContacts(publicKey.toBase58()));
  }, [publicKey]);

  useEffect(() => {
    if (!showContacts) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (contactsDropdownRef.current && !contactsDropdownRef.current.contains(e.target as Node)) {
        setShowContacts(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showContacts]);

  const handleSendToChange = (raw: string, resolved: string) => {
    setSendToInput(raw);
    setResolvedSendTo(resolved || (!raw.includes('.') ? raw : ''));
  };

  const selectContact = (c: Contact) => {
    setSendToInput(c.snsName || c.address);
    setResolvedSendTo(c.address);
    setShowContacts(false);
  };

  const clearSendTo = () => {
    setSendToInput('');
    setResolvedSendTo('');
  };

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
    const url = generatePaymentUrl(
      baseUrl, parseFloat(amount), currency, receiverAddress, note,
      resolvedSendTo || undefined
    );
    setPaymentUrl(url);

    const receipt: Receipt = {
      id: Date.now().toString(),
      type: 'request',
      amount: parseFloat(amount),
      currency,
      date: new Date().toISOString(),
      note,
      fromAddress: receiverAddress,
      toAddress: resolvedSendTo || receiverAddress,
    };
    if (publicKey) saveReceipt(publicKey.toBase58(), receipt);

    setTimeout(() => startPolling(parseFloat(amount), receiverAddress, receipt.id), 500);
  }, [amount, currency, note, receiverAddress, resolvedSendTo, publicKey]);

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
          toAddress: resolvedSendTo || receiverAddress,
          txId,
        };
        saveReceipt(publicKey.toBase58(), updatedReceipt);
        setPdfGenerating(true);
        try { await generateReceiptPDF(updatedReceipt); } catch (e) { console.error('PDF error:', e); }
        setPdfGenerating(false);
      }
    } else {
      setPollStatus('timeout');
    }
  }, [connection, currency, note, receiverAddress, resolvedSendTo, publicKey]);

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
      toAddress: resolvedSendTo || receiverAddress,
      txId: incomingTxId ?? undefined,
    };
    try { await generateReceiptPDF(receipt); } catch (e) { console.error('PDF error:', e); }
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

            {/* 1. Receiving Wallet */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Receiving Wallet</label>
              <div className="bg-gray-50 rounded-xl p-3 text-sm font-mono text-gray-600 break-all border border-gray-100">
                {receiverAddress}
              </div>
            </div>

            {/* 2. Send To (optional) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Send To (optional)</label>
                <div className="relative" ref={contactsDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowContacts(v => !v)}
                    className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-semibold bg-primary-50 hover:bg-primary-100 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <Users size={12} /> From contacts
                  </button>

                  {showContacts && (
                    <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                      <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contacts</span>
                        <button onClick={() => setShowContacts(false)} className="text-gray-400 hover:text-gray-600">
                          <X size={14} />
                        </button>
                      </div>
                      {contacts.length === 0 ? (
                        <div className="px-3 py-4 text-center">
                          <p className="text-sm text-gray-400">No contacts saved yet</p>
                        </div>
                      ) : (
                        <div className="max-h-56 overflow-y-auto">
                          {contacts.map(c => (
                            <button
                              key={c.id}
                              onClick={() => selectContact(c)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-primary-50 transition-colors text-left"
                            >
                              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 text-primary-700 font-bold text-xs">
                                {c.nickname.slice(0, 1).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{c.nickname}</p>
                                <p className="text-xs font-mono text-gray-400 truncate">
                                  {c.snsName || `${c.address.slice(0, 8)}…${c.address.slice(-4)}`}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <SnsAddressInput
                value={sendToInput}
                onChange={handleSendToChange}
              />
              {sendToInput && (
                <button
                  onClick={clearSendTo}
                  className="mt-1 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
                >
                  <X size={11} /> Clear
                </button>
              )}
              <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                Leave empty to share publicly, or specify a recipient to personalise the request.
              </p>
            </div>

            {/* 3. Amount */}
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

            {/* 4. Note */}
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

            {/* 5. Generate */}
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
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="text-primary-600" size={18} />
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-900">Payment Request Ready</h2>
                      {resolvedSendTo && (
                        <p className="text-xs text-primary-600 mt-0.5">
                          Personalised for {sendToInput !== resolvedSendTo ? sendToInput : `${resolvedSendTo.slice(0, 6)}…${resolvedSendTo.slice(-4)}`}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Lock / Globe badge */}
                  {resolvedSendTo ? (
                    <span className="flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0">
                      <Lock size={11} /> Private
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0">
                      <Globe size={11} /> Public
                    </span>
                  )}
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
