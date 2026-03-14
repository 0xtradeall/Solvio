import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { TransactionStatus, Currency } from '@/types';
import { validateSolanaAddress } from './validators';

export const USDC_MINT_DEVNET = 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr';

export function getTransactionExplorerUrl(signature: string): string {
  return `https://solscan.io/tx/${signature}?cluster=devnet`;
}

export function generatePaymentUrl(
  baseUrl: string,
  amount: number,
  currency: Currency,
  toAddress: string,
  note?: string
): string {
  const params: Record<string, string> = {
    amount: amount.toString(),
    currency,
    to: toAddress,
  };
  if (note) params.note = note;
  return `${baseUrl}/pay?${new URLSearchParams(params).toString()}`;
}

export async function sendSOLPayment(
  connection: Connection,
  wallet: WalletContextState,
  receiverAddress: string,
  amountSOL: number,
  onStatus: (status: TransactionStatus) => void
): Promise<TransactionStatus> {
  if (!wallet.publicKey || !wallet.sendTransaction) {
    return { status: 'failed', error: 'Wallet not connected' };
  }
  if (!validateSolanaAddress(receiverAddress)) {
    const result: TransactionStatus = { status: 'failed', error: 'Invalid receiver address' };
    onStatus(result);
    return result;
  }

  onStatus({ status: 'pending' });

  try {
    const receiverPubkey = new PublicKey(receiverAddress);
    const lamports = Math.floor(amountSOL * LAMPORTS_PER_SOL);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: receiverPubkey,
        lamports,
      })
    );

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    const signature = await wallet.sendTransaction(transaction, connection);

    await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      'confirmed'
    );

    const result: TransactionStatus = { status: 'confirmed', signature };
    onStatus(result);
    return result;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Transaction failed';
    const result: TransactionStatus = { status: 'failed', error: errMsg };
    onStatus(result);
    return result;
  }
}

export async function pollForIncomingPayment(
  connection: Connection,
  toAddress: string,
  amountSOL: number,
  timeoutMs = 120000
): Promise<string | null> {
  const start = Date.now();
  const toPubkey = new PublicKey(toAddress);

  while (Date.now() - start < timeoutMs) {
    try {
      const sigs = await connection.getSignaturesForAddress(toPubkey, { limit: 5 });
      for (const sig of sigs) {
        if (sig.blockTime && sig.blockTime * 1000 > start) {
          const tx = await connection.getTransaction(sig.signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
          });
          if (tx) {
            const accounts = tx.transaction.message.getAccountKeys ? 
              tx.transaction.message.getAccountKeys().staticAccountKeys :
              (tx.transaction.message as any).accountKeys;
            const toIdx = accounts?.findIndex((k: PublicKey) => k?.toBase58() === toAddress);
            if (toIdx !== undefined && toIdx >= 0 && tx.meta?.postBalances && tx.meta?.preBalances) {
              const delta = (tx.meta.postBalances[toIdx] - tx.meta.preBalances[toIdx]) / LAMPORTS_PER_SOL;
              if (Math.abs(delta - amountSOL) < 0.001) {
                return sig.signature;
              }
            }
          }
        }
      }
    } catch { }
    await new Promise(r => setTimeout(r, 3000));
  }
  return null;
}
