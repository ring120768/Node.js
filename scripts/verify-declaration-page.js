/**
 * Verify Declaration Page in Generated PDF
 *
 * Extract page 17 from the newly generated PDF and compare size
 * to verify declaration content was properly included.
 */

const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

async function verifyDeclarationPage() {
  try {
    console.log('🔍 Verifying declaration page in generated PDF...\n');

    // Load the generated PDF
    const generatedPath = '/Users/ianring/Node.js/test-output/filled-form-5326c2aa-f1d5-4edc-a972-7fb14995ed0f.pdf';
    const generatedBytes = fs.readFileSync(generatedPath);
    const generatedPdf = await PDFDocument.load(generatedBytes);

    console.log(`📄 Generated PDF: ${generatedPdf.getPageCount()} pages`);
    console.log(`📊 Total size: ${(generatedBytes.length / 1024).toFixed(2)} KB\n`);

    // Extract page 17 (0-based index: 16)
    console.log('📄 Extracting page 17 (declaration page)...');
    const extractedPdf = await PDFDocument.create();
    const [page17] = await extractedPdf.copyPages(generatedPdf, [16]);
    extractedPdf.addPage(page17);

    // Save extracted page
    const extractedBytes = await extractedPdf.save();
    const outputPath = '/Users/ianring/Node.js/test-output/page17-NEW.pdf';
    fs.writeFileSync(outputPath, extractedBytes);

    const sizeKB = (extractedBytes.length / 1024).toFixed(2);
    console.log(`   ✅ Saved: ${outputPath}`);
    console.log(`   📊 Size: ${sizeKB} KB\n`);

    // Compare with reference
    console.log('📊 Size Comparison:');
    console.log('   Reference page 17: 711.43 KB (original declaration)');
    console.log('   Previous page 17:  468.76 KB (missing content)');
    console.log(`   NEW page 17:       ${sizeKB} KB`);

    if (parseFloat(sizeKB) > 650) {
      console.log('\n✅ SUCCESS: Page 17 size indicates declaration content is present!');
      console.log('   Declaration page has been successfully restored.');
    } else if (parseFloat(sizeKB) > 500) {
      console.log('\n⚠️  WARNING: Page 17 size is larger but still smaller than reference.');
      console.log('   Some declaration content may be missing.');
    } else {
      console.log('\n❌ ERROR: Page 17 size is still too small.');
      console.log('   Declaration content appears to be missing.');
    }

    console.log('\n📋 Next Steps:');
    console.log('   1. Open test-output/page17-NEW.pdf to visually verify declaration content');
    console.log('   2. Compare with test-output/page17-reference.pdf');
    console.log('   3. If content looks correct, deployment is ready');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

verifyDeclarationPage();
