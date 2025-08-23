import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Function to run security checks and generate comprehensive reports
async function runSecurityChecks() {
  console.log('🔒 Starting Comprehensive Security Analysis...\n');
  
  const contractsDir = path.join(process.cwd(), 'contracts');
  const contractFiles = fs.readdirSync(contractsDir).filter(file => file.endsWith('.sol'));
  
  console.log(`📋 Found ${contractFiles.length} contracts to analyze:\n`);
  
  let totalWarnings = 0;
  let totalErrors = 0;
  const allIssues = [];
  
  // Run security checks for each contract
  for (const contractFile of contractFiles) {
    console.log(`\n🔍 Analyzing ${contractFile}...`);
    console.log('='.repeat(50));
    
    const contractPath = path.join(contractsDir, contractFile);
    const contractName = contractFile.replace('.sol', '');
    
    try {
      // 1. Solhint (Linting)
      console.log('\n📝 Running Solhint...');
      try {
        const solhintOutput = execSync(`npx solhint "${contractPath}"`, { encoding: 'utf8' });
        console.log('✅ Solhint passed');
      } catch (error) {
        const solhintIssues = error.stdout || error.stderr || '';
        const issues = solhintIssues.split('\n').filter(line => line.trim());
        console.log(`⚠️ Solhint found ${issues.length} issues:`);
        issues.forEach(issue => {
          console.log(`   ${issue}`);
          allIssues.push({ contract: contractName, tool: 'Solhint', issue });
        });
        totalWarnings += issues.length;
      }
      
      // 2. Slither (Security Analysis) - Fixed to use proper Python command
      console.log('\n🛡️ Running Slither...');
      try {
        // Use 'slither' command directly (Python tool) instead of npx
        const slitherOutput = execSync(`slither "${contractPath}" --print human-summary`, { encoding: 'utf8' });
        console.log('✅ Slither passed');
      } catch (error) {
        const slitherIssues = error.stdout || error.stderr || '';
        const issues = slitherIssues.split('\n').filter(line => line.trim());
        console.log(`⚠️ Slither found ${issues.length} issues:`);
        issues.forEach(issue => {
          console.log(`   ${issue}`);
          allIssues.push({ contract: contractName, tool: 'Slither', issue });
        });
        totalWarnings += issues.length;
      }
      
      // 3. Compiler Warnings
      console.log('\n⚙️ Checking Compiler Warnings...');
      try {
        const compileOutput = execSync('npx hardhat compile', { encoding: 'utf8' });
        if (compileOutput.includes('Warning') || compileOutput.includes('warning')) {
          const warnings = compileOutput.split('\n').filter(line => 
            line.toLowerCase().includes('warning') && line.includes(contractName)
          );
          console.log(`⚠️ Compiler found ${warnings.length} warnings:`);
          warnings.forEach(warning => {
            console.log(`   ${warning.trim()}`);
            allIssues.push({ contract: contractName, tool: 'Compiler', issue: warning.trim() });
          });
          totalWarnings += warnings.length;
        } else {
          console.log('✅ No compiler warnings');
        }
      } catch (error) {
        console.log('⚠️ Compilation issues found');
        totalErrors++;
      }
      
    } catch (error) {
      console.log(`❌ Error analyzing ${contractFile}: ${error.message}`);
      totalErrors++;
    }
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
  reportContent += `Total Warnings: ${totalWarnings}\n`;
  reportContent += `Total Errors: ${totalErrors}\n\n`;
  
  allIssues.forEach((issue, index) => {
    reportContent += `${index + 1}. [${issue.contract}] ${issue.tool}: ${issue.issue}\n`;
  });
  
  fs.writeFileSync(reportPath, reportContent);
  console.log(`\n📄 Detailed report saved to: security-report.txt`);
  
  // Display all issues (this will show in GitHub Actions logs)
  if (allIssues.length > 0) {
    console.log('\n🚨 ALL SECURITY ISSUES FOUND:');
    console.log('='.repeat(60));
    allIssues.forEach((issue, index) => {
      console.log(`${index + 1}. [${issue.contract}] ${issue.tool}: ${issue.issue}`);
    });
  }
  
  // Exit with error code if issues found (for CI/CD)
  if (totalWarnings > 0 || totalErrors > 0) {
    console.log(`\n⚠️ Security check completed with ${totalWarnings} warnings and ${totalErrors} errors`);
    process.exit(1);
  } else {
    console.log('\n✅ All security checks passed!');
    process.exit(0);
  }
}

// Run security checks
runSecurityChecks().catch(error => {
  console.error('💥 Security check failed:', error);
  process.exit(1);
});
