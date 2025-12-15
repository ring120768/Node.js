/**
 * Extract Page 17 (Declaration) from Both PDFs for Visual Comparison
 *
 * Creates side-by-side comparison files to identify visual content differences.
 */

const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

async function extractDeclarationPages() {
  try {
    console.log('📄 Extracting declaration pages for comparison...\n');

    // Paths
    const referencePath = '/Users/ianring/Ian.ring Dropbox/Ian Ring/Car Crash Lawyer/PDFco/App ready/PDF fillabe/Final PDF/Car-Crash-Lawyer-AI-incident-report-main.pdf';
    const templatePath = '/Users/ianring/Node.js/pdf-templates/Car-Crash-Lawyer-AI-Incident-Report-Main.pdf';

    const outputDir = '/Users/ianring/Node.js/test-output';
    const referencePage17Path = `${outputDir}/page17-REFERENCE-declaration.pdf`;
    const templatePage17Path = `${outputDir}/page17-TEMPLATE-declaration.pdf`;

    // Load PDFs
    console.log('📖 Loading PDFs...');
    const referenceBytes = fs.readFileSync(referencePath);
    const templateBytes = fs.readFileSync(templatePath);

    const referencePdf = await PDFDocument.load(referenceBytes);
    const templatePdf = await PDFDocument.load(templateBytes);

    console.log(`   Reference: ${referencePdf.getPageCount()} pages, ${(referenceBytes.length / 1024).toFixed(2)} KB`);
    console.log(`   Template:  ${templatePdf.getPageCount()} pages, ${(templateBytes.length / 1024).toFixed(2)} KB\n`);

    // Extract page 17 from reference
    console.log('📄 Extracting page 17 from REFERENCE PDF...');
    const referencePage17Doc = await PDFDocument.create();
    const [refPage17] = await referencePage17Doc.copyPages(referencePdf, [16]);
    referencePage17Doc.addPage(refPage17);
    const refPage17Bytes = await referencePage17Doc.save();
    fs.writeFileSync(referencePage17Path, refPage17Bytes);
    console.log(`   ✅ Saved: ${referencePage17Path}`);
    console.log(`   📊 Size: ${(refPage17Bytes.length / 1024).toFixed(2)} KB\n`);

    // Extract page 17 from template
    console.log('📄 Extracting page 17 from TEMPLATE PDF...');
    const templatePage17Doc = await PDFDocument.create();
    const [tmpPage17] = await templatePage17Doc.copyPages(templatePdf, [16]);
    templatePage17Doc.addPage(tmpPage17);
    const tmpPage17Bytes = await templatePage17Doc.save();
    fs.writeFileSync(templatePage17Path, tmpPage17Bytes);
    console.log(`   ✅ Saved: ${templatePage17Path}`);
    console.log(`   📊 Size: ${(tmpPage17Bytes.length / 1024).toFixed(2)} KB\n`);

    // Comparison summary
    console.log('📊 Size Comparison:');
    const refSizeKB = (refPage17Bytes.length / 1024).toFixed(2);
    const tmpSizeKB = (tmpPage17Bytes.length / 1024).toFixed(2);
    const diffKB = (refPage17Bytes.length - tmpPage17Bytes.length) / 1024;
    const diffPercent = ((diffKB / refSizeKB) * 100).toFixed(1);

    console.log(`   Reference declaration page: ${refSizeKB} KB`);
    console.log(`   Template declaration page:  ${tmpSizeKB} KB`);
    console.log(`   Difference: ${diffKB.toFixed(2)} KB (${diffPercent}%)\n`);

    if (Math.abs(diffKB) > 100) {
      console.log('⚠️  SIGNIFICANT SIZE DIFFERENCE DETECTED');
      console.log('   This suggests substantial content differences between the pages.');
    } else if (Math.abs(diffKB) > 10) {
      console.log('⚠️  Moderate size difference detected');
      console.log('   Minor content differences may exist.');
    } else {
      console.log('✅ Size difference is minimal');
      console.log('   Content is likely very similar.');
    }

    console.log('\n📋 Next Steps:');
    console.log('   1. Open both extracted files side-by-side:');
    console.log(`      - ${referencePage17Path}`);
    console.log(`      - ${templatePage17Path}`);
    console.log('   2. Identify which declaration text/content is different');
    console.log('   3. Report findings to continue with solution');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

extractDeclarationPages();
