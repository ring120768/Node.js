#!/usr/bin/env node
/**
 * VERIFY SCENE PHOTO CONTROLLER FIX
 *
 * Validates that incidentForm.controller.js contains the scene photo finalization code
 * and that it follows the correct pattern matching other photo types.
 *
 * Run: node verify-scene-photo-controller-fix.js
 */

const fs = require('fs');
const path = require('path');

const CONTROLLER_PATH = path.join(__dirname, 'src/controllers/incidentForm.controller.js');

console.log('🔍 SCENE PHOTO CONTROLLER FIX VERIFICATION\n');
console.log('Checking: ' + CONTROLLER_PATH + '\n');

// Read the controller file
const controllerCode = fs.readFileSync(CONTROLLER_PATH, 'utf8');
const lines = controllerCode.split('\n');

// Verification checks
const checks = {
  fileExists: false,
  scenePhotoBlockExists: false,
  correctFieldName: false,
  correctStorageCategory: false,
  correctDocumentType: false,
  errorHandlingExists: false,
  nonBlockingError: false,
  sessionIdCheck: false,
  loggerInfoExists: false,
  patternMatchesOtherPhotos: false
};

// Check 1: File exists
checks.fileExists = fs.existsSync(CONTROLLER_PATH);
console.log(`${checks.fileExists ? '✅' : '❌'} Controller file exists`);

if (!checks.fileExists) {
  console.log('\n❌ VERIFICATION FAILED: Controller file not found\n');
  process.exit(1);
}

// Check 2: Scene photo finalization block exists
const scenePhotoPattern = /Finalize scene photos.*Page 11/i;
checks.scenePhotoBlockExists = scenePhotoPattern.test(controllerCode);
console.log(`${checks.scenePhotoBlockExists ? '✅' : '❌'} Scene photo finalization block exists`);

// Check 3: Correct field_name parameter
checks.correctFieldName = /finalizePhotosByType\([^)]*'scene_photo'/.test(controllerCode);
console.log(`${checks.correctFieldName ? '✅' : '❌'} Correct field_name: 'scene_photo'`);

// Check 4: Correct storage category
checks.correctStorageCategory = /finalizePhotosByType\([^)]*'scene-photos'/.test(controllerCode);
console.log(`${checks.correctStorageCategory ? '✅' : '❌'} Correct storage category: 'scene-photos'`);

// Check 5: Correct document_type (appears twice in the pattern)
const documentTypeMatches = (controllerCode.match(/'scene_photo'/g) || []).length;
checks.correctDocumentType = documentTypeMatches >= 2;
console.log(`${checks.correctDocumentType ? '✅' : '❌'} Correct document_type: 'scene_photo' (${documentTypeMatches} occurrences)`);

// Check 6: Error handling exists
checks.errorHandlingExists = /catch\s*\(\s*photoError\s*\)/.test(controllerCode);
console.log(`${checks.errorHandlingExists ? '✅' : '❌'} Error handling (try-catch) exists`);

// Check 7: Non-blocking error (doesn't rethrow)
const scenePhotoBlockMatch = controllerCode.match(/\/\/ \d+\. Finalize scene photos[\s\S]*?(?=\/\/\s*\d+\.|$)/);
if (scenePhotoBlockMatch) {
  const blockCode = scenePhotoBlockMatch[0];
  // Should have catch block without 'throw' statement
  checks.nonBlockingError = /catch\s*\([^)]*\)\s*{[^}]*logger\.error[^}]*}/.test(blockCode) &&
                            !blockCode.includes('throw photoError');
}
console.log(`${checks.nonBlockingError ? '✅' : '❌'} Non-blocking error handling (doesn't fail submission)`);

// Check 8: Session ID check
checks.sessionIdCheck = /formData\.page11\?\.session_id/.test(controllerCode);
console.log(`${checks.sessionIdCheck ? '✅' : '❌'} Session ID check: formData.page11?.session_id`);

// Check 9: Logger info exists
checks.loggerInfoExists = /logger\.info\(['"]Scene photos finalized/.test(controllerCode);
console.log(`${checks.loggerInfoExists ? '✅' : '❌'} Success logging exists`);

// Check 10: Pattern matches other photo types
const otherPhotoPatterns = [
  /Finalize.*location photos/i,
  /Finalize.*vehicle damage photos/i,
  /Finalize.*other vehicle photos/i
];

let patternMatchCount = 0;
otherPhotoPatterns.forEach(pattern => {
  if (pattern.test(controllerCode)) patternMatchCount++;
});

checks.patternMatchesOtherPhotos = patternMatchCount >= 2; // Should have at least 2 other photo types
console.log(`${checks.patternMatchesOtherPhotos ? '✅' : '❌'} Pattern matches other photo types (${patternMatchCount} found)`);

// Final verdict
console.log('\n' + '='.repeat(80));
console.log('\n📊 VERIFICATION SUMMARY\n');

const passedChecks = Object.values(checks).filter(v => v === true).length;
const totalChecks = Object.keys(checks).length;
const passPercentage = Math.round((passedChecks / totalChecks) * 100);

console.log(`Passed: ${passedChecks}/${totalChecks} checks (${passPercentage}%)\n`);

if (passedChecks === totalChecks) {
  console.log('🎉 ALL CHECKS PASSED!\n');
  console.log('✅ Scene photo finalization code is correctly implemented');
  console.log('✅ Pattern matches existing photo finalization blocks');
  console.log('✅ Error handling is non-blocking');
  console.log('✅ All parameters are correct\n');
  console.log('📋 NEXT STEP: Manual end-to-end testing');
  console.log('   See SCENE_PHOTO_FIX_SUMMARY.md for test plan\n');
  process.exit(0);
} else {
  console.log('⚠️  SOME CHECKS FAILED\n');
  console.log('Failed checks:');
  Object.entries(checks).forEach(([check, passed]) => {
    if (!passed) {
      console.log(`   ❌ ${check}`);
    }
  });
  console.log('\n📋 REVIEW: src/controllers/incidentForm.controller.js');
  console.log('   Ensure scene photo finalization block follows correct pattern\n');
  process.exit(1);
}
