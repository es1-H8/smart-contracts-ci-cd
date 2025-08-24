import pkg from "hardhat";
const { ethers } = pkg;
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// Function to run security checks and generate comprehensive reports
async function runSecurityChecks() {
  console.log('🔒 Starting Comprehensive Security Analysis...\n');
  
  const contractsDir = path.join(process.cwd(), 'contracts');
  const contractFiles = fs.readdirSync(contractsDir).filter(file => file.endsWith('.sol'));
  
  console.log(`📋 Found ${contractFiles.length} contracts to analyze:\n`);
  
  let totalWarnings = 0;
  let totalErrors = 0;
  const allIssues = [];
  
  // 1. Run Solhint on ALL contracts (like original CI workflow)
  console.log('\n📝 Running Solhint on all contracts...');
  console.log('='.repeat(50));
  try {
    const solhintOutput = execSync(`npx solhint "contracts/**/*.sol"`, { encoding: 'utf8' });
    console.log('✅ Solhint passed');
  } catch (error) {
    const solhintIssues = error.stdout || error.stderr || '';
    const issues = solhintIssues.split('\n').filter(line => line.trim());
    console.log(`⚠️ Solhint found ${issues.length} issues:`);
    issues.forEach(issue => {
      if (issue.trim()) {
        console.log(`   ${issue.trim()}`);
        // Extract contract name and line number from Solhint output
        const contractMatch = issue.match(/contracts\/([^#]+)#L(\d+)/);
        if (contractMatch) {
          const contractName = contractMatch[1].replace('.sol', '');
          const lineNumber = contractMatch[2];
          allIssues.push({ 
            contract: contractName, 
            tool: 'Solhint', 
            issue: issue.trim(),
            line: lineNumber
          });
        } else {
          allIssues.push({ 
            contract: 'Unknown', 
            tool: 'Solhint', 
            issue: issue.trim() 
          });
        }
        totalWarnings++;
      }
    });
  }
  
  // 2. Run Slither on ALL contracts (like original CI workflow)
  console.log('\n🛡️ Running Slither on all contracts...');
  console.log('='.repeat(50));
  try {
    const slitherOutput = execSync(`slither . --print human-summary`, { encoding: 'utf8' });
    console.log('✅ Slither passed');
    
    // Parse Slither output for issues even if it doesn't exit with error
    if (slitherOutput.includes('High') || slitherOutput.includes('Medium') || slitherOutput.includes('Low')) {
      const lines = slitherOutput.split('\n');
      const issueLines = lines.filter(line => 
        line.includes('High') || line.includes('Medium') || line.includes('Low') || 
        line.includes('Warning') || line.includes('Info') || line.includes('GC:')
      );
      
      if (issueLines.length > 0) {
        console.log(`⚠️ Slither found ${issueLines.length} security issues:`);
        issueLines.forEach(issue => {
          if (issue.trim()) {
            console.log(`   ${issue.trim()}`);
            // Try to extract contract name from Slither output
            let contractName = 'Unknown';
            if (issue.includes('contracts/')) {
              const contractMatch = issue.match(/contracts\/([^#]+)/);
              if (contractMatch) {
                contractName = contractMatch[1].replace('.sol', '');
              }
            }
            allIssues.push({ 
              contract: contractName, 
              tool: 'Slither', 
              issue: issue.trim() 
            });
            totalWarnings++;
          }
        });
      }
    }
  } catch (error) {
    const slitherIssues = error.stdout || error.stderr || '';
    const issues = slitherIssues.split('\n').filter(line => line.trim());
    console.log(`⚠️ Slither found ${issues.length} issues:`);
    issues.forEach(issue => {
      if (issue.trim()) {
        console.log(`   ${issue.trim()}`);
        // Try to extract contract name from Slither output
        let contractName = 'Unknown';
        if (issue.includes('contracts/')) {
          const contractMatch = issue.match(/contracts\/([^#]+)/);
          if (contractMatch) {
            contractName = contractMatch[1].replace('.sol', '');
          }
        }
        allIssues.push({ 
          contract: contractName, 
          tool: 'Slither', 
          issue: issue.trim() 
        });
        totalWarnings++;
      }
    });
  }
  
  // 3. Compiler Warnings
  console.log('\n⚙️ Checking Compiler Warnings...');
  console.log('='.repeat(50));
  try {
    const compileOutput = execSync('npx hardhat compile', { encoding: 'utf8' });
    if (compileOutput.includes('Warning') || compileOutput.includes('warning')) {
      const warnings = compileOutput.split('\n').filter(line => 
        line.toLowerCase().includes('warning')
      );
      console.log(`⚠️ Compiler found ${warnings.length} warnings:`);
      warnings.forEach(warning => {
        if (warning.trim()) {
          console.log(`   ${warning.trim()}`);
          allIssues.push({ 
            contract: 'Compiler', 
            tool: 'Hardhat', 
            issue: warning.trim() 
          });
          totalWarnings++;
        }
      });
    } else {
      console.log('✅ No compiler warnings');
    }
  } catch (error) {
    console.log('⚠️ Compilation issues found');
    totalErrors++;
  }
  
  // Generate comprehensive security report
  console.log('\n' + '='.repeat(60));
  console.log('📊 SECURITY ANALYSIS SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Contracts Analyzed: ${contractFiles.length}`);
  console.log(`Total Warnings Found: ${totalWarnings}`);
  console.log(`Total Errors Found: ${totalErrors}`);
  console.log('='.repeat(60));
  
  // Save detailed report to file
  const reportPath = path.join(process.cwd(), 'security-report.txt');
  let reportContent = `SECURITY ANALYSIS REPORT\n`;
  reportContent += `Generated: ${new Date().toISOString()}\n`;
  reportContent += `Total Contracts: ${contractFiles.length}\n`;
  reportContent += `Total Warnings Found: ${totalWarnings}\n`;
  reportContent += `Total Errors Found: ${totalErrors}\n\n`;
  
  allIssues.forEach((issue, index) => {
    const lineInfo = issue.line ? ` (Line ${issue.line})` : '';
    reportContent += `${index + 1}. [${issue.contract}] ${issue.tool}: ${issue.issue}${lineInfo}\n`;
  });
  
  fs.writeFileSync(reportPath, reportContent);
  console.log(`\n📄 Detailed report saved to: security-report.txt`);
  
  // Display all issues (this will show in GitHub Actions logs)
  if (allIssues.length > 0) {
    console.log('\n🚨 ALL SECURITY ISSUES FOUND:');
    console.log('='.repeat(60));
    allIssues.forEach((issue, index) => {
      const lineInfo = issue.line ? ` (Line ${issue.line})` : '';
      console.log(`${index + 1}. [${issue.contract}] ${issue.tool}: ${issue.issue}${lineInfo}`);
    });
  }
  
  // Exit with error code if issues found (for CI/CD)
  if (totalWarnings > 0 || totalErrors > 0) {
    console.log(`\n⚠️ Security check completed with ${totalWarnings} warnings and ${totalErrors} errors`);
    return false;
  } else {
    console.log('\n✅ All security checks passed!');
    return true;
  }
}

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
  console.log("🚀 Starting Smart Contract Security & Deployment...");
  
  // First run security analysis
  const securityPassed = await runSecurityChecks();
  
  if (!securityPassed) {
    console.log("\n⚠️ Security checks failed! Deployment aborted.");
    console.log("Please fix security issues before deploying.");
    process.exit(1);
  }
  
  console.log("\n🔒 Security checks passed! Proceeding with deployment...");
  
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

  //so ur saying in the github the slither would work but right now when i pushed the workflow on github i go this rror regarding the slither in the report 1081. [BoredApe] Solhint: ✖ 439 problems (0 errors, 439 warnings)
//1082. [Unknown] Slither: /bin/sh: 1: py: not found (Line N/A)
