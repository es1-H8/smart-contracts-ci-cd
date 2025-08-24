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
  
  // Run Slither analysis
  console.log('\n🛡️ Running Slither Analysis...');
  console.log('='.repeat(50));
  
  try {
    // First check if slither is available
    try {
      execSync('py -m slither --version', { stdio: 'ignore' });
      console.log('✅ Slither is available');
    } catch (error) {
      console.log('❌ Slither is not installed or not available in PATH');
      console.log('💡 To install Slither: py -m pip install slither-analyzer');
      
      allIssues.push({
        contract: 'System',
        tool: 'Slither',
        line: 'N/A',
        issue: 'Slither is not installed or not available in PATH',
        severity: 'error'
      });
      totalErrors++;
      
      // Generate report and exit
      generateReport(allIssues, totalWarnings, totalErrors);
      process.exit(1);
    }
    
    // Run Slither with checklist output (this contains the actual vulnerability details)
    console.log('Running: py -m slither . --checklist');
    
    let slitherOutput;
    let slitherExitCode = 0;
    
    try {
      // Try to run Slither normally
      slitherOutput = execSync('py -m slither . --checklist', { 
        encoding: 'utf8',
        timeout: 60000 // 60 second timeout
      });
      console.log('✅ Slither analysis completed successfully');
    } catch (error) {
      // Slither returns exit code 1 when vulnerabilities are found (this is correct behavior)
      if (error.status === 1 && error.stdout) {
        console.log('✅ Slither analysis completed - vulnerabilities found (exit code 1 is expected)');
        slitherOutput = error.stdout;
        slitherExitCode = 1; // This is expected when vulnerabilities are found
      } else {
        console.log('❌ Slither analysis failed');
        console.log('Error:', error.message);
        throw error;
      }
    }
    
    // Simple parsing: just look for lines with contract references and line numbers
    const lines = slitherOutput.split('\n');
    let issueCount = 0;
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Look for lines that contain contract references with line numbers
      if (trimmedLine.includes('contracts/') && trimmedLine.includes('#L')) {
        console.log(`   Line ${index + 1}: ${trimmedLine}`);
        
        // Extract contract name and line number
        const contractMatch = trimmedLine.match(/contracts\/([^\/\s]+)\.sol#L(\d+)/);
        if (contractMatch) {
          const contractName = contractMatch[1];
          const lineNumber = contractMatch[2];
          
          // Determine severity based on content
          let severity = 'info';
          if (trimmedLine.includes('abi.encodePacked()')) severity = 'high';
          else if (trimmedLine.includes('Reentrancy in')) severity = 'medium';
          else if (trimmedLine.includes('external calls inside a loop')) severity = 'low';
          else if (trimmedLine.includes('should be constant') || trimmedLine.includes('should be immutable')) severity = 'optimization';
          else if (trimmedLine.includes('lacks a zero-check')) severity = 'low';
          else if (trimmedLine.includes('shadows:')) severity = 'low';
          else if (trimmedLine.includes('different versions of Solidity')) severity = 'info';
          else if (trimmedLine.includes('costly operations inside a loop')) severity = 'info';
          else if (trimmedLine.includes('is never used and should be removed')) severity = 'info';
          else if (trimmedLine.includes('contains known severe issues')) severity = 'info';
          else if (trimmedLine.includes('Low level call')) severity = 'info';
          else if (trimmedLine.includes('is not in mixedCase')) severity = 'info';
          else if (trimmedLine.includes('uses literals with too many digits')) severity = 'info';
          
          allIssues.push({
            contract: contractName,
            tool: 'Slither',
            line: lineNumber,
            issue: trimmedLine,
            severity: severity
          });
          issueCount++;
          totalWarnings++;
        }
      }
      // Also capture summary information
      else if (trimmedLine.includes('INFO:Slither:') && trimmedLine.includes('analyzed') && trimmedLine.includes('result(s) found')) {
        console.log(`   Line ${index + 1}: ${trimmedLine}`);
        
        allIssues.push({
          contract: 'Summary',
          tool: 'Slither',
          line: 'N/A',
          issue: trimmedLine,
          severity: 'summary'
        });
        issueCount++;
        totalWarnings++;
      }
    });
    
    if (issueCount > 0) {
      console.log(`\n⚠️ Slither found ${issueCount} issues in output`);
    } else {
      console.log('\n✅ Slither found no issues in output');
    }
    
    // If Slither found vulnerabilities (exit code 1), that's expected behavior
    if (slitherExitCode === 1) {
      console.log('ℹ️ Slither exit code 1 is expected when vulnerabilities are found');
    }
    
  } catch (error) {
    console.log('❌ Slither analysis failed');
    console.log('Error:', error.message);
    
    allIssues.push({
      contract: 'System',
      tool: 'Slither',
      line: 'N/A',
      issue: `Slither analysis failed: ${error.message}`,
      severity: 'error'
    });
    totalErrors++;
  }
  
  // Generate final report
  generateReport(allIssues, totalWarnings, totalErrors);
  
  // Exit with appropriate code
  if (totalErrors > 0) {
    console.log('\n❌ Security analysis completed with errors');
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.log('\n⚠️ Security analysis completed with warnings');
    process.exit(0);
  } else {
    console.log('\n✅ Security analysis completed successfully - no issues found');
    process.exit(0);
  }
}

function generateReport(allIssues, totalWarnings, totalErrors) {
  const timestamp = new Date().toISOString();
  
  let reportContent = `SECURITY ANALYSIS REPORT
Generated: ${timestamp}
Total Contracts: 2
Total Warnings Found: ${totalWarnings}
Total Errors Found: ${totalErrors}

`;

  if (allIssues.length > 0) {
    reportContent += `DETAILED ISSUES:
================

`;
    
    allIssues.forEach((issue, index) => {
      const severityIcon = {
        'high': '🔴',
        'medium': '🟡',
        'low': '🟠',
        'optimization': '🔵',
        'info': 'ℹ️',
        'error': '❌',
        'summary': '📊'
      }[issue.severity] || 'ℹ️';
      
      reportContent += `${index + 1}. ${severityIcon} [${issue.contract}:${issue.line}] ${issue.severity.toUpperCase()}\n`;
      reportContent += `   Tool: ${issue.tool}\n`;
      reportContent += `   Issue: ${issue.issue}\n\n`;
    });
  } else {
    reportContent += `No security issues found.\n`;
  }
  
  // Write report to file
  fs.writeFileSync('security-report.txt', reportContent);
  console.log(`\n📄 Security report saved to: security-report.txt`);
}

// Run the security checks
runSecurityChecks().catch(error => {
  console.error('❌ Script execution failed:', error);
  process.exit(1);
});
