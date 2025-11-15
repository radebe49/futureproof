# Technology Stack

## Core Technologies

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript with strict mode enabled
- **Styling**: Tailwind CSS with Prettier plugin for class sorting
- **Blockchain**: Polkadot.js API for Passet Hub testnet (Polkadot ecosystem)
- **Smart Contracts**: Solidity 0.8.20 compiled to PolkaVM via pallet-revive
- **Storage**: Storacha Network (formerly Web3.Storage) for decentralized IPFS storage
- **Wallet**: Talisman browser extension via @polkadot/extension-dapp
- **Cryptography**: Web Crypto API (AES-256-GCM, RSA-OAEP)

## Key Dependencies

### Frontend
```json
{
  "@polkadot/api": "^16.4.9",
  "@polkadot/extension-dapp": "^0.62.3",
  "@polkadot/util-crypto": "^13.5.7",
  "@storacha/client": "^1.0.0",
  "next": "^14.2.0",
  "react": "^18.3.0"
}
```

### Smart Contract
```json
{
  "hardhat": "^2.19.0",
  "@nomicfoundation/hardhat-toolbox": "^4.0.0"
}
```

## Common Commands

### Development
```bash
npm run dev          # Start development server on localhost:3000
npm run build        # Create production build
npm start            # Start production server
```

### Code Quality
```bash
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

## TypeScript Configuration

- Target: ES2020
- Strict mode enabled
- Path alias: `@/*` maps to project root
- Module resolution: bundler (Next.js)

## ESLint Rules

- Extends: next/core-web-vitals, next/typescript
- Unused vars: warn (ignore args starting with `_`)
- Explicit any: warn

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_CONTRACT_ADDRESS` - Solidity smart contract address (Ethereum format, 0x...)
- `NEXT_PUBLIC_RPC_ENDPOINT` - Ethereum-compatible RPC endpoint (https://testnet-passet-hub-eth-rpc.polkadot.io)
- `NEXT_PUBLIC_NETWORK` - Network name (passet-hub)
- `NEXT_PUBLIC_STORACHA_GATEWAY` - Storacha gateway (default: storacha.link)

Note: Storacha uses email-based authentication with UCAN delegation. No API tokens required!

## RPC Endpoints

Passet Hub has two RPC endpoints:
- **Ethereum RPC** (for Solidity contracts): `https://testnet-passet-hub-eth-rpc.polkadot.io`
- **Substrate RPC** (for Substrate pallets): `wss://testnet-passet-hub.polkadot.io`

Always use the Ethereum RPC endpoint for this project.

## Prerequisites

- Node.js 18+
- Talisman or MetaMask wallet browser extension
- Storacha Network account (email-based authentication)
- Passet Hub testnet tokens (PAS) from faucet: https://faucet.polkadot.io/paseo

## Storacha Network

Storacha (formerly Web3.Storage) is a decentralized hot storage network built on IPFS and Filecoin:
- **Email-based authentication** - No API keys needed
- **Space-based organization** - Content namespaced by DIDs
- **UCAN delegation** - User-controlled authorization
- **CDN-level speeds** - Optimized gateway performance
- **99.9% availability** - Redundant storage with cryptographic proofs
- **Browser-native** - Fully compatible with client-side JavaScript
