const hre = require("hardhat");

async function main() {
  console.log("Deploying FutureProof contract...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "tokens");

  const FutureProof = await hre.ethers.getContractFactory("FutureProof");
  const futureProof = await FutureProof.deploy();

  await futureProof.waitForDeployment();

  const address = await futureProof.getAddress();
  console.log("FutureProof deployed to:", address);

  // Verify deployment
  const messageCount = await futureProof.getMessageCount();
  console.log("Initial message count:", messageCount.toString());

  console.log("\n✅ Deployment successful!");
  console.log("\nUpdate your .env.local with:");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`);
  
  return address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
