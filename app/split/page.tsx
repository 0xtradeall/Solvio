'use client';

import { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Plus, Trash2, AlertCircle, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import WalletConnectButton from '@/components/WalletConnectButton';
import { validateSolanaAddress, validateAmount } from '@/lib/validators';
import { sendSOLPayment } from '@/lib/transactions';
import { saveReceipt } from '@/lib/storage';
import { generateReceiptPDF } from '@/lib/pdf';
import { Currency, TxStatus, Participant, Receipt } from '@/types';

interface ParticipantState extends Participant {
  addressError: string;
  status: TxStatus | 'idle';
  txId?: string;
  error?: string;
}

export default function SplitPage() {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();

  const [totalAmount, setTotalAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('SOL');
  const [description, setDescription] = useState('');
  const [equalSplit, setEqualSplit] = useState(true);
  const [participants, setParticipants] = useState<ParticipantState[]>([
    { nickname: '', address: '', amount: undefined, addressError: '', status: 'idle' },
  ]);
  const [isSending, setIsSending] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [totalError, setTotalError] = useState('');

  const addParticipant = () => {
    if (participants.length >= 10) return;
    setParticipants([...participants, { nickname: '', address: '', amount: undefined, addressError: '', status: 'idle' }]);
  };

  const removeParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const updateParticipant = (index: number, field: keyof ParticipantState, value: string | number | undefined) => {
    const updated = [...participants];
    (updated[index] as any)[field] = value;
    if (field === 'address') {
      const addr = value as string;
      if (addr && !validateSolanaAddress(addr)) {
        updated[index].addressError = 'Invalid Solana address';
      } else {
        updated[index].addressError = '';
      }
    }
    setParticipants(updated);
  };

  const getShare = (index: number): number => {
    const total = parseFloat(totalAmount) || 0;
    if (equalSplit) return total / participants.length;
    return participants[index].amount || 0;
  };

  const validateAll = (): boolean => {
    let valid = true;
    if (!validateAmount(totalAmount)) {
      setTotalError('Enter a valid total amount');
      valid = false;
    } else {
      setTotalError('');
    }

    const updated = [...participants];
    updated.forEach((p, i) => {
      if (!p.address || !validateSolanaAddress(p.address)) {
        updated[i].addressError = 'Invalid Solana address';
        valid = false;
      }
      if (!equalSplit && (!p.amount || p.amount <= 0)) {
        valid = false;
      }
    });

    if (!equalSplit) {
      const sum = participants.reduce((acc, p) => acc + (p.amount || 0), 0);
      const total = parseFloat(totalAmount) || 0;
      if (Math.abs(sum - total) > 0.0001) {
        setTotalError(`Custom amounts sum (${sum}) must equal total (${total})`);
        valid = false;
      }
    }

    setParticipants(updated);
    return valid;
  };

  const handleSendAll = async () => {
    if (!publicKey || !signTransaction) return;
    if (!validateAll()) return;

    setIsSending(true);
    setSummary(null);

    const updated = [...participants];
    const promises = participants.map(async (p, i) => {
      if (p.status === 'confirmed') return;
      updated[i] = { ...updated[i], status: 'pending' };
      setParticipants([...updated]);

      const share = getShare(i);
      const result = await sendSOLPayment(
        connection,
        publicKey,
        signTransaction,
        p.address,
        share,
        (status) => {
          updated[i] = { ...updated[i], status: status.status, txId: status.signature, error: status.error };
          setParticipants([...updated]);
        }
      );
      return result;
    });

    await Promise.allSettled(promises);

    const confirmed = updated.filter(p => p.status === 'confirmed').length;
    const failed = updated.filter(p => p.status === 'failed').length;
    setSummary(`${confirmed}/${participants.length} payments confirmed${failed > 0 ? `, ${failed} failed` : ''}`);

    if (confirmed > 0 && publicKey) {
      const receipt: Receipt = {
        id: Date.now().toString(),
        type: 'split',
        amount: parseFloat(totalAmount),
        currency,
        date: new Date().toISOString(),
        note: description,
        fromAddress: publicKey.toBase58(),
        toAddress: 'multiple',
        participants: updated.map((p, i) => ({
          nickname: p.nickname || `Person ${i + 1}`,
          address: p.address,
          amount: getShare(i),
          status: p.status === 'idle' ? 'pending' : p.status,
          txId: p.txId,
        })),
      };
      saveReceipt(publicKey.toBase58(), receipt);
    }

    setIsSending(false);
  };

  const handleRetry = async (index: number) => {
    if (!publicKey || !signTransaction) return;
    const p = participants[index];
    const updated = [...participants];
    updated[index] = { ...updated[index], status: 'pending', error: undefined };
    setParticipants(updated);

    const share = getShare(index);
    await sendSOLPayment(
      connection,
      publicKey,
      signTransaction,
      p.address,
      share,
      (status) => {
        updated[index] = { ...updated[index], status: status.status, txId: status.signature, error: status.error };
        setParticipants([...updated]);
      }
    );
  };

  const getStatusIcon = (status: TxStatus | 'idle') => {
    if (status === 'pending') return <Loader2 size={16} className="animate-spin text-yellow-500" />;
    if (status === 'confirmed') return <CheckCircle size={16} className="text-green-500" />;
    if (status === 'failed') return <XCircle size={16} className="text-red-500" />;
    return null;
  };

  const getStatusBg = (status: TxStatus | 'idle') => {
    if (status === 'pending') return 'bg-yellow-50 border-yellow-200';
    if (status === 'confirmed') return 'bg-green-50 border-green-200';
    if (status === 'failed') return 'bg-red-50 border-red-200';
    return 'bg-white border-gray-200';
  };

  const canSend = participants.length > 0 && !isSending && participants.every(p => !p.addressError && p.address);

  return (
    <div className="p-4 space-y-6">
      <div className="pt-4">
        <h1 className="text-2xl font-bold text-gray-900">Split the Bill</h1>
        <p className="text-sm text-gray-500 mt-1">Split payments across multiple wallets</p>
      </div>

      {!connected ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center space-y-4">
          <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl">👥</span>
          </div>
          <p className="text-gray-600 font-medium">Connect your wallet to split bills</p>
          <WalletConnectButton />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g., Dinner at restaurant"
                disabled={isSending}
                className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Total Amount</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={totalAmount}
                  onChange={e => { setTotalAmount(e.target.value); setTotalError(''); }}
                  placeholder="0.00"
                  min="0"
                  step="any"
                  disabled={isSending}
                  className={`flex-1 border rounded-xl p-3 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60 ${totalError ? 'border-red-400' : 'border-gray-200'}`}
                />
                <div className="flex bg-gray-100 rounded-xl p-1">
                  {(['SOL', 'USDC'] as Currency[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => setCurrency(c)}
                      disabled={isSending}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${currency === c ? 'bg-white shadow text-primary-600' : 'text-gray-500'}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              {totalError && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} /> {totalError}</p>}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Split type:</span>
              <div className="flex bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setEqualSplit(true)}
                  disabled={isSending}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${equalSplit ? 'bg-white shadow text-primary-600' : 'text-gray-500'}`}
                >
                  Equal
                </button>
                <button
                  onClick={() => setEqualSplit(false)}
                  disabled={isSending}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!equalSplit ? 'bg-white shadow text-primary-600' : 'text-gray-500'}`}
                >
                  Custom
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Participants ({participants.length}/10)</h2>
              <button
                onClick={addParticipant}
                disabled={participants.length >= 10 || isSending}
                className="flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium text-sm disabled:opacity-40"
              >
                <Plus size={16} />
                Add Person
              </button>
            </div>

            {participants.map((p, i) => (
              <div key={i} className={`rounded-2xl p-4 border space-y-3 transition-colors ${getStatusBg(p.status)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold text-xs">
                      {i + 1}
                    </div>
                    {getStatusIcon(p.status)}
                    <span className="text-xs font-medium text-gray-500 capitalize">
                      {p.status !== 'idle' ? p.status : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.status === 'failed' && (
                      <button
                        onClick={() => handleRetry(i)}
                        disabled={isSending}
                        className="flex items-center gap-1 bg-red-100 hover:bg-red-200 text-red-600 text-xs font-medium px-2 py-1 rounded-lg"
                      >
                        <RefreshCw size={12} />
                        Retry
                      </button>
                    )}
                    {participants.length > 1 && !isSending && (
                      <button onClick={() => removeParticipant(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <input
                  type="text"
                  value={p.nickname}
                  onChange={e => updateParticipant(i, 'nickname', e.target.value)}
                  placeholder="Nickname"
                  disabled={isSending || p.status === 'confirmed'}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60"
                />

                <div>
                  <input
                    type="text"
                    value={p.address}
                    onChange={e => updateParticipant(i, 'address', e.target.value)}
                    placeholder="Solana wallet address"
                    disabled={isSending || p.status === 'confirmed'}
                    className={`w-full border rounded-xl p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60 ${p.addressError ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                  />
                  {p.addressError && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={11} /> {p.addressError}</p>}
                </div>

                {!equalSplit && (
                  <input
                    type="number"
                    value={p.amount || ''}
                    onChange={e => updateParticipant(i, 'amount', parseFloat(e.target.value))}
                    placeholder={`Amount (${currency})`}
                    min="0"
                    step="any"
                    disabled={isSending || p.status === 'confirmed'}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60"
                  />
                )}

                {totalAmount && equalSplit && (
                  <p className="text-xs text-gray-500">
                    Share: <span className="font-semibold text-primary-600">{(getShare(i)).toFixed(6)} {currency}</span>
                  </p>
                )}

                {p.txId && (
                  <p className="text-xs text-green-600 break-all">
                    Tx: <a href={`https://solscan.io/tx/${p.txId}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="underline">{p.txId.slice(0, 20)}...</a>
                  </p>
                )}

                {p.error && <p className="text-xs text-red-500">{p.error}</p>}
              </div>
            ))}
          </div>

          {summary && (
            <div className={`rounded-2xl p-4 text-sm font-medium ${summary.includes('failed') ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
              {summary.includes('failed') ? '⚠️' : '✅'} {summary}
              {summary.includes('failed') && <span className="block text-xs font-normal mt-1">Confirmed transactions cannot be undone.</span>}
            </div>
          )}

          <button
            onClick={handleSendAll}
            disabled={!canSend}
            className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 min-h-[52px]"
          >
            {isSending ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Sending Payments...
              </>
            ) : (
              `Send All Payments (${participants.length})`
            )}
          </button>
        </>
      )}
    </div>
  );
}
