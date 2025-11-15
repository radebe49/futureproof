# Quick Start - Passet Hub Deployment

## 🚀 5-Minute Setup

### 1. Install Wallet (2 min)

**Option A: MetaMask (Easiest)**
- Install from https://metamask.io/
- All accounts are Ethereum by default ✅

**Option B: Talisman**
- Install from https://talisman.xyz/
- Create **Ethereum account** (NOT Polkadot) ✅

### 2. Get Tokens (1 min)

1. Copy your address (starts with `0x`)
2. Visit https://faucet.polkadot.io/paseo
3. Request PAS tokens
4. Wait ~1 minute

### 3. Configure Environment (1 min)

```bash
# .env.local
NEXT_PUBLIC_CONTRACT_ADDRESS=0xeD0fDD2be363590800F86ec8562Dde951654668F
NEXT_PUBLIC_RPC_ENDPOINT=https://testnet-passet-hub-eth-rpc.polkadot.io
NEXT_PUBLIC_NETWORK=passet-hub
NEXT_PUBLIC_STORACHA_GATEWAY=storacha.link
```

### 4. Deploy Contract (1 min)

```bash
cd contract
npx hardhat run scripts/deploy.js --network passetHub
```

Copy the output address (0x...) to `.env.local`

### 5. Start App

```bash
npm run dev
```

Open http://localhost:3000

---

## ⚠️ Critical Rules

### Address Format

✅ **CORRECT:**
```
0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```
- Starts with `0x`
- 40 hex characters
- Ethereum format

❌ **WRONG:**
```
5E2jTHsQfRCq8wBPeHgwKQAeCMwSsxYCCZfB4dG2SWhp4ZTv
```
- Substrate format
- Will NOT work

### Wallet Setup

| Wallet | Account Type | Works? |
|--------|-------------|--------|
| MetaMask | Ethereum (default) | ✅ Yes |
| Talisman (ETH) | Ethereum | ✅ Yes |
| Talisman (DOT) | Substrate | ❌ No |

---

## 📚 Detailed Guides

- **Wallet Setup**: See `WALLET_SETUP_GUIDE.md`
- **Address Format**: See `ADDRESS_FORMAT_FIX.md`
- **Full Deployment**: See `contract/DEPLOYMENT_GUIDE.md`
- **Troubleshooting**: See `README.md`

---

## ✅ Verification Checklist

Before starting:
- [ ] Wallet installed (MetaMask or Talisman)
- [ ] Ethereum account created (address starts with 0x)
- [ ] PAS tokens received
- [ ] `.env.local` configured with 0x... address
- [ ] Contract deployed to Passet Hub

---

## 🆘 Quick Troubleshooting

### "Invalid address format"
→ Use Ethereum address (0x...), not Substrate (5...)

### "Cannot connect to network"
→ Check RPC: `https://testnet-passet-hub-eth-rpc.polkadot.io`

### "Insufficient balance"
→ Get tokens: https://faucet.polkadot.io/paseo

### "Contract not found"
→ Deploy contract first: `npx hardhat run scripts/deploy.js --network passetHub`

---

## 🎯 Success Criteria

You're ready when:
- ✅ Wallet connected
- ✅ Address shows 0x... format
- ✅ PAS balance visible
- ✅ Network shows "Passet Hub"
- ✅ No connection errors

---

**Need Help?** Check the detailed guides above or open an issue.
