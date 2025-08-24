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
      execSync('slither --version', { stdio: 'ignore' });
      console.log('✅ Slither is available');
    } catch (error) {
      console.log('❌ Slither is not installed or not available in PATH');
      console.log('💡 To install Slither: pip install slither-analyzer');
      
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
    
    // Run Slither with human-readable output (this was working before)
    console.log('Running: slither . --print human-summary');
    const slitherOutput = execSync('slither . --print human-summary', { 
      encoding: 'utf8',
      timeout: 60000 // 60 second timeout
    });
    
    console.log('✅ Slither analysis completed successfully');
    
    // Parse the human-readable output to extract issues
    const lines = slitherOutput.split('\n');
    let issueCount = 0;
    
    lines.forEach((line, index) => {
      if (line.trim() && (
        line.includes('High:') || 
        line.includes('Medium:') || 
        line.includes('Low:') ||
        line.includes('Optimization:') ||
        line.includes('Informational:') ||
        line.includes('contracts/') ||
        line.includes('BoredApe') ||
        line.includes('ArbitrageFlashLoaner')
      )) {
        console.log(`   Line ${index + 1}: ${line.trim()}`);
        
        // Extract contract name and line number if available
        const contractMatch = line.match(/contracts\/([^\/\s]+)\.sol#L(\d+)/);
        if (contractMatch) {
          const contractName = contractMatch[1];
          const lineNumber = contractMatch[2];
          
          // Determine severity from the line content
          let severity = 'info';
          if (line.includes('High:')) severity = 'high';
          else if (line.includes('Medium:')) severity = 'medium';
          else if (line.includes('Low:')) severity = 'low';
          else if (line.includes('Optimization:')) severity = 'optimization';
          else if (line.includes('Informational:')) severity = 'info';
          
          allIssues.push({
            contract: contractName,
            tool: 'Slither',
            line: lineNumber,
            issue: line.trim(),
            severity: severity
          });
        } else {
          // For summary lines (High: X, Medium: Y, etc.)
          if (line.includes('High:') || line.includes('Medium:') || line.includes('Low:') || 
              line.includes('Optimization:') || line.includes('Informational:')) {
            allIssues.push({
              contract: 'Summary',
              tool: 'Slither',
              line: 'N/A',
              issue: line.trim(),
              severity: 'summary'
            });
          } else {
            allIssues.push({
              contract: 'Unknown',
              tool: 'Slither',
              line: 'N/A',
              issue: line.trim(),
              severity: 'info'
            });
          }
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
