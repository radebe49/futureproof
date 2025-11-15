# Passet Hub RPC Endpoint Discovery Summary

## Problem

The contract was deployed to Passet Hub using `forge create`, but the contract address was not saved. Additionally, the commonly documented RPC endpoint (`wss://testnet-passet-hub.polkadot.io`) did not support Ethereum JSON-RPC methods needed to query transaction history and recover the contract address.

## Discovery Process

### 1. Initial Attempts (Failed)

Tried using the WebSocket Substrate RPC endpoint:
```bash
cast nonce 0xAddress --rpc-url wss://testnet-passet-hub.polkadot.io
# Error: Method not found (-32601)
```

The Substrate RPC endpoint does not support Ethereum JSON-RPC methods like:
- `eth_getTransactionCount`
- `eth_call`
- `eth_sendTransaction`
- etc.

### 2. Research

Used Tavily MCP to search for Ethereum-compatible RPC endpoints for Passet Hub. Found reference on [Polkadot.FYI](https://polkadot.fyi/about) mentioning:

**Ethereum RPC URL:** `https://testnet-passet-hub-eth-rpc.polkadot.io`

### 3. Verification

Tested the Ethereum RPC endpoint:
```bash
curl -X POST https://testnet-passet-hub-eth-rpc.polkadot.io \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Success! Returns: {"jsonrpc":"2.0","id":1,"result":"0x212a5b"}
```

### 4. Contract Address Recovery

With the working Ethereum RPC endpoint, recovered the contract address:

```bash
# Step 1: Get deployer address from private key
cast wallet address --private-key $PRIVATE_KEY
# Result: 0x0A58494CD644f38219c388c032B5BfF62CC5Ea30

# Step 2: Check transaction count (nonce)
cast nonce 0x0A58494CD644f38219c388c032B5BfF62CC5Ea30 \
  --rpc-url https://testnet-passet-hub-eth-rpc.polkadot.io
# Result: 1 (meaning 1 transaction sent, nonce 0 was the deployment)

# Step 3: Calculate contract address from deployer + nonce
cast compute-address 0x0A58494CD644f38219c388c032B5BfF62CC5Ea30 --nonce 0
# Result: 0xeD0fDD2be363590800F86ec8562Dde951654668F

# Step 4: Verify contract exists
cast code 0xeD0fDD2be363590800F86ec8562Dde951654668F \
  --rpc-url https://testnet-passet-hub-eth-rpc.polkadot.io
# Result: Bytecode starting with 0x50564d (PolkaVM signature) ✅
```

## Solution

### Correct RPC Endpoints

Passet Hub has **two separate RPC endpoints**:

1. **Ethereum RPC** (for Solidity contracts):
   - **URL:** `https://testnet-passet-hub-eth-rpc.polkadot.io`
   - **Protocol:** HTTPS
   - **Use for:** forge, cast, ethers.js, web3.js, MetaMask
   - **Supports:** All Ethereum JSON-RPC methods

2. **Substrate RPC** (for Substrate pallets):
   - **URL:** `wss://testnet-passet-hub.polkadot.io`
   - **Protocol:** WebSocket
   - **Use for:** Polkadot.js API, substrate queries
   - **Does NOT support:** Ethereum JSON-RPC methods

### Recovered Contract Details

- **Contract Address:** `0xeD0fDD2be363590800F86ec8562Dde951654668F`
- **Deployer Address:** `0x0A58494CD644f38219c388c032B5BfF62CC5Ea30`
- **Deployment Nonce:** 0
- **Network:** Passet Hub Testnet
- **Block Explorer:** https://blockscout-passet-hub.parity-testnet.parity.io

## Updated Configuration

### Environment Variables

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0xeD0fDD2be363590800F86ec8562Dde951654668F
NEXT_PUBLIC_RPC_ENDPOINT=https://testnet-passet-hub-eth-rpc.polkadot.io
NEXT_PUBLIC_NETWORK=passet-hub
```

### Foundry Configuration

```toml
[rpc_endpoints]
passet_hub = "https://testnet-passet-hub-eth-rpc.polkadot.io"
```

## Key Learnings

1. **pallet-revive requires Ethereum RPC endpoint** for Solidity contract interactions
2. **Substrate RPC and Ethereum RPC are separate** - don't confuse them
3. **Contract addresses can be recovered** using deployer address + nonce
4. **Always save deployment output** to avoid recovery process
5. **Documentation may be incomplete** - use multiple sources

## Documentation Updates

Updated the following files with correct RPC endpoints:
- `.env.local` - Production configuration
- `.env.example` - Template configuration
- `README.md` - Main documentation
- `QUICK_START_PASSET_HUB.md` - Quick start guide
- `contract/DEPLOYMENT_GUIDE.md` - Deployment instructions
- `contract/DEPLOYMENT_RECORD.md` - Deployment history
- `contract/README.md` - Contract documentation
- `.kiro/steering/tech.md` - Technical steering
- `docs/RPC_ENDPOINTS.md` - New comprehensive RPC reference

Removed outdated temporary documentation:
- Migration summaries
- Fix documentation
- Audit reports
- Cleanup summaries
- Demo scripts

## Resources

- **Polkadot.FYI:** https://polkadot.fyi/about
- **BlockScout Explorer:** https://blockscout-passet-hub.parity-testnet.parity.io
- **Foundry Book:** https://book.getfoundry.sh/
- **pallet-revive:** https://github.com/paritytech/polkadot-sdk/tree/master/substrate/frame/revive

## Future Recommendations

1. **Always use Ethereum RPC endpoint** for Solidity contracts
2. **Save deployment output** immediately after deployment
3. **Document contract addresses** in `contract/DEPLOYMENT_RECORD.md`
4. **Use environment variables** for RPC endpoints
5. **Test RPC connectivity** before deployment
6. **Keep backup of deployer private key** securely

---

**Date:** November 15, 2025  
**Status:** Resolved ✅  
**Contract:** Deployed and verified on Passet Hub
