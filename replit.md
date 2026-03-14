# Solvio — Solana Payment Hub

Mobile-first PWA for requesting SOL payments, splitting bills, and generating PDF receipts. All transactions on Solana Devnet. Frontend-only, no backend/database.

## Architecture

- **Framework**: Next.js 13.5.6 (App Router) with Babel (not SWC — required for Replit)
- **Styling**: Tailwind CSS with custom purple/teal theme
- **Wallet**: Phantom via `@solana/wallet-adapter-react`
- **Blockchain**: Solana Devnet
- **PDF**: jsPDF + jspdf-autotable (dynamic import)
- **QR Codes**: qrcode.react v3 (`QRCodeSVG`)
- **Storage**: browser localStorage (no backend)

## Key Notes

### Critical Configuration
- **MUST keep `.babelrc`** with `{"presets": ["next/babel"]}` — Next.js 14 SWC binary crashes with SIGBUS on Replit
- **Port**: 5000 (configured in `next.config.js` via dev command `next dev -p 5000`)
- **Webpack fallbacks** in `next.config.js`: `fs: false, net: false, tls: false, encoding: false, 'pino-pretty': false, 'supports-color': false` — required for Solana browser compatibility
- Non-critical build warnings from `supports-color`, `encoding`, `pino-pretty` are expected and benign

### Wallet Adapter Pattern
Use `wallet.sendTransaction(transaction, connection)` from `useWallet()` — not manual sign + sendRaw.

### QR Code
`QRCodeSVG` (named export) from `qrcode.react@3.x` — NOT the default export.

### PDF Generation
Always dynamic-import both jsPDF and jspdf-autotable together to avoid SSR errors.

## File Structure

```
app/
  page.tsx           → redirects to /request
  layout.tsx         → root layout with WalletProvider + BottomNav
  globals.css        → Tailwind + Inter font + wallet adapter overrides
  request/page.tsx   → Payment request + QR code + payment detection polling
  split/page.tsx     → Bill splitting with equal/custom amounts + retry
  receipts/page.tsx  → LocalStorage receipt viewer + PDF download + WhatsApp share
  settings/page.tsx  → Wallet disconnect, clear receipts, security info
  pay/page.tsx       → Payer landing page (from QR code scan)

components/
  BottomNav.tsx
  WalletConnectButton.tsx
  providers/WalletProvider.tsx

lib/
  transactions.ts    → sendSOLPayment, pollForIncomingPayment, generatePaymentUrl
  pdf.ts             → generateReceiptPDF (jsPDF + autotable)
  storage.ts         → getReceipts, saveReceipt, clearReceipts (localStorage)
  validators.ts      → validateSolanaAddress, validateAmount

types/index.ts       → Currency, TxStatus, Receipt, TransactionStatus types
public/
  manifest.json      → PWA manifest (SVG icons)
  favicon.svg        → App favicon
  icon-192.svg       → PWA icon
  icon-512.svg       → PWA icon
```

## Features

1. **Request Tab**: Enter amount (SOL/USDC) + note → generates QR code (260px purple) + shareable URL + polls for incoming payment → auto-PDF on detection
2. **Split Tab**: Add up to 10 participants, equal or custom amounts, sends simultaneous payments, retry failed txs, group PDF receipt
3. **Receipts Tab**: localStorage receipt list per wallet, expandable details, PDF download, WhatsApp share
4. **Settings Tab**: Wallet disconnect, Solscan link, clear receipts with confirmation, security info, About
5. **Pay Page** (`/pay?amount=X&currency=SOL&to=ADDRESS&note=...`): Payer landing page from QR scan, sends payment, PDF receipt

## Payment URL Format
`{origin}/pay?amount={number}&currency={SOL|USDC}&to={address}&note={string}`

## LocalStorage Key Format
`solvio_receipts_{walletAddress}` — max 50 receipts, newest-first

## Solana Config
- Network: Devnet
- RPC: `https://api.devnet.solana.com`
- USDC Mint (Devnet): `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr`
- Explorer: Solscan with `?cluster=devnet`

## Deployment
- Target: Autoscale
- Build: `npm run build`
- Run: `npm run start`
