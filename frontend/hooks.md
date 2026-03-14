# Custom React Hooks for Solvio Blockchain Interactions

This document outlines the custom React hooks implemented in the Solvio frontend for handling Solana blockchain interactions. These hooks leverage `@solana/wallet-adapter-react` for Phantom wallet integration, `@solana/web3.js` for transaction logic, and integrate seamlessly with the app's modular structure. All hooks are designed for mobile-first PWA usage, ensuring efficient state management without backend dependencies. Transaction functions are imported from the centralized `transactions.js` module to maintain separation of concerns and enable future Pollinet SDK interception via status callbacks.

Hooks focus on:
- Wallet connection and authentication (tied to localStorage for receipt persistence).
- Payment requests with QR code and PDF generation triggers.
- Bill splitting with multi-transaction handling, validation, and error states.
- Receipt management from localStorage, keyed to the connected wallet address.

These hooks are used across components in the bottom tab navigation (Request, Split, Receipts, Settings) and assume TailwindCSS for styling and TypeScript for type safety. No private keys are handled; all signing occurs in Phantom.

## Prerequisites

- Install dependencies: `@solana/wallet-adapter-react`, `@solana/web3.js`, `qrcode.react`, `jsPDF`.
- Import `transactions.js` for core Solana functions (e.g., `sendPayment`, `sendSplitPayments` with callback pattern: `(status, txId, error) => void`).
- LocalStorage usage: Receipts stored as `JSON.stringify({ walletAddress: [...receipts] })` for device-persistent sessions.

## Hook: useWalletConnection

Manages Phantom wallet connection, serving as the sole authentication mechanism. Automatically retrieves and persists the publicKey for localStorage keying. Handles connection/disconnection and network checks (mainnet-beta only for MVP).

### Description
- Initializes wallet adapter context.
- Tracks connection status, publicKey, and auto-connect on app load if previously connected.
- Integrates with Settings tab for manual connect/disconnect.

### Parameters
- None (uses WalletAdapterProvider from context).

### Returns
- `isConnected: boolean` - Wallet connection status.
- `publicKey: PublicKey | null` - Connected wallet's public key.
- `connect: () => Promise<void>` - Triggers Phantom connection modal.
- `disconnect: () => Promise<void>` - Disconnects wallet and clears local session.
- `walletAddress: string | null` - Formatted publicKey as string (e.g., "9WzDX...abcde").
- `error: string | null` - Connection errors (e.g., "Wallet not installed").

### Usage Example
```tsx
import { useWalletConnection } from '@/hooks/useWalletConnection';

function SettingsTab() {
  const { isConnected, walletAddress, connect, disconnect, error } = useWalletConnection();

  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }

  return (
    <div className="p-4">
      {isConnected ? (
        <div>
          <p>Connected: {walletAddress}</p>
          <button onClick={disconnect} className="bg-teal-500 text-white px-4 py-2 rounded">
            Disconnect
          </button>
        </div>
      ) : (
        <button onClick={connect} className="bg-purple-500 text-white px-4 py-2 rounded">
          Connect Phantom Wallet
        </button>
      )}
    </div>
  );
}
```

### Implementation Notes
- On connect, fetches localStorage receipts using `publicKey.toString()` as key and hydrates app state.
- Uses `useEffect` for auto-connect on mount if localStorage has a prior address.
- Error handling: Catches "User rejected" and displays user-friendly messages in purple/teal theme.

## Hook: usePaymentRequest

Handles generation of payment requests, including amount validation, QR code creation, and post-payment receipt generation. Auto-fills receiver address from connected wallet.

### Description
- Validates SOL/USDC amounts (e.g., 0.001 min for SOL).
- Generates shareable URL (e.g., `https://solvio.app/request?amount=0.5&currency=SOL&to={walletAddress}&note=Invoice`).
- Triggers QR code rendering via `qrcode.react`.
- Listens for payment confirmation via Solana connection events; generates PDF on success.

### Parameters
- `amount: string` - Amount input (validated on change).
- `currency: 'SOL' | 'USDC'` - Selected currency.
- `note: string` - Optional note (max 200 chars).

### Returns
- `generateRequest: () => { url: string; qrValue: string }` - Creates URL and QR data.
- `isGenerating: boolean` - Loading state during QR/PDF ops.
- `receiptData: Receipt | null` - Post-payment data for PDF/download.
- `generatePDF: (txId: string) => void` - Creates jsPDF with date, amount, addresses, txId (Solscan link), note.
- `error: string | null` - Validation errors (e.g., "Invalid amount").

### Usage Example
```tsx
import { usePaymentRequest } from '@/hooks/usePaymentRequest';
import QRCode from 'qrcode.react';
import { useWalletConnection } from '@/hooks/useWalletConnection';

function RequestTab() {
  const { walletAddress } = useWalletConnection();
  const { amount, setAmount, currency, setCurrency, note, setNote } = useFormState(); // Assume form hook
  const { generateRequest, isGenerating, receiptData, generatePDF, error } = usePaymentRequest(amount, currency, note);

  const handleShare = () => {
    const { url } = generateRequest();
    // Share via Web Share API or copy to clipboard for mobile
    navigator.share({ url, title: 'Solvio Payment Request' });
  };

  useEffect(() => {
    if (receiptData) generatePDF(receiptData.txId);
  }, [receiptData]);

  if (error) {
    return <div className="text-red-500 p-4 bg-red-100 rounded">{error}</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
        className="w-full p-2 border border-purple-300 rounded"
      />
      <select value={currency} onChange={(e) => setCurrency(e.target.value as 'SOL' | 'USDC')} className="w-full p-2 border">
        <option value="SOL">SOL</option>
        <option value="USDC">USDC</option>
      </select>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note"
        className="w-full p-2 border h-20"
      />
      <button onClick={handleShare} disabled={isGenerating} className="bg-teal-500 text-white px-6 py-3 rounded w-full">
        {isGenerating ? 'Generating...' : 'Generate & Share Request'}
      </button>
      {generateRequest().qrValue && (
        <QRCode value={generateRequest().qrValue} size={256} className="mx-auto" />
      )}
      {receiptData && (
        <a href={receiptData.pdfUrl} download="receipt.pdf" className="block bg-purple-500 text-white text-center py-2 rounded">
          Download Receipt
        </a>
      )}
    </div>
  );
}
```

### Implementation Notes
- URL generation uses `new URLSearchParams` for query params; QR value is the full URL.
- PDF via jsPDF: Includes table layout with purple/teal accents, auto-save as "solvio-receipt-{date}.pdf".
- Integrates with `transactions.js` for payment detection (polls recent blockhash or uses connection.onSignature).

## Hook: useBillSplit

Manages bill splitting logic, including participant list, split calculations (equal/custom), address validation, and simultaneous transactions. Locks inputs during send and handles partial successes.

### Description
- Validates Phantom wallet addresses using `@solana/web3.js` PublicKey constructor.
- Calculates splits: Equal (total / count) or custom per-person amounts.
- Triggers `sendSplitPayments` from `transactions.js` with status callbacks for live updates.
- Stores successful receipts in localStorage; generates group PDF on completion.

### Parameters
- `totalAmount: string` - Total bill amount.
- `currency: 'SOL' | 'USDC'`.
- `participants: Array<{ nickname: string; address: string; amount?: string }>` - List of people.
- `splitType: 'equal' | 'custom'`.

### Returns
- `addParticipant: () => void` - Adds empty participant slot.
- `removeParticipant: (index: number) => void`.
- `validateAddresses: () => { valid: boolean; errors: Record<number, string> }` - Pre-send validation.
- `sendPayments: () => Promise<void>` - Initiates all txs; locks UI.
- `statuses: Array<'pending' | 'confirmed' | 'failed'>` - Per-person live status.
- `txIds: Array<string | null>` - Confirmed transaction IDs.
- `isSending: boolean` - Global loading state.
- `generateGroupPDF: () => string` - jsPDF for full split (all statuses, amounts, addresses).
- `retryPayment: (index: number) => void` - Retries failed individual tx.
- `error: string | null` - Global errors (e.g., "Partial success: 2/3 confirmed").

### Usage Example
```tsx
import { useBillSplit } from '@/hooks/useBillSplit';

function SplitTab() {
  const [participants, setParticipants] = useState([{ nickname: '', address: '', amount: '' }]);
  // ... other form states

  const {
    addParticipant,
    removeParticipant,
    validateAddresses,
    sendPayments,
    statuses,
    txIds,
    isSending,
    generateGroupPDF,
    retryPayment,
    error
  } = useBillSplit(totalAmount, currency, participants, splitType);

  const handleSend = async () => {
    const { valid, errors } = validateAddresses();
    if (!valid) {
      // Highlight errors in UI (e.g., red border on invalid fields)
      return;
    }
    await sendPayments();
  };

  return (
    <div className="p-4 space-y-4">
      <input type="number" value={totalAmount} /* ... */ className="w-full p-2 border" />
      {/* Participant list rendering */}
      {participants.map((p, i) => (
        <div key={i} className="flex space-x-2 items-center">
          <input value={p.nickname} placeholder="Nickname" className="flex-1 p-2 border" />
          <input value={p.address} placeholder="Wallet Address" className={`flex-1 p-2 border ${validateErrors[i] ? 'border-red-500' : ''}`} />
          {splitType === 'custom' && <input value={p.amount} placeholder="Amount" className="p-2 border w-20" />}
          <button onClick={() => removeParticipant(i)} className="text-red-500">Remove</button>
          {statuses[i] === 'failed' && (
            <button onClick={() => retryPayment(i)} className="bg-red-500 text-white px-2 py-1 rounded text-xs">
              Retry
            </button>
          )}
          <span className={`px-2 py-1 rounded text-xs ${statuses[i] === 'pending' ? 'bg-yellow-200' : statuses[i] === 'confirmed' ? 'bg-green-200' : 'bg-red-200'}`}>
            {statuses[i]?.toUpperCase()}
          </span>
        </div>
      ))}
      <button onClick={addParticipant} className="bg-purple-500 text-white px-4 py-2 rounded">Add Person</button>
      <button onClick={handleSend} disabled={isSending} className="bg-teal-500 text-white w-full py-3 rounded">
        {isSending ? 'Sending...' : 'Send All Payments'}
      </button>
      {error && <div className="text-red-500 p-2 bg-red-100 rounded">{error}</div>}
      {txIds.every(id => id) && (
        <a href={generateGroupPDF()} download="split-receipt.pdf" className="block bg-purple-500 text-white text-center py-2 rounded">
          Download Group Receipt
        </a>
      )}
    </div>
  );
}
```

### Implementation Notes
- Address validation: `new PublicKey(address)` in try-catch; errors highlight specific fields pre-send.
- Transactions: Calls `sendSplitPayments(participants, currency, totalAmount, onStatusUpdate)` from `transactions.js`; no rollbacks on partial fails.
- Locking: Sets `isSending` true during process; disables inputs.
- PDF: jsPDF multi-page if many participants; includes Solscan links for each txId.
- Status callback: `(index, status, txId, error) => { update statuses; if all done, set partial summary }`.

## Hook: useReceipts

Manages retrieval, display, and actions for past transactions stored in localStorage (tied to wallet address). Supports PDF re-generation and WhatsApp sharing.

### Description
- Loads receipts on wallet connect; filters by session if needed (MVP: all device-persistent).
- Each receipt includes txId, amount, currency, date, note, payer/receiver addresses.
- Enables download (re-generate PDF) and share (WhatsApp URL with receipt details).

### Parameters
- `walletAddress: string | null` - From useWalletConnection.

### Returns
- `receipts: Array<Receipt>` - Sorted list (newest first).
- `addReceipt: (newReceipt: Receipt) => void` - Appends after successful tx.
- `downloadReceipt: (receipt: Receipt) => void` - Re-generates and downloads PDF.
- `shareReceipt: (receipt: Receipt) => void` - Opens WhatsApp with formatted message (e.g., "Payment received: 0.5 SOL - Tx: {solscanLink}").
- `clearReceipts: () => void` - Clears localStorage (Settings only).

### Usage Example
```tsx
import { useReceipts } from '@/hooks/useReceipts';
import { useWalletConnection } from '@/hooks/useWalletConnection';

function ReceiptsTab() {
  const { walletAddress } = useWalletConnection();
  const { receipts, downloadReceipt, shareReceipt } = useReceipts(walletAddress);

  return (
    <div className="p-4 space-y-2">
      {receipts.map((r) => (
        <div key={r.txId} className="border border-purple-300 p-4 rounded space-y-2">
          <p><strong>{r.currency} {r.amount}</strong> - {r.date}</p>
          <p>Note: {r.note || 'N/A'}</p>
          <p>From: {r.payerAddress.slice(0, 8)}... To: {r.receiverAddress.slice(0, 8)}...</p>
          <div className="flex space-x-2">
            <button onClick={() => downloadReceipt(r)} className="bg-teal-500 text-white px-3 py-1 rounded text-sm">
              Download PDF
            </button>
            <button onClick={() => shareReceipt(r)} className="bg-purple-500 text-white px-3 py-1 rounded text-sm">
              Share on WhatsApp
            </button>
          </div>
        </div>
      ))}
      {receipts.length === 0 && <p className="text-gray-500 text-center">No receipts yet. Make a payment!</p>}
    </div>
  );
}
```

### Implementation Notes
- Receipt type: `{ txId: string; amount: string; currency: string; date: string; note?: string; payerAddress: string; receiverAddress: string; pdfUrl?: string }`.
- Storage: `localStorage.setItem(walletAddress, JSON.stringify(receipts))`; load on connect.
- Sharing: Constructs WhatsApp URL: `https://wa.me/?text=${encodeURIComponent(message with Solscan link)}`.
- PDF re-gen: Same jsPDF logic as payment hooks, using stored data.

## Best Practices & Integration
- **Error Boundaries**: Wrap hooks in React ErrorBoundary for tx failures; display in red with retry options.
- **Mobile Optimization**: All hooks use `useCallback` and `useMemo` to prevent re-renders on 390px screens.
- **Future-Proofing**: Transaction callbacks in hooks allow Pollinet interception (e.g., replace `connection.sendTransaction` with offline relay).
- **Testing**: Unit test with `@testing-library/react-hooks` and mock `@solana/web3.js` connections.
- **Accessibility**: ARIA labels for statuses (e.g., "Payment pending"); focus management on mobile keyboards.

These hooks ensure Solvio remains lightweight, secure, and user-friendly for real-world Solana payments. For updates, reference `transactions.js` for any Solana RPC changes.
