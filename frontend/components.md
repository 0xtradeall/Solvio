# Solvio Frontend Components Documentation

This document outlines the key Web3 UI components for the Solvio Progressive Web App (PWA), a mobile-first Solana payment hub designed for real-world use cases like freelancer invoicing, merchant payments, and group bill splitting. These components focus on wallet connection via Phantom and transaction-related interfaces, ensuring seamless integration with the Solana blockchain using `@solana/wallet-adapter-react`. All components are built with React (using Next.js App Router for routing and structure), TypeScript for type safety, TailwindCSS for styling (purple/teal fintech theme inspired by Revolut/Venmo), and optimized for mobile screens (min-width: 390px).

Components are modular, client-side only, and avoid direct network calls—transaction logic is delegated to the `transactions.js` utility file for exportable functions and status callbacks. This supports future interception by Pollinet SDK for offline P2P relaying in an Android wrapper. No private keys are handled; all signing occurs in Phantom. Data persistence (e.g., receipts) uses localStorage keyed to the connected wallet address for device-specific sessions.

Receipts are generated via `jsPDF` and stored as JSON blobs in localStorage. QR codes use `qrcode.react`. Error handling includes validation for invalid wallet addresses (highlighted in red), partial transaction successes (no rollbacks), and retry mechanisms. Currency support is limited to SOL and USDC for MVP.

## Core Design Principles
- **Mobile-First**: Components use responsive Tailwind classes (e.g., `flex flex-col space-y-4 p-4 sm:p-6`). Bottom tab navigation (Request, Split, Receipts, Settings) is handled via a shared `BottomNav` component (not detailed here).
- **Theme**: Primary: `bg-purple-600 text-white`, Secondary: `bg-teal-500 hover:bg-teal-600`. Errors: `text-red-500 border-red-300`. Success: `text-green-500`.
- **Accessibility**: ARIA labels for wallet states, keyboard-navigable forms, and screen-reader-friendly status updates.
- **State Management**: Uses React Context for wallet (`WalletProvider` from `@solana/wallet-adapter-react`) and local receipts. No global state library for MVP simplicity.
- **Dependencies**: `@solana/wallet-adapter-react`, `@solana/web3.js`, `qrcode.react`, `jspdf`, `react-qr-code` (fallback), TailwindCSS v3+.

## 1. WalletConnectButton
A reusable button component for connecting/disconnecting the Phantom wallet, serving as the app's sole authentication mechanism. It auto-fills the user's wallet address in forms post-connection and persists the public address in localStorage for receipt keying.

### Props
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `className` | `string` | No | Additional Tailwind classes for styling (default: `w-full bg-purple-600 text-white py-3 rounded-lg font-semibold`). |
| `onConnect` | `() => void` | No | Optional callback on successful connection (e.g., refresh receipts from localStorage). |
| `onDisconnect` | `() => void` | No | Optional callback on disconnect (e.g., clear session data). |
| `showAddress` | `boolean` | No | If true, displays truncated wallet address after connection (default: false for compact mobile view). |

### Usage Example
```tsx
import { WalletConnectButton } from '@/components/WalletConnectButton';
import { useWallet } from '@solana/wallet-adapter-react';

function SettingsTab() {
  const { publicKey, disconnect } = useWallet();

  return (
    <div className="p-4">
      <WalletConnectButton
        onConnect={() => console.log('Wallet connected')}
        onDisconnect={disconnect}
        showAddress={true}
      />
      {publicKey && (
        <p className="text-teal-500 mt-2">
          Connected: {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-4)}
        </p>
      )}
    </div>
  );
}
```

### Implementation Notes
- Integrates with `useWallet()` hook: Shows "Connect Phantom" if disconnected; "Disconnect" if connected.
- Handles connection errors (e.g., no Phantom installed) with a modal prompt: "Install Phantom from phantom.app".
- On connect, validates the wallet address format (base58, 32-44 chars) and stores in localStorage as `solvio_wallet_${address}_receipts`.
- Mobile optimization: Full-width button with haptic feedback on tap (via `navigator.vibrate(50)` if supported).

## 2. PaymentRequestForm
Form component for generating payment requests. Users input amount (SOL/USDC), optional note, and it auto-fills the connected wallet address. Submits to generate a shareable URL (e.g., `/request?amount=0.5&currency=SOL&note=Invoice&to=${address}`) and QR code.

### Props
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `initialAmount` | `number` | No | Pre-fill amount (default: 0). |
| `onGenerate` | `(data: PaymentRequestData) => void` | Yes | Callback with form data on submit; triggers QR/PDF logic. |
| `currencyOptions` | `('SOL' \| 'USDC')[]` | No | Allowed currencies (default: ['SOL', 'USDC']). |
| `loading` | `boolean` | No | Show spinner during submission (default: false). |

### PaymentRequestData Interface
```tsx
interface PaymentRequestData {
  amount: number;
  currency: 'SOL' | 'USDC';
  note: string;
  toAddress: string; // Auto-filled from connected wallet
}
```

### Usage Example
```tsx
import { PaymentRequestForm } from '@/components/PaymentRequestForm';
import { useWallet } from '@solana/wallet-adapter-react';

function RequestTab() {
  const { publicKey } = useWallet();

  const handleGenerate = (data: PaymentRequestData) => {
    // Generate URL and QR via transactions.js
    const url = `/request?${new URLSearchParams(data)}`;
    generateQR(url);
    // Later: On payment confirmation, create PDF receipt
  };

  if (!publicKey) return <WalletConnectButton />;

  return (
    <div className="space-y-4 p-4">
      <PaymentRequestForm onGenerate={handleGenerate} />
    </div>
  );
}
```

### Implementation Notes
- Form fields: Number input for amount (with currency toggle dropdown), textarea for note (max 200 chars).
- Validation: Amount > 0, valid wallet address (uses `PublicKey.isOnCurve()` from `@solana/web3.js`). Errors highlight fields in red (`border-2 border-red-300`).
- On submit, calls `createPaymentRequest` from `transactions.js` (exported function with status callback: `(status: 'pending' \| 'confirmed' \| 'failed') => void`).
- Post-confirmation: Auto-generates PDF with jsPDF including timestamp, tx ID (hyperlinked to `https://solscan.io/tx/${txId}`), and downloads via `PDFDocument.output('datauristring')`.
- QR Integration: Renders `<QRCode value={url} size={256} className="mx-auto" />` below form for large mobile display. Shareable via Web Share API if available.

## 3. SplitBillForm
Component for bill splitting. Inputs total amount, description, participant list (nickname + wallet address). Toggle equal/custom splits. "Send All Payments" button initiates simultaneous transactions via `transactions.js`, with live per-person status updates.

### Props
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `participants` | `Participant[]` | No | Initial list of participants (default: empty). |
| `onSubmit` | `(data: SplitBillData) => void` | Yes | Callback on send; handles transaction batch. |
| `equalSplit` | `boolean` | No | Default split mode (default: true). |
| `maxParticipants` | `number` | No | Limit list length (default: 10 for mobile UX). |

### Participant & SplitBillData Interfaces
```tsx
interface Participant {
  nickname: string;
  address: string;
  amount?: number; // For custom splits
}

interface SplitBillData {
  totalAmount: number;
  currency: 'SOL' | 'USDC';
  description: string;
  participants: Participant[];
  equalSplit: boolean;
}
```

### Usage Example
```tsx
import { SplitBillForm } from '@/components/SplitBillForm';
import { TransactionStatusList } from '@/components/TransactionStatusList';

function SplitTab() {
  const [status, setStatus] = useState<Record<string, TransactionStatus>>({});
  const [locked, setLocked] = useState(false);

  const handleSubmit = async (data: SplitBillData) => {
    setLocked(true); // Prevent edits mid-send
    // Validate addresses first
    const invalid = validateAddresses(data.participants.map(p => p.address));
    if (invalid.length) {
      // Highlight invalid fields in red
      return;
    }
    // Batch send via transactions.js
    const results = await sendBatchPayments(data, (update: { address: string; status: TransactionStatus }) => {
      setStatus(prev => ({ ...prev, [update.address]: update.status }));
    });
    // Generate PDF for whole split on completion
    if (results.some(r => r.confirmed)) {
      generateSplitPDF(results, data);
    }
    setLocked(false);
  };

  return (
    <div className="space-y-4 p-4">
      <SplitBillForm onSubmit={handleSubmit} />
      <TransactionStatusList statuses={status} locked={locked} onRetry={retrySingle} />
    </div>
  );
}
```

### Implementation Notes
- Dynamic list: Add/remove participants with input fields (nickname: text, address: text with validation on blur).
- Split Logic: Equal mode auto-calculates `amount = total / participants.length`; custom allows per-person overrides (sums must match total).
- Send Button: Disabled if no wallet connected or invalid data; shows loading spinner. Uses `sendBatchPayments` from `transactions.js` (returns Promise of per-tx results with callback for real-time updates: Pending → Confirmed → Failed).
- Locking: On send, disables form inputs (`pointer-events-none opacity-50`) to prevent changes.
- Partial Success: Summary banner (e.g., "3/5 Confirmed – No rollbacks applied") in teal/green; failures in red with individual Retry buttons (calls `retryPayment` from `transactions.js` for single address).
- PDF: jsPDF multi-page for list of txs, total summary, and Solscan links.

## 4. TransactionStatusList
Reusable list for displaying per-participant statuses during/after splits, or general transaction history previews. Integrates with receipts tab for past sessions.

### Props
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `statuses` | `Record<string, TransactionStatus>` | Yes | Map of address to status (Pending/Confirmed/Failed). |
| `locked` | `boolean` | No | Disable interactions (default: false). |
| `onRetry` | `(address: string) => void` | No | Callback for retrying failed txs. |
| `showDetails` | `boolean` | No | Expand to show tx ID and Solscan link (default: false). |

### TransactionStatus Type
```tsx
type TransactionStatus = 'pending' | 'confirmed' | 'failed';
```

### Usage Example
See SplitBillForm above. In ReceiptsTab:
```tsx
// Load from localStorage
const receipts = loadReceipts(walletAddress);
<TransactionStatusList statuses={receipts.statusMap} showDetails={true} />
```

### Implementation Notes
- List Items: Card per participant (`bg-white rounded-lg shadow-md p-3 mb-2`) with avatar (initials from nickname), status badge (yellow for pending, green for confirmed, red for failed), and optional Retry button (only for failed, disabled if locked).
- Animations: Status changes trigger fade-in (`transition-opacity duration-300`); vibrations on confirm (mobile feedback).
- Receipts Integration: In Receipts tab, lists all localStorage entries as expandable cards with Download PDF (regenerates from stored data) and WhatsApp Share buttons (uses `navigator.share` with PDF blob URL or text summary).
- Uniqueness: Filters out non-Web3 elements; callbacks hook into `transactions.js` for retry (e.g., re-sign via Phantom without batch).

## 5. ReceiptPDFGenerator (Utility Component)
Not a visible UI but a wrapper for jsPDF integration, used in forms and lists. Generates downloadable receipts tied to wallet address.

### Props
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `receiptData` | `ReceiptData` | Yes | Object with tx details. |
| `onGenerate` | `(pdfBlob: Blob) => void` | Yes | Callback with PDF blob for download/share. |

### ReceiptData Interface
```tsx
interface ReceiptData {
  date: Date;
  amount: number;
  currency: 'SOL' | 'USDC';
  fromAddress: string;
  toAddress: string;
  txId?: string;
  note?: string;
  type: 'request' | 'split';
}
```

### Implementation Notes
- Uses jsPDF: Adds header ("Solvio Receipt"), table for details, QR of txId (if available), and footer with Solscan link.
- Download: Creates `<a>` element with `download="solvio-receipt-${date}.pdf"` and blob URL.
- Share: For WhatsApp, formats text summary (e.g., "Paid 0.5 SOL to [address] - Tx: [link]") and uses `window.open(encodeURIComponent(text))` to `https://wa.me/?text=`.
- Storage: Serializes `ReceiptData[]` to localStorage post-generation, keyed by wallet (e.g., `JSON.stringify(receipts, null, 2)`).
- Mobile: Ensures PDF scales to 390px width; auto-saves to device downloads if PWA installed.

## Integration with transactions.js
All components call exported functions like:
- `connectWallet(callback: () => void)`
- `createPaymentRequest(data: PaymentRequestData, statusCallback: (status: TransactionStatus, txId?: string) => void)`
- `sendBatchPayments(data: SplitBillData, updateCallback: (update: { address: string; status: TransactionStatus; txId?: string }) => void)`
- `validateAddress(address: string): boolean`
- `retryPayment(address: string, amount: number, currency: string, statusCallback: ...`

These use `@solana/web3.js` for tx construction but defer signing to wallet adapter. Status callbacks enable UI updates and future Pollinet overrides (e.g., replace RPC with offline relay).

## Testing & Edge Cases
- **Unit Tests**: Use `@testing-library/react` for form validation (e.g., invalid address highlights), wallet mocks.
- **E2E**: Cypress for mobile flows: Connect → Request → Simulate payer confirmation → PDF download.
- **Edges**: No wallet (redirect to connect), offline (queue txs with warning), partial fails (e.g., 2/3 confirmed shows summary), invalid USDC address (error: "Not a valid Solana address").
- **Performance**: Lazy-load QR/PDF libs; limit localStorage to 50 receipts (oldest evicted).

This setup ensures Solvio's components are production-ready, unique to Web3 interactions, and aligned with the no-backend, device-local MVP. For updates, coordinate with ProductManager on UX tweaks and BackendDev (if backend added later for sync). Unique ID: 1773487698727_solvio__solana_payment_hub_for_real_world_use__frontend_components_md_uwbq7h
