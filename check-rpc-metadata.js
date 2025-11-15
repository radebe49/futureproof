const { ApiPromise, WsProvider } = require('@polkadot/api');

async function checkRPC(url) {
  console.log(`\n🔍 Checking RPC: ${url}\n`);
  
  const provider = new WsProvider(url, false, {}, 5000);
  let api;
  
  try {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout after 15s')), 15000)
    );
    
    api = await Promise.race([
      ApiPromise.create({ provider }),
      timeoutPromise
    ]);
    
    await Promise.race([api.isReady, timeoutPromise]);
    
    console.log('✅ Connection successful');
    console.log(`Chain: ${await api.rpc.system.chain()}`);
    console.log(`Version: ${await api.rpc.system.version()}`);
    
    // Check for Contracts pallet
    const metadata = await api.rpc.state.getMetadata();
    const pallets = metadata.asLatest.pallets;
    
    const contractsPallet = pallets.find(p => p.name.toString() === 'Contracts');
    
    if (contractsPallet) {
      console.log('\n✅ Contracts pallet FOUND');
    } else {
      console.log('\n❌ Contracts pallet NOT FOUND');
      console.log('\nAvailable pallets (first 20):');
      pallets.slice(0, 20).forEach(p => console.log(`  - ${p.name.toString()}`));
    }
    
    // Check for ContractsApi RPC
    console.log('\n🔍 Checking for ContractsApi runtime API...');
    const runtimeApis = metadata.asLatest.apis;
    const contractsApi = runtimeApis.find(api => api.name.toString().includes('ContractsApi'));
    
    if (contractsApi) {
      console.log('✅ ContractsApi runtime API FOUND');
    } else {
      console.log('❌ ContractsApi runtime API NOT FOUND');
      console.log('\nAvailable runtime APIs:');
      runtimeApis.forEach(api => console.log(`  - ${api.name.toString()}`));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (api) {
      await api.disconnect();
    }
    provider.disconnect();
  }
}

async function main() {
  const endpoints = [
    'wss://testnet-passet-hub.polkadot.io',
    'wss://rococo-contracts-rpc.polkadot.io',
  ];
  
  for (const endpoint of endpoints) {
    await checkRPC(endpoint);
    console.log('\n' + '='.repeat(80) + '\n');
  }
  
  process.exit(0);
}

main().catch(console.error);
