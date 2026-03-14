# Solvio: Product Requirements Document (PRD)

## Document Information
- **Version**: 1.0
- **Date**: [Insert Current Date]
- **Author**: Product Manager Agent
- **Project Title**: Solvio: Solana Payment Hub for Real-World Use
- **Unique Identifier**: 1773487698756_solvio__solana_payment_hub_for_real_world_use__docs_PRD_md_viab6
- **Status**: Draft for MVP Implementation
- **Approval**: Pending review by development team

## 1. Executive Summary
Solvio is a mobile-first Progressive Web App (PWA) built on the Solana blockchain, designed to simplify everyday crypto payments for non-technical users. By leveraging the Phantom wallet for seamless authentication and transaction signing, Solvio eliminates the need for traditional logins, backends, or databases. All user data, such as receipts, is stored locally in the browser's localStorage, tied to the user's wallet address, ensuring device-persistent sessions without cross-device synchronization for the Minimum Viable Product (MVP).

The app targets practical, real-world scenarios like freelancers sending invoices, small merchants accepting payments at markets, or friends splitting restaurant bills. Core functionalities focus on generating shareable payment requests with QR codes, multi-party bill splitting with real-time status tracking, and local receipt management. Built with React for optimal mobile performance (targeting 390px+ screen widths), Solvio features a clean, fintech-inspired UI in purple (#7C3AED) and teal (#0D9488) colors, reminiscent of Revolut or Venmo. Deployment on Vercel ensures easy accessibility and installability on mobile home screens.

This PRD outlines user stories, functional and non-functional requirements, and technical specifications to guide FrontendDev and BackendDev (noting that MVP requires no backend components). The modular architecture prepares for future enhancements, such as an Android wrapper using Pollinet SDK for offline peer-to-peer relaying.

**Key Success Metrics for MVP**:
- User Adoption: 80% of beta testers complete a payment request or split in under 2 minutes.
- Error Rate: Less than 5% transaction failures due to invalid inputs (address validation).
- Engagement: 70% of users install the PWA on their home screen post-first use.

## 2. Target Audience and User Personas
### Target Audience
- **Primary Users**: Freelancers (e.g., graphic designers invoicing clients via SOL/USDC), small merchants (e.g., market vendors accepting quick payments), casual groups (e.g., friends splitting bills at events), and everyday crypto enthusiasts seeking frictionless Solana transactions on mobile devices.
- **Demographics**: Tech-savvy but non-expert users aged 18-45, primarily on iOS/Android mobiles, familiar with Phantom wallet but not advanced blockchain tools.
- **Pain Points Addressed**:
  - Complex wallet interfaces for simple sends/requests.
  - Lack of shareable, user-friendly payment links without centralized apps.
  - Tedious manual splitting of group expenses in crypto.
  - No easy way to generate and store receipts without cloud dependency.
- **User Goals**:
  - Send/receive payments in seconds via QR or link.
  - Split bills equitably without repeated transactions.
  - Access past receipts offline on the same device.

### User Personas
1. **Freelancer Alex** (28, Graphic Designer): Uses Solvio to generate invoice links for clients. Needs quick QR sharing via WhatsApp and PDF receipts for records. Values one-tap Phantom integration to avoid copy-pasting addresses.
2. **Merchant Mia** (35, Street Vendor): Accepts USDC payments at markets. Relies on large QR codes for customers' phones and local receipt storage for daily tallies, without internet for every transaction.
3. **Group User Jordan** (24, Student): Splits dinner bills with friends. Enters nicknames and addresses once, taps "Send All," and tracks statuses live. Appreciates failure retries without affecting successful payments.

## 3. User Stories
User stories are prioritized for MVP (M = Must-Have, S = Should-Have, C = Could-Have). They derive from the original idea and user intent, focusing on client-side Solana interactions.

### Epic 1: Wallet Connection and Authentication (M)
- As a first-time user, I want to connect my Phantom wallet with one tap so that the app auto-fills my address and serves as my identity without passwords.
- As a returning user, I want the connection to persist across sessions on the same device (via localStorage) so I don't reconnect every time.
- As any user, I want a disconnect option in Settings so I can switch wallets securely.

### Epic 2: Payment Request Generation (M)
- As a receiver, I want to enter an amount in SOL or USDC with an optional note so that I can create a personalized request.
- As a receiver, I want my connected wallet address auto-filled so I avoid manual entry errors.
- As a receiver, I want a shareable URL and large QR code generated so payers can scan or click to auto-open Phantom for one-tap payment confirmation.
- As a receiver, post-payment, I want an auto-generated PDF receipt (downloadable) including date, amount, currency, sender/receiver addresses, transaction ID (hyperlinked to solscan.io), and note so I have a verifiable record.
- As a payer, when opening the request link/QR, I want Phantom to launch automatically so payment is seamless without extra steps.

### Epic 3: Bill Splitting (M)
- As a splitter, I want to input a total amount in SOL or USDC, a description, and a list of participants (nicknames + Phantom wallet addresses) so I can organize group payments.
- As a splitter, I want to toggle between equal splits or custom amounts per person so flexibility matches the scenario.
- As a splitter, I want address validation before sending (highlight invalid fields in red with error messages like "Invalid Solana address") so errors are caught early.
- As a splitter, upon tapping "Send All Payments," I want addresses locked and simultaneous transactions initiated with live per-person statuses (Pending → Confirmed → Failed) so I track progress in real-time.
- As a splitter, if a transaction fails, I want it marked in red with a "Retry" button for that person only, without affecting confirmed ones, so partial successes are handled gracefully.
- As a splitter, post-split, I want a comprehensive PDF receipt for the entire group (via jsPDF) including all details per person so everyone has a shared record.
- As a splitter, I want a partial success summary (e.g., "3/5 Confirmed, 1 Failed, 1 Pending") so outcomes are clear without rollbacks.

### Epic 4: Receipts Management (M)
- As any user, I want a Receipts tab listing all past transactions from the current session (stored in localStorage tied to wallet address) so I can review history on the same device across sessions.
- As any user, for each receipt, I want a "Download PDF" button (regenerating via jsPDF with full details) and a "Share via WhatsApp" button so I can distribute easily.
- As any user, I want receipts to persist only on the device (no cross-device sync) so privacy is maintained without cloud risks.

### Epic 5: Navigation and Settings (S)
- As any user, I want bottom tab navigation (Request, Split, Receipts, Settings) optimized for mobile thumbs so the app feels intuitive.
- As any user, in Settings, I want basic options like wallet reconnect/disconnect and currency preference toggle (SOL/USDC default) so I customize minimally.
- As any user, I want the app installable on home screen with a prompt after first use so it behaves like a native app.

### Epic 6: Error Handling and Edge Cases (M)
- As any user, if a wallet is not connected, I want a prominent prompt to connect Phantom so flows don't break.
- As a splitter, if all addresses are invalid, I want the "Send All" button disabled until fixed so accidental sends are prevented.
- As any user, during transactions, I want offline warnings (e.g., "No internet: Transactions will queue if Pollinet integrated later") so expectations are set.

## 4. Functional Requirements
### 4.1 Core Flows
- **Wallet Integration**: Use `@solana/wallet-adapter-react` for connection. Auto-detect Phantom; fallback to manual connect. Store public address in localStorage for session persistence.
- **Currency Support**: SOL and USDC only. Input fields with dropdown selector; convert amounts if needed (e.g., via Solana RPC for USDC decimals).
- **Payment Request**:
  - Form: Amount (numeric input, validated >0), Currency (SOL/USDC), Note (textarea, optional).
  - Output: URL like `https://solvio.app/request?to=<address>&amount=<amt>&currency=<SOL/USDC>&note=<encoded>`. QR code (300x300px min, via `qrcode.react`).
  - Post-Payment Detection: Poll Solana RPC (via `web3.js`) for transaction confirmation; trigger PDF on success.
- **Bill Split**:
  - Form: Total Amount, Description, Dynamic list (add/remove participants: nickname text, address input with validation regex `^[1-9A-HJ-NP-Za-km-z]{32,44}$`).
  - Split Logic: Equal = total / n; Custom = sum of inputs must == total (validate).
  - Transaction Batch: Use `@solana/web3.js` to prepare/sign/send multiple transfers in parallel. Status via Promise.allSettled; update UI with callbacks.
  - Locking: Disable form edits on "Send All" tap until all resolved.
- **Receipts**:
  - Storage: JSON array in localStorage, key: `solvio_receipts_<walletAddress>`. Each entry: {id: timestamp, type: 'request'|'split', details: {...}, txId: string}.
  - PDF Generation: jsPDF with custom layout – header with Solvio logo (purple/teal), table for details, Solscan link as clickable text.
  - Sharing: Use Web Share API for WhatsApp; fallback to URL copy.

### 4.2 Integrations
- **Solana Blockchain**: All tx via public RPC (e.g., mainnet-beta). USDC mint: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v.
- **External Links**: Solscan.io for tx details (e.g., `https://solscan.io/tx/<txId>`).
- **No External APIs**: Pure client-side; future Pollinet hook via status callbacks in transaction functions.

## 5. Non-Functional Requirements
### 5.1 Performance
- Load Time: <3s on 3G for mobile (code-split React routes).
- Transaction Speed: Leverage Solana's <1s confirmations; UI updates in <500ms.
- Storage: Limit localStorage to 5MB (receipts); auto-prune oldest if exceeded.

### 5.2 Usability and Accessibility
- Mobile-First: Responsive design for 390px+; touch-friendly buttons (>44px).
- Color Scheme: Primary: Purple (#7C3AED), Secondary: Teal (#0D9488), Neutral: White/Gray.
- Accessibility: ARIA labels for tabs/QR; high contrast (WCAG 2.1 AA); screen reader support for forms/statuses.
- Offline Support: PWA manifest for installation; cache assets via service worker; queue tx if offline (prep for Pollinet).

### 5.3 Security and Compliance
- No Private Keys: All signing in Phantom; app handles only public addresses and tx prep.
- Data Privacy: Zero personal data collected; localStorage optional (user can clear). GDPR N/A for MVP.
- Validation: Sanitize inputs; prevent XSS in notes (escape HTML).
- Network: Use HTTPS only; CORS for Vercel domain.

### 5.4 Scalability and Maintainability
- Modularity: Solana logic in `transactions.js` – exports like `sendPayment(to, amount, currency, callback)` with interceptable RPC calls (e.g., `if (window.pollinet) { useRelay() }`).
- Testing: Unit tests for tx functions; E2E for flows (Cypress).
- Internationalization: English only for MVP; currency symbols (SOL, USDC).

## 6. Technical Specifications
### 6.1 Stack Alignment
- **Frontend**: React (with Next.js App Router for PWA routing), TypeScript, TailwindCSS for styling, `@solana/wallet-adapter-react`, `@solana/web3.js`, `qrcode.react`, `jsPDF`.
- **No Backend**: Client-side only; no Node.js/Express, PostgreSQL, or Prisma for MVP. (Future: Optional for analytics if needed.)
- **Deployment**: Vercel (static hosting + serverless if edge functions added later). PWA manifest.json, service worker for offline.
- **Dev Tools**: ESLint/Prettier, Vite for build (if not Next.js), Git for version control.

### 6.2 Architecture Overview
- **Components**: 
  - `WalletProvider`: Wraps app for adapter.
  - `RequestTab`: Form + QR generator.
  - `SplitTab`: Dynamic form + batch tx handler.
  - `ReceiptsTab`: localStorage reader + PDF/Share UI.
  - `SettingsTab`: Wallet controls.
- **Data Flow**: UI → transactions.js → Phantom signing → Solana RPC → Callback to UI for status/PDF.
- **Future-Proofing**: Expose tx callbacks for Pollinet SDK integration (e.g., replace `connection.sendTransaction` with relay).

### 6.3 Dependencies
- npm: `@solana/web3.js@^1.87`, `@solana/wallet-adapter-react@^0.15`, `qrcode.react@^3.1`, `jspdf@^2.5`, `next@^14` (if using), `tailwindcss@^3.4`.
- No Blockchain-Specific Backend: Aligns with DApp platform; ChainGPT for any future smart contracts (none for MVP).

## 7. Assumptions and Dependencies
- **Assumptions**: Users have Phantom installed; Solana mainnet stable; localStorage available (no incognito restrictions).
- **Dependencies**: Phantom wallet extension/app; Internet for tx (offline prep only).
- **Risks**: RPC rate limits (mitigate with user-friendly errors); Wallet adoption (focus on Phantom only).
- **Out of Scope for MVP**: Fiat on-ramps, other tokens, cross-device sync, advanced analytics, i18n, native Android (wrapper later).

## 8. Next Steps
- **Coordination**: Share this PRD with FrontendDev for UI/UX implementation and BackendDev for confirmation of no-backend scope (focus on modularity).
- **Milestones**: Wireframes (Week 1), Core Features (Week 2-3), Testing/Deploy (Week 4).
- **Budget Allocation**: 70,000 $SCRIPT for development (as per payment spec).
- **Feedback Loop**: Schedule sprint reviews to refine based on prototypes.

This PRD serves as the single source of truth for Solvio's MVP. Updates will be versioned upon feature additions.