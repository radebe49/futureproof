#!/bin/bash

# Script to rename all references from "futureproof" to "lockdrop"
# Run this AFTER renaming the repository on GitHub

set -e  # Exit on error

echo "🔄 Renaming futureproof to lockdrop..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to update file
update_file() {
    local file=$1
    if [ -f "$file" ]; then
        echo -e "${BLUE}Updating:${NC} $file"
        # Case-insensitive replacement for various forms
        sed -i '' 's/futureproof-app/lockdrop-app/g' "$file"
        sed -i '' 's/FutureProof/Lockdrop/g' "$file"
        sed -i '' 's/futureproof/lockdrop/g' "$file"
    fi
}

echo "📦 Updating package files..."
update_file "package.json"
update_file "package-lock.json"

echo ""
echo "📄 Updating documentation..."
update_file "CHANGELOG.md"
update_file "CONTRIBUTING.md"
update_file "LICENSE"
update_file "WALLET_SETUP_GUIDE.md"
update_file "WALLET_TROUBLESHOOTING.md"
update_file "CI_CD_GUIDE.md"
update_file "POLKADOT_ECOSYSTEM_EXPLAINED.md"

echo ""
echo "📋 Updating GitHub files..."
update_file ".github/QUICK_START.md"
update_file ".github/DEPLOYMENT_CHECKLIST.md"
update_file ".github/TIMEOUT_IMPLEMENTATION_CHECKLIST.md"
update_file ".github/workflows/README.md"
update_file ".github/workflows/ci.yml"
update_file ".github/ISSUE_TEMPLATE/bug_report.md"

echo ""
echo "📚 Updating docs..."
update_file "docs/user-guide.md"
update_file "docs/developer-guide.md"
update_file "docs/RPC_ENDPOINTS.md"
update_file "docs/CODE_DEBT_ANALYSIS.md"
update_file "docs/TIMEOUT_ARCHITECTURE.md"

echo ""
echo "🔧 Updating utility files..."
update_file "utils/edgeCaseValidation.ts"
update_file "utils/errorHandling.ts"

echo ""
echo "📖 Updating README files..."
update_file "lib/message/README.md"
update_file "lib/redeem/README.md"

echo ""
echo "📝 Updating spec files..."
update_file ".kiro/specs/lockdrop-app/requirements.md"

echo ""
echo "🔗 Updating git remote..."
CURRENT_REMOTE=$(git remote get-url origin)
if [[ $CURRENT_REMOTE == *"futureproof"* ]]; then
    NEW_REMOTE=$(echo $CURRENT_REMOTE | sed 's/futureproof/lockdrop/g')
    git remote set-url origin "$NEW_REMOTE"
    echo -e "${GREEN}✓${NC} Updated git remote from:"
    echo "  $CURRENT_REMOTE"
    echo "  to:"
    echo "  $NEW_REMOTE"
else
    echo "⚠️  Remote URL doesn't contain 'futureproof', skipping..."
fi

echo ""
echo -e "${GREEN}✅ Rename complete!${NC}"
echo ""
echo "📋 Summary of changes:"
echo "  • Package name: lockdrop-app"
echo "  • App name: Lockdrop"
echo "  • Git remote: updated to lockdrop repository"
echo ""
echo "Next steps:"
echo "  1. Review changes: git status"
echo "  2. Test the app: npm run dev"
echo "  3. Commit changes: git add -A && git commit -m 'refactor: rename from futureproof to lockdrop'"
echo "  4. Push to GitHub: git push origin main"
echo ""
