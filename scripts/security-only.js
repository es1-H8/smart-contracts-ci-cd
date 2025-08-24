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
