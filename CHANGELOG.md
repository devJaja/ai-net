# Changelog

## 2026-07-04 — Chain Switch, Error Handling & Polish

- **feat**: `lib/chain.ts` — `switchToCelo()` utility; auto-adds Celo to wallet if needed
- **fix**: Chain mismatch error — `switchToCelo()` called before every transaction
  in `use-wallet`, `/mini`, `task-creator`, and `register` page
- **fix**: `chainChanged` event listener in `use-wallet` — resets walletClient on
  network switch so next tx always triggers chain check
- **feat**: `lib/errors.ts` — `parseError()` maps raw RPC/viem errors to plain English
  - user rejected, insufficient funds, wrong network, timeout, contract reverts
  - truncates unknown errors at 120 chars
- **fix**: `WalletConnect` — shows `connectError` inline with AlertCircle icon
  (replaces `alert()`)
- **fix**: Payments page — `celoscan.io` mainnet links (was alfajores testnet)
- **fix**: Payments page — amounts show `0.0008 CELO` and `0.001 cUSD` (not ETH)
- **fix**: Dashboard — "Your Spend" stat shows `$X.XXX cUSD` (not CELO)
- **fix**: `use-chain-agents` — silent error handling on registry fetch failure

## 2026-07-03 — MiniPay Mini App

- **feat**: `/mini` route — consumer-grade MiniPay entry point
  - Pay-per-question UI: $0.001 cUSD per question, no subscription
  - Example prompts for emerging market users (East Africa, Ghana, DeFi)
  - Step-by-step progress indicator through agent pipeline
  - Collapsible result sections; report expanded by default
  - "Ask another question" reset flow
- **feat**: `manifest.json` — MiniPay web app manifest
  - `start_url: /mini`, `display: standalone`
  - Correct icons (192×192, 512×512), theme/background color
- **feat**: Public assets — `logo.png` (500×500) and `og-image.png` (1200×630)
- **feat**: Celo fee abstraction — gas paid in cUSD on `createTask` tx
  - Users don't need a CELO balance for gas inside MiniPay
- **feat**: Auto-redirect — MiniPay users sent to `/mini` on any page load
- **feat**: Flash suppression — `detected` flag prevents desktop shell rendering
  before MiniPay detection completes
- **fix**: `useMiniPay` hook — use `eth_requestAccounts` per official MiniPay docs
  (was incorrectly using `walletClient.getAddresses()`)
- **fix**: SSR guard — `typeof window === 'undefined'` check in hook and connect()
- **fix**: `MiniPayBanner` — hidden on `/mini`, removed duplicate connect button,
  added error guard on `readContract`
- **fix**: `handleSubmit` stale closure — `isMiniPay` added to `useCallback` deps
- **fix**: cUSD payment path — was trying to use ERC-20 transfer to trigger
  `createTask`; contract requires `msg.value > 0` (native CELO)
- **docs**: README rewritten with consumer-facing tagline and MiniPay section
- **chore**: `NEXT_PUBLIC_APP_URL` added to `.env.example`

## 2026-06-21
- MiniPay banner component for mobile-first UX
- Published `@ai-net/sdk` package with contract ABIs and MiniPay utilities
- 949+ tasks completed on Celo mainnet (2,847+ transactions)
- Optimized bulk transaction script with retry logic and minimum gas pricing

## 2026-06-12
- Full MiniPay wallet integration: detection, connect, transaction signing
- Deployed all 3 contracts to Celo mainnet (chain 42220)
- Registered 5 agents on-chain
- Updated all chain configs from Base → Celo

## 2026-06-11
- Renamed project GuildNet → AI-Net
- Migrated from Base → Celo blockchain
- Initial deployment to Celo Alfajores testnet
- Added `@celo/rainbowkit-celo` dependency

## 2026-06-09
- Initial commit: AgentRegistry, GuildPermissions, TaskCoordinator contracts
- 17/17 tests passing
- Frontend with Next.js, Privy wallet, task creator UI
- Backend coordinator with Venice AI integration

## 2026-06-22
- Redesigned homepage with 6-feature grid and stats bar
- Added 8 reusable UI components (Spinner, Badge, Alert, Address, etc.)
- Added 6 utility hooks (useCopy, useDebounce, useLocalStorage, etc.)
- 50+ new CSS utility classes for consistent design system
- Improved dashboard stat cards with colored borders
- SEO: Added OpenGraph, Twitter cards, meta keywords

## [1.2.0] - 2026-07-26

### Added
- On-chain task history scanning via TaskCoordinator event logs
- Real-time task stats from blockchain (total tasks, TVL, active agents)
- AgentHired event tracking for per-agent payment history
- TaskCompleted event tracking with refund amounts
- Block timestamp resolution for event chronological ordering
