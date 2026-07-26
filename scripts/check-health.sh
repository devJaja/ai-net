#!/usr/bin/env bash
# check-health.sh — Quick health check of all AI-Net services
set -euo pipefail

BACKEND_URL="${BACKEND_URL:-http://localhost:3000}"

echo "=== AI-Net Health Check ==="
echo ""

# Backend
echo -n "Backend: "
if curl -sf "${BACKEND_URL}/health" > /dev/null 2>&1; then
  echo "✓ running"
  curl -sf "${BACKEND_URL}/health" | python3 -m json.tool 2>/dev/null
else
  echo "✗ not reachable"
fi

echo ""

# x402
echo -n "x402 Server: "
if curl -sf "${BACKEND_URL}/x402/health" > /dev/null 2>&1; then
  echo "✓ running"
  curl -sf "${BACKEND_URL}/x402/health" | python3 -m json.tool 2>/dev/null
else
  echo "✗ not reachable"
fi

echo ""

# Runner stats
echo -n "Task Runner: "
if curl -sf "${BACKEND_URL}/runner/stats" > /dev/null 2>&1; then
  echo "✓ running"
  curl -sf "${BACKEND_URL}/runner/stats" | python3 -m json.tool 2>/dev/null
else
  echo "✗ not reachable"
fi

echo ""
echo "Done."
