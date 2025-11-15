# Storacha Network Setup Guide

This guide explains how to set up and use Storacha Network for decentralized storage in FutureProof.

## What is Storacha?

Storacha Network is a decentralized hot storage layer built on IPFS and Filecoin.

## Installation

```bash
npm install
```

## Authentication

Storacha uses email-based authentication:

```typescript
import { storachaService } from '@/lib/storage';

await storachaService.login('your-email@example.com');
await storachaService.createSpace('my-space');
```

## Usage

```typescript
// Upload
const result = await storachaService.uploadEncryptedBlob(blob, 'file.bin');

// Download
const blob = await storachaService.downloadEncryptedBlob(cid);
```

## Resources

- [Storacha Documentation](https://docs.storacha.network/)
- [Discord Community](https://discord.gg/8uza4ha73R)
