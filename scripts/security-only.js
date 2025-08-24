import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Simple security script that focuses on Slither only
async function runSecurityChecks() {
  console.log('🔒 Starting Security Analysis (Slither Only)...\n');
  
  const contractsDir = path.join(process.cwd(), 'contracts');
  const contractFiles = fs.readdirSync(contractsDir).filter(file => file.endsWith('.sol'));
  
  console.log(`📋 Found ${contractFiles.length} contracts to analyze:\n`);
  
  let totalWarnings = 0;
  let totalErrors = 0;
  const allIssues = [];
  
  // Run Slither analysis with better error handling
  console.log('\n🛡️ Running Slither Analysis...');
  console.log('='.repeat(50));
  
  try {
    // First check if slither is available
    try {
      execSync('slither --version', { encoding: 'utf8', stdio: 'pipe' });
      console.log('✅ Slither is available');
    } catch (versionError) {
      console.log('❌ Slither is not available, trying alternative approach...');
      throw new Error('Slither not found');
    }
    
    // Run Slither on the entire project with more options
    console.log('Running: slither . --print human-summary --json -');
    const slitherOutput = execSync('slither . --print human-summary --json -', { 
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 60000 // 60 second timeout
    });
    
    console.log('✅ Slither analysis completed successfully');
    console.log('Raw Slither output:');
    console.log(slitherOutput);
    
    // Parse Slither output for issues
    if (slitherOutput && slitherOutput.trim()) {
      const lines = slitherOutput.split('\n');
      let issueCount = 0;
      
      lines.forEach((line, index) => {
        if (line.trim() && (
          line.includes('warning') || 
          line.includes('Warning') || 
          line.includes('error') || 
          line.includes('Error') ||
          line.includes('info') || 
          line.includes('Info') ||
          line.includes('contracts/') ||
          line.includes('High:') ||
          line.includes('Medium:') ||
          line.includes('Low:')
        )) {
          console.log(`   Line ${index + 1}: ${line.trim()}`);
          
          // Extract contract name and line number if available
          const contractMatch = line.match(/contracts\/([^\/\s]+)\.sol#L(\d+)/);
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
          } else {
            allIssues.push({
              contract: 'Unknown',
              tool: 'Slither',
              line: 'N/A',
              issue: line.trim(),
              severity: 'warning'
            });
          }
          issueCount++;
          totalWarnings++;
        }
      });
      
      if (issueCount > 0) {
        console.log(`\n⚠️ Slither found ${issueCount} issues in output`);
      } else {
        console.log('\n✅ Slither found no issues in output');
      }
    }
    
  } catch (error) {
    console.log('⚠️ Slither execution failed, analyzing error output...');
    
    // Try to extract useful information from the error
    let errorOutput = '';
    if (error.stdout) errorOutput += error.stdout;
    if (error.stderr) errorOutput += error.stderr;
    if (error.message) errorOutput += error.message;
    
    console.log('Error details:', errorOutput);
    
    if (errorOutput.includes('slither') || errorOutput.includes('Slither')) {
      // This is a Slither-related error, add it to issues
      const errorLines = errorOutput.split('\n').filter(line => line.trim());
      errorLines.forEach(line => {
        if (line.trim()) {
          console.log(`   Error: ${line.trim()}`);
          allIssues.push({
            contract: 'Slither',
            tool: 'System',
            line: 'N/A',
            issue: line.trim(),
            severity: 'error'
          });
          totalErrors++;
        }
      });
    } else {
      // Generic error
      allIssues.push({
        contract: 'System',
        tool: 'Slither',
        line: 'N/A',
        issue: `Slither execution failed: ${error.message}`,
        severity: 'error'
      });
      totalErrors++;
    }
  }
  
  // Run Compiler to check for warnings
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
  
  if (allIssues.length > 0) {
    reportContent += `DETAILED ISSUES:\n`;
    reportContent += `================\n\n`;
    allIssues.forEach((issue, index) => {
      const lineInfo = issue.line ? ` (Line ${issue.line})` : '';
      reportContent += `${index + 1}. [${issue.contract}] ${issue.tool}: ${issue.issue}${lineInfo}\n`;
    });
  } else {
    reportContent += `No security issues found.\n`;
  }
  
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
  } else {
    console.log('\n✅ No security issues found!');
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
