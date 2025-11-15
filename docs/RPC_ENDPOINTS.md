# Passet Hub RPC Endpoints Reference

## Overview

Passet Hub testnet provides two types of RPC endpoints for different use cases. Understanding which endpoint to use is critical for successful contract deployment and interaction.

## Ethereum-Compatible RPC (Recommended)

**Endpoint:** `https://testnet-passet-hub-eth-rpc.polkadot.io`

### Use Cases
- Deploying Solidity contracts via Foundry (forge, cast)
- Interacting with contracts using ethers.js or web3.js
- MetaMask wallet connections
- Ethereum JSON-RPC method calls
- Frontend contract interactions

### Supported Methods
- `eth_blockNumber`
- `eth_getTransactionCount`
- `eth_call`
- `eth_sendTransaction`
- `eth_getTransactionReceipt`
- `eth_getCode`
- All standard Ethereum JSON-RPC methods

### Example Usage

#### Foundry (forge/cast)
```bash
# Deploy contract
forge create --resolc \
  --rpc-url https://testnet-passet-hub-eth-rpc.polkadot.io \
  --private-key $PRIVATE_KEY \
  contracts/FutureProof.sol:FutureProof

# Check nonce
cast nonce 0xYourAddress \
  --rpc-url https://testnet-passet-hub-eth-rpc.polkadot.io

# Get contract code
cast code 0xContractAddress \
  --rpc-url https://testnet-passet-hub-eth-rpc.polkadot.io
```

#### ethers.js
```typescript
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider(
  'https://testnet-passet-hub-eth-rpc.polkadot.io'
);

const contract = new ethers.Contract(address, abi, provider);
```

#### Environment Configuration
```env
NEXT_PUBLIC_RPC_ENDPOINT=https://testnet-passet-hub-eth-rpc.polkadot.io
```

## Substrate RPC (Legacy/Advanced)

**Endpoint:** `wss://testnet-passet-hub.polkadot.io`

### Use Cases
- Polkadot.js API interactions
- Substrate pallet queries
- Chain state queries
- Extrinsic submissions (Substrate format)
- Advanced blockchain operations

### NOT Suitable For
- ❌ Solidity contract deployment
- ❌ Ethereum JSON-RPC calls
- ❌ MetaMask connections
- ❌ ethers.js/web3.js interactions

### Example Usage

#### Polkadot.js
```typescript
import { ApiPromise, WsProvider } from '@polkadot/api';

const provider = new WsProvider('wss://testnet-passet-hub.polkadot.io');
const api = await ApiPromise.create({ provider });
```

## Quick Reference Table

| Feature | Ethereum RPC | Substrate RPC |
|---------|-------------|---------------|
| **URL** | `https://testnet-passet-hub-eth-rpc.polkadot.io` | `wss://testnet-passet-hub.polkadot.io` |
| **Protocol** | HTTPS | WebSocket |
| **Address Format** | 0x... (Ethereum) | 5... (SS58) or 0x... |
| **Solidity Contracts** | ✅ Yes | ❌ No |
| **Foundry (forge/cast)** | ✅ Yes | ❌ No |
| **ethers.js/web3.js** | ✅ Yes | ❌ No |
| **MetaMask** | ✅ Yes | ❌ No |
| **Polkadot.js** | ❌ No | ✅ Yes |
| **Substrate Pallets** | ❌ No | ✅ Yes |

## Common Errors and Solutions

### Error: "Method not found" (-32601)

**Cause:** Using Substrate RPC endpoint for Ethereum JSON-RPC calls

**Solution:** Switch to Ethereum RPC endpoint
```bash
# Wrong
--rpc-url wss://testnet-passet-hub.polkadot.io

# Correct
--rpc-url https://testnet-passet-hub-eth-rpc.polkadot.io
```

### Error: "Invalid address format"

**Cause:** Using Substrate address (5...) with Ethereum RPC

**Solution:** Use Ethereum address format (0x...)
```bash
# Wrong
5E2jTHsQfRCq8wBPeHgwKQAeCMwSsxYCCZfB4dG2SWhp4ZTv

# Correct
0xeD0fDD2be363590800F86ec8562Dde951654668F
```

### Error: "Connection refused" or timeout

**Cause:** Using wrong protocol (HTTP vs WebSocket)

**Solution:** Match protocol to endpoint type
```bash
# Ethereum RPC uses HTTPS
https://testnet-passet-hub-eth-rpc.polkadot.io

# Substrate RPC uses WebSocket
wss://testnet-passet-hub.polkadot.io
```

## Network Information

### Passet Hub Testnet

- **Network Name:** Passet Hub
- **Chain ID:** 1000 (Ethereum-compatible)
- **Native Token:** PAS (Paseo)
- **Decimals:** 12
- **Block Time:** ~6 seconds
- **Faucet:** https://faucet.polkadot.io/paseo

### Block Explorers

- **BlockScout (Ethereum-style):** https://blockscout-passet-hub.parity-testnet.parity.io
- **Polkadot.js Apps (Substrate-style):** https://polkadot.js.org/apps/?rpc=wss://testnet-passet-hub.polkadot.io

## Best Practices

1. **Always use Ethereum RPC** for Solidity contract interactions
2. **Store RPC URL in environment variables** for easy configuration
3. **Use HTTPS endpoint** for better reliability and caching
4. **Implement retry logic** for network resilience
5. **Monitor RPC health** and have fallback endpoints ready

## Troubleshooting Checklist

When experiencing RPC issues, verify:

- [ ] Using correct RPC endpoint (Ethereum vs Substrate)
- [ ] Using correct protocol (HTTPS vs WebSocket)
- [ ] Using correct address format (0x... for Ethereum RPC)
- [ ] Network connectivity is stable
- [ ] RPC endpoint is not rate-limited
- [ ] Wallet has sufficient PAS tokens
- [ ] Contract address is valid and deployed

## Additional Resources

- [Polkadot.FYI](https://polkadot.fyi/about) - Network information
- [pallet-revive Documentation](https://github.com/paritytech/polkadot-sdk/tree/master/substrate/frame/revive)
- [Foundry Book](https://book.getfoundry.sh/)
- [ethers.js Documentation](https://docs.ethers.org/)
- [Polkadot.js API Documentation](https://polkadot.js.org/docs/)

## Support

If you encounter issues not covered here:

1. Check the [GitHub Issues](https://github.com/yourusername/futureproof-app/issues)
2. Review the [Deployment Guide](../contract/DEPLOYMENT_GUIDE.md)
3. Ask on [Polkadot Stack Exchange](https://polkadot.stackexchange.com/)

---

**Last Updated:** November 15, 2025  
**Network:** Passet Hub Testnet  
**Status:** Active
