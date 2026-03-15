'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Plus, Trash2, AlertCircle, CheckCircle, XCircle, Loader2, RefreshCw, Users, Lock, Copy, Share2, User, Search, X } from 'lucide-react';
import WalletConnectButton from '@/components/WalletConnectButton';
import SnsAddressInput from '@/components/SnsAddressInput';
import { validateSolanaAddress, validateAmount } from '@/lib/validators';
import { isSNSInput } from '@/lib/sns';
import { saveReceipt } from '@/lib/storage';
import { generateReceiptPDF } from '@/lib/pdf';
import { generateSplitUrl } from '@/lib/transactions';
import { saveSplit, updateSplitParticipantStatus, getSplits, SplitData } from '@/lib/storage';
import { getContacts } from '@/lib/storage';
import { Currency, TxStatus, Receipt, Contact } from '@/types';

interface ParticipantState {
  nickname: string;
  addressInput: string;
  walletAddress: string;
  snsName?: string;
  customAmount: string;
  addressError: string;
  amountError: string;
  status: TxStatus | 'idle';
  txId?: string;
  txError?: string;
  paidAt?: string;
}

const makeParticipant = (nickname = '', walletAddress = ''): ParticipantState => ({
  nickname,
  addressInput: walletAddress,
  walletAddress,
  snsName: undefined,
  customAmount: '',
  addressError: '',
  amountError: '',
  status: 'idle',
  paidAt: undefined,
});

function SplitPageContent() {
  const wallet = useWallet();
  const { publicKey, connected } = wallet;
  const searchParams = useSearchParams();

  const [totalAmount, setTotalAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('SOL');
  const [description, setDescription] = useState('');
  const [equalSplit, setEqualSplit] = useState(true);
  const [participants, setParticipants] = useState<ParticipantState[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [hasSentAll, setHasSentAll] = useState(false);
  const [totalError, setTotalError] = useState('');
  const [participantCountError, setParticipantCountError] = useState('');
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [splitId, setSplitId] = useState<string>('');
  const [currentSplit, setCurrentSplit] = useState<SplitData | null>(null);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [contactsSearchQuery, setContactsSearchQuery] = useState('');

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
        setHasSentAll(true);

        // Update participants status from split data
        const updatedParticipants = participants.map((p, i) => {
          const splitParticipant = existingSplit.participants.find(sp => sp.walletAddress === p.walletAddress);
          if (splitParticipant) {
            return {
              ...p,
              status: splitParticipant.status,
              txId: splitParticipant.txId || p.txId,
              paidAt: splitParticipant.status === 'confirmed' ? p.paidAt || new Date().toISOString() : p.paidAt,
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

  useEffect(() => {
    if (publicKey) {
      setContacts(getContacts(publicKey.toBase58()));
    } else {
      setContacts([]);
    }
  }, [publicKey]);

  useEffect(() => {
    if (participants.length < 2) {
      setParticipantCountError('Add at least 2 people to split the bill');
    } else {
      setParticipantCountError('');
    }
  }, [participants.length]);

  useEffect(() => {
    if (!equalSplit) return;

    const total = parseFloat(totalAmount) || 0;
    const share = total / (participants.length || 1);
    setParticipants(prev => {
      let updated = false;
      const next = prev.map(p => {
        const amountError = share <= 0 ? 'Amount cannot be zero — check your split calculation' : '';
        if (p.amountError !== amountError) {
          updated = true;
          return { ...p, amountError };
        }
        return p;
      });
      return updated ? next : prev;
    });
  }, [equalSplit, totalAmount, participants.length]);

  useEffect(() => {
    if (!publicKey || !splitId || !hasSentAll) return;

    const interval = setInterval(() => {
      const splits = getSplits(publicKey.toBase58());
      const existingSplit = splits.find(s => s.id === splitId);
      if (!existingSplit) return;

      setParticipants(prev => {
        const next = [...prev];
        let changed = false;

        existingSplit.participants.forEach(sp => {
          const idx = next.findIndex(p => p.walletAddress === sp.walletAddress);
          if (idx === -1) return;
          if (next[idx].status !== sp.status || next[idx].txId !== sp.txId) {
            next[idx] = {
              ...next[idx],
              status: sp.status,
              txId: sp.txId,
              paidAt: sp.status === 'confirmed' ? next[idx].paidAt || new Date().toISOString() : next[idx].paidAt,
            };
            changed = true;
          }
        });

        return changed ? next : prev;
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [publicKey, splitId, hasSentAll]);

  const total = parseFloat(totalAmount) || 0;
  const perPerson = equalSplit && participants.length > 0 ? total / participants.length : 0;

  const getShare = useCallback((i: number): number => {
    if (equalSplit) return perPerson;
    return parseFloat(participants[i]?.customAmount || '0') || 0;
  }, [equalSplit, perPerson, participants]);

  const getParticipantName = (p: ParticipantState, i: number) => p.nickname || `Person ${i + 1}`;
  const shortenAddress = (addr: string) => (addr ? `${addr.slice(0, 4)}...${addr.slice(-4)}` : '');

  const addParticipant = () => {
    if (participants.length >= 10) return;
    setParticipants(p => [...p, makeParticipant()]);
  };

  const openContactsModal = () => {
    setShowContactsModal(true);
    setSelectedContacts(new Set());
    setContactsSearchQuery('');
  };

  const closeContactsModal = () => {
    setShowContactsModal(false);
    setSelectedContacts(new Set());
    setContactsSearchQuery('');
  };

  const toggleContactSelection = (contactId: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const addSelectedContacts = () => {
    const selectedContactsList = contacts.filter(c => selectedContacts.has(c.id));
    const newParticipants = selectedContactsList.map(c => makeParticipant(c.nickname, c.address));
    
    // Check if we would exceed the limit
    if (participants.length + newParticipants.length > 10) {
      // Add as many as possible
      const availableSlots = 10 - participants.length;
      newParticipants.splice(availableSlots);
    }
    
    setParticipants(p => {
      // Filter out empty participants (those with no address and no nickname)
      const filteredExisting = p.filter(participant => 
        participant.addressInput.trim() !== '' || participant.nickname.trim() !== ''
      );
      return [...filteredExisting, ...newParticipants];
    });
    closeContactsModal();
  };

  const filteredContacts = contacts.filter(c => 
    c.nickname.toLowerCase().includes(contactsSearchQuery.toLowerCase()) ||
    c.address.toLowerCase().includes(contactsSearchQuery.toLowerCase())
  );

  const isContactAlreadyAdded = (contact: Contact) => {
    return participants.some(p => p.walletAddress === contact.address);
  };

  const removeParticipant = (index: number) => {
    setParticipants(p => p.filter((_, i) => i !== index));
  };

  const updateParticipant = (index: number, field: 'nickname' | 'customAmount', value: string) => {
    setParticipants(prev => {
      const next = [...prev];
      (next[index] as any)[field] = value;

      if (field === 'customAmount') {
        const share = parseFloat(value) || 0;
        next[index].amountError = share <= 0 ? 'Amount cannot be zero — check your split calculation' : '';
      }

      return next;
    });
  };

  const updateParticipantAddress = (index: number, raw: string, resolved: string, snsName?: string) => {
    setParticipants(prev => {
      const next = [...prev];
      const isSns = isSNSInput(raw);
      const name = getParticipantName(next[index], index);
      let addressError = '';

      if (!raw) {
        addressError = `Please enter wallet address for ${name}`;
      } else if (isSns && !resolved) {
        addressError = 'Waiting for .sol name to resolve…';
      } else if (!isSns && !validateSolanaAddress(raw)) {
        addressError = 'Invalid Solana address';
      }

      next[index] = {
        ...next[index],
        addressInput: raw,
        walletAddress: resolved || (isSns ? '' : raw),
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
            id: `participant-${i}-${Date.now()}`,
            walletAddress: p.walletAddress,
            nickname: p.nickname || `Person ${i + 1}`,
            amount: getShare(i),
            status: "pending" as const
          })),
          createdAt: Date.now(),
        };
        saveSplit(publicKey.toBase58(), splitData);
        setCurrentSplit(splitData);
      }

      return next;
    });
  };

  const validateAll = (): boolean => {
    let valid = true;

    // Total amount validation
    if (!validateAmount(totalAmount)) {
      setTotalError('Please enter the total amount to split');
      valid = false;
    } else {
      setTotalError('');
    }

    // Participant count validation
    if (participants.length < 2) {
      setParticipantCountError('Add at least 2 people to split the bill');
      valid = false;
    } else {
      setParticipantCountError('');
    }

    // Validate custom split sums
    if (!equalSplit && validateAmount(totalAmount)) {
      const sum = participants.reduce((acc, p) => acc + (parseFloat(p.customAmount) || 0), 0);
      if (Math.abs(sum - total) > 0.000001) {
        setTotalError(`Custom amounts (${sum.toFixed(4)}) must equal total (${total})`);
        valid = false;
      }
    }

    const updated = participants.map((p, i) => {
      const name = getParticipantName(p, i);
      let addressError = '';
      let amountError = '';
      const share = getShare(i);

      if (!p.addressInput) {
        addressError = `Please enter wallet address for ${name}`;
      } else if (isSNSInput(p.addressInput) && !p.walletAddress) {
        addressError = 'Waiting for .sol name to resolve…';
      } else if (!validateSolanaAddress(p.walletAddress)) {
        addressError = 'Invalid Solana address';
      }

      if (share <= 0) {
        amountError = 'Amount cannot be zero — check your split calculation';
      }

      if (addressError || amountError) valid = false;

      return { ...p, addressError, amountError };
    });

    setParticipants(updated);
    return valid;
  };

  const handleSendAllClick = () => {
    const valid = validateAll();
    if (!valid) return;
    setShowConfirmModal(true);
  };

  const sendAll = async () => {
    if (!publicKey) return;
    setShowConfirmModal(false);
    if (!validateAll()) return;

    setHasSentAll(true);

    const results: ParticipantState[] = participants.map((p, i) => ({
      ...p,
      status: 'pending',
      txId: undefined,
      txError: undefined,
      paidAt: undefined,
    }));

    const splitData: SplitData = {
      id: splitId,
      senderAddress: publicKey.toBase58(),
      totalAmount: total,
      currency,
      description,
      participants: results.map((p, i) => ({
        id: `participant-${i}-${Date.now()}`,
        walletAddress: p.walletAddress,
        nickname: p.nickname || `Person ${i + 1}`,
        amount: getShare(i),
        status: 'pending' as const,
      })),
      createdAt: Date.now(),
    };

    setParticipants(results);
    saveSplit(publicKey.toBase58(), splitData);
    setCurrentSplit(splitData);
  };

  const retryOne = (index: number) => {
    setParticipants(prev => {
      const next = [...prev];
      next[index] = { ...next[index], status: 'pending', txId: undefined, txError: undefined };
      return next;
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
        address: p.walletAddress,
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
    if (status === 'pending') return <span className="flex items-center gap-1 text-xs font-semibold text-yellow-800 bg-yellow-100 px-2 py-0.5 rounded-full animate-pulse"><span className="text-sm">⏳</span>Waiting for payment</span>;
    if (status === 'confirmed') return <span className="flex items-center gap-1 text-xs font-semibold text-green-800 bg-green-100 px-2 py-0.5 rounded-full"><span className="text-sm">✅</span>Paid</span>;
    if (status === 'failed') return <span className="flex items-center gap-1 text-xs font-semibold text-red-800 bg-red-100 px-2 py-0.5 rounded-full"><span className="text-sm">❌</span>Payment failed</span>;
    return null;
  };

  const cardBorder = (status: TxStatus | 'idle') => {
    if (status === 'confirmed') return 'border-green-200 bg-green-50/40';
    if (status === 'failed') return 'border-red-200 bg-red-50/40';
    if (status === 'pending') return 'border-yellow-200 bg-yellow-50/40';
    return 'border-gray-200 bg-white';
  };

  const generateParticipantLink = (participant: ParticipantState, index: number): string => {
    if (!publicKey) return '';
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return generateSplitUrl(
      baseUrl,
      splitId,
      participant.walletAddress,
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

  const formHasRequiredFields = validateAmount(totalAmount) && (currency === 'SOL' || currency === 'USDC') && participants.length >= 2;
  const participantsValid = participants.every((p, i) => {
    const share = getShare(i);
    return !!p.walletAddress && validateSolanaAddress(p.walletAddress) && share > 0 && !p.addressError && !p.amountError;
  });
  const isFormValid = formHasRequiredFields && participantsValid && !totalError && !participantCountError;

  const confirmedCount = participants.filter(p => p.status === 'confirmed').length;
  const pendingCount = participants.filter(p => p.status === 'pending').length;
  const failedCount = participants.filter(p => p.status === 'failed').length;
  const totalCount = participants.length;
  const allConfirmed = totalCount > 0 && confirmedCount === totalCount;

  const anyDone = participants.some(p => p.status === 'confirmed' || p.status === 'failed');
  const showStatusBar = hasSentAll || anyDone;
  const progressPercent = totalCount ? Math.round((confirmedCount / totalCount) * 100) : 0;

  return (
    <div className="p-4 space-y-5">
      <div className="pt-4">
        <h1 className="text-2xl font-bold text-gray-900">Split the Bill</h1>
        <p className="text-sm text-gray-500 mt-0.5">Pay multiple people simultaneously</p>
      </div>

      {showStatusBar && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="text-sm font-semibold text-gray-700">
              {allConfirmed
                ? `🎉 Split complete! All ${totalCount} payments paid.`
                : `Split status: ${confirmedCount}/${totalCount} paid • ${pendingCount} pending${failedCount ? ` • ${failedCount} failed` : ''}`}
            </div>
            <div className="text-xs text-gray-500">
              {allConfirmed ? `${progressPercent}% collected` : `${progressPercent}% collected`}
            </div>
          </div>
          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden mt-3">
            <div className={`${allConfirmed ? 'bg-green-500' : 'bg-primary-500'} h-full`} style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      )}

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
              {!description && (
                <p className="text-gray-500 text-xs mt-1">Description is optional but helps participants understand the payment.</p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Total Amount</label>
              <div className="flex gap-2">
                <input type="number" value={totalAmount} onChange={e => {
                    const value = e.target.value;
                    setTotalAmount(value);
                    setTotalError(!validateAmount(value) ? 'Please enter the total amount to split' : '');
                  }}
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
            {hasSentAll && !allConfirmed && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-800">
                <p className="font-semibold">✅ Payment requests sent to all {totalCount} participants!</p>
                <p className="text-sm text-emerald-700 mt-1">Share the links below with each person.</p>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900">Participants <span className="text-gray-400 font-normal text-sm">({participants.length}/10)</span></h2>
                {participantCountError && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={11} />{participantCountError}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={openContactsModal} disabled={participants.length >= 10 || isSending}
                  className="flex items-center gap-1 text-secondary-600 hover:text-secondary-700 font-semibold text-sm disabled:opacity-40 transition-colors">
                  <User size={16} /> From Contacts
                </button>
                <button onClick={addParticipant} disabled={participants.length >= 10 || isSending}
                  className="flex items-center gap-1 text-primary-600 hover:text-primary-700 font-semibold text-sm disabled:opacity-40 transition-colors">
                  <Plus size={16} /> Add Person
                </button>
              </div>
            </div>

            {participants.length === 0 ? (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="text-gray-400" size={28} />
                </div>
                <p className="text-gray-600 font-semibold mb-2">No participants yet</p>
                <p className="text-sm text-gray-500">Add participants using '+ Add Person' or 'From Contacts'</p>
              </div>
            ) : (
              participants.map((p, i) => (
                <div key={i} className={`rounded-2xl p-4 border-2 space-y-3 transition-all ${cardBorder(p.status)}`}>
                  <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-xs flex-shrink-0">{i + 1}</div>
                    {statusBadge(p.status)}
                    {p.walletAddress && validateSolanaAddress(p.walletAddress) && (
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
                {(p.status === 'confirmed' || p.status === 'pending') && (
                  <p className="text-xs mt-1 text-gray-600">
                    {p.status === 'confirmed'
                      ? `Paid${p.paidAt ? ` — ${new Date(p.paidAt).toLocaleString()}` : ''}`
                      : `Link sent — waiting for ${getParticipantName(p, i)} to pay`}
                  </p>
                )}
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
                {!equalSplit ? (
                  <>
                    <input type="number" value={p.customAmount} onChange={e => updateParticipant(i, 'customAmount', e.target.value)}
                      placeholder={`Amount in ${currency}`} min="0" step="any" disabled={isSending || p.status === 'confirmed'}
                      className={`w-full border-2 rounded-xl p-2.5 text-sm focus:outline-none transition-colors disabled:opacity-60 ${p.amountError ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-primary-400'}`} />
                    {p.amountError && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={11} />{p.amountError}</p>
                    )}
                  </>
                ) : total > 0 ? (
                  <p className={`text-xs ${p.amountError ? 'text-red-500' : 'text-gray-400'}`}>Share: <span className="font-bold text-primary-600">{perPerson.toFixed(6)} {currency}</span></p>
                ) : null}
                {(p.walletAddress && validateSolanaAddress(p.walletAddress) && (hasSentAll || isFormValid)) && (
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => copyLink(generateParticipantLink(p, i))}
                      className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      title={hasSentAll ? undefined : 'Fill in all required fields to continue'}
                    >
                      <Copy size={12} /> Copy Link
                    </button>
                    <button
                      onClick={() => shareViaWhatsApp(generateParticipantLink(p, i), p)}
                      className="flex items-center gap-1 bg-green-100 hover:bg-green-200 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      title={hasSentAll ? undefined : 'Fill in all required fields to continue'}
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
            ))
            )}
          </div>

          {allConfirmed && (
            <button onClick={handleDownloadPDF} disabled={pdfGenerating}
              className="w-full flex items-center justify-center gap-2 border-2 border-primary-200 text-primary-600 hover:bg-primary-50 active:scale-95 font-semibold py-3.5 rounded-xl transition-all">
              {pdfGenerating ? <Loader2 size={16} className="animate-spin" /> : null}
              {pdfGenerating ? 'Generating PDF...' : 'Download Group Receipt PDF'}
            </button>
          )}

          <div title={!isFormValid ? 'Fill in all required fields to continue' : undefined}>
            <button onClick={() => handleSendAllClick()}
              disabled={!isFormValid || hasSentAll}
              className="w-full bg-primary-500 hover:bg-primary-600 active:bg-primary-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 text-base shadow-sm shadow-primary-200">
              {hasSentAll
                ? '✅ Payment requests generated!'
                : 'Generate Payment Links'
              }
            </button>
          </div>

          {showConfirmModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Confirm split</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Ready to split <span className="font-semibold">{total.toFixed(4)} {currency}</span> between <span className="font-semibold">{participants.length}</span> people?
                    </p>
                    {equalSplit ? (
                      <p className="text-sm text-gray-600 mt-1">
                        Each person pays: <span className="font-semibold">{perPerson.toFixed(4)} {currency}</span>
                      </p>
                    ) : (
                      <p className="text-sm text-gray-600 mt-1">
                        Custom amounts will be used for each person.
                      </p>
                    )}
                  </div>
                  <button onClick={() => setShowConfirmModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
                </div>

                <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50 p-4">
                  {participants.map((p, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 py-2 border-b last:border-b-0">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{getParticipantName(p, i)}</p>
                        <p className="text-xs text-gray-500">{shortenAddress(p.walletAddress)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{getShare(i).toFixed(4)} {currency}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setShowConfirmModal(false)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 rounded-xl transition-colors">
                    Cancel
                  </button>
                  <button onClick={() => sendAll()}
                    className="flex-1 bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 rounded-xl transition-colors">
                    Generate Links
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Contacts Modal */}
          {showContactsModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">Select Contacts</h3>
                    <button onClick={closeContactsModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                      <X size={24} />
                    </button>
                  </div>
                  
                  {/* Search Bar */}
                  <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search contacts..."
                      value={contactsSearchQuery}
                      onChange={(e) => setContactsSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 focus:border-primary-400 rounded-xl focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {contacts.length === 0 ? (
                    <div className="p-8 text-center space-y-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                        <User size={24} className="text-gray-400" />
                      </div>
                      <div>
                        <p className="text-gray-900 font-semibold">No contacts yet</p>
                        <p className="text-gray-500 text-sm mt-1">Add contacts in the Contacts tab first.</p>
                      </div>
                      <button
                        onClick={() => {
                          closeContactsModal();
                          // Navigate to contacts - we'll use window.location for simplicity
                          window.location.href = '/contacts';
                        }}
                        className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
                      >
                        Go to Contacts →
                      </button>
                    </div>
                  ) : filteredContacts.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-gray-500">No contacts match your search.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {filteredContacts.map((contact) => {
                        const alreadyAdded = isContactAlreadyAdded(contact);
                        return (
                          <div
                            key={contact.id}
                            className={`p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                              alreadyAdded ? 'opacity-50' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedContacts.has(contact.id)}
                              onChange={() => toggleContactSelection(contact.id)}
                              disabled={alreadyAdded}
                              className="w-5 h-5 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2 disabled:opacity-50"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 truncate">{contact.nickname}</p>
                              <p className="text-sm text-gray-500 truncate">
                                {contact.address.slice(0, 8)}...{contact.address.slice(-8)}
                              </p>
                              {alreadyAdded && (
                                <p className="text-xs text-gray-400 mt-1">Already added</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {contacts.length > 0 && (
                  <div className="p-6 border-t border-gray-100 bg-gray-50">
                    <div className="flex gap-3">
                      <button
                        onClick={closeContactsModal}
                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 rounded-xl transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={addSelectedContacts}
                        disabled={selectedContacts.size === 0}
                        className="flex-1 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
                      >
                        Add Selected ({selectedContacts.size})
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
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
