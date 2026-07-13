#!/usr/bin/env bash
# verify-deployment.sh — Verify all AI-Net contracts are deployed and functional on Celo Mainnet
set -euo pipefail

RPC="https://forno.celo.org"
REGISTRY="0x052f70C756B079F7eADB8b72C7Ea1579215090C8"
PERMISSIONS="0x190091c0B717AD7fA34A3840A16A8753444D8b2C"
COORDINATOR="0x2097796487bea53b00D1e6e2D3327D30bEf08E3E"
USDC="0xcebA9300f2b948710d2653dD7B07f33A8B32118C"

echo "=== AI-Net Deployment Verification ==="
echo ""

for name_addr in "AgentRegistry:$REGISTRY" "GuildPermissions:$PERMISSIONS" "TaskCoordinator:$COORDINATOR" "USDC:$USDC"; do
  name="${name_addr%%:*}"
  addr="${name_addr##*:}"
  code=$(cast code "$addr" --rpc-url "$RPC" 2>/dev/null || echo "0x")
  if [ "$code" = "0x" ] || [ -z "$code" ]; then
    echo "✗ $name ($addr) — NO CODE"
  else
    echo "✓ $name ($addr) — deployed"
  fi
done

echo ""
echo "=== Agent Registry ==="
total=$(cast call "$REGISTRY" "totalAgents()(uint256)" --rpc-url "$RPC" 2>/dev/null || echo "?")
echo "  Total agents: $total"

echo ""
echo "=== Chain ==="
chainId=$(cast chain-id --rpc-url "$RPC" 2>/dev/null || echo "?")
echo "  Chain ID: $chainId"
blockNumber=$(cast block-number --rpc-url "$RPC" 2>/dev/null || echo "?")
echo "  Block: $blockNumber"

echo ""
echo "=== Attribution ==="
echo "  Tag: celo_d0d52665012f"

echo ""
echo "Done."
