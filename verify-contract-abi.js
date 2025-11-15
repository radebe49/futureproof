#!/usr/bin/env node

/**
 * Contract ABI Verification Script
 * 
 * Connects to the deployed contract and compares its ABI with the local version
 */

const { ApiPromise, WsProvider } = require("@polkadot/api");
const { ContractPromise } = require("@polkadot/api-contract");
const fs = require("fs");
const path = require("path");

// Configuration from .env.local
const CONTRACT_ADDRESS = "5E2jTHsQfRCq8wBPeHgwKQAeCMwSsxYCCZfB4dG2SWhp4ZTv";
const RPC_ENDPOINT = "wss://rpc.shibuya.astar.network";
const NETWORK = "shibuya";

// Load local ABI
const localAbiPath = path.join(__dirname, "contract", "abi.json");
const localAbi = JSON.parse(fs.readFileSync(localAbiPath, "utf8"));

console.log("═".repeat(80));
console.log("CONTRACT ABI VERIFICATION");
console.log("═".repeat(80));
console.log();
console.log(`Network: ${NETWORK}`);
console.log(`RPC Endpoint: ${RPC_ENDPOINT}`);
console.log(`Contract Address: ${CONTRACT_ADDRESS}`);
console.log();

async function verifyContractAbi() {
  let api;
  let provider;

  try {
    // Connect to the network
    console.log("🔌 Connecting to network...");
    provider = new WsProvider(RPC_ENDPOINT, false, {}, 30000);
    
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Connection timeout after 30s")), 30000)
    );

    api = await Promise.race([
      ApiPromise.create({ provider }),
      timeoutPromise
    ]);

    await Promise.race([api.isReady, timeoutPromise]);

    console.log("✅ Connected successfully");
    console.log(`   Chain: ${await api.rpc.system.chain()}`);
    console.log(`   Version: ${await api.rpc.system.version()}`);
    console.log();

    // Check if contract exists
    console.log("🔍 Checking contract existence...");
    const contractInfo = await api.query.contracts.contractInfoOf(CONTRACT_ADDRESS);

    if (contractInfo.isNone) {
      console.error("❌ ERROR: Contract not found at address:", CONTRACT_ADDRESS);
      console.error();
      console.error("Possible reasons:");
      console.error("1. Contract has not been deployed yet");
      console.error("2. Wrong contract address in .env.local");
      console.error("3. Wrong network (currently: " + NETWORK + ")");
      console.error();
      console.error("Action required:");
      console.error("- Deploy the contract using: ./deploy-to-passet-hub.sh");
      console.error("- Or update NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local");
      process.exit(1);
    }

    console.log("✅ Contract exists on-chain");
    console.log();

    // Create contract instance with local ABI
    console.log("📋 Loading contract with local ABI...");
    const contract = new ContractPromise(api, localAbi, CONTRACT_ADDRESS);

    console.log("✅ Contract instance created");
    console.log();

    // Verify methods exist
    console.log("🔍 Verifying contract methods...");
    console.log();

    const expectedMethods = [
      { name: "store_message", mutates: true },
      { name: "get_sent_messages", mutates: false },
      { name: "get_received_messages", mutates: false },
      { name: "get_message", mutates: false },
      { name: "get_message_count", mutates: false }
    ];

    let allMethodsFound = true;
    const missingMethods = [];
    const foundMethods = [];

    for (const expected of expectedMethods) {
      const method = contract.tx[expected.name] || contract.query[expected.name];
      
      if (method) {
        foundMethods.push(expected.name);
        console.log(`   ✅ ${expected.name} - Found`);
      } else {
        allMethodsFound = false;
        missingMethods.push(expected.name);
        console.log(`   ❌ ${expected.name} - MISSING`);
      }
    }

    console.log();

    // Check for extra methods in deployed contract
    console.log("🔍 Checking for extra methods in deployed contract...");
    const deployedMethods = [
      ...Object.keys(contract.tx),
      ...Object.keys(contract.query)
    ];
    const expectedMethodNames = expectedMethods.map(m => m.name);
    const extraMethods = deployedMethods.filter(m => !expectedMethodNames.includes(m));

    if (extraMethods.length > 0) {
      console.log("   ⚠️  Extra methods found:");
      extraMethods.forEach(m => console.log(`      - ${m}`));
    } else {
      console.log("   ✅ No extra methods");
    }
    console.log();

    // Test a simple query to verify ABI compatibility
    console.log("🧪 Testing contract query (get_message_count)...");
    try {
      const { gasRequired, storageDeposit, result, output } = 
        await contract.query.get_message_count(
          CONTRACT_ADDRESS,
          { gasLimit: api.registry.createType('WeightV2', {
            refTime: 1000000000,
            proofSize: 1000000
          }) }
        );

      if (result.isOk) {
        const count = output?.toHuman();
        console.log(`   ✅ Query successful - Message count: ${count}`);
      } else {
        console.log(`   ⚠️  Query returned error: ${result.asErr}`);
      }
    } catch (error) {
      console.log(`   ❌ Query failed: ${error.message}`);
    }
    console.log();

    // Summary
    console.log("═".repeat(80));
    console.log("VERIFICATION SUMMARY");
    console.log("═".repeat(80));
    console.log();

    if (allMethodsFound && extraMethods.length === 0) {
      console.log("✅ ABI VERIFICATION PASSED");
      console.log();
      console.log("All expected methods are present and accessible.");
      console.log("The local ABI matches the deployed contract.");
      console.log();
      console.log("✅ Safe to proceed with transactions");
      process.exit(0);
    } else {
      console.log("⚠️  ABI VERIFICATION WARNINGS");
      console.log();

      if (missingMethods.length > 0) {
        console.log("❌ Missing methods:");
        missingMethods.forEach(m => console.log(`   - ${m}`));
        console.log();
        console.log("Impact: Calls to these methods will fail at runtime");
        console.log();
      }

      if (extraMethods.length > 0) {
        console.log("⚠️  Extra methods in deployed contract:");
        extraMethods.forEach(m => console.log(`   - ${m}`));
        console.log();
        console.log("Impact: These methods are available but not in local ABI");
        console.log();
      }

      console.log("Recommended actions:");
      console.log("1. If contract is not deployed: Deploy using ./deploy-to-passet-hub.sh");
      console.log("2. If ABI mismatch: Update contract/abi.json from deployed contract");
      console.log("3. If wrong contract: Update NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local");
      console.log();

      process.exit(1);
    }

  } catch (error) {
    console.error("❌ Verification failed:", error.message);
    console.error();

    if (error.message.includes("timeout")) {
      console.error("💡 The RPC endpoint may be temporarily unavailable.");
      console.error("   Try again in a few minutes or check network status.");
    } else if (error.message.includes("Cannot read")) {
      console.error("💡 Contract may not be deployed or ABI format is incorrect.");
      console.error("   Deploy the contract first using: ./deploy-to-passet-hub.sh");
    }

    process.exit(1);
  } finally {
    if (api) {
      await api.disconnect();
    }
    if (provider) {
      provider.disconnect();
    }
  }
}

// Run verification
verifyContractAbi().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
