import { Receipt, Contact, SplitData, SplitParticipant } from '@/types';

const MAX_RECEIPTS = 50;

function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const key = '__solvio_test__';
    window.localStorage.setItem(key, '1');
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function getReceiptsKey(walletAddress: string): string {
  return `solvio_receipts_${walletAddress}`;
}

export function getReceipts(walletAddress: string): Receipt[] {
  if (!isStorageAvailable()) return [];
  try {
    const stored = localStorage.getItem(getReceiptsKey(walletAddress));
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveReceipt(walletAddress: string, receipt: Receipt): void {
  if (!isStorageAvailable()) return;
  try {
    const receipts = getReceipts(walletAddress);
    const idx = receipts.findIndex(r => r.id === receipt.id);
    if (idx >= 0) {
      receipts[idx] = receipt;
    } else {
      receipts.unshift(receipt);
    }
    if (receipts.length > MAX_RECEIPTS) receipts.splice(MAX_RECEIPTS);
    localStorage.setItem(getReceiptsKey(walletAddress), JSON.stringify(receipts));
  } catch {}
}

export function clearReceipts(walletAddress: string): void {
  if (!isStorageAvailable()) return;
  try {
    localStorage.removeItem(getReceiptsKey(walletAddress));
  } catch {}
}

export function getContactsKey(walletAddress: string): string {
  return `solvio_contacts_${walletAddress}`;
}

export function getContacts(walletAddress: string): Contact[] {
  if (!isStorageAvailable()) return [];
  try {
    const stored = localStorage.getItem(getContactsKey(walletAddress));
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveContact(walletAddress: string, contact: Contact): void {
  if (!isStorageAvailable()) return;
  try {
    const contacts = getContacts(walletAddress);
    const idx = contacts.findIndex(c => c.id === contact.id);
    if (idx >= 0) {
      contacts[idx] = contact;
    } else {
      contacts.unshift(contact);
    }
    localStorage.setItem(getContactsKey(walletAddress), JSON.stringify(contacts));
  } catch {}
}

export function deleteContact(walletAddress: string, contactId: string): void {
  if (!isStorageAvailable()) return;
  try {
    const contacts = getContacts(walletAddress).filter(c => c.id !== contactId);
    localStorage.setItem(getContactsKey(walletAddress), JSON.stringify(contacts));
  } catch {}
}

export function clearContacts(walletAddress: string): void {
  if (!isStorageAvailable()) return;
  try {
    localStorage.removeItem(getContactsKey(walletAddress));
  } catch {}
}

export function getSplitsKey(walletAddress: string): string {
  return `solvio_splits_${walletAddress}`;
}

export function getSplits(walletAddress: string): SplitData[] {
  if (!isStorageAvailable()) return [];
  try {
    const stored = localStorage.getItem(getSplitsKey(walletAddress));
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSplit(walletAddress: string, split: SplitData): void {
  if (!isStorageAvailable()) return;
  try {
    const splits = getSplits(walletAddress);
    const idx = splits.findIndex(s => s.id === split.id);
    if (idx >= 0) {
      splits[idx] = split;
    } else {
      splits.unshift(split);
    }
    localStorage.setItem(getSplitsKey(walletAddress), JSON.stringify(splits));
  } catch {}
}

export function updateSplitParticipantStatus(
  walletAddress: string,
  splitId: string,
  participantAddress: string,
  status: 'pending' | 'confirmed',
  txId?: string
): void {
  if (!isStorageAvailable()) return;
  try {
    const splits = getSplits(walletAddress);
    const split = splits.find(s => s.id === splitId);
    if (!split) return;

    const participant = split.participants.find(p => p.address === participantAddress);
    if (!participant) return;

    participant.status = status;
    if (txId) participant.txId = txId;
    if (status === 'confirmed') participant.paidAt = new Date().toISOString();

    saveSplit(walletAddress, split);
  } catch {}
}
