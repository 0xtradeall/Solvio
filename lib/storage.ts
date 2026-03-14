import { Receipt, Contact } from '@/types';

const MAX_RECEIPTS = 50;

export function getReceiptsKey(walletAddress: string): string {
  return `solvio_receipts_${walletAddress}`;
}

export function getReceipts(walletAddress: string): Receipt[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(getReceiptsKey(walletAddress));
    if (!stored) return [];
    return JSON.parse(stored) as Receipt[];
  } catch {
    return [];
  }
}

export function saveReceipt(walletAddress: string, receipt: Receipt): void {
  if (typeof window === 'undefined') return;
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
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(getReceiptsKey(walletAddress));
  } catch {}
}

export function getContactsKey(walletAddress: string): string {
  return `solvio_contacts_${walletAddress}`;
}

export function getContacts(walletAddress: string): Contact[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(getContactsKey(walletAddress));
    if (!stored) return [];
    return JSON.parse(stored) as Contact[];
  } catch {
    return [];
  }
}

export function saveContact(walletAddress: string, contact: Contact): void {
  if (typeof window === 'undefined') return;
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
  if (typeof window === 'undefined') return;
  try {
    const contacts = getContacts(walletAddress).filter(c => c.id !== contactId);
    localStorage.setItem(getContactsKey(walletAddress), JSON.stringify(contacts));
  } catch {}
}

export function clearContacts(walletAddress: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(getContactsKey(walletAddress));
  } catch {}
}
