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

    const participant = split.participants.find(p => p.walletAddress === participantAddress);
    if (!participant) return;

    participant.status = status;
    if (txId) participant.txId = txId;

    saveSplit(walletAddress, split);

    // Also update active split if it matches
    const active = getActiveSplit(walletAddress);
    if (active && active.id === splitId) {
      const activeParticipant = active.participants.find(p => p.walletAddress === participantAddress);
      if (activeParticipant) {
        activeParticipant.status = status;
        if (txId) activeParticipant.txId = txId;
        saveActiveSplit(walletAddress, active);
      }
    }
  } catch {}
}

export function getActiveSplitKey(walletAddress: string): string {
  return `solvio_active_split_${walletAddress}`;
}

export function getActiveSplit(walletAddress: string): SplitData | null {
  if (!isStorageAvailable()) return null;
  try {
    const stored = localStorage.getItem(getActiveSplitKey(walletAddress));
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function saveActiveSplit(walletAddress: string, split: SplitData | null): void {
  if (!isStorageAvailable()) return;
  try {
    if (split) {
      localStorage.setItem(getActiveSplitKey(walletAddress), JSON.stringify(split));
    } else {
      localStorage.removeItem(getActiveSplitKey(walletAddress));
    }
  } catch {}
}

export function clearActiveSplit(walletAddress: string): void {
  if (!isStorageAvailable()) return;
  try {
    localStorage.removeItem(getActiveSplitKey(walletAddress));
  } catch {}
}

export type { SplitData };
