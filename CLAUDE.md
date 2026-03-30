# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Dev server on port 5000
npm run build    # Production build
npm run start    # Production server on port 5000
npm run lint     # ESLint via next lint
```

No test framework is configured.

## Critical Configuration

**Do not switch to SWC.** The project uses Babel (`.babelrc`) instead of Next.js's default SWC compiler because SWC crashes with SIGBUS on Replit. The `.babelrc` must remain as-is.

**Webpack fallbacks** in `next.config.js` are required for Solana libraries to work in the browser (`fs`, `net`, `tls` all set to false; `buffer` polyfilled).

**Port is hardcoded to 5000** in both `dev` and `start` scripts.

## Architecture

Solvio is a **frontend-only PWA** — no backend, no database. All persistence is via `localStorage`.

### Provider Hierarchy (app/layout.tsx)
```
WalletAddressProvider (global address context)
  └─ SolvioWalletProvider (Phantom/Solflare wallet adapter)
     └─ AppShell (conditionally renders header + bottom nav)
        └─ {children}
```

`AppShell` suppresses the header and bottom nav on the landing page (`/`) and the payer page (`/pay`).

### Transaction Flow
```
UI page → lib/transactions.ts → @solana/web3.js → Phantom (signing) → Solana Devnet RPC
                                                                              ↓
                                                        lib/storage.ts (localStorage) ← lib/pdf.ts (jsPDF)
```

- SOL transfers: system program transfer instruction
- USDC transfers: SPL token transfer via `@solana/spl-token`
- USDC mint on devnet: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
- Incoming payment detection: polling via `pollForIncomingPayment` in `lib/transactions.ts`

### localStorage Schema
- Key: `solvio_receipts_{walletAddress}`
- Max 50 receipts per wallet
- Contacts also stored in localStorage

### Pages & Routes
| Route | Purpose |
|-------|---------|
| `/` | Marketing landing page (no app chrome) |
| `/request` | Create payment request → shareable URL + QR code |
| `/pay` | Payer lands here via shared link (`?amount=&currency=&to=&note=`) |
| `/split` | Bill splitting — sends parallel transactions, tracks per-person status |
| `/receipts` | View/download stored receipts |
| `/contacts` | Nickname-to-address book |
| `/settings` | Disconnect wallet, clear receipts, preferences |

### Key Implementation Notes

- **QR codes**: Use `QRCodeSVG` named export from `qrcode.react@3.x` (not default export)
- **PDF generation**: Must use dynamic imports for both `jspdf` and `jspdf-autotable` to avoid SSR issues
- **Split payments**: Sent via `Promise.allSettled` (parallel), with per-participant retry on failure
- **Address validation**: Regex `^[1-9A-HJ-NP-Za-km-z]{32,44}$` in `lib/validators.ts`
- **SNS resolution**: `lib/sns.ts` resolves `.sol` domain names to addresses via `@bonfida/spl-name-service`
- **Styling**: Tailwind with custom purple (`primary-500: #7C3AED`) and teal (`secondary-500: #0D9488`) palettes; mobile-first at 390px, max content width `max-w-lg`

### Environment Variables (set in next.config.js)
```
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
NEXT_PUBLIC_MAGIC_API_KEY=pk_test_demo
```
