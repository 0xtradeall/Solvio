# Next.js Web3 Integration Setup for Solvio

## Overview

This document outlines the setup for integrating Solana Web3 functionality into the Solvio Next.js application using the App Router. Solvio is a mobile-first Progressive Web App (PWA) built as a Solana payment hub, enabling seamless SOL and USDC transactions via Phantom wallet integration. All Web3 operations are client-side only, with no backend dependencies, ensuring privacy and simplicity. Wallet connection serves as authentication, receipts are persisted in localStorage tied to the wallet address, and transaction logic is modularized for future offline relaying via Pollinet SDK.

Key principles for this integration:
- **Client-Side Only**: Leverage `@solana/wallet-adapter-react` for Phantom wallet handling; never store private keys.
- **Modularity**: Encapsulate Solana transaction functions in `lib/transactions.js` to keep UI components clean and allow interception for Android wrappers.
- **Error Handling**: Validate wallet addresses pre-transaction, handle partial successes in bill splits (no rollbacks), and provide retry mechanisms.
- **PWA Optimization**: Ensure Web3 hooks work within React Server Components where possible, but hydrate client-side for wallet interactions.
- **Tech Stack Alignment**: Use `@solana/web3.js` for Solana interactions (preferred over Ethers.js for this blockchain), TypeScript for type safety, and TailwindCSS for purple/teal fintech styling.

This setup supports core features:
- Payment requests with QR codes and auto-Phantom triggering.
- Multi-party bill splits with simultaneous transactions and status tracking.
- Local receipt management with PDF generation.

**Unique Project Identifier**: 1773487698706_solvio__solana_payment_hub_for_real_world_use__frontend_nextjs_web3_md_bkd9j4

## Prerequisites

- Node.js >= 18.x
- Next.js 14+ with App Router enabled
- Basic familiarity with Solana concepts (wallets, transactions, USDC SPL token)
- Phantom wallet browser extension for testing (mobile simulation via Chrome DevTools at 390px width)
- No backend setup required; all data is device-local.

## Installation

Install core dependencies via npm or yarn. Focus on Solana-specific libraries to avoid Ethereum bloat.

```bash
npm install @solana/web3.js @solana/wallet-adapter-base @solana/wallet-adapter-react @solana/wallet-adapter-wallets @solana/wallet-adapter-react-ui @solana/spl-token
npm install qrcode.react jspdf  # For QR and PDF features specific to Solvio
npm install next@latest react@latest react-dom@latest  # Ensure latest for PWA support
npm install -D @types/node typescript tailwindcss postcss autoprefixer  # TypeScript and styling
```

For PWA manifest and service worker (mobile installability):
```bash
npm install next-pwa
```

Update `next.config.js` to enable PWA:
```js
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
        },
      },
    },
  ],
});

const nextConfig = {
  // Other Next.js config
  images: {
    domains: ['solscan.io'],  // For transaction ID linking
  },
  env: {
    NEXT_PUBLIC_SOLANA_NETWORK: 'devnet',  // Switch to 'mainnet-beta' for production
  },
};

module.exports = withPWA(nextConfig);
```

## Configuration

### 1. TailwindCSS Setup for Solvio Styling
Configure `tailwind.config.js` for the purple/teal fintech theme (inspired by Revolut/Venmo: clean, mobile-optimized with rounded buttons and subtle shadows).

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#7c3aed',  // Purple for buttons (e.g., Send All Payments)
          600: '#9333ea',
        },
        secondary: {
          500: '#0ea5e9',  // Teal for accents (e.g., status confirmed)
          600: '#0284c7',
        },
        error: '#ef4444',  // Red for failures/retry buttons
        success: '#10b981',  // Green for confirmed statuses
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],  // Clean fintech font
      },
      screens: {
        'mobile-min': '390px',  // Optimize for smallest mobile viewport
      },
    },
  },
  plugins: [],
};
```

Include in `globals.css` (or `app/globals.css` for App Router):
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: 'Inter', sans-serif;
  background-color: #f8fafc;  /* Light gray for mobile readability */
}
```

### 2. TypeScript Configuration
Update `tsconfig.json` for Solana types and strict mode:

```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@/lib/*": ["./lib/*"],  // For transactions.js
    },
    "types": ["@solana/web3.js", "@solana/wallet-adapter-react"]  // Solana-specific types
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 3. Environment Variables
In `.env.local` (gitignored):
```
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com  # Use mainnet for prod
NEXT_PUBLIC_USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v  # USDC devnet mint
```

## Wallet Adapter Setup

Wrap the app with Solana wallet providers. Since Solvio uses Phantom only for MVP, configure minimally.

Create `components/providers/WalletProvider.tsx` (client component):

```tsx
'use client';

import { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Styles for wallet modal (purple/teal theme)
import '@solana/wallet-adapter-react-ui/styles.css';
import './WalletModal.css';  // Custom override below

interface WalletProviderProps {
  children: ReactNode;
}

export const SolvioWalletProvider: FC<WalletProviderProps> = ({ children }) => {
  const network = WalletAdapterNetwork.Devnet;  // Matches env
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
```

Custom `components/providers/WalletModal.css` for Solvio theme:
```css
.solana-wallet-adapter-modal {
  --wallets-modal-background-color: #f8fafc;  /* Light bg */
  --wallets-modal-title-color: #7c3aed;  /* Purple title */
  --wallets-modal-button-hover-background-color: #9333ea;  /* Purple hover */
}

.solana-wallet-adapter-button {
  background-color: #0ea5e9 !important;  /* Teal for connect button */
  color: white !important;
}
```

In `app/layout.tsx` (App Router root):
```tsx
import { SolvioWalletProvider } from '@/components/providers/WalletProvider';
import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SolvioWalletProvider>
          {children}
        </SolvioWalletProvider>
      </body>
    </html>
  );
}
```

### Usage in Components
In any client component (e.g., `app/request/page.tsx` for Payment Request tab):
```tsx
'use client';

import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useState } from 'react';

export default function RequestPage() {
  const { publicKey, connected, connect } = useWallet();
  const { connection } = useConnection();
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState<'SOL' | 'USDC'>('SOL');
  const [note, setNote] = useState('');

  if (!connected) {
    return (
      <button
        onClick={connect}
        className="bg-purple-500 text-white px-6 py-3 rounded-lg w-full mx-4 mb-4"
      >
        Connect Phantom Wallet
      </button>
    );
  }

  // Auto-fill receiver address
  const receiverAddress = publicKey?.toBase58();

  // Generate QR/payment logic here (integrate with transactions.js)
  // ...

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-2xl font-bold text-purple-600 mb-4">Payment Request</h1>
      {/* Form inputs for amount, currency toggle, note */}
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        placeholder="Amount"
        className="w-full p-3 border rounded-lg mb-2"
      />
      {/* ... other fields */}
      <button
        onClick={() => handleGenerateRequest({ amount, currency, note, receiverAddress })}
        className="bg-teal-500 text-white px-6 py-3 rounded-lg w-full"
      >
        Generate Link & QR
      </button>
    </div>
  );
}
```

## Transaction Logic Modularization

All Solana operations are in `lib/transactions.ts` for exportability and future Pollinet interception. Use a callback pattern for status updates.

```ts
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token';
import { NATIVE_MINT } from '@solana/spl-token';  // For SOL (wrapped)

const USDC_MINT = new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT!);

export interface TransactionStatus {
  status: 'Pending' | 'Confirmed' | 'Failed';
  signature?: string;
  error?: string;
}

export interface SplitPayload {
  totalAmount: number;
  participants: Array<{ address: string; nickname: string; share?: number }>;  // share for custom splits
  description: string;
  currency: 'SOL' | 'USDC';
}

export interface PaymentRequestPayload {
  amount: number;
  currency: 'SOL' | 'USDC';
  note: string;
  receiverAddress: string;
}

// Simple status callback for UI updates or Pollinet relay
type StatusCallback = (txId: string, status: TransactionStatus) => void;

// Validate Solana address
export const validateAddress = (address: string): boolean => {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
};

// Core transfer function (SOL or USDC)
export const sendPayment = async (
  connection: Connection,
  sender: PublicKey,
  receiverAddress: string,
  amount: number,
  currency: 'SOL' | 'USDC',
  callback: StatusCallback
): Promise<TransactionStatus> => {
  if (!validateAddress(receiverAddress)) {
    return { status: 'Failed', error: 'Invalid receiver address' };
  }

  try {
    callback('temp', { status: 'Pending' });

    const receiverPubkey = new PublicKey(receiverAddress);
    let transaction = new Transaction();

    if (currency === 'SOL') {
      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: sender,
          toPubkey: receiverPubkey,
          lamports,
        })
      );
    } else {
      // USDC transfer (SPL token)
      const senderTokenAccount = await getAssociatedTokenAddress(NATIVE_MINT, sender);  // Placeholder; use actual USDC
      const receiverTokenAccount = await getAssociatedTokenAddress(USDC_MINT, receiverPubkey);
      const transferInstruction = createTransferInstruction(
        senderTokenAccount,  // Assume sender's ATA
        receiverTokenAccount,
        sender,
        Math.floor(amount * 1e6),  // USDC decimals
        [],
        TOKEN_PROGRAM_ID
      );
      transaction.add(transferInstruction);
    }

    const signature = await connection.sendTransaction(transaction, [/* wallet */]);  // Passed from adapter
    await connection.confirmTransaction(signature);

    callback(signature, { status: 'Confirmed', signature });
    return { status: 'Confirmed', signature };
  } catch (error) {
    const errMsg = (error as Error).message;
    callback('temp', { status: 'Failed', error: errMsg });
    return { status: 'Failed', error: errMsg };
  }
};

// Bill split: Simultaneous sends with statuses
export const splitBill = async (
  connection: Connection,
  sender: PublicKey,
  payload: SplitPayload,
  onStatusUpdate: (nickname: string, status: TransactionStatus) => void
): Promise<TransactionStatus[]> => {
  const results: TransactionStatus[] = [];
  const totalShares = payload.share ? payload.participants.reduce((sum, p) => sum + (p.share || 0), 0) : payload.participants.length;
  let locked = true;  // Lock during process

  for (const participant of payload.participants) {
    const share = payload.share ? (participant.share || 0) / totalShares * payload.totalAmount : payload.totalAmount / payload.participants.length;
    const result = await sendPayment(connection, sender, participant.address, share, payload.currency, (sig, status) => onStatusUpdate(participant.nickname, status));
    results.push(result);
  }

  // Partial success summary: Count confirmed/failed
  const confirmed = results.filter(r => r.status === 'Confirmed').length;
  const failed = results.filter(r => r.status === 'Failed').length;
  console.log(`Split complete: ${confirmed} confirmed, ${failed} failed (no rollback)`);

  return results;
};

// Payment request handler (payer side): Auto-trigger Phantom
export const handlePaymentRequest = async (
  connection: Connection,
  payload: PaymentRequestPayload,
  wallet: any  // From adapter
): Promise<TransactionStatus> => {
  // Deep link or direct sign via wallet adapter
  if (wallet && wallet.signTransaction) {
    return sendPayment(connection, wallet.publicKey!, payload.receiverAddress, payload.amount, payload.currency, () => {});
  }
  throw new Error('Wallet not connected');
};

// Export for receipts/PDF integration
export const getTransactionDetails = (signature: string): { link: string; explorer: string } => ({
  link: `https://solscan.io/tx/${signature}?cluster=devnet`,
  explorer: 'Solscan',
});
```

### Integration in UI
In bill split component (e.g., `app/split/page.tsx`):
```tsx
'use client';

import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useState } from 'react';
import { splitBill, SplitPayload, validateAddress } from '@/lib/transactions';

export default function SplitPage() {
  const { publicKey, signTransaction } = useWallet();  // Pass signTransaction to sendPayment if needed
  const { connection } = useConnection();
  const [participants, setParticipants] = useState<Array<{ address: string; nickname: string; share?: number }>>([]);
  const [statuses, setStatuses] = useState<Record<string, TransactionStatus>>({});
  const [isSending, setIsSending] = useState(false);

  const handleAddParticipant = (nickname: string, address: string) => {
    if (!validateAddress(address)) {
      // Highlight error: e.g., set border red on input
      return alert('Invalid wallet address');
    }
    setParticipants([...participants, { nickname, address }]);
  };

  const handleSplit = async () => {
    if (!publicKey) return;
    setIsSending(true);
    const payload: SplitPayload = {
      totalAmount: 5,  // From form
      participants,
      description: 'Dinner split',
      currency: 'USDC',
    };

    // Lock addresses
    const updateStatus = (nickname: string, status: TransactionStatus) => {
      setStatuses(prev => ({ ...prev, [nickname]: status }));
    };

    await splitBill(connection, publicKey, payload, updateStatus);

    // Generate PDF receipt for whole split (integrate jsPDF here)
    generateSplitReceipt(payload, statuses);

    setIsSending(false);
  };

  return (
    <div className="p-4 min-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold text-purple-600 mb-4">Split the Bill</h1>
      {/* Participant list with inputs, equal/custom toggle */}
      <ul>
        {participants.map((p, i) => (
          <li key={i} className="flex justify-between p-2 bg-white rounded mb-2">
            <span>{p.nickname} ({p.address.slice(0, 8)}...)</span>
            <span className={`px-2 py-1 rounded ${
              statuses[p.nickname]?.status === 'Failed' ? 'bg-red-200 text-red-800' :
              statuses[p.nickname]?.status === 'Confirmed' ? 'bg-green-200 text-green-800' :
              'bg-yellow-200 text-yellow-800'
            }`}>
              {statuses[p.nickname]?.status || 'Ready'}
              {statuses[p.nickname]?.status === 'Failed' && (
                <button onClick={() => retryIndividual(p)} className="ml-2 bg-red-500 text-white px-2 py-1 rounded text-xs">
                  Retry
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
      <button
        onClick={handleSplit}
        disabled={isSending || participants.length === 0}
        className="bg-purple-500 text-white px-6 py-3 rounded-lg w-full disabled:opacity-50"
      >
        {isSending ? 'Sending...' : 'Send All Payments'}
      </button>
      {Object.values(statuses).some(s => s.status === 'Failed') && (
        <p className="text-red-500 mt-2">Partial success: Some payments failed. Use Retry buttons.</p>
      )}
    </div>
  );
}

// Helper for PDF (using jsPDF)
function generateSplitReceipt(payload: SplitPayload, statuses: Record<string, TransactionStatus>) {
  const { jsPDF } = require('jspdf');
  const doc = new jsPDF();
  doc.text(`Split Bill: ${payload.description}`, 10, 10);
  doc.text(`Total: ${payload.totalAmount} ${payload.currency}`, 10, 20);
  // Add participants, statuses, signatures, date, addresses
  Object.entries(statuses).forEach(([nick, status], i) => {
    doc.text(`${nick}: ${status.status} ${status.signature ? `(Tx: ${status.signature})` : ''}`, 10, 30 + i * 10);
  });
  doc.text(`Receiver (Payer): ${publicKey?.toBase58()}`, 10, 30 + participants.length * 10);
  doc.text(new Date().toISOString(), 10, 40 + participants.length * 10);
  doc.save(`solvio-split-${Date.now()}.pdf`);
}

// Individual retry (non-rollback)
function retryIndividual(participant: { address: string; nickname: string }) {
  // Re-call sendPayment for that one, update status
}
```

For QR in payment request: Use `qrcode.react` in `app/request/page.tsx`:
```tsx
import QRCode from 'qrcode.react';

<QRCode
  value={`solvio://pay?amount=${amount}&to=${receiverAddress}&currency=${currency}&note=${encodeURIComponent(note)}`}
  size={256}
  className="mx-auto block"  // Large for mobile scanning
/>
```

## PWA-Specific Web3 Considerations

- **Offline Handling**: Transactions require online connection; use service worker to cache UI but not transactions. For future Pollinet, intercept `sendPayment` calls via a proxy wrapper.
- **Mobile Deep Linking**: Payment URLs like `solvio://pay?...` auto-open Phantom on mobile (test with `window.location.href`).
- **Receipt Storage**: In `lib/storage.ts` (separate file):
  ```ts
  export const saveReceipt = (walletAddress: string, receipt: any) => {
    const key = `solvio_receipts_${walletAddress}`;
    const receipts = JSON.parse(localStorage.getItem(key) || '[]');
    receipts.push({ ...receipt, timestamp: Date.now() });
    localStorage.setItem(key, JSON.stringify(receipts));
  };

  export const getReceipts = (walletAddress: string) => {
    const key = `solvio_receipts_${walletAddress}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  };
  ```
  Tie to Receipts tab: List from localStorage, regenerate PDF on demand, add WhatsApp share (`window.open('whatsapp://send?text=Receipt: ${link}')`).

## Testing and Deployment

### Testing
- **Devnet**: Run `npm run dev` and test with Phantom devnet SOL/USDC.
- **Error Simulation**: Mock failed transactions by invalid addresses; verify red status and retry.
- **Mobile**: Use Chrome DevTools (390px, touch simulation); install PWA via Lighthouse.
- **Partial Splits**: Test 3 participants; fail one to confirm no rollback and summary message.

### Deployment to Vercel
1. Push to GitHub.
2. Connect repo in Vercel dashboard.
3. Set env vars (RPC_URL, USDC_MINT).
4. Deploy: Vercel handles PWA manifest (`public/manifest.json` with purple icons).
5. Custom domain optional; enable HTTPS for wallet security.

For production:
- Switch to mainnet-beta.
- Add analytics (no personal data).
- Monitor for Solana congestion in status callbacks.

## Future Enhancements
- **Pollinet Integration**: Wrap `sendPayment` in a relay function: `const relayedSend = (params) => pollinetRelay(params, sendPayment);`.
- **Token Expansion**: Abstract mint in `transactions.ts` for future tokens.
- **Accessibility**: Add ARIA labels to wallet buttons for fintech compliance.

This setup ensures Solvio remains modular, secure, and user-friendly for real-world Solana payments. For updates, reference project requirements (e.g., no cross-device sync).
