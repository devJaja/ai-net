#!/usr/bin/env bash
# start-runner.sh — Start the autonomous task runner daemon
# Generates continuous on-chain volume for Track 1 (Most Revenue Generated)
#
# PREREQUISITES:
#   1. Register agents first: npm run register-agents
#   2. Fill in .env with real keys
set -euo pipefail

cd "$(dirname "$0")/../backend"

echo "=== AI-Net Task Runner ==="
echo "Starting autonomous task runner..."
echo "Interval: ${TASK_RUNNER_INTERVAL:-300000}ms (5 min default)"
echo "Budget: ${TASK_RUNNER_BUDGET:-0.05} ETH per task"
echo ""

# Ensure .env exists
if [ ! -f .env ]; then
  echo "ERROR: backend/.env not found. Copy .env.example and fill in your keys."
  exit 1
fi

npx ts-node src/taskRunner.ts --daemon
