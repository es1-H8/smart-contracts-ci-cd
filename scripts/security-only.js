import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Simple security script that works exactly like the original CI workflow
async function runSecurityChecks() {
  console.log('🔒 Starting Security Analysis (Original CI Workflow Method)...\n');
  
  const contractsDir = path.join(process.cwd(), 'contracts');
  const contractFiles = fs.readdirSync(contractsDir).filter(file => file.endsWith('.sol'));
  
  console.log(`📋 Found ${contractFiles.length} contracts to analyze:\n`);
  
  let totalWarnings = 0;
  let totalErrors = 0;
  const allIssues = [];
  
  // 1. Run Solhint exactly like original CI workflow
  console.log('\n📝 Running Solhint (like original CI)...');
  console.log('='.repeat(50));
  try {
    // This is the EXACT command from your original CI workflow
    const solhintOutput = execSync(`npx solhint "contracts/**/*.sol"`, { encoding: 'utf8' });
    console.log('✅ Solhint passed');
    
    // Even if Solhint passes, check if there are warnings in the output
    if (solhintOutput.includes('warning') || solhintOutput.includes('Warning')) {
      const lines = solhintOutput.split('\n');
      const warningLines = lines.filter(line => 
        line.includes('warning') || line.includes('Warning') ||
        line.includes('contracts/') && line.includes('#L')
      );
      
      if (warningLines.length > 0) {
        console.log(`⚠️ Solhint found ${warningLines.length} warnings in output:`);
        warningLines.forEach(warning => {
          if (warning.trim()) {
            console.log(`   ${warning.trim()}`);
            // Extract contract name and line number
            const contractMatch = warning.match(/contracts\/([^#]+)#L(\d+)/);
            if (contractMatch) {
              const contractName = contractMatch[1].replace('.sol', '');
              const lineNumber = contractMatch[2];
              allIssues.push({ 
                contract: contractName, 
                tool: 'Solhint', 
                issue: warning.trim(),
                line: lineNumber
              });
            } else {
              allIssues.push({ 
                contract: 'Unknown', 
                tool: 'Solhint', 
                issue: warning.trim() 
              });
            }
            totalWarnings++;
          }
        });
      }
    }
  } catch (error) {
    // Solhint found issues (this is what we want!)
    const solhintIssues = error.stdout || error.stderr || '';
    const issues = solhintIssues.split('\n').filter(line => line.trim());
    console.log(`⚠️ Solhint found ${issues.length} issues:`);
    
    issues.forEach(issue => {
      if (issue.trim()) {
        console.log(`   ${issue.trim()}`);
        // Extract contract name and line number
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
  
  // Also run Solhint on individual contracts to catch more issues
  console.log('\n📝 Running Solhint on individual contracts...');
  console.log('='.repeat(50));
  for (const contractFile of contractFiles) {
    const contractPath = path.join(contractsDir, contractFile);
    const contractName = contractFile.replace('.sol', '');
    
    try {
      // Use relative path to avoid glob issues
      const relativePath = `contracts/${contractFile}`;
      const solhintOutput = execSync(`npx solhint "${relativePath}"`, { encoding: 'utf8' });
      console.log(`✅ ${contractName}: Solhint passed`);
      
      // Check for warnings even when Solhint passes
      if (solhintOutput.includes('warning') || solhintOutput.includes('Warning')) {
        const lines = solhintOutput.split('\n');
        const warningLines = lines.filter(line => 
          line.includes('warning') || line.includes('Warning') ||
          line.includes('contracts/') && line.includes('#L')
        );
        
        if (warningLines.length > 0) {
          console.log(`⚠️ ${contractName}: Solhint found ${warningLines.length} warnings in output:`);
          warningLines.forEach(warning => {
            if (warning.trim()) {
              console.log(`   ${warning.trim()}`);
              // Extract line number
              const lineMatch = warning.match(/#L(\d+)/);
              const lineNumber = lineMatch ? lineMatch[1] : null;
              
              allIssues.push({ 
                contract: contractName, 
                tool: 'Solhint', 
                issue: warning.trim(),
                line: lineNumber
              });
              totalWarnings++;
            }
          });
        }
      }
    } catch (error) {
      const solhintIssues = error.stdout || error.stderr || '';
      const issues = solhintIssues.split('\n').filter(line => line.trim());
      console.log(`⚠️ ${contractName}: Solhint found ${issues.length} issues:`);
      
      issues.forEach(issue => {
        if (issue.trim()) {
          console.log(`   ${issue.trim()}`);
          // Extract line number
          const lineMatch = issue.match(/#L(\d+)/);
          const lineNumber = lineMatch ? lineMatch[1] : null;
          
          allIssues.push({ 
            contract: contractName, 
            tool: 'Solhint', 
            issue: issue.trim(),
            line: lineNumber
          });
          totalWarnings++;
        }
      });
    }
  }
  
  // 2. Run Slither exactly like original CI workflow
  console.log('\n🛡️ Running Slither (like original CI)...');
  console.log('='.repeat(50));
  try {
    // This is the EXACT command from your original CI workflow
    // On Windows, we need to use py -m slither instead of just slither
    const slitherOutput = execSync(`py -m slither . --print human-summary`, { encoding: 'utf8' });
    console.log('✅ Slither passed');
    
    // Even if Slither passes, check if there are warnings in the output
    if (slitherOutput.includes('warning') || slitherOutput.includes('Warning')) {
      const lines = slitherOutput.split('\n');
      const warningLines = lines.filter(line => 
        line.includes('warning') || line.includes('Warning') ||
        line.includes('contracts/') && line.includes('#L')
      );
      
      if (warningLines.length > 0) {
        console.log(`⚠️ Slither found ${warningLines.length} warnings:`);
        warningLines.forEach(line => {
          if (line.trim()) {
            console.log(`   ${line.trim()}`);
            // Extract contract name and line number
            const contractMatch = line.match(/contracts\/([^\/]+)\.sol#L(\d+)/);
            if (contractMatch) {
              const contractName = contractMatch[1];
              const lineNumber = contractMatch[2];
              allIssues.push({
                contract: contractName,
                tool: 'Slither',
                line: lineNumber,
                issue: line.trim(),
                severity: 'warning'
              });
              totalWarnings++;
            } else {
              allIssues.push({
                contract: 'Unknown',
                tool: 'Slither',
                line: 'N/A',
                issue: line.trim(),
                severity: 'warning'
              });
              totalWarnings++;
            }
          }
        });
      }
    }
  } catch (error) {
    // Slither found issues (this is what we want!)
    const slitherIssues = error.stdout || error.stderr || '';
    const issues = slitherIssues.split('\n').filter(line => line.trim());
    console.log(`⚠️ Slither found ${issues.length} issues:`);
    
    issues.forEach(issue => {
      if (issue.trim()) {
        console.log(`   ${issue.trim()}`);
        // Extract contract name and line number
        const contractMatch = issue.match(/contracts\/([^\/]+)\.sol#L(\d+)/);
        if (contractMatch) {
          const contractName = contractMatch[1];
          const lineNumber = contractMatch[2];
          allIssues.push({
            contract: contractName,
            tool: 'Slither',
            line: lineNumber,
            issue: issue.trim(),
            severity: 'warning'
          });
          totalWarnings++;
        } else {
          allIssues.push({
            contract: 'Unknown',
            tool: 'Slither',
            line: 'N/A',
            issue: issue.trim(),
            severity: 'warning'
          });
          totalWarnings++;
        }
      }
    });
  }
  
  // 3. Run Compiler to check for warnings
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
