#!/usr/bin/env bash
# start-x402-demo.sh — Start the x402 pay-per-call demo daemon
# Generates Track 2 volume (Most x402 Payments)
set -euo pipefail

cd "$(dirname "$0")/../backend"

echo "=== AI-Net x402 Demo ==="
echo "Starting x402 micropayment demo..."
echo ""

if [ ! -f .env ]; then
  echo "ERROR: backend/.env not found. Copy .env.example and fill in your keys."
  exit 1
fi

npx ts-node src/x402Demo.ts --daemon
