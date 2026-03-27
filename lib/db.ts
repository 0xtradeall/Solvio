import { getSupabase } from './supabase';
import { Receipt } from '@/types';
import { getReceipts, getActiveSplit } from './storage';

// ─── Receipts ─────────────────────────────────────────────────────────────────

export async function saveReceiptDB(receipt: Receipt, walletAddress: string) {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from('receipts').upsert({
    id: receipt.id,
    wallet_address: walletAddress,
    type: receipt.type,
    amount: receipt.amount,
    currency: receipt.currency,
    date: receipt.date,
    note: receipt.note ?? null,
    from_address: receipt.fromAddress ?? null,
    to_address: receipt.toAddress ?? null,
    tx_id: receipt.txId ?? null,
  });
  if (error) console.error('[Solvio] saveReceiptDB error:', error);
}

export async function getReceiptsDB(walletAddress: string): Promise<Receipt[]> {
  const supabase = getSupabase();
  if (!supabase) return getReceipts(walletAddress);
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('wallet_address', walletAddress)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) {
    console.error('[Solvio] getReceiptsDB error:', error);
    return getReceipts(walletAddress);
  }
  return (data ?? []).map(r => ({
    id: r.id,
    type: r.type,
    amount: r.amount,
    currency: r.currency,
    date: r.date,
    note: r.note,
    fromAddress: r.from_address,
    toAddress: r.to_address,
    txId: r.tx_id,
  }));
}

// ─── Splits ───────────────────────────────────────────────────────────────────

export async function saveSplitDB(split: {
  id: string;
  senderAddress: string;
  totalAmount: number;
  currency: 'SOL' | 'USDC';
  description: string;
  equalSplit?: boolean;
  participants: {
    id: string;
    walletAddress: string;
    nickname: string;
    amount: number;
    status: 'pending' | 'confirmed' | 'failed';
    txId?: string;
  }[];
}) {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error: splitError } = await supabase.from('splits').upsert({
    id: split.id,
    sender_address: split.senderAddress,
    total_amount: split.totalAmount,
    currency: split.currency,
    description: split.description,
    equal_split: split.equalSplit,
  });
  if (splitError) {
    console.error('[Solvio] saveSplitDB split error:', splitError);
    return;
  }
  const rows = split.participants.map(p => ({
    id: p.id,
    split_id: split.id,
    wallet_address: p.walletAddress,
    nickname: p.nickname,
    amount: p.amount,
    status: p.status,
    tx_id: p.txId ?? null,
  }));
  const { error: partError } = await supabase.from('split_participants').upsert(rows);
  if (partError) console.error('[Solvio] saveSplitDB participants error:', partError);
}

export async function updateParticipantStatusDB(
  participantId: string,
  status: 'confirmed' | 'failed',
  txId?: string
) {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from('split_participants')
    .update({
      status,
      tx_id: txId ?? null,
      paid_at: status === 'confirmed' ? new Date().toISOString() : null,
    })
    .eq('id', participantId);
  if (error) console.error('[Solvio] updateParticipantStatusDB error:', error);
}

export async function getSplitDB(splitId: string) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data: split, error: splitError } = await supabase
    .from('splits')
    .select('*')
    .eq('id', splitId)
    .single();
  if (splitError || !split) return null;
  const { data: participants, error: partError } = await supabase
    .from('split_participants')
    .select('*')
    .eq('split_id', splitId)
    .order('created_at', { ascending: true });
  if (partError) return null;
  return { split, participants: participants ?? [] };
}

export async function getActiveSplitDB(senderAddress: string) {
  const supabase = getSupabase();
  if (!supabase) return getActiveSplit(senderAddress);
  const { data, error } = await supabase
    .from('splits')
    .select('*, split_participants(*)')
    .eq('sender_address', senderAddress)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error || !data) return getActiveSplit(senderAddress);
  return data;
}

export function subscribeToSplit(
  splitId: string,
  onUpdate: (walletAddress: string, status: string, txId: string | null) => void
) {
  const supabase = getSupabase();
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`split:${splitId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'split_participants',
        filter: `split_id=eq.${splitId}`,
      },
      (payload) => {
        const { wallet_address, status, tx_id } = payload.new;
        onUpdate(wallet_address, status, tx_id);
      }
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}
