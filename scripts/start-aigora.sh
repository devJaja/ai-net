#!/usr/bin/env bash
# start-aigora.sh — Start the Aigora feedback daemon (Track 4)
# Discovers agents on Aigora and generates structured feedback
set -euo pipefail

cd "$(dirname "$0")/../backend"

echo "=== AI-Net Aigora (Track 4) ==="
echo "Starting aigora feedback daemon..."
echo ""

if [ ! -f .env ]; then
  echo "ERROR: backend/.env not found. Copy .env.example and fill in your keys."
  exit 1
fi

npx ts-node src/aigora.ts --daemon
