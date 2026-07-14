#!/usr/bin/env bash
# register-erc8004.sh — Register the AI-Net coordinator on ERC-8004 Identity Registry
# Required for hackathon submission (mandatory X post must include 8004scan link)
set -euo pipefail

cd "$(dirname "$0")/../backend"

echo "=== ERC-8004 Agent Identity Registration ==="
echo ""

if [ ! -f .env ]; then
  echo "ERROR: backend/.env not found. Copy .env.example and fill in your keys."
  exit 1
fi

# Check if server is running
if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
  echo "Server is running — using API endpoint..."
  RESULT=$(curl -sf -X POST http://localhost:3000/erc8004/register)
  echo "$RESULT" | python3 -m json.tool 2>/dev/null || echo "$RESULT"
else
  echo "Server not running. Start it first with: cd backend && npm run dev"
  echo "Then run this script again."
  exit 1
fi
