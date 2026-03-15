'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Download, Share2, FileText, ChevronDown, ChevronUp, ExternalLink, Loader2, Mail, X, Send } from 'lucide-react';
import WalletConnectButton from '@/components/WalletConnectButton';
import { getReceipts } from '@/lib/storage';
import { generateReceiptPDF } from '@/lib/pdf';
import { getTransactionExplorerUrl } from '@/lib/transactions';
import { Receipt } from '@/types';
import { format } from 'date-fns';
import { getSplits, getActiveSplit, SplitData } from '@/lib/storage';
import { generateSplitUrl } from '@/lib/transactions';

// ─── EmailJS setup ─────────────────────────────────────────────────────────────
// To enable real email sending:
// 1. Create a free account at https://www.emailjs.com
// 2. Add an email service (Gmail, Outlook, etc.)
// 3. Create a template with variables: {{to_email}}, {{subject}}, {{message}}
// 4. Replace the values below with your own IDs from the EmailJS dashboard
const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';
const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY';
// ──────────────────────────────────────────────────────────────────────────────

interface EmailModalProps {
  receipt: Receipt;
  onClose: () => void;
}

function EmailModal({ receipt, onClose }: EmailModalProps) {
  const [toEmail, setToEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const subject = `Payment Receipt from Solvio — ${receipt.amount} ${receipt.currency}`;
  const txLine = receipt.txId
    ? `Transaction: ${getTransactionExplorerUrl(receipt.txId)}`
    : 'Transaction: Not yet confirmed';
  const noteLine = receipt.note ? `Note: "${receipt.note}"` : '';
  const participantsText = receipt.participants
    ? '\nParticipants:\n' + receipt.participants.map(p =>
        `  • ${p.nickname || 'Person'}: ${p.amount} ${receipt.currency} — ${p.status}`
      ).join('\n')
    : '';

  const messageBody = `
Hi,

Here is your payment receipt from Solvio.

──────────────────────────────────
Amount: ${receipt.amount} ${receipt.currency}
Type: ${receipt.type === 'split' ? 'Bill Split' : 'Payment Request'}
Date: ${format(new Date(receipt.date), 'MMMM d, yyyy · h:mm a')}
${noteLine}
${txLine}${participantsText}
──────────────────────────────────

Powered by Solvio — The Solana Payment Hub
https://solvio.app
  `.trim();

  const handleSend = async () => {
    if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
      setError('Please enter a valid email address');
      return;
    }
    setSending(true);
    setError('');

    try {
      // Dynamic import to avoid SSR issues
      const emailjs = (await import('@emailjs/browser')).default;
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        { to_email: toEmail, subject, message: messageBody },
        EMAILJS_PUBLIC_KEY
      );
      setSent(true);
    } catch (e) {
      // Fallback to mailto if EmailJS is not configured
      const mailtoUrl = `mailto:${toEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(messageBody)}`;
      window.open(mailtoUrl, '_blank');
      setSent(true);
    }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Mail size={18} className="text-primary-500" />
            <h3 className="font-bold text-gray-900">Share via Email</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {sent ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Send className="text-green-500" size={24} />
            </div>
            <p className="font-bold text-gray-900">Receipt Shared!</p>
            <p className="text-sm text-gray-500">The receipt details were sent to {toEmail}</p>
            <button onClick={onClose} className="mt-2 text-sm text-primary-600 font-medium hover:underline">Close</button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Recipient Email</label>
              <input
                type="email"
                value={toEmail}
                onChange={e => { setToEmail(e.target.value); setError(''); }}
                placeholder="recipient@example.com"
                className={`w-full border-2 rounded-xl p-3 focus:outline-none transition-colors ${error ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-primary-400'}`}
                autoFocus
              />
              {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Subject</label>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-2.5 border border-gray-100 truncate">{subject}</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Message Preview</label>
              <pre className="text-xs text-gray-500 bg-gray-50 rounded-xl p-2.5 border border-gray-100 overflow-hidden whitespace-pre-wrap line-clamp-4 max-h-24 overflow-y-auto font-sans">{messageBody}</pre>
            </div>

            <button
              onClick={handleSend}
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {sending ? 'Sending…' : 'Send Receipt'}
            </button>
            <p className="text-xs text-gray-400 text-center">
              Receipt details sent as email text. PDF attachment requires backend setup.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReceiptsPage() {
  const { publicKey, connected } = useWallet();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const [emailReceipt, setEmailReceipt] = useState<Receipt | null>(null);
  const [activeSplits, setActiveSplits] = useState<SplitData[]>([]);

  useEffect(() => {
    if (publicKey) setReceipts(getReceipts(publicKey.toBase58()));
    else setReceipts([]);
  }, [publicKey]);

  useEffect(() => {
    if (publicKey) {
      const splits = getSplits(publicKey.toBase58());
      // Filter for active splits (not all confirmed)
      const active = splits.filter(split => 
        !split.participants.every(p => p.status === 'confirmed')
      );
      setActiveSplits(active);
    } else {
      setActiveSplits([]);
    }
  }, [publicKey]);

  useEffect(() => {
    if (!publicKey || activeSplits.length === 0) return;

    const interval = setInterval(() => {
      const splits = getSplits(publicKey.toBase58());
      const updatedActive = splits.filter(split => 
        !split.participants.every(p => p.status === 'confirmed')
      );
      setActiveSplits(updatedActive);
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [publicKey, activeSplits.length]);

  const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const handleDownload = async (receipt: Receipt) => {
    setDownloading(prev => ({ ...prev, [receipt.id]: true }));
    try { await generateReceiptPDF(receipt); } catch (e) { console.error(e); }
    setDownloading(prev => ({ ...prev, [receipt.id]: false }));
  };

  const generateParticipantLink = (split: SplitData, participantAddress: string): string => {
    if (!publicKey) return '';
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const participant = split.participants.find(p => p.walletAddress === participantAddress);
    if (!participant) return '';
    return generateSplitUrl(
      baseUrl,
      split.id,
      participantAddress,
      participant.amount,
      split.currency,
      split.description,
      publicKey.toBase58()
    );
  };

  const copyParticipantLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };

  const shareParticipantViaWhatsApp = (split: SplitData, link: string, participant: any) => {
    const message = `Hey ${participant.nickname}! Please pay your share of ${participant.amount} ${split.currency} for: ${split.description}\n\n${link}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleSplitDownloadPDF = async (split: SplitData) => {
    if (!publicKey) return;
    const receipt: Receipt = {
      id: split.id,
      type: 'split',
      amount: split.totalAmount,
      currency: split.currency,
      date: new Date(split.createdAt).toISOString(),
      note: split.description,
      fromAddress: split.senderAddress,
      toAddress: 'multiple',
      participants: split.participants.map(p => ({
        nickname: p.nickname,
        address: p.walletAddress,
        amount: p.amount,
        status: p.status,
        txId: p.txId,
      })),
    };
    setDownloading(prev => ({ ...prev, [`split-${split.id}`]: true }));
    try { await generateReceiptPDF(receipt); } catch (e) { console.error(e); }
    setDownloading(prev => ({ ...prev, [`split-${split.id}`]: false }));
  };

  const handleWhatsApp = (receipt: Receipt) => {
    const amtStr = `${receipt.amount} ${receipt.currency}`;
    const dateStr = format(new Date(receipt.date), 'MMM d, yyyy');
    const txLink = receipt.txId ? `\nTx: ${getTransactionExplorerUrl(receipt.txId)}` : '';
    const noteStr = receipt.note ? `\n"${receipt.note}"` : '';
    const typeLabel = receipt.type === 'split' ? 'Bill split' : 'Payment';
    const msg = `${typeLabel}: ${amtStr} — ${dateStr}${noteStr}${txLink}\nVia Solvio`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const typeLabel = (r: Receipt) => r.type === 'split' ? 'Split' : 'Request';
  const typeBg = (r: Receipt) => r.type === 'split'
    ? 'bg-secondary-100 text-secondary-700'
    : 'bg-primary-100 text-primary-700';

  return (
    <>
      {emailReceipt && <EmailModal receipt={emailReceipt} onClose={() => setEmailReceipt(null)} />}

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
        ) : (
          <>
            {/* Active Splits Section */}
            {activeSplits.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900">Active Splits</h2>
                {activeSplits.map(split => {
                  const confirmedCount = split.participants.filter(p => p.status === 'confirmed').length;
                  const pendingCount = split.participants.filter(p => p.status === 'pending').length;
                  const failedCount = split.participants.filter(p => p.status === 'failed').length;
                  const totalCount = split.participants.length;
                  const progressPercent = totalCount ? Math.round((confirmedCount / totalCount) * 100) : 0;
                  const allPaid = confirmedCount === totalCount;

                  return (
                    <div key={split.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="p-4 space-y-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <span className="text-lg font-bold text-gray-900">{split.totalAmount} {split.currency}</span>
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                Split
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">"{split.description}"</p>
                            <p className="text-xs text-gray-400">
                              Created {format(new Date(split.createdAt), "MMM d, yyyy '·' h:mm a")}
                            </p>
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-sm mb-2">
                                <span className="font-semibold text-gray-700">
                                  Progress: {confirmedCount}/{totalCount} paid • {pendingCount} pending{failedCount ? ` • ${failedCount} failed` : ''}
                                </span>
                                <span className="text-gray-500">{progressPercent}%</span>
                              </div>
                              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                <div className={`${allPaid ? 'bg-green-500' : 'bg-primary-500'} h-full transition-all duration-300`} style={{ width: `${progressPercent}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {split.participants.map(participant => (
                            <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                              <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${
                                  participant.status === 'confirmed' ? 'bg-green-500' :
                                  participant.status === 'pending' ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`} />
                                <div>
                                  <p className="font-semibold text-gray-900">{participant.nickname}</p>
                                  <p className="text-xs text-gray-500">{participant.amount} {split.currency}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {participant.status === 'confirmed' && participant.txId && (
                                  <a
                                    href={`https://solscan.io/tx/${participant.txId}?cluster=devnet`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-secondary-600 underline"
                                  >
                                    <ExternalLink size={12} />
                                  </a>
                                )}
                                {participant.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => copyParticipantLink(generateParticipantLink(split, participant.walletAddress))}
                                      className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded transition-colors"
                                    >
                                      Copy Link
                                    </button>
                                    <button
                                      onClick={() => shareParticipantViaWhatsApp(split, generateParticipantLink(split, participant.walletAddress), participant)}
                                      className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded transition-colors"
                                    >
                                      WhatsApp
                                    </button>
                                  </>
                                )}
                                {participant.status === 'failed' && (
                                  <button
                                    onClick={() => copyParticipantLink(generateParticipantLink(split, participant.walletAddress))}
                                    className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded transition-colors"
                                  >
                                    Retry
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-end">
                          <button
                            onClick={() => handleSplitDownloadPDF(split)}
                            disabled={!allPaid || downloading[`split-${split.id}`]}
                            className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
                            title={!allPaid ? 'Available when all participants have paid' : undefined}
                          >
                            {downloading[`split-${split.id}`] ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                            Download Group Receipt PDF
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {receipts.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center space-y-3">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                  <FileText className="text-gray-400" size={28} />
                </div>
                <p className="text-gray-700 font-semibold">No receipts yet</p>
                <p className="text-sm text-gray-400">Make a payment request or split a bill to generate your first receipt.</p>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-900">Receipts</h2>
                <p className="text-xs text-gray-400">{receipts.length} receipt{receipts.length !== 1 ? 's' : ''} stored locally</p>
                <div className="space-y-3">
                  {receipts.map(receipt => (
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
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex-shrink-0">Confirmed</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {format(new Date(receipt.date), "MMM d, yyyy '·' h:mm a")}
                        </p>
                      </div>
                      <button onClick={() => toggleExpand(receipt.id)} className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 mt-1">
                        {expanded[receipt.id] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>

                    {receipt.note && (
                      <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2 italic">"{receipt.note}"</p>
                    )}

                    {expanded[receipt.id] && (
                      <div className="space-y-2 border-t border-gray-100 pt-3">
                        <div className="grid grid-cols-1 gap-1.5 text-xs">
                          {receipt.fromAddress && (
                            <div className="flex gap-2">
                              <span className="font-semibold text-gray-500 w-14 flex-shrink-0">From:</span>
                              <span className="font-mono text-gray-600 break-all">{receipt.fromAddress}</span>
                            </div>
                          )}
                          {receipt.toAddress && receipt.toAddress !== 'multiple' && (
                            <div className="flex gap-2">
                              <span className="font-semibold text-gray-500 w-14 flex-shrink-0">To:</span>
                              <span className="font-mono text-gray-600 break-all">{receipt.toAddress}</span>
                            </div>
                          )}
                          {receipt.txId && (
                            <div className="flex gap-2 items-start">
                              <span className="font-semibold text-gray-500 w-14 flex-shrink-0">Tx:</span>
                              <a href={getTransactionExplorerUrl(receipt.txId)} target="_blank" rel="noopener noreferrer"
                                className="font-mono text-secondary-600 underline break-all flex items-center gap-1">
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
                                  <span className="w-5 h-5 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-xs font-bold flex-shrink-0">{i + 1}</span>
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-gray-700 truncate">{p.nickname || `Person ${i + 1}`}</p>
                                    <p className="text-xs font-mono text-gray-400 truncate">{p.address.slice(0, 14)}...</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="text-xs font-semibold text-gray-600">{p.amount} {receipt.currency}</span>
                                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${p.status === 'confirmed' ? 'bg-green-100 text-green-700' : p.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {p.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <button
                        onClick={() => handleDownload(receipt)}
                        disabled={downloading[receipt.id]}
                        className="flex items-center justify-center gap-1.5 bg-primary-500 hover:bg-primary-600 active:scale-95 disabled:opacity-60 text-white text-xs font-semibold py-3 rounded-xl transition-all min-h-[44px]"
                      >
                        {downloading[receipt.id] ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                        PDF
                      </button>
                      <button
                        onClick={() => handleWhatsApp(receipt)}
                        className="flex items-center justify-center gap-1.5 border-2 border-gray-200 hover:bg-green-50 hover:border-green-300 active:scale-95 text-gray-700 text-xs font-semibold py-3 rounded-xl transition-all min-h-[44px]"
                      >
                        <Share2 size={13} />
                        WhatsApp
                      </button>
                      <button
                        onClick={() => setEmailReceipt(receipt)}
                        className="flex items-center justify-center gap-1.5 border-2 border-gray-200 hover:bg-primary-50 hover:border-primary-300 active:scale-95 text-gray-700 text-xs font-semibold py-3 rounded-xl transition-all min-h-[44px]"
                      >
                        <Mail size={13} />
                        Email
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
