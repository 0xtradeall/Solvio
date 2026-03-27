import { supabase } from './supabase';
import { Receipt, SplitData } from '@/types';
import { saveReceipt, getReceipts, saveSplit, saveActiveSplit, getActiveSplit } from './storage';

// ─── Receipts ─────────────────────────────────────────────────────────────────

export async function saveReceiptDB(walletAddress: string, receipt: Receipt): Promise<void> {
  // localStorage always written first as fallback
  saveReceipt(walletAddress, receipt);
  try {
    await supabase.from('receipts').upsert({
      id: receipt.id,
      wallet_address: walletAddress,
      type: receipt.type,
      amount: receipt.amount,
      currency: receipt.currency,
      date: receipt.date,
      note: receipt.note ?? null,
      from_address: receipt.fromAddress,
      to_address: receipt.toAddress,
      tx_id: receipt.txId ?? null,
    });
  } catch (e) {
    console.error('[Solvio] saveReceiptDB failed, localStorage fallback used:', e);
  }
}

export async function getReceiptsDB(walletAddress: string): Promise<Receipt[]> {
  try {
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('wallet_address', walletAddress)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    if (!data?.length) return getReceipts(walletAddress);

    return data.map(row => ({
      id: row.id,
      type: row.type,
      amount: row.amount,
      currency: row.currency,
      date: row.date,
      note: row.note ?? undefined,
      fromAddress: row.from_address,
      toAddress: row.to_address,
      txId: row.tx_id ?? undefined,
    }));
  } catch (e) {
    console.error('[Solvio] getReceiptsDB failed, using localStorage fallback:', e);
    return getReceipts(walletAddress);
  }
}

// ─── Splits ───────────────────────────────────────────────────────────────────

export async function saveSplitDB(split: SplitData): Promise<void> {
  // localStorage always written first as fallback
  saveSplit(split.senderAddress, split);
  saveActiveSplit(split.senderAddress, split);
  try {
    await supabase.from('splits').upsert({
      id: split.id,
      sender_address: split.senderAddress,
      total_amount: split.totalAmount,
      currency: split.currency,
      description: split.description,
      equal_split: split.equalSplit ?? true,
    });

    if (split.participants.length > 0) {
      await supabase.from('split_participants').upsert(
        split.participants.map(p => ({
          id: p.id,
          split_id: split.id,
          wallet_address: p.walletAddress,
          nickname: p.nickname,
          amount: p.amount,
          status: p.status,
          tx_id: p.txId ?? null,
          paid_at: p.status === 'confirmed' ? new Date().toISOString() : null,
        }))
      );
    }
  } catch (e) {
    console.error('[Solvio] saveSplitDB failed, localStorage fallback used:', e);
  }
}

export async function updateParticipantStatusDB(
  splitId: string,
  walletAddress: string,
  status: 'pending' | 'confirmed' | 'failed',
  txId?: string
): Promise<void> {
  try {
    await supabase
      .from('split_participants')
      .update({
        status,
        tx_id: txId ?? null,
        paid_at: status === 'confirmed' ? new Date().toISOString() : null,
      })
      .eq('split_id', splitId)
      .eq('wallet_address', walletAddress);
  } catch (e) {
    console.error('[Solvio] updateParticipantStatusDB failed:', e);
  }
}

export async function getSplitDB(splitId: string): Promise<SplitData | null> {
  try {
    const { data: splitRow, error: splitError } = await supabase
      .from('splits')
      .select('*')
      .eq('id', splitId)
      .single();

    if (splitError || !splitRow) return null;

    const { data: participants, error: pError } = await supabase
      .from('split_participants')
      .select('*')
      .eq('split_id', splitId)
      .order('created_at', { ascending: true });

    if (pError) return null;

    return {
      id: splitRow.id,
      senderAddress: splitRow.sender_address,
      totalAmount: splitRow.total_amount,
      currency: splitRow.currency,
      description: splitRow.description,
      equalSplit: splitRow.equal_split,
      createdAt: new Date(splitRow.created_at).getTime(),
      participants: (participants ?? []).map(p => ({
        id: p.id,
        walletAddress: p.wallet_address,
        nickname: p.nickname,
        amount: p.amount,
        status: p.status,
        txId: p.tx_id ?? undefined,
      })),
    };
  } catch (e) {
    console.error('[Solvio] getSplitDB failed:', e);
    return null;
  }
}

export async function getActiveSplitDB(senderAddress: string): Promise<SplitData | null> {
  try {
    const { data: splits, error } = await supabase
      .from('splits')
      .select('id')
      .eq('sender_address', senderAddress)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error || !splits?.length) return getActiveSplit(senderAddress);

    for (const { id } of splits) {
      const split = await getSplitDB(id);
      if (split && !split.participants.every(p => p.status === 'confirmed')) {
        return split;
      }
    }
    return null;
  } catch (e) {
    console.error('[Solvio] getActiveSplitDB failed, using localStorage fallback:', e);
    return getActiveSplit(senderAddress);
  }
}

export function subscribeToSplit(
  splitId: string,
  onUpdate: (participants: SplitData['participants']) => void
): () => void {
  const channel = supabase
    .channel(`split-${splitId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'split_participants',
        filter: `split_id=eq.${splitId}`,
      },
      async () => {
        const { data } = await supabase
          .from('split_participants')
          .select('*')
          .eq('split_id', splitId)
          .order('created_at', { ascending: true });

        if (data) {
          onUpdate(data.map(p => ({
            id: p.id,
            walletAddress: p.wallet_address,
            nickname: p.nickname,
            amount: p.amount,
            status: p.status,
            txId: p.tx_id ?? undefined,
          })));
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
