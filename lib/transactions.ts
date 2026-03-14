import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { TransactionStatus } from '@/types';
import { validateSolanaAddress } from './validators';

export const USDC_MINT_DEVNET = 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr';
export const USDC_MINT_MAINNET = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

export function getTransactionExplorerUrl(signature: string): string {
  return `https://solscan.io/tx/${signature}?cluster=devnet`;
}

export function generatePaymentUrl(
  baseUrl: string,
  amount: number,
  currency: 'SOL' | 'USDC',
  toAddress: string,
  note?: string
): string {
  const params = new URLSearchParams({
    amount: amount.toString(),
    currency,
    to: toAddress,
    ...(note ? { note } : {}),
  });
  return `${baseUrl}/pay?${params.toString()}`;
}

export async function sendSOLPayment(
  connection: Connection,
  senderPublicKey: PublicKey,
  signTransaction: (tx: Transaction) => Promise<Transaction>,
  receiverAddress: string,
  amountSOL: number,
  onStatus: (status: TransactionStatus) => void
): Promise<TransactionStatus> {
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
        fromPubkey: senderPublicKey,
        toPubkey: receiverPubkey,
        lamports,
      })
    );

    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = senderPublicKey;

    const signed = await signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(signature, 'confirmed');

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
