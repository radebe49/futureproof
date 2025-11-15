#!/usr/bin/env node

/**
 * Script to map a Substrate account for ink! v6 contract interactions on Passet Hub
 *
 * This is REQUIRED before deploying or interacting with any ink! v6 contracts.
 */

const { ApiPromise, WsProvider } = require("@polkadot/api");
const { Keyring } = require("@polkadot/keyring");
const { cryptoWaitReady } = require("@polkadot/util-crypto");

const RPC_ENDPOINT = "wss://testnet-passet-hub.polkadot.io";
const SEED_PHRASE =
  "country agree license nephew waste route settle tilt screen always replace cargo";

async function mapAccount() {
  console.log("═".repeat(80));
  console.log("PASSET HUB - ACCOUNT MAPPING FOR INK! V6");
  console.log("═".repeat(80));
  console.log();

  // Wait for crypto to be ready
  await cryptoWaitReady();

  // Create keyring and add account
  const keyring = new Keyring({ type: "sr25519" });
  const account = keyring.addFromUri(SEED_PHRASE);

  console.log("📋 Account Information:");
  console.log(`   Address: ${account.address}`);
  console.log(`   Public Key: ${account.publicKey.toString("hex")}`);
  console.log();

  // Connect to Passet Hub
  console.log(`🔌 Connecting to ${RPC_ENDPOINT}...`);
  const provider = new WsProvider(RPC_ENDPOINT, false, {}, 10000);

  let api;
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Connection timeout after 30s")), 30000)
    );

    api = await Promise.race([ApiPromise.create({ provider }), timeoutPromise]);

    await Promise.race([api.isReady, timeoutPromise]);

    console.log("✅ Connected successfully");
    console.log(`   Chain: ${await api.rpc.system.chain()}`);
    console.log(`   Version: ${await api.rpc.system.version()}`);
    console.log();

    // Check if Revive pallet exists
    const metadata = await api.rpc.state.getMetadata();
    const pallets = metadata.asLatest.pallets;
    const revivePallet = pallets.find((p) => p.name.toString() === "Revive");

    if (!revivePallet) {
      console.error("❌ ERROR: Revive pallet not found on this chain!");
      console.error("   This chain does not support ink! v6 contracts.");
      process.exit(1);
    }

    console.log("✅ Revive pallet found - ink! v6 is supported");
    console.log();

    // Check current balance
    const { data: balance } = await api.query.system.account(account.address);
    const freeBalance = balance.free.toString();
    const freePAS = Number(freeBalance) / 1_000_000_000_000;

    console.log("💰 Account Balance:");
    console.log(`   Free: ${freePAS.toFixed(4)} PAS`);
    console.log();

    if (freePAS < 0.1) {
      console.warn("⚠️  WARNING: Low balance! Get tokens from faucet:");
      console.warn("   https://faucet.polkadot.io/?parachain=1111");
      console.warn('   Select "Passet Hub: smart contracts"');
      console.log();
    }

    // Check if account is already mapped
    console.log("🔍 Checking if account is already mapped...");

    try {
      const mapping = await api.query.revive.addressMapping(account.address);

      if (mapping.isSome) {
        const h160Address = mapping.unwrap();
        console.log("✅ Account is ALREADY MAPPED!");
        console.log(`   H160 Address: ${h160Address.toHex()}`);
        console.log();
        console.log("🎉 You can now deploy contracts using cargo-contract!");
        console.log();
        return;
      }
    } catch (error) {
      console.log(
        "   Unable to check mapping status (query may not be available)"
      );
    }

    console.log("❌ Account is NOT mapped yet");
    console.log();

    // Map the account
    console.log("📝 Submitting mapAccount transaction...");
    console.log();

    const unsub = await api.tx.revive
      .mapAccount()
      .signAndSend(account, ({ status, events }) => {
        if (status.isInBlock) {
          console.log(
            `✅ Transaction included in block: ${status.asInBlock.toHex()}`
          );

          // Check for errors
          events.forEach(({ event }) => {
            if (api.events.system.ExtrinsicFailed.is(event)) {
              const [dispatchError] = event.data;
              let errorInfo = dispatchError.toString();

              if (dispatchError.isModule) {
                const decoded = api.registry.findMetaError(
                  dispatchError.asModule
                );
                errorInfo = `${decoded.section}.${decoded.name}: ${decoded.docs}`;
              }

              console.error("❌ Transaction failed:", errorInfo);
            }
          });
        } else if (status.isFinalized) {
          console.log(
            `✅ Transaction finalized in block: ${status.asFinalized.toHex()}`
          );
          console.log();

          // Verify mapping
          api.query.revive
            .addressMapping(account.address)
            .then((mapping) => {
              if (mapping.isSome) {
                const h160Address = mapping.unwrap();
                console.log("🎉 SUCCESS! Account mapped successfully!");
                console.log();
                console.log("📋 Mapping Details:");
                console.log(`   Substrate Address: ${account.address}`);
                console.log(`   H160 Address: ${h160Address.toHex()}`);
                console.log();
                console.log("✅ You can now deploy contracts using:");
                console.log();
                console.log("   cargo contract upload \\");
                console.log(`     --suri "${SEED_PHRASE}" \\`);
                console.log(`     --url ${RPC_ENDPOINT} \\`);
                console.log("     --execute");
                console.log();
                console.log("   cargo contract instantiate \\");
                console.log("     --constructor new \\");
                console.log(`     --suri "${SEED_PHRASE}" \\`);
                console.log(`     --url ${RPC_ENDPOINT} \\`);
                console.log("     --execute");
                console.log();
              } else {
                console.error(
                  "❌ Mapping verification failed - account still not mapped"
                );
              }

              unsub();
              process.exit(0);
            })
            .catch((error) => {
              console.error("Error verifying mapping:", error.message);
              unsub();
              process.exit(1);
            });
        }
      });
  } catch (error) {
    console.error("❌ Error:", error.message);

    if (error.message.includes("timeout")) {
      console.error();
      console.error("💡 The RPC endpoint may be temporarily unavailable.");
      console.error(
        "   Try again in a few minutes or use the alternative endpoint:"
      );
      console.error("   wss://passet-hub-paseo.ibp.network");
      console.error();
      console.error("   Or map your account manually via Polkadot.js Apps:");
      console.error(
        "   https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Ftestnet-passet-hub.polkadot.io#/extrinsics"
      );
      console.error("   Select: revive → mapAccount()");
    }

    process.exit(1);
  } finally {
    if (api) {
      await api.disconnect();
    }
    provider.disconnect();
  }
}

// Run the script
mapAccount().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
