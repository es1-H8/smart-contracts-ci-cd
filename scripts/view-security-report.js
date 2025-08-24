import fs from 'fs';
import path from 'path';

function viewSecurityReport() {
  const reportPath = path.join(process.cwd(), 'security-report.txt');
  
  if (!fs.existsSync(reportPath)) {
    console.log('❌ No security report found. Run "npm run security:ci" first.');
    return;
  }
  
  const report = fs.readFileSync(reportPath, 'utf8');
  console.log('🔒 SECURITY ANALYSIS REPORT');
  console.log('='.repeat(60));
  console.log(report);
  
  // Count total issues
  const lines = report.split('\n');
  const issueLines = lines.filter(line => line.includes('[') && line.includes(']'));
  console.log('\n📊 SUMMARY:');
  console.log(`Total Issues Found: ${issueLines.length}`);
}

viewSecurityReport();
