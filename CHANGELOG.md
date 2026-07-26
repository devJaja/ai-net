# Changelog

## [2.1.0] - 2026-07-14

### Added
- **Autonomous Task Runner**: Daemon that continuously creates tasks, hires agents, and generates tagged on-chain volume (Track 1). Configurable interval, budget, and jitter to avoid sybil patterns. Run via `npm run runner` or `scripts/start-runner.sh`
- **x402 Demo Script**: Bulk and daemon modes for generating Track 2 volume by calling x402 pay-per-call endpoints. Run via `npm run x402-demo`
- **Runner Stats Endpoint**: `GET /runner/stats` returns live task runner metrics (tasks run, tx count, uptime)
- **Automation Scripts**: `scripts/start-runner.sh`, `scripts/start-x402-demo.sh`, `scripts/register-erc8004.sh`, `scripts/check-health.sh`

### Fixed
- **RegisterAgentIdentity.s.sol**: Removed invalid viem (JavaScript) imports that prevented Foundry compilation. Script now compiles as pure Solidity
- **AINetIntegration.t.sol**: Fixed constructor mismatch — was passing 2 args in wrong order, now correctly passes 3 args: `(registry, permissions, coordinator)`
- **Exposed secrets in .env**: Redacted private key and API keys from `backend/.env`. **ACTION REQUIRED: Rotate all exposed keys immediately** (COORDINATOR_PRIVATE_KEY, VENICE_API_KEY, ONESHOT_API_KEY)
- **x402Demo.ts**: Fixed TypeScript strict mode type errors in JSON parsing

### Changed
- **Frontend dependencies**: Removed unused `@celo/rainbowkit-celo` and `@metamask/smart-accounts-kit` (never imported anywhere)
- **Backend package.json**: Added `runner`, `runner:once`, `x402-demo`, `x402-demo:once` scripts. Added `ts-node` dev dependency
- **.gitignore**: Changed `scripts/` exclusion to `scripts/*.sh.bak` so automation scripts are tracked

## [2.0.0] - 2026-07-13

### Added
- **ERC-8021 Attribution Tags**: All on-chain transactions now include the Celo Builders attribution tag (`celo_d0d52665012f`) for leaderboard tracking
- **x402 Pay-Per-Call Server**: 12 USDC micropayment endpoints for AI agent capabilities (Track 2)
- **ERC-8004 Agent Identity**: Registration module for on-chain agent identity via Celo's Identity Registry
- **OpenAPI Specification**: Full API documentation for x402 endpoints
- **Deployment Verification Script**: Shell script to verify contract deployments on Celo Mainnet
- **Integration Tests**: End-to-end Foundry tests for task lifecycle and ERC-7710 permissions

### Fixed
- **Attribution tag calldata override**: Fixed critical bug where `data: taggedData()` in `writeContract` replaced the ABI-encoded calldata instead of appending as suffix. Now uses `encodeFunctionData` + `appendAttributionTag` pattern
- **A2A transaction tagging**: Sub-agent wallet transactions (agent-to-agent hiring) now also include the attribution tag

### Changed
- **README**: Rewritten for hackathon judges with track alignment tables, architecture diagram, and volume generation strategy
- **Health endpoint**: Now returns attribution tag and x402 facilitator URL
- **Environment config**: Added `ATTRIBUTION_TAG`, `X402_FACILITATOR_URL`, `USDC_ADDRESS`, `X402_PORT` fields

## [1.0.0] - 2026-07-01

### Added
- Initial deployment of AgentRegistry, GuildPermissions, and TaskCoordinator on Celo Mainnet
- Venice AI integration for private LLM inference
- 1Shot Relayer for gasless agent transactions
- MiniPay Mini App for $0.001 per-question AI service
- 1,200+ tasks completed, 3,600+ on-chain transactions
