# Wallet Connection Troubleshooting Guide

**Issue**: "Failed to connect wallet. Please try again."

---

## Quick Diagnostics

### Step 1: Check Browser Console

Open your browser's developer console (F12 or Cmd+Option+I) and look for error messages starting with `[WalletProvider]`.

Common errors and solutions:

#### Error: "No Ethereum wallet detected"

**Cause**: No wallet extension installed or not detected  
**Solution**:

1. Install Talisman: https://www.talisman.xyz/download
2. OR install MetaMask: https://metamask.io/download
3. Refresh the page after installation

#### Error: "Connection rejected" or "User rejected"

**Cause**: You clicked "Cancel" or "Reject" in the wallet popup  
**Solution**:

1. Click "Connect Wallet" again
2. Click "Approve" or "Connect" in the wallet popup

#### Error: "No Ethereum accounts found"

**Cause**: No Ethereum account in your wallet  
**Solution**:

- **Talisman**: Create a new Ethereum account (not Polkadot!)
- **MetaMask**: Create a new account (all accounts are Ethereum)

#### Error: "Wallet connection timed out"

**Cause**: Wallet extension is locked or unresponsive  
**Solution**:

1. Unlock your wallet extension
2. Close and reopen the wallet popup
3. Try connecting again

---

## Step 2: Verify Wallet Installation

### For Talisman Users

1. **Check Extension**:
   - Look for Talisman icon in browser toolbar
   - Click it to open the extension
   - Verify it's unlocked (not asking for password)

2. **Check Account Type**:

   ```
   ✅ Correct: Ethereum account (address starts with 0x)
   ❌ Wrong: Polkadot account (address starts with 5)
   ```

3. **Create Ethereum Account** (if needed):
   - Open Talisman
   - Click "Add Account" or "+"
   - Select "Ethereum" (NOT Polkadot!)
   - Name it (e.g., "Lockdrop ETH")
   - Verify address starts with 0x

### For MetaMask Users

1. **Check Extension**:
   - Look for MetaMask fox icon in browser toolbar
   - Click it to open the extension
   - Verify it's unlocked

2. **All MetaMask accounts are Ethereum** ✅
   - No need to create special account type
   - All addresses start with 0x

---

## Step 3: Check Browser Compatibility

### Supported Browsers

- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Brave
- ✅ Edge
- ❌ Safari (limited wallet support)

### Check window.ethereum

Open browser console and type:

```javascript
window.ethereum;
```

**Expected**: Should show an object with properties  
**If undefined**: Wallet extension not detected

---

## Step 4: Common Issues

### Issue: Multiple Wallets Installed

If you have both Talisman and MetaMask installed:

1. **Talisman Priority**: Talisman usually takes over `window.ethereum`
2. **To use MetaMask**: Temporarily disable Talisman extension
3. **To use Talisman**: Keep both enabled (Talisman will be used)

### Issue: Wallet Popup Blocked

1. Check for popup blocker notification in browser
2. Allow popups for localhost:3000
3. Try connecting again

### Issue: Extension Conflicts

1. Disable all other wallet extensions
2. Keep only one wallet enabled
3. Refresh the page
4. Try connecting

---

## Step 5: Manual Testing

### Test 1: Check Wallet Detection

Open browser console and run:

```javascript
// Check if wallet exists
console.log("Wallet exists:", !!window.ethereum);

// Check wallet type
console.log("Is Talisman:", window.ethereum?.isTalisman);
console.log("Is MetaMask:", window.ethereum?.isMetaMask);
```

### Test 2: Request Accounts Manually

```javascript
// Try requesting accounts directly
window.ethereum
  .request({ method: "eth_requestAccounts" })
  .then((accounts) => console.log("Accounts:", accounts))
  .catch((error) => console.error("Error:", error));
```

**Expected**: Should show array of addresses starting with 0x  
**If error**: Check the error message for clues

---

## Step 6: Reset and Retry

### Clear Browser State

1. Open browser console
2. Run:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   ```
3. Refresh the page
4. Try connecting again

### Reset Wallet Connection

**Talisman**:

1. Open Talisman extension
2. Go to Settings → Connected Sites
3. Remove localhost:3000 if listed
4. Try connecting again

**MetaMask**:

1. Open MetaMask
2. Click three dots → Connected Sites
3. Remove localhost:3000 if listed
4. Try connecting again

---

## Step 7: Check Network Issues

### Verify RPC Endpoint

The app connects to Passet Hub testnet. Check if the RPC is accessible:

1. Open `.env.local`
2. Verify:
   ```
   NEXT_PUBLIC_RPC_ENDPOINT=https://testnet-passet-hub-eth-rpc.polkadot.io
   ```
3. Test RPC in browser console:
   ```javascript
   fetch("https://testnet-passet-hub-eth-rpc.polkadot.io", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({
       jsonrpc: "2.0",
       method: "eth_blockNumber",
       params: [],
       id: 1,
     }),
   })
     .then((r) => r.json())
     .then(console.log);
   ```

**Expected**: Should return a block number  
**If error**: RPC endpoint may be down

---

## Step 8: Development Server Issues

### Restart Development Server

Sometimes the issue is with the Next.js dev server:

1. Stop the server (Ctrl+C)
2. Clear Next.js cache:
   ```bash
   rm -rf .next
   ```
3. Restart:
   ```bash
   npm run dev
   ```
4. Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)

---

## Still Not Working?

### Collect Debug Information

1. **Browser Console Logs**:
   - Open console (F12)
   - Click "Connect Wallet"
   - Copy all `[WalletProvider]` messages

2. **Wallet Info**:
   - Which wallet? (Talisman or MetaMask)
   - Version number
   - Browser and version

3. **Account Info**:
   - Does account exist?
   - Does address start with 0x?
   - Is wallet unlocked?

4. **Error Message**:
   - Exact error text shown in UI
   - Any console errors

### Report Issue

Create an issue with:

- Debug information from above
- Steps to reproduce
- Screenshots if helpful

---

## Quick Fixes Summary

| Symptom               | Quick Fix                       |
| --------------------- | ------------------------------- |
| No wallet popup       | Install Talisman or MetaMask    |
| Popup shows but fails | Check account is Ethereum (0x)  |
| "User rejected"       | Click Approve in wallet popup   |
| Timeout error         | Unlock wallet extension         |
| Multiple wallets      | Disable all but one             |
| Still failing         | Clear cache, restart dev server |

---

## Prevention Tips

1. **Always use Ethereum accounts** (0x...) not Polkadot (5...)
2. **Keep wallet unlocked** when using the app
3. **Use one wallet at a time** to avoid conflicts
4. **Check console logs** for detailed error messages
5. **Refresh after changes** to wallet or extensions

---

**Last Updated**: November 16, 2025  
**Status**: Active troubleshooting guide
