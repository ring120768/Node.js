/**
 * Compare Form Fields in Both Templates
 *
 * Check if the backup template has the same fields as the reference,
 * specifically on page 17.
 */

const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

async function compareTemplateFields() {
  try {
    console.log('🔍 Comparing template form fields...\n');

    // Load backup (original template before replacement)
    const backupPath = '/Users/ianring/Node.js/pdf-templates/Car-Crash-Lawyer-AI-Incident-Report-Main-BACKUP.pdf';
    const backupBytes = fs.readFileSync(backupPath);
    const backupPdf = await PDFDocument.load(backupBytes);

    // Load reference
    const referencePath = '/Users/ianring/Ian.ring Dropbox/Ian Ring/Car Crash Lawyer/PDFco/App ready/PDF fillabe/Final PDF/Car-Crash-Lawyer-AI-incident-report-main.pdf';
    const referenceBytes = fs.readFileSync(referencePath);
    const referencePdf = await PDFDocument.load(referenceBytes);

    // Get fields from both
    const backupForm = backupPdf.getForm();
    const referenceForm = referencePdf.getForm();

    const backupFields = backupForm.getFields().map(f => f.getName()).sort();
    const referenceFields = referenceForm.getFields().map(f => f.getName()).sort();

    console.log('📊 Field Counts:');
    console.log(`   Original Template (backup): ${backupFields.length} fields`);
    console.log(`   Reference PDF:              ${referenceFields.length} fields\n`);

    // Check for page 17 specific fields
    console.log('📋 Page 17 Fields Check:');
    const page17Fields = ['Date69_af_date', 'Signature70', 'name', 'surname'];

    page17Fields.forEach(fieldName => {
      const inBackup = backupFields.includes(fieldName);
      const inReference = referenceFields.includes(fieldName);
      const status = inBackup && inReference ? '✅' : inBackup ? '⚠️ ' : '❌';
      console.log(`   ${status} ${fieldName}`);
      console.log(`      Backup: ${inBackup ? 'YES' : 'NO'} | Reference: ${inReference ? 'YES' : 'NO'}`);
    });

    // Find missing fields
    const missingInBackup = referenceFields.filter(f => !backupFields.includes(f));
    const missingInReference = backupFields.filter(f => !referenceFields.includes(f));

    if (missingInBackup.length > 0) {
      console.log('\n⚠️  Fields in Reference but NOT in Original Template:');
      missingInBackup.slice(0, 10).forEach(f => console.log(`   - ${f}`));
      if (missingInBackup.length > 10) {
        console.log(`   ... and ${missingInBackup.length - 10} more`);
      }
    }

    if (missingInReference.length > 0) {
      console.log('\n⚠️  Fields in Original Template but NOT in Reference:');
      missingInReference.slice(0, 10).forEach(f => console.log(`   - ${f}`));
      if (missingInReference.length > 10) {
        console.log(`   ... and ${missingInReference.length - 10} more`);
      }
    }

    console.log('\n📋 Conclusion:');
    if (backupFields.length === referenceFields.length && missingInBackup.length === 0) {
      console.log('   ✅ Both PDFs have identical form fields');
      console.log('   💡 The difference is likely visual content, not form structure');
      console.log('   🔧 Solution: Restore backup and investigate visual content differences');
    } else {
      console.log('   ⚠️  PDFs have different form field structures');
      console.log('   💡 May need to update template with reference form structure');
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

compareTemplateFields();
