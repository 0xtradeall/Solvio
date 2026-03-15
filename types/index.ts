export type Currency = 'SOL' | 'USDC';

export type TxStatus = 'pending' | 'confirmed' | 'failed';

export interface Receipt {
  id: string;
  type: 'request' | 'split';
  amount: number;
  currency: Currency;
  date: string;
  note?: string;
  fromAddress: string;
  toAddress: string;
  txId?: string;
  participants?: ReceiptParticipant[];
}

export interface ReceiptParticipant {
  nickname: string;
  address: string;
  snsName?: string;
  amount: number;
  status: TxStatus;
  txId?: string;
}

export interface Participant {
  nickname: string;
  address: string;
  amount?: number;
}

export interface PaymentRequestData {
  amount: number;
  currency: Currency;
  note: string;
  toAddress: string;
}

export interface SplitBillData {
  totalAmount: number;
  currency: Currency;
  description: string;
  participants: Participant[];
  equalSplit: boolean;
}

export interface SplitData {
  id: string;
  senderAddress: string;
  totalAmount: number;
  currency: string;
  description: string;
  participants: SplitParticipant[];
  createdAt: string;
}

export interface SplitParticipant {
  address: string;
  nickname: string;
  amount: number;
  status: 'pending' | 'confirmed';
  txId?: string;
  paidAt?: string;
}

export interface TransactionStatus {
  status: TxStatus;
  signature?: string;
  error?: string;
}

export interface Contact {
  id: string;
  nickname: string;
  address: string;
  snsName?: string;
  note?: string;
  createdAt: string;
}
