# Solvio — Solana Payment Hub

## Overview
Solvio is a mobile-first Progressive Web App (PWA) built on the Solana blockchain. It enables seamless SOL and USDC payments without a backend — all logic is client-side.

## Architecture
- **Framework**: Next.js 13.5.6 (App Router) with Babel compilation (SWC disabled for Replit compatibility)
- **Language**: TypeScript with strict mode off for broader compatibility  
- **Styling**: TailwindCSS with custom purple (#7C3AED) and teal (#0D9488) theme
- **Blockchain**: Solana Devnet via `@solana/web3.js` and `@solana/wallet-adapter-react`
- **Wallet**: Phantom wallet only (MVP)
- **Storage**: localStorage keyed to wallet address
- **PDFs**: jsPDF for receipt generation
- **QR Codes**: qrcode.react

## Project Structure
```
app/
  layout.tsx          - Root layout with WalletProvider and BottomNav
  page.tsx            - Redirects to /request
  request/page.tsx    - Payment request generation with QR code
  split/page.tsx      - Bill splitting with multi-party payments
  receipts/page.tsx   - View and download past receipts
  settings/page.tsx   - Wallet settings and data management
  pay/page.tsx        - Payment fulfillment page (opened from QR/link)
components/
  providers/WalletProvider.tsx  - Solana wallet adapter setup
  BottomNav.tsx                 - Mobile bottom navigation
  WalletConnectButton.tsx       - Phantom wallet connect/disconnect button
lib/
  transactions.ts   - Solana transaction functions
  storage.ts        - localStorage helpers
  validators.ts     - Solana address and amount validation
  pdf.ts            - PDF receipt generation with jsPDF
types/
  index.ts          - TypeScript interfaces (Receipt, Participant, etc.)
public/
  manifest.json     - PWA manifest
```

## Key Configurations
- Port: 5000 (both dev and start scripts)
- Host: 0.0.0.0 (configured via Next.js)
- Babel: `.babelrc` forces Babel compilation (SWC crashes on Replit)
- Webpack fallbacks: fs, net, tls, encoding, pino-pretty, supports-color → false

## Running
```
npm run dev   # starts on port 5000
npm run build # production build
npm run start # production start on port 5000
```

## No Backend
This app is entirely client-side. All Solana interactions happen via public RPC nodes. No database, no server API routes.
