const { ApiPromise, WsProvider } = require("@polkadot/api");

async function checkRPC(url, name) {
  console.log(`\n🔍 Checking ${name}: ${url}\n`);

  const provider = new WsProvider(url, false, {}, 10000);
  let api;

  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Connection timeout after 20s")), 20000)
    );

    api = await Promise.race([ApiPromise.create({ provider }), timeoutPromise]);

    await Promise.race([api.isReady, timeoutPromise]);

    console.log("✅ Connection successful");
    console.log(`Chain: ${await api.rpc.system.chain()}`);
    console.log(`Version: ${await api.rpc.system.version()}`);

    // Check for Contracts pallet
    const metadata = await api.rpc.state.getMetadata();
    const pallets = metadata.asLatest.pallets;

    const contractsPallet = pallets.find(
      (p) => p.name.toString() === "Contracts"
    );

    if (contractsPallet) {
      console.log("\n✅ Contracts pallet FOUND");
      console.log("   This chain supports ink! smart contracts");
    } else {
      console.log("\n❌ Contracts pallet NOT FOUND");
      console.log("   This chain does NOT support ink! smart contracts");
    }

    // Check for Revive pallet (PolkaVM/Solidity)
    const revivePallet = pallets.find((p) => p.name.toString() === "Revive");
    if (revivePallet) {
      console.log("✅ Revive pallet FOUND (PolkaVM/Solidity contracts)");
    }

    // Check for ContractsApi RPC
    console.log("\n🔍 Checking for ContractsApi runtime API...");
    const runtimeApis = metadata.asLatest.apis;
    const contractsApi = runtimeApis.find((api) =>
      api.name.toString().includes("ContractsApi")
    );

    if (contractsApi) {
      console.log("✅ ContractsApi runtime API FOUND");
      console.log("   Methods available for cargo-contract CLI");
    } else {
      console.log("❌ ContractsApi runtime API NOT FOUND");
      console.log("   cargo-contract will NOT work with this endpoint");
    }

    return {
      success: true,
      hasContracts: !!contractsPallet,
      hasContractsApi: !!contractsApi,
    };
  } catch (error) {
    console.error("❌ Error:", error.message);
    return { success: false, error: error.message };
  } finally {
    if (api) {
      await api.disconnect();
    }
    provider.disconnect();
  }
}

async function main() {
  console.log("═".repeat(80));
  console.log("PASSET HUB TESTNET - RPC ENDPOINT VERIFICATION");
  console.log("═".repeat(80));

  const endpoints = [
    { url: "wss://passet-hub-paseo.ibp.network", name: "IBP Archive Node" },
    {
      url: "wss://testnet-passet-hub.polkadot.io",
      name: "Official Parity Endpoint (from docs)",
    },
  ];

  const results = [];

  for (const endpoint of endpoints) {
    const result = await checkRPC(endpoint.url, endpoint.name);
    results.push({ ...endpoint, ...result });
    console.log("\n" + "═".repeat(80) + "\n");
  }

  console.log("\n📊 SUMMARY\n");
  console.log("═".repeat(80));

  const workingEndpoint = results.find(
    (r) => r.success && r.hasContracts && r.hasContractsApi
  );

  if (workingEndpoint) {
    console.log("\n✅ WORKING ENDPOINT FOUND FOR INK! CONTRACTS:\n");
    console.log(`   ${workingEndpoint.url}`);
    console.log(`\n   Use this with cargo-contract commands.`);
  } else {
    console.log("\n❌ NO WORKING ENDPOINT FOUND FOR INK! CONTRACTS");
    console.log("\n   Possible reasons:");
    console.log(
      "   1. Passet Hub only supports Revive (PolkaVM/Solidity), not ink!"
    );
    console.log("   2. The endpoints are down or misconfigured");
    console.log("   3. The documentation is outdated");
  }

  console.log("\n" + "═".repeat(80));

  process.exit(0);
}

main().catch(console.error);
