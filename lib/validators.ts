import { PublicKey } from '@solana/web3.js';

export function validateSolanaAddress(address: string): boolean {
  if (!address || address.trim() === '') return false;
  try {
    const pubkey = new PublicKey(address.trim());
    return PublicKey.isOnCurve(pubkey.toBytes());
  } catch {
    return false;
  }
}

export function validateAmount(amount: string | number): boolean {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return !isNaN(num) && num > 0;
}
