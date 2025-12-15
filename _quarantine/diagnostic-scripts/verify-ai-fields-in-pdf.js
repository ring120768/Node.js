const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

async function verifyAIFields() {
  const pdfPath = 'test-output/filled-form-5326c2aa-f1d5-4edc-a972-7fb14995ed0f.pdf';
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  console.log('\n📋 VERIFYING AI ANALYSIS FIELDS (Pages 13-16)\n');
  console.log('='.repeat(80));

  // Page 13 fields
  console.log('\n📄 PAGE 13 - Voice Transcription & Quality Review:\n');

  const voiceTranscription = form.getTextField('voice_transcription');
  const voiceText = voiceTranscription.getText() || '(empty)';
  console.log('✓ voice_transcription:', voiceText.substring(0, 100) + '...');
  console.log('  Length:', voiceText.length, 'characters\n');

  const analysisMetadata = form.getTextField('analysis_metadata');
  const metadataText = analysisMetadata.getText() || '(empty)';
  console.log('✓ analysis_metadata:', metadataText);
  console.log('  Length:', metadataText.length, 'characters\n');

  const qualityReview = form.getTextField('quality_review');
  const reviewText = qualityReview.getText() || '(empty)';
  console.log('✓ quality_review:', reviewText.substring(0, 100) + '...');
  console.log('  Length:', reviewText.length, 'characters\n');

  // Page 14 field
  console.log('='.repeat(80));
  console.log('\n📄 PAGE 14 - AI Summary:\n');

  const aiSummary = form.getTextField('ai_summary');
  const summaryText = aiSummary.getText() || '(empty)';
  console.log('✓ ai_summary:', summaryText.substring(0, 150) + '...');
  console.log('  Length:', summaryText.length, 'characters\n');

  // Page 15 field
  console.log('='.repeat(80));
  console.log('\n📄 PAGE 15 - Closing Statement:\n');

  const closingStatement = form.getTextField('closing_statement');
  const closingText = closingStatement.getText() || '(empty)';
  console.log('✓ closing_statement:', closingText.substring(0, 150) + '...');
  console.log('  Length:', closingText.length, 'characters\n');

  // Page 16 field
  console.log('='.repeat(80));
  console.log('\n📄 PAGE 16 - Final Review:\n');

  const finalReview = form.getTextField('final_review');
  const finalText = finalReview.getText() || '(empty)';
  console.log('✓ final_review:', finalText.substring(0, 150) + '...');
  console.log('  Length:', finalText.length, 'characters\n');

  console.log('='.repeat(80));

  // Summary
  const allFieldsPopulated =
    voiceText !== '(empty)' &&
    metadataText !== '(empty)' &&
    reviewText !== '(empty)' &&
    summaryText !== '(empty)' &&
    closingText !== '(empty)' &&
    finalText !== '(empty)';

  if (allFieldsPopulated) {
    console.log('\n✅ SUCCESS! All 6 AI analysis fields are populated in the PDF');
  } else {
    console.log('\n⚠️  WARNING: Some AI analysis fields are empty');
  }
}

verifyAIFields().catch(console.error);
