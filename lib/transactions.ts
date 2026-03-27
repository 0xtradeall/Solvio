import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
} from '@solana/spl-token';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { TransactionStatus, Currency } from '@/types';
import { validateSolanaAddress } from './validators';

export const USDC_MINT_DEVNET = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
const USDC_DECIMALS = 6;

export function getTransactionExplorerUrl(signature: string): string {
  return `https://solscan.io/tx/${signature}?cluster=devnet`;
}

// toAddress is now the recipient, fromAddress is the sender
export function generatePaymentUrl(
  baseUrl: string,
  amount: number,
  currency: Currency,
  toAddress: string, // recipient
  note?: string,
  fromAddress?: string // sender
): string {
  const params: Record<string, string> = {
    amount: amount.toString(),
    currency,
    to: toAddress,
  };
  if (note) params.note = note;
  if (fromAddress) params.recipient = fromAddress;
  return `${baseUrl}/pay?${new URLSearchParams(params).toString()}`;
}

export function generateSplitUrl(
  baseUrl: string,
  splitId: string,
  participantAddress: string,
  amount: number,
  currency: Currency,
  description: string,
  senderAddress: string
): string {
  const params: Record<string, string> = {
    splitId,
    participant: participantAddress,
    amount: amount.toString(),
    currency,
    description,
    sender: senderAddress,
  };
  return `${baseUrl}/split-pay?${new URLSearchParams(params).toString()}`;
}

export async function sendPayment(
  connection: Connection,
  wallet: WalletContextState,
  receiverAddress: string,
  amount: number,
  currency: Currency,
  onStatus: (status: TransactionStatus) => void,
  recipientAddress?: string
): Promise<TransactionStatus> {
  if (recipientAddress && wallet.publicKey) {
    if (wallet.publicKey.toBase58() !== recipientAddress) {
      const result: TransactionStatus = {
        status: 'failed',
        error: 'WALLET_MISMATCH: This payment link was not intended for your wallet.',
      };
      onStatus(result);
      return result;
    }
  }
  if (currency === 'USDC') {
    return sendUSDCPayment(connection, wallet, receiverAddress, amount, onStatus);
  }
  return sendSOLPayment(connection, wallet, receiverAddress, amount, onStatus);
}

async function sendUSDCPayment(
  connection: Connection,
  wallet: WalletContextState,
  receiverAddress: string,
  amountUSDC: number,
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
    const mintPubkey = new PublicKey(USDC_MINT_DEVNET);
    const senderPubkey = wallet.publicKey;
    const receiverPubkey = new PublicKey(receiverAddress);
    const tokenAmount = Math.floor(amountUSDC * Math.pow(10, USDC_DECIMALS));

    const senderATA = await getAssociatedTokenAddress(mintPubkey, senderPubkey);

    try {
      const senderAccount = await getAccount(connection, senderATA);
      const balance = Number(senderAccount.amount) / Math.pow(10, USDC_DECIMALS);
      if (balance < amountUSDC) {
        const result: TransactionStatus = {
          status: 'failed',
          error: `Insufficient USDC balance (${balance.toFixed(2)} USDC). Get devnet USDC at spl-token-faucet.vercel.app`,
        };
        onStatus(result);
        return result;
      }
    } catch {
      const result: TransactionStatus = {
        status: 'failed',
        error: 'You need devnet USDC to test. Get some at spl-token-faucet.vercel.app',
      };
      onStatus(result);
      return result;
    }

    const receiverATA = await getAssociatedTokenAddress(mintPubkey, receiverPubkey);
    const transaction = new Transaction();

    try {
      await getAccount(connection, receiverATA);
    } catch {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          senderPubkey,
          receiverATA,
          receiverPubkey,
          mintPubkey,
        )
      );
    }

    transaction.add(
      createTransferInstruction(
        senderATA,
        receiverATA,
        senderPubkey,
        tokenAmount,
      )
    );

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = senderPubkey;

    const signature = await wallet.sendTransaction(transaction, connection);
    onStatus({ status: 'pending', signature });
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

    const result: TransactionStatus = { status: 'confirmed', signature };
    onStatus(result);
    return result;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'USDC transaction failed';
    const result: TransactionStatus = { status: 'failed', error: errMsg };
    onStatus(result);
    return result;
  }
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
    onStatus({ status: 'pending', signature });
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

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
  amount: number,
  timeoutMs = 120000,
  currency: 'SOL' | 'USDC' = 'SOL'
): Promise<string | null> {
  const start = Date.now();
  const toPubkey = new PublicKey(toAddress);

  while (Date.now() - start < timeoutMs) {
    try {
      if (currency === 'USDC') {
        // For USDC: poll the receiver's ATA for recent transactions
        const mintPubkey = new PublicKey(USDC_MINT_DEVNET);
        let receiverATA: PublicKey;
        try {
          receiverATA = await getAssociatedTokenAddress(mintPubkey, toPubkey);
        } catch {
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }
        const sigs = await connection.getSignaturesForAddress(receiverATA, { limit: 5 });
        for (const sig of sigs) {
          if (sig.blockTime && sig.blockTime * 1000 > start) {
            const tx = await connection.getParsedTransaction(sig.signature, {
              commitment: 'confirmed',
              maxSupportedTransactionVersion: 0,
            });
            if (!tx?.meta) continue;
            // Check token balance changes on the receiver ATA
            const postTokenBalances = tx.meta.postTokenBalances ?? [];
            const preTokenBalances = tx.meta.preTokenBalances ?? [];
            for (const post of postTokenBalances) {
              if (post.mint !== USDC_MINT_DEVNET) continue;
              const pre = preTokenBalances.find(p => p.accountIndex === post.accountIndex);
              const postAmt = Number(post.uiTokenAmount.amount) / Math.pow(10, USDC_DECIMALS);
              const preAmt = pre ? Number(pre.uiTokenAmount.amount) / Math.pow(10, USDC_DECIMALS) : 0;
              const delta = postAmt - preAmt;
              if (Math.abs(delta - amount) < 0.01) {
                return sig.signature;
              }
            }
          }
        }
      } else {
        // SOL: existing logic
        const sigs = await connection.getSignaturesForAddress(toPubkey, { limit: 5 });
        for (const sig of sigs) {
          if (sig.blockTime && sig.blockTime * 1000 > start) {
            const tx = await connection.getTransaction(sig.signature, {
              commitment: 'confirmed',
              maxSupportedTransactionVersion: 0,
            });
            if (tx) {
              const accounts = tx.transaction.message.getAccountKeys
                ? tx.transaction.message.getAccountKeys().staticAccountKeys
                : (tx.transaction.message as any).accountKeys;
              const toIdx = accounts?.findIndex((k: PublicKey) => k?.toBase58() === toAddress);
              if (toIdx !== undefined && toIdx >= 0 && tx.meta?.postBalances && tx.meta?.preBalances) {
                const delta = (tx.meta.postBalances[toIdx] - tx.meta.preBalances[toIdx]) / LAMPORTS_PER_SOL;
                if (Math.abs(delta - amount) < 0.001) {
                  return sig.signature;
                }
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
