# Address Format Fix - Passet Hub EVM Compatibility

## The Problem

**Passet Hub uses pallet-revive (PolkaVM) which accepts Ethereum-format addresses (0x...)**

Your current configuration is mixing:
- ❌ Substrate SS58 addresses (5...) - Wrong for Passet Hub
- ❌ Shibuya network configuration - Wrong network
- ❌ Conflicting documentation about address formats

## The Solution

Passet Hub via pallet-revive uses **Ethereum-compatible addresses**:
- ✅ Format: `0x` followed by 40 hexadecimal characters
- ✅ Example: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`
- ✅ Compatible with MetaMask
- ✅ Compatible with Talisman (Ethereum accounts)

## What Needs to Change

### 1. Environment Configuration

**Current (.env.local):**
```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=5E2jTHsQfRCq8wBPeHgwKQAeCMwSsxYCCZfB4dG2SWhp4ZTv  # ❌ Wrong format
NEXT_PUBLIC_RPC_ENDPOINT=wss://rpc.shibuya.astar.network  # ❌ Wrong network
NEXT_PUBLIC_NETWORK=shibuya  # ❌ Wrong network
```

**Should be:**
```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourContractAddressHere  # ✅ Ethereum format
NEXT_PUBLIC_RPC_ENDPOINT=wss://testnet-passet-hub.polkadot.io  # ✅ Passet Hub
NEXT_PUBLIC_NETWORK=passet-hub  # ✅ Correct network
```

### 2. Wallet Configuration

**Supported Wallets:**
- ✅ **MetaMask** - Native Ethereum wallet (recommended for Passet Hub)
- ✅ **Talisman** - Use Ethereum account type (not Polkadot account)

**Important:** Users must use Ethereum-compatible accounts, not Substrate accounts.

### 3. Contract Deployment

When deploying with Hardhat:
```bash
npx hardhat run scripts/deploy.js --network passetHub
```

This will output an Ethereum address like: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`

## Address Format Reference

| Network | Address Format | Example | Wallet |
|---------|---------------|---------|--------|
| Passet Hub (pallet-revive) | Ethereum (0x...) | `0x742d35Cc...` | MetaMask, Talisman (ETH) |
| Shibuya (pallet-contracts) | Substrate (5...) | `5E2jTHsQ...` | Talisman (Polkadot) |
| Westend (relay chain) | Substrate (5...) | `5GrwvaEF...` | Talisman (Polkadot) |

## User Guidance

### For MetaMask Users
1. Install MetaMask
2. Add Passet Hub network manually:
   - Network Name: Passet Hub Testnet
   - RPC URL: `wss://testnet-passet-hub.polkadot.io`
   - Chain ID: (to be determined)
   - Currency Symbol: PAS
3. Get PAS tokens from faucet
4. Your address will be in 0x... format

### For Talisman Users
1. Install Talisman
2. Create an **Ethereum account** (not Polkadot account)
3. Switch to Passet Hub network
4. Your Ethereum account address will be in 0x... format

## Code Changes Needed

### ContractService.ts
Ensure it handles Ethereum addresses:
```typescript
// Validate Ethereum address format
if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
  throw new Error("Invalid Ethereum address format");
}
```

### WalletProvider.tsx
Support both wallet types but use Ethereum accounts:
```typescript
// For Talisman: filter to Ethereum accounts only
const ethereumAccounts = accounts.filter(acc => acc.type === 'ethereum');

// For MetaMask: all accounts are Ethereum by default
```

## Testing Checklist

- [ ] Update .env.local with Ethereum address format
- [ ] Deploy contract to Passet Hub (get 0x... address)
- [ ] Test with MetaMask wallet
- [ ] Test with Talisman (Ethereum account)
- [ ] Verify address validation accepts 0x... format
- [ ] Verify address validation rejects 5... format
- [ ] Update all documentation with correct format

## Quick Fix Commands

```bash
# 1. Update environment
cat > .env.local << 'EOF'
# Passet Hub Testnet Configuration
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourContractAddressHere
NEXT_PUBLIC_RPC_ENDPOINT=wss://testnet-passet-hub.polkadot.io
NEXT_PUBLIC_NETWORK=passet-hub
NEXT_PUBLIC_STORACHA_GATEWAY=storacha.link
EOF

# 2. Deploy contract (if not already deployed)
cd contract
npx hardhat run scripts/deploy.js --network passetHub

# 3. Copy the output address (0x...) to .env.local

# 4. Restart dev server
npm run dev
```

## Documentation Updates Needed

1. **README.md** - Clarify Ethereum address format
2. **.env.example** - Update with Ethereum address example
3. **contract/DEPLOYMENT_GUIDE.md** - Emphasize Ethereum addresses
4. **docs/user-guide.md** - Add wallet setup for Ethereum accounts

---

**Status**: Ready to implement
**Priority**: HIGH - Blocks all functionality
**Estimated Time**: 30 minutes
