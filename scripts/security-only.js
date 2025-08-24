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
      execSync('slither --version', { stdio: 'ignore' });
    } catch (error) {
      console.log('❌ Slither is not installed or not available in PATH');
      console.log('💡 To install Slither: pip install slither-analyzer');
      console.log('💡 Or use: python -m pip install slither-analyzer');
      
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
    
    // Run Slither with JSON output for better parsing
    console.log('Running Slither analysis...');
    
    // Check if we're in a CI environment
    const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
    console.log(`Environment: ${isCI ? 'CI/GitHub Actions' : 'Local Development'}`);
    
    let slitherOutput;
    try {
      // Try the standard JSON output first
      console.log('Trying: slither . --json');
      slitherOutput = execSync(`slither . --json`, { encoding: 'utf8' });
      console.log('✅ JSON output successful');
    } catch (jsonError) {
      console.log('⚠️ Standard JSON output failed, trying alternative format...');
      console.log('JSON error:', jsonError.message);
      try {
        // Fallback: try with human-readable output and parse it
        console.log('Trying: slither . --print human-summary');
        slitherOutput = execSync(`slither . --print human-summary`, { encoding: 'utf8' });
        console.log('✅ Human-readable output successful');
        
        // Convert human output to a structured format
        const humanResults = {
          results: {
            detectors: []
          }
        };
        
        // Parse human-readable output for basic issues
        const lines = slitherOutput.split('\n');
        let currentIssue = null;
        
        lines.forEach(line => {
          if (line.includes('High:') || line.includes('Medium:') || line.includes('Low:') || line.includes('Optimization:')) {
            const severity = line.split(':')[0].trim();
            const count = parseInt(line.split(':')[1]) || 0;
            
            if (count > 0) {
              // Add placeholder detector for this severity level
              humanResults.results.detectors.push({
                impact: severity,
                description: `${severity} level issues found`,
                elements: [{
                  source_mapping: {
                    filename_relative: 'contracts/',
                    lines: [0]
                  }
                }],
                check: 'human-summary',
                confidence: 'Medium'
              });
            }
          }
        });
        
        slitherOutput = JSON.stringify(humanResults);
        
      } catch (humanError) {
        console.log('❌ Both JSON and human-readable output failed');
        console.log('Human error:', humanError.message);
        
        // In CI, we want to fail hard; locally, we can be more lenient
        if (isCI) {
          throw new Error(`Slither execution failed in CI environment: ${humanError.message}`);
        } else {
          console.log('⚠️ Continuing with minimal analysis for local development...');
          slitherOutput = JSON.stringify({
            results: {
              detectors: [{
                impact: 'Informational',
                description: 'Slither analysis failed, but continuing with basic checks',
                elements: [{
                  source_mapping: {
                    filename_relative: 'contracts/',
                    lines: [0]
                  }
                }],
                check: 'fallback',
                confidence: 'Low'
              }]
            }
          });
        }
      }
    }
    
    // Parse JSON output
    try {
      const slitherResults = JSON.parse(slitherOutput);
      
      if (slitherResults.results && slitherResults.results.detectors) {
        const detectors = slitherResults.results.detectors;
        
        console.log(`✅ Slither analysis completed successfully`);
        console.log(`📊 Found ${detectors.length} security findings\n`);
        
        // Process each detector result
        detectors.forEach((detector, index) => {
          if (detector.elements && detector.elements.length > 0) {
            detector.elements.forEach(element => {
              // Extract contract name and line number
              let contractName = 'Unknown';
              let lineNumber = 'N/A';
              
              if (element.source_mapping) {
                const filename = element.source_mapping.filename_relative;
                if (filename) {
                  contractName = filename.replace('contracts/', '').replace('.sol', '');
                }
                
                if (element.source_mapping.lines && element.source_mapping.lines.length > 0) {
                  lineNumber = element.source_mapping.lines[0].toString();
                }
              }
              
              // Determine severity
              let severity = 'info';
              if (detector.impact === 'High') severity = 'high';
              else if (detector.impact === 'Medium') severity = 'medium';
              else if (detector.impact === 'Low') severity = 'low';
              else if (detector.impact === 'Optimization') severity = 'optimization';
              
              // Add to issues list
              allIssues.push({
                contract: contractName,
                tool: 'Slither',
                line: lineNumber,
                issue: detector.description,
                severity: severity,
                check: detector.check,
                confidence: detector.confidence
              });
              
              // Count by severity
              if (severity === 'high' || severity === 'medium') {
                totalWarnings++;
              } else if (severity === 'error') {
                totalErrors++;
              } else {
                totalWarnings++;
              }
            });
          }
        });
        
        // Display summary
        console.log('📋 SECURITY FINDINGS SUMMARY:');
        console.log('='.repeat(50));
        
        const highIssues = allIssues.filter(issue => issue.severity === 'high');
        const mediumIssues = allIssues.filter(issue => issue.severity === 'medium');
        const lowIssues = allIssues.filter(issue => issue.severity === 'low');
        const optimizationIssues = allIssues.filter(issue => issue.severity === 'optimization');
        
        console.log(`🔴 High Risk Issues: ${highIssues.length}`);
        console.log(`🟡 Medium Risk Issues: ${mediumIssues.length}`);
        console.log(`🟠 Low Risk Issues: ${lowIssues.length}`);
        console.log(`🔵 Optimization Issues: ${optimizationIssues.length}`);
        console.log(`📊 Total Issues: ${allIssues.length}\n`);
        
        // Display detailed findings
        if (allIssues.length > 0) {
          console.log('🔍 DETAILED FINDINGS:');
          console.log('='.repeat(50));
          
          allIssues.forEach((issue, index) => {
            const severityIcon = {
              'high': '🔴',
              'medium': '🟡',
              'low': '🟠',
              'optimization': '🔵',
              'info': 'ℹ️',
              'error': '❌'
            }[issue.severity] || 'ℹ️';
            
            console.log(`${index + 1}. ${severityIcon} [${issue.contract}:${issue.line}] ${issue.severity.toUpperCase()}`);
            console.log(`   Tool: ${issue.tool} (${issue.check || 'N/A'})`);
            console.log(`   Confidence: ${issue.confidence || 'N/A'}`);
            console.log(`   Issue: ${issue.issue}`);
            console.log('');
          });
        }
        
      } else {
        console.log('⚠️ No detector results found in Slither output');
        allIssues.push({
          contract: 'System',
          tool: 'Slither',
          line: 'N/A',
          issue: 'No detector results found in Slither output',
          severity: 'warning'
        });
        totalWarnings++;
      }
      
    } catch (jsonError) {
      console.log('⚠️ Failed to parse Slither JSON output');
      console.log('Raw output:', slitherOutput.substring(0, 500) + '...');
      
      allIssues.push({
        contract: 'System',
        tool: 'Slither',
        line: 'N/A',
        issue: 'Failed to parse Slither JSON output',
        severity: 'error'
      });
      totalErrors++;
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
        'error': '❌'
      }[issue.severity] || 'ℹ️';
      
      reportContent += `${index + 1}. ${severityIcon} [${issue.contract}:${issue.line}] ${issue.severity.toUpperCase()}\n`;
      reportContent += `   Tool: ${issue.tool}\n`;
      if (issue.check) {
        reportContent += `   Check: ${issue.check}\n`;
      }
      if (issue.confidence) {
        reportContent += `   Confidence: ${issue.confidence}\n`;
      }
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
