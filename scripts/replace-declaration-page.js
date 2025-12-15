/**
 * Replace Declaration Page (Page 17) in Template PDF
 *
 * This script:
 * 1. Loads reference PDF with correct declaration page
 * 2. Loads current template PDF
 * 3. Creates new PDF with:
 *    - Pages 1-16 from current template
 *    - Page 17 from reference (declaration page)
 *    - Page 18 from current template
 * 4. Saves as updated template PDF
 * 5. Creates backup of original template
 */

const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

async function replaceDeclarationPage() {
  try {
    console.log('🔧 Starting declaration page replacement...\n');

    // File paths
    const referencePath = '/Users/ianring/Ian.ring Dropbox/Ian Ring/Car Crash Lawyer/PDFco/App ready/PDF fillabe/Final PDF/Car-Crash-Lawyer-AI-incident-report-main.pdf';
    const templatePath = '/Users/ianring/Node.js/pdf-templates/Car-Crash-Lawyer-AI-Incident-Report-Main.pdf';
    const backupPath = '/Users/ianring/Node.js/pdf-templates/Car-Crash-Lawyer-AI-Incident-Report-Main-BACKUP.pdf';
    const outputPath = templatePath; // Overwrite template

    // Step 1: Create backup of current template
    console.log('📦 Creating backup of current template...');
    fs.copyFileSync(templatePath, backupPath);
    console.log(`   ✅ Backup saved: ${path.basename(backupPath)}\n`);

    // Step 2: Load both PDFs
    console.log('📄 Loading PDFs...');
    const referenceBytes = fs.readFileSync(referencePath);
    const templateBytes = fs.readFileSync(templatePath);

    const referencePdf = await PDFDocument.load(referenceBytes);
    const templatePdf = await PDFDocument.load(templateBytes);

    console.log(`   Reference PDF: ${referencePdf.getPageCount()} pages`);
    console.log(`   Template PDF: ${templatePdf.getPageCount()} pages\n`);

    // Step 3: Create new merged PDF
    console.log('🔗 Creating updated template...');
    const mergedPdf = await PDFDocument.create();

    // Copy pages 1-16 from current template (0-based indexing: 0-15)
    console.log('   📄 Copying pages 1-16 from template...');
    const templatePages1to16 = await mergedPdf.copyPages(
      templatePdf,
      Array.from({ length: 16 }, (_, i) => i)
    );
    templatePages1to16.forEach(page => mergedPdf.addPage(page));

    // Copy page 17 from reference (0-based indexing: 16)
    console.log('   📄 Copying page 17 from reference (DECLARATION PAGE)...');
    const [declarationPage] = await mergedPdf.copyPages(referencePdf, [16]);
    mergedPdf.addPage(declarationPage);

    // Copy page 18 from current template (0-based indexing: 17)
    console.log('   📄 Copying page 18 from template...');
    const [page18] = await mergedPdf.copyPages(templatePdf, [17]);
    mergedPdf.addPage(page18);

    console.log('   ✅ Merge complete: 18 pages total\n');

    // Step 4: Save updated template
    console.log('💾 Saving updated template...');
    const mergedBytes = await mergedPdf.save();
    fs.writeFileSync(outputPath, mergedBytes);

    console.log(`   ✅ Template updated: ${path.basename(outputPath)}`);
    console.log(`   📊 New size: ${(mergedBytes.length / 1024).toFixed(2)} KB\n`);

    // Step 5: Verification
    console.log('🔍 Verifying updated template...');
    const verifyPdf = await PDFDocument.load(mergedBytes);
    console.log(`   ✅ Page count: ${verifyPdf.getPageCount()}`);
    console.log(`   ✅ Form fields: ${verifyPdf.getForm().getFields().length}\n`);

    console.log('✅ SUCCESS: Declaration page replacement complete!');
    console.log('\n📋 Summary:');
    console.log('   - Backup created at:', backupPath);
    console.log('   - Template updated at:', templatePath);
    console.log('   - Page 17 now contains declaration content from reference PDF');
    console.log('\n🧪 Next: Run test-form-filling.js to verify PDF generation');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the replacement
replaceDeclarationPage();
