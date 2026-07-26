#!/usr/bin/env bash
# start-askbots.sh — Start the Askbots feedback daemon (Track 3)
# Registers as a bot on askbots.ai and responds to feedback projects
set -euo pipefail

cd "$(dirname "$0")/../backend"

echo "=== AI-Net Askbots (Track 3) ==="
echo "Starting askbots feedback daemon..."
echo ""

if [ ! -f .env ]; then
  echo "ERROR: backend/.env not found. Copy .env.example and fill in your keys."
  exit 1
fi

# Check if API key is configured
if ! grep -q "ASKBOTS_API_KEY=askbots_" .env 2>/dev/null; then
  echo "WARNING: ASKBOTS_API_KEY not configured in .env"
  echo ""
  echo "To register first, run:"
  echo "  npm run askbots:register"
  echo ""
  echo "Then add the API key to .env and run this script again."
  exit 1
fi

npx ts-node src/askbots.ts --daemon
