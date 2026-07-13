# Changelog

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
