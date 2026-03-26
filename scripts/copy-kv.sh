#!/bin/bash

# Usage: ./copy-kv.sh <namespace-id> [--confirm]
#
# This script copies all keys from a local Wrangler KV namespace
# to the remote KV namespace with the same ID.

set -e

NAMESPACE_ID=""
CONFIRM=false
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMP_FILE="$(cd "$SCRIPT_DIR/../data" && pwd)/copy-kv-temp.json"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --confirm)
      CONFIRM=true
      shift
      ;;
    *)
      if [[ -z "$NAMESPACE_ID" ]]; then
        NAMESPACE_ID="$1"
      else
        echo "Error: Unknown argument '$1'"
        exit 1
      fi
      shift
      ;;
  esac
done

# Validate namespace ID is provided
if [[ -z "$NAMESPACE_ID" ]]; then
  echo "Error: Namespace ID is required"
  echo "Usage: $0 <namespace-id> [--confirm]"
  exit 1
fi

echo "Fetching keys from local KV namespace: $NAMESPACE_ID"
echo ""

# Get all keys from local namespace
KEYS=$(pnpm wrangler kv key list --namespace-id="$NAMESPACE_ID" --local)

# Parse key names from JSON output
KEY_NAMES=$(echo "$KEYS" | jq -r '.[].name')

# Count keys
KEY_COUNT=$(echo "$KEY_NAMES" | grep -c . || echo "0")

if [[ "$KEY_COUNT" -eq 0 ]]; then
  echo "No keys found in local KV namespace."
  exit 0
fi

echo "Found $KEY_COUNT key(s) in local KV:"
echo "$KEY_NAMES"
echo ""

# Check for confirmation
if [[ "$CONFIRM" != true ]]; then
  echo "⚠️  Dry run mode - no keys will be copied."
  echo "Add --confirm flag to proceed with the copy operation."
  exit 0
fi

echo "Starting copy to remote KV namespace..."
echo ""

# Copy each key from local to remote
SUCCESS_COUNT=0
FAIL_COUNT=0

while IFS= read -r key; do
  if [[ -n "$key" ]]; then
    echo "Copying key: $key"
    
    # Read local value into a temp file to avoid shell argument size limits.
    if pnpm wrangler kv key get "$key" --namespace-id="$NAMESPACE_ID" --local > "$TEMP_FILE"; then
      # Put value to remote KV using file path.
      if pnpm wrangler kv key put "$key" --path "$TEMP_FILE" --namespace-id="$NAMESPACE_ID" --remote; then
        ((SUCCESS_COUNT++))
        echo "✓ Successfully copied: $key"
      else
        ((FAIL_COUNT++))
        echo "✗ Failed to copy: $key"
      fi
    else
      ((FAIL_COUNT++))
      echo "✗ Failed to read local key: $key"
    fi
    echo ""
  fi
done <<< "$KEY_NAMES"

rm -f "$TEMP_FILE"

echo "========================================="
echo "Copy operation complete!"
echo "Success: $SUCCESS_COUNT"
echo "Failed: $FAIL_COUNT"
echo "========================================="

if [[ $FAIL_COUNT -gt 0 ]]; then
  exit 1
fi
