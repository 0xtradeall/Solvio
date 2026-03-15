'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Plus, Trash2, AlertCircle, CheckCircle, XCircle, Loader2, RefreshCw, Users, Lock, Copy, Share2 } from 'lucide-react';
import WalletConnectButton from '@/components/WalletConnectButton';
import SnsAddressInput from '@/components/SnsAddressInput';
import { validateSolanaAddress, validateAmount } from '@/lib/validators';
import { isSNSInput } from '@/lib/sns';
import { sendPayment } from '@/lib/transactions';
import { saveReceipt } from '@/lib/storage';
import { generateReceiptPDF } from '@/lib/pdf';
import { generateSplitUrl } from '@/lib/transactions';
import { saveSplit, updateSplitParticipantStatus, getSplits, SplitData } from '@/lib/storage';
import { Currency, TxStatus, Receipt } from '@/types';

interface ParticipantState {
  nickname: string;
  addressInput: string;
  address: string;
  snsName?: string;
  customAmount: string;
  addressError: string;
  status: TxStatus | 'idle';
  txId?: string;
  txError?: string;
}

const makeParticipant = (nickname = '', address = ''): ParticipantState => ({
  nickname,
  addressInput: address,
  address,
  snsName: undefined,
  customAmount: '',
  addressError: '',
  status: 'idle',
});

function SplitPageContent() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const { publicKey, connected } = wallet;
  const searchParams = useSearchParams();

  const [totalAmount, setTotalAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('SOL');
  const [description, setDescription] = useState('');
  const [equalSplit, setEqualSplit] = useState(true);
  const [participants, setParticipants] = useState<ParticipantState[]>([makeParticipant()]);
  const [isSending, setIsSending] = useState(false);
  const [summary, setSummary] = useState<{ confirmed: number; failed: number; total: number } | null>(null);
  const [totalError, setTotalError] = useState('');
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [splitId, setSplitId] = useState<string>('');
  const [currentSplit, setCurrentSplit] = useState<SplitData | null>(null);

  useEffect(() => {
    // Generate unique split ID
    const newSplitId = `split_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSplitId(newSplitId);
  }, []);

  useEffect(() => {
    if (publicKey && splitId) {
      // Load existing split data if it exists
      const splits = getSplits(publicKey.toBase58());
      const existingSplit = splits.find(s => s.id === splitId);
      if (existingSplit) {
        setCurrentSplit(existingSplit);
        // Update participants status from split data
        const updatedParticipants = participants.map((p, i) => {
          const splitParticipant = existingSplit.participants.find(sp => sp.address === p.address);
          if (splitParticipant) {
            return {
              ...p,
              status: splitParticipant.status === 'confirmed' ? 'confirmed' : p.status,
              txId: splitParticipant.txId || p.txId,
            };
          }
          return p;
        });
        setParticipants(updatedParticipants);
      }
    }
  }, [publicKey, splitId, participants.length]);

  useEffect(() => {
    const add = searchParams.get('add');
    const name = searchParams.get('name');
    if (add && validateSolanaAddress(add)) {
      setParticipants([makeParticipant(name ?? '', add)]);
    }
  }, [searchParams]);

  const total = parseFloat(totalAmount) || 0;
  const perPerson = equalSplit && participants.length > 0 ? total / participants.length : 0;

  const getShare = useCallback((i: number): number => {
    if (equalSplit) return perPerson;
    return parseFloat(participants[i]?.customAmount || '0') || 0;
  }, [equalSplit, perPerson, participants]);

  const addParticipant = () => {
    if (participants.length >= 10) return;
    setParticipants(p => [...p, makeParticipant()]);
  };

  const removeParticipant = (index: number) => {
    setParticipants(p => p.filter((_, i) => i !== index));
  };

  const updateParticipant = (index: number, field: 'nickname' | 'customAmount', value: string) => {
    setParticipants(prev => {
      const next = [...prev];
      (next[index] as any)[field] = value;
      return next;
    });
  };

  const updateParticipantAddress = (index: number, raw: string, resolved: string, snsName?: string) => {
    setParticipants(prev => {
      const next = [...prev];
      const isSns = isSNSInput(raw);
      let addressError = '';
      if (raw && !isSns && !validateSolanaAddress(raw)) {
        addressError = 'Invalid Solana address';
      }
      next[index] = {
        ...next[index],
        addressInput: raw,
        address: resolved || (isSns ? '' : raw),
        snsName: snsName,
        addressError,
      };

      // Save split data when addresses are updated
      if (publicKey && splitId && description && total > 0) {
        const splitData: SplitData = {
          id: splitId,
          senderAddress: publicKey.toBase58(),
          totalAmount: total,
          currency,
          description,
          participants: next.map((p, i) => ({
            address: p.address,
            nickname: p.nickname || `Person ${i + 1}`,
            amount: getShare(i),
            status: 'pending',
          })),
          createdAt: new Date().toISOString(),
        };
        saveSplit(publicKey.toBase58(), splitData);
        setCurrentSplit(splitData);
      }

      return next;
    });
  };

  const validateAll = (): boolean => {
    let valid = true;
    if (!validateAmount(totalAmount)) {
      setTotalError('Enter a valid total amount greater than 0');
      valid = false;
    } else {
      setTotalError('');
    }
    const updated = participants.map(p => {
      let addrErr = '';
      if (!p.addressInput) {
        addrErr = 'Wallet address is required';
      } else if (isSNSInput(p.addressInput) && !p.address) {
        addrErr = 'Waiting for .sol name to resolve…';
      } else if (!validateSolanaAddress(p.address)) {
        addrErr = 'Invalid Solana address';
      }
      if (addrErr) valid = false;
      return { ...p, addressError: addrErr };
    });
    setParticipants(updated);
    if (!equalSplit) {
      const sum = participants.reduce((acc, p) => acc + (parseFloat(p.customAmount) || 0), 0);
      if (Math.abs(sum - total) > 0.000001) {
        setTotalError(`Custom amounts (${sum.toFixed(4)}) must equal total (${total})`);
        valid = false;
      }
    }
    return valid;
  };

  const sendAll = async () => {
    if (!publicKey || !validateAll()) return;
    setIsSending(true);
    setSummary(null);
    setShowSummaryModal(false);

    const results: ParticipantState[] = [...participants];

    // Save split data
    const splitData: SplitData = {
      id: splitId,
      senderAddress: publicKey.toBase58(),
      totalAmount: total,
      currency,
      description,
      participants: participants.map((p, i) => ({
        address: p.address,
        nickname: p.nickname || `Person ${i + 1}`,
        amount: getShare(i),
        status: 'pending',
      })),
      createdAt: new Date().toISOString(),
    };
    saveSplit(publicKey.toBase58(), splitData);

    await Promise.allSettled(
      participants.map(async (p, i) => {
        if (p.status === 'confirmed') return;
        results[i] = { ...results[i], status: 'pending', txId: undefined, txError: undefined };
        setParticipants([...results]);
        await sendPayment(connection, wallet, p.address, getShare(i), currency, (s) => {
          results[i] = { ...results[i], status: s.status, txId: s.signature, txError: s.error };
          setParticipants([...results]);
          // Update split participant status
          if (s.status === 'confirmed' && s.signature) {
            updateSplitParticipantStatus(publicKey.toBase58(), splitId, p.address, 'confirmed', s.signature);
          }
        });
      })
    );

    const confirmed = results.filter(p => p.status === 'confirmed').length;
    const failed = results.filter(p => p.status === 'failed').length;
    setSummary({ confirmed, failed, total: participants.length });
    setShowSummaryModal(true);

    if (confirmed > 0 && publicKey) {
      const receipt: Receipt = {
        id: Date.now().toString(), type: 'split', amount: total, currency,
        date: new Date().toISOString(), note: description,
        fromAddress: publicKey.toBase58(), toAddress: 'multiple',
        participants: results.map((p, i) => ({
          nickname: p.nickname || `Person ${i + 1}`,
          address: p.address,
          snsName: p.snsName,
          amount: getShare(i),
          status: p.status === 'idle' ? 'pending' : p.status,
          txId: p.txId,
        })),
      };
      saveReceipt(publicKey.toBase58(), receipt);
    }
    setIsSending(false);
  };

  const retryOne = async (index: number) => {
    if (!publicKey) return;
    const p = participants[index];
    setParticipants(prev => {
      const next = [...prev];
      next[index] = { ...next[index], status: 'pending', txId: undefined, txError: undefined };
      return next;
    });
    const share = getShare(index);
    await sendPayment(connection, wallet, p.address, share, currency, (s) => {
      setParticipants(prev => {
        const next = [...prev];
        next[index] = { ...next[index], status: s.status, txId: s.signature, txError: s.error };
        return next;
      });
    });
  };

  const handleDownloadPDF = async () => {
    if (!publicKey) return;
    const receipt: Receipt = {
      id: Date.now().toString(), type: 'split', amount: total, currency,
      date: new Date().toISOString(), note: description,
      fromAddress: publicKey.toBase58(), toAddress: 'multiple',
      participants: participants.map((p, i) => ({
        nickname: p.nickname || `Person ${i + 1}`,
        address: p.address,
        snsName: p.snsName,
        amount: getShare(i),
        status: p.status === 'idle' ? 'pending' : p.status,
        txId: p.txId,
      })),
    };
    setPdfGenerating(true);
    try { await generateReceiptPDF(receipt); } catch (e) { console.error(e); }
    setPdfGenerating(false);
  };

  const statusBadge = (status: TxStatus | 'idle') => {
    if (status === 'pending') return <span className="flex items-center gap-1 text-xs font-semibold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full"><Loader2 size={11} className="animate-spin" />Pending</span>;
    if (status === 'confirmed') return <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full"><CheckCircle size={11} />Confirmed</span>;
    if (status === 'failed') return <span className="flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full"><XCircle size={11} />Failed</span>;
    return null;
  };

  const cardBorder = (status: TxStatus | 'idle') => {
    if (status === 'confirmed') return 'border-green-200 bg-green-50/30';
    if (status === 'failed') return 'border-red-200 bg-red-50/30';
    if (status === 'pending') return 'border-yellow-200 bg-yellow-50/30';
    return 'border-gray-200 bg-white';
  };

  const generateParticipantLink = (participant: ParticipantState, index: number): string => {
    if (!publicKey) return '';
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return generateSplitUrl(
      baseUrl,
      splitId,
      participant.address,
      getShare(index),
      currency,
      description,
      publicKey.toBase58()
    );
  };

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      // Could add a toast notification here
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };

  const shareViaWhatsApp = (link: string, participant: ParticipantState) => {
    const message = `Hey ${participant.nickname || 'there'}! Please pay your share of ${getShare(participants.indexOf(participant))} ${currency} for: ${description}\n\n${link}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const hasSendable = participants.length > 0 && !isSending && participants.some(p => p.status !== 'confirmed' && !p.addressError && p.address);
  const anyDone = participants.some(p => p.status === 'confirmed' || p.status === 'failed');

  return (
    <div className="p-4 space-y-5">
      <div className="pt-4">
        <h1 className="text-2xl font-bold text-gray-900">Split the Bill</h1>
        <p className="text-sm text-gray-500 mt-0.5">Pay multiple people simultaneously</p>
      </div>

      {!connected ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center space-y-4">
          <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto">
            <Users className="text-primary-400" size={28} />
          </div>
          <p className="text-gray-600 font-medium">Connect your wallet to split bills</p>
          <WalletConnectButton />
        </div>
      ) : (
        <>
          {showSummaryModal && summary && (
            <div className={`rounded-2xl p-4 border flex items-start gap-3 ${summary.failed > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
              <div className="flex-1">
                <p className={`font-bold ${summary.failed > 0 ? 'text-yellow-800' : 'text-green-800'}`}>
                  {summary.failed > 0 ? '⚠️ Partial Success' : '✅ All Payments Sent'}
                </p>
                <p className={`text-sm mt-0.5 ${summary.failed > 0 ? 'text-yellow-700' : 'text-green-700'}`}>
                  {summary.confirmed}/{summary.total} confirmed{summary.failed > 0 ? `, ${summary.failed} failed` : ''}
                </p>
              </div>
              <button onClick={() => setShowSummaryModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
            </div>
          )}

          {currentSplit && currentSplit.participants.every(p => p.status === 'confirmed') && (
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 text-center">
              <p className="text-green-800 font-extrabold text-lg">🎉 Split Complete!</p>
              <p className="text-sm text-green-700 mt-1">All participants have paid their share</p>
            </div>
          )}

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Description</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                placeholder="e.g., Dinner at Nobu, Team lunch..." disabled={isSending}
                className="w-full border-2 border-gray-200 focus:border-primary-400 rounded-xl p-3 focus:outline-none transition-colors disabled:opacity-60" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Total Amount</label>
              <div className="flex gap-2">
                <input type="number" value={totalAmount} onChange={e => { setTotalAmount(e.target.value); setTotalError(''); }}
                  placeholder="0.00" min="0" step="any" disabled={isSending}
                  className={`flex-1 border-2 rounded-xl p-3 text-xl font-bold focus:outline-none transition-colors disabled:opacity-60 ${totalError ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-primary-400'}`} />
                <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                  {(['SOL', 'USDC'] as Currency[]).map(c => (
                    <button key={c} onClick={() => setCurrency(c)} disabled={isSending}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${currency === c ? 'bg-white shadow-sm text-primary-600 ring-1 ring-primary-200' : 'text-gray-500'}`}>{c}</button>
                  ))}
                </div>
              </div>
              {totalError && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={11} />{totalError}</p>}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Split type</span>
              <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                <button onClick={() => setEqualSplit(true)} disabled={isSending}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${equalSplit ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500'}`}>Equal</button>
                <button onClick={() => setEqualSplit(false)} disabled={isSending}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${!equalSplit ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500'}`}>Custom</button>
              </div>
              {equalSplit && total > 0 && participants.length > 0 && (
                <span className="text-xs text-gray-500 ml-auto">{perPerson.toFixed(4)} {currency} each</span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Participants <span className="text-gray-400 font-normal text-sm">({participants.length}/10)</span></h2>
              <button onClick={addParticipant} disabled={participants.length >= 10 || isSending}
                className="flex items-center gap-1 text-primary-600 hover:text-primary-700 font-semibold text-sm disabled:opacity-40 transition-colors">
                <Plus size={16} /> Add Person
              </button>
            </div>

            {participants.map((p, i) => (
              <div key={i} className={`rounded-2xl p-4 border-2 space-y-3 transition-all ${cardBorder(p.status)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-xs flex-shrink-0">{i + 1}</div>
                    {statusBadge(p.status)}
                    {p.address && validateSolanaAddress(p.address) && (
                      <Lock size={14} className="text-green-600" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {p.status === 'failed' && !isSending && (
                      <button onClick={() => retryOne(i)}
                        className="flex items-center gap-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors">
                        <RefreshCw size={11} /> Retry
                      </button>
                    )}
                    {participants.length > 1 && !isSending && p.status !== 'confirmed' && (
                      <button onClick={() => removeParticipant(i)} className="text-gray-300 hover:text-red-400 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
                <input type="text" value={p.nickname} onChange={e => updateParticipant(i, 'nickname', e.target.value)}
                  placeholder="Name or nickname" disabled={isSending || p.status === 'confirmed'}
                  className="w-full border-2 border-gray-200 focus:border-primary-400 rounded-xl p-2.5 text-sm focus:outline-none transition-colors disabled:opacity-60" />
                <div>
                  <SnsAddressInput
                    value={p.addressInput}
                    onChange={(raw, resolved, snsName) => updateParticipantAddress(i, raw, resolved, snsName)}
                    disabled={isSending || p.status === 'confirmed'}
                    error={p.addressError}
                  />
                  {p.addressError && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={11} /> {p.addressError}</p>
                  )}
                </div>
                {!equalSplit && (
                  <input type="number" value={p.customAmount} onChange={e => updateParticipant(i, 'customAmount', e.target.value)}
                    placeholder={`Amount in ${currency}`} min="0" step="any" disabled={isSending || p.status === 'confirmed'}
                    className="w-full border-2 border-gray-200 focus:border-primary-400 rounded-xl p-2.5 text-sm focus:outline-none transition-colors disabled:opacity-60" />
                )}
                {equalSplit && total > 0 && (
                  <p className="text-xs text-gray-400">Share: <span className="font-bold text-primary-600">{perPerson.toFixed(6)} {currency}</span></p>
                )}
                {p.address && validateSolanaAddress(p.address) && (
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => copyLink(generateParticipantLink(p, i))}
                      className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Copy size={12} /> Copy Link
                    </button>
                    <button
                      onClick={() => shareViaWhatsApp(generateParticipantLink(p, i), p)}
                      className="flex items-center gap-1 bg-green-100 hover:bg-green-200 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Share2 size={12} /> WhatsApp
                    </button>
                  </div>
                )}
                {p.txId && (
                  <a href={`https://solscan.io/tx/${p.txId}?cluster=devnet`} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-secondary-600 underline break-all flex items-center gap-1">
                    <CheckCircle size={11} />Tx: {p.txId.slice(0, 24)}...
                  </a>
                )}
                {p.txError && (
                  <p className="text-xs text-red-500 bg-red-50 rounded-lg p-2">
                    {p.txError.replace('spl-token-faucet.vercel.app', '').trimEnd().replace(/\.$/, '')}
                    {p.txError.includes('spl-token-faucet.vercel.app') && (
                      <> — <a href="https://spl-token-faucet.vercel.app" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Get devnet USDC →</a></>
                    )}
                  </p>
                )}
              </div>
            ))}
          </div>

          {anyDone && (
            <button onClick={handleDownloadPDF} disabled={pdfGenerating}
              className="w-full flex items-center justify-center gap-2 border-2 border-primary-200 text-primary-600 hover:bg-primary-50 active:scale-95 font-semibold py-3.5 rounded-xl transition-all">
              {pdfGenerating ? <Loader2 size={16} className="animate-spin" /> : null}
              {pdfGenerating ? 'Generating PDF...' : 'Download Group Receipt PDF'}
            </button>
          )}

          <button onClick={sendAll} disabled={!hasSendable || !totalAmount || parseFloat(totalAmount) <= 0}
            className="w-full bg-primary-500 hover:bg-primary-600 active:bg-primary-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 text-base shadow-sm shadow-primary-200">
            {isSending
              ? <><Loader2 size={18} className="animate-spin" /> Sending Payments…</>
              : `Send All ${participants.length} Payment${participants.length !== 1 ? 's' : ''}`
            }
          </button>
        </>
      )}
    </div>
  );
}

export default function SplitPage() {
  return (
    <Suspense fallback={<div className="p-4 pt-8 flex justify-center"><Loader2 className="animate-spin text-primary-400" size={28} /></div>}>
      <SplitPageContent />
    </Suspense>
  );
}
