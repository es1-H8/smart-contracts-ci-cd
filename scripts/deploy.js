import pkg from "hardhat";
const { ethers } = pkg;
import fs from "fs";
import path from "path";

// Function to automatically discover all contracts in the contracts folder
function discoverContracts() {
  const contractsDir = path.join(process.cwd(), "contracts");
  const contractFiles = fs.readdirSync(contractsDir).filter(file => file.endsWith('.sol'));
  
  return contractFiles.map(file => {
    const content = fs.readFileSync(path.join(contractsDir, file), 'utf8');
    // Extract contract name from Solidity file
    const contractMatch = content.match(/contract\s+(\w+)/);
    return contractMatch ? contractMatch[1] : null;
  }).filter(Boolean);
}

// Function to deploy a single contract
async function deployContract(contractName) {
  try {
    console.log(`\n🚀 Deploying ${contractName}...`);
    
    // Get the contract factory
    const Contract = await ethers.getContractFactory(contractName);
    
    // Deploy the contract (no constructor arguments for simplicity)
    const contract = await Contract.deploy();
    
    // Wait for deployment to finish
    await contract.waitForDeployment();
    
    const address = await contract.getAddress();
    console.log(`✅ ${contractName} deployed to: ${address}`);
    
    // Wait for block confirmations
    console.log("⏳ Waiting for block confirmations...");
    await contract.deploymentTransaction().wait(6);
    
    // Verify the contract on Etherscan
    console.log("🔍 Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: [],
      });
      console.log("✅ Contract verified successfully on Etherscan!");
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log("ℹ️ Contract is already verified on Etherscan!");
      } else {
        console.log("⚠️ Verification failed:", error.message);
      }
    }
    
    return { name: contractName, address, success: true };
    
  } catch (error) {
    console.error(`❌ Failed to deploy ${contractName}:`, error.message);
    return { name: contractName, error: error.message, success: false };
  }
}

async function main() {
  console.log("🚀 Starting Automatic Contract Deployment...");
  
  // Get current network
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "localhost" : network.name;
  console.log(`🌐 Network: ${networkName} (Chain ID: ${network.chainId})`);
  
  // Automatically discover all contracts
  const contractNames = discoverContracts();
  
  if (contractNames.length === 0) {
    console.log("❌ No contracts found in contracts directory");
    return;
  }
  
  console.log(`📋 Found ${contractNames.length} contracts: ${contractNames.join(', ')}`);
  
  // Deploy all contracts automatically
  const deploymentResults = [];
  
  for (const contractName of contractNames) {
    const result = await deployContract(contractName);
    deploymentResults.push(result);
  }
  
  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  
  const successful = deploymentResults.filter(r => r.success);
  const failed = deploymentResults.filter(r => !r.success);
  
  console.log(`✅ Successfully deployed: ${successful.length}`);
  successful.forEach(r => {
    console.log(`   ${r.name}: ${r.address}`);
  });
  
  if (failed.length > 0) {
    console.log(`❌ Failed deployments: ${failed.length}`);
    failed.forEach(r => {
      console.log(`   ${r.name}: ${r.error}`);
    });
  }
  
  console.log("=".repeat(60));
  
  if (successful.length > 0) {
    console.log("🎉 Deployment completed successfully!");
    return successful;
  } else {
    console.log("💥 All deployments failed!");
    process.exit(1);
  }
}

// Handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Deployment failed:", error);
    process.exit(1);
  }); 