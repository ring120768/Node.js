/**
 * Check Declaration Page in Newly Generated PDF
 *
 * Extract page 17 from the just-generated PDF and compare with reference.
 */

const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

async function checkGeneratedDeclaration() {
  try {
    console.log('🔍 Checking declaration page in generated PDF...\n');

    // Paths
    const generatedPath = '/Users/ianring/Node.js/test-output/filled-form-5326c2aa-f1d5-4edc-a972-7fb14995ed0f.pdf';
    const referencePath = '/Users/ianring/Node.js/test-output/page17-REFERENCE-declaration.pdf';
    const outputPath = '/Users/ianring/Node.js/test-output/page17-GENERATED-declaration.pdf';

    // Load generated PDF
    console.log('📖 Loading generated PDF...');
    const generatedBytes = fs.readFileSync(generatedPath);
    const generatedPdf = await PDFDocument.load(generatedBytes);

    console.log(`   Pages: ${generatedPdf.getPageCount()}`);
    console.log(`   Total size: ${(generatedBytes.length / 1024).toFixed(2)} KB\n`);

    // Extract page 17
    console.log('📄 Extracting page 17 (declaration page)...');
    const extractedPdf = await PDFDocument.create();
    const [page17] = await extractedPdf.copyPages(generatedPdf, [16]);
    extractedPdf.addPage(page17);

    // Save extracted page
    const extractedBytes = await extractedPdf.save();
    fs.writeFileSync(outputPath, extractedBytes);

    const generatedSizeKB = (extractedBytes.length / 1024).toFixed(2);
    console.log(`   ✅ Saved: ${outputPath}`);
    console.log(`   📊 Size: ${generatedSizeKB} KB\n`);

    // Load reference for comparison
    const referenceBytes = fs.readFileSync(referencePath);
    const referenceSizeKB = (referenceBytes.length / 1024).toFixed(2);

    // Comparison
    console.log('📊 Size Comparison:');
    console.log(`   Reference declaration:  ${referenceSizeKB} KB (from template)`);
    console.log(`   Generated declaration:  ${generatedSizeKB} KB (after form filling)\n`);

    const diffKB = parseFloat(generatedSizeKB) - parseFloat(referenceSizeKB);
    const diffPercent = ((diffKB / parseFloat(referenceSizeKB)) * 100).toFixed(1);

    if (Math.abs(diffKB) < 10) {
      console.log('✅ SUCCESS: Declaration page sizes match!');
      console.log('   Declaration content appears to be preserved correctly.');
      console.log('   Form filling did not lose declaration page.');
    } else if (diffKB < -100) {
      console.log('❌ ERROR: Generated page is significantly smaller!');
      console.log(`   Missing content: approximately ${Math.abs(diffKB).toFixed(2)} KB`);
      console.log('   Declaration content may be lost during form filling.');
    } else {
      console.log('⚠️  WARNING: Size difference detected');
      console.log(`   Difference: ${diffKB.toFixed(2)} KB (${diffPercent}%)`);
      console.log('   Visual inspection recommended.');
    }

    console.log('\n📋 Files for Manual Verification:');
    console.log(`   Reference:  ${referencePath}`);
    console.log(`   Generated:  ${outputPath}`);
    console.log('\n💡 Open both files side-by-side to verify declaration text is identical.');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkGeneratedDeclaration();
