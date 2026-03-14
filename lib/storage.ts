import { Receipt } from '@/types';

const MAX_RECEIPTS = 50;

export function getReceiptsKey(walletAddress: string): string {
  return `solvio_receipts_${walletAddress}`;
}

export function getReceipts(walletAddress: string): Receipt[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = getReceiptsKey(walletAddress);
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    return JSON.parse(stored) as Receipt[];
  } catch {
    return [];
  }
}

export function saveReceipt(walletAddress: string, receipt: Receipt): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getReceiptsKey(walletAddress);
    const receipts = getReceipts(walletAddress);
    receipts.unshift(receipt);
    if (receipts.length > MAX_RECEIPTS) {
      receipts.splice(MAX_RECEIPTS);
    }
    localStorage.setItem(key, JSON.stringify(receipts));
  } catch {
  }
}

export function clearReceipts(walletAddress: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getReceiptsKey(walletAddress);
    localStorage.removeItem(key);
  } catch {
  }
}
