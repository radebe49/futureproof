#!/bin/bash

# Verification script to ensure all message-related localStorage has been removed

echo "🔍 Verifying localStorage cleanup..."
echo ""

# Check for MessageCache references
echo "1. Checking for MessageCache references..."
if grep -r "MessageCache" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules . 2>/dev/null; then
  echo "❌ FAIL: Found MessageCache references"
  exit 1
else
  echo "✅ PASS: No MessageCache references found"
fi

echo ""

# Check for message cache localStorage keys
echo "2. Checking for message cache localStorage keys..."
if grep -r "futureproof_messages" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules . 2>/dev/null; then
  echo "❌ FAIL: Found futureproof_messages localStorage usage"
  exit 1
else
  echo "✅ PASS: No futureproof_messages localStorage usage"
fi

echo ""

# Check for unlocked messages localStorage
echo "3. Checking for unlocked messages localStorage..."
if grep -r "futureproof_unlocked" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules . 2>/dev/null; then
  echo "❌ FAIL: Found futureproof_unlocked localStorage usage"
  exit 1
else
  echo "✅ PASS: No futureproof_unlocked localStorage usage"
fi

echo ""

# Check for old cache functions
echo "4. Checking for old cache functions..."
CACHE_FUNCTIONS=("getMessageCache" "saveMessageCache" "addSentMessage" "addReceivedMessage" "getUnlockedMessages" "markAsUnlocked")

for func in "${CACHE_FUNCTIONS[@]}"; do
  if grep -r "$func" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules . 2>/dev/null; then
    echo "❌ FAIL: Found $func function"
    exit 1
  fi
done
echo "✅ PASS: No old cache functions found"

echo ""

# Verify legitimate localStorage usage still exists
echo "5. Verifying legitimate localStorage usage..."
if ! grep -q "futureproof_storacha_auth" lib/storage/StorachaService.ts 2>/dev/null; then
  echo "⚠️  WARNING: Storacha auth localStorage not found (should exist)"
fi

echo ""
echo "✅ All checks passed! localStorage cleanup is complete."
echo ""
echo "Legitimate localStorage usage (should remain):"
echo "  - lib/storage/StorachaService.ts: futureproof_storacha_auth"
echo "  - lib/wallet/WalletProvider.tsx: Security cleanup only"
