
#!/usr/bin/env node
/**
 * Car Crash Lawyer AI System - Project File Cleanup Script
 * Safely identifies and removes test, temporary, and development files
 * Creates backups before deletion and requires confirmation
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase().trim());
    });
  });
}

class ProjectCleaner {
  constructor() {
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.backupDir = `backup_cleanup_${this.timestamp}`;
    this.logFile = `cleanup_log_${this.timestamp}.txt`;
    this.foundFiles = {
      testFiles: [],
      tempFiles: [],
      devArtifacts: [],
      logFiles: [],
      buildArtifacts: []
    };
    this.deletionLog = [];
    
    // Critical files to preserve
    this.preservePatterns = [
      /^index\.js$/,
      /^package(-lock)?\.json$/,
      /^\.env$/,
      /^constants\.js$/,
      /^webhookDebugger\.js$/, // Will check if actively used
      /^template\.pdf$/i,
      /Car.*and.*scales.*logo.*\.png$/i,
      /^logo\.png$/i
    ];
    
    this.preserveDirectories = [
      'lib',
      'services',
      'public'
    ];
  }

  async init() {
    log('🧹 Car Crash Lawyer AI System - File Cleanup Tool', 'cyan');
    log('='.repeat(60), 'cyan');
    log(`Timestamp: ${this.timestamp}`, 'blue');
    log(`Backup directory: ${this.backupDir}`, 'blue');
    log(`Log file: ${this.logFile}`, 'blue');
    console.log();

    // Create backup directory
    this.createBackupDirectory();
    
    // Initialize log file
    this.writeLog('='.repeat(60));
    this.writeLog(`Car Crash Lawyer AI System - Cleanup Log`);
    this.writeLog(`Started at: ${new Date().toISOString()}`);
    this.writeLog('='.repeat(60));
  }

  createBackupDirectory() {
    try {
      fs.mkdirSync(this.backupDir, { recursive: true });
      log(`✅ Created backup directory: ${this.backupDir}`, 'green');
    } catch (error) {
      log(`❌ Failed to create backup directory: ${error.message}`, 'red');
      process.exit(1);
    }
  }

  writeLog(message) {
    const logEntry = `[${new Date().toISOString()}] ${message}\n`;
    fs.appendFileSync(this.logFile, logEntry);
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileInfo(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return {
        size: stats.size,
        modified: stats.mtime.toISOString(),
        isDirectory: stats.isDirectory()
      };
    } catch (error) {
      return null;
    }
  }

  shouldPreserveFile(filePath, fileName) {
    // Check if file matches preserve patterns
    for (const pattern of this.preservePatterns) {
      if (pattern.test(fileName)) {
        return true;
      }
    }

    // Check if file is in preserve directories
    const relativePath = path.relative('.', filePath);
    for (const dir of this.preserveDirectories) {
      if (relativePath.startsWith(dir + '/') || relativePath.startsWith(dir + '\\')) {
        // But allow test files in lib directory to be cleaned
        if (dir === 'lib' && (fileName.includes('test') || fileName.includes('Test'))) {
          return false;
        }
        return true;
      }
    }

    return false;
  }

  async checkWebhookDebuggerUsage() {
    try {
      const indexContent = fs.readFileSync('index.js', 'utf8');
      return indexContent.includes('webhookDebugger') || indexContent.includes('WebhookDebugger');
    } catch (error) {
      return false;
    }
  }

  async scanDirectory(dir, category) {
    if (!fs.existsSync(dir)) return;

    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const fileInfo = this.getFileInfo(fullPath);
        
        if (!fileInfo) continue;

        if (fileInfo.isDirectory) {
          await this.scanDirectory(fullPath, category);
        } else {
          const fileName = path.basename(item);
          
          // Skip preserved files
          if (this.shouldPreserveFile(fullPath, fileName)) {
            continue;
          }

          this.foundFiles[category].push({
            path: fullPath,
            name: fileName,
            size: fileInfo.size,
            modified: fileInfo.modified
          });
        }
      }
    } catch (error) {
      log(`⚠️ Error scanning ${dir}: ${error.message}`, 'yellow');
    }
  }

  async identifyFiles() {
    log('🔍 Scanning project for cleanup candidates...', 'yellow');

    // 1. TEST FILES
    log('  📋 Identifying test files...', 'blue');
    const testPatterns = [
      /^fix-transcription\.js$/,
      /^test-transcription\.js$/,
      /^testModules\.js$/,
      /^migrate\.js$/,
      /^indextemp\.js$/,
      /^test-.*\.js$/,
      /.*-test\.js$/,
      /.*\.test\.js$/,
      /.*\.spec\.js$/
    ];

    const rootFiles = fs.readdirSync('.');
    for (const file of rootFiles) {
      const filePath = path.join('.', file);
      const fileInfo = this.getFileInfo(filePath);
      
      if (fileInfo && !fileInfo.isDirectory) {
        for (const pattern of testPatterns) {
          if (pattern.test(file) && !this.shouldPreserveFile(filePath, file)) {
            this.foundFiles.testFiles.push({
              path: filePath,
              name: file,
              size: fileInfo.size,
              modified: fileInfo.modified
            });
            break;
          }
        }
      }
    }

    // Also scan test directory
    await this.scanDirectory('test', 'testFiles');

    // 2. TEMPORARY/DEBUG FILES
    log('  🔧 Identifying temporary and debug files...', 'blue');
    
    // Check webhookDebugger.js usage
    const webhookDebuggerUsed = await this.checkWebhookDebuggerUsage();
    if (!webhookDebuggerUsed && fs.existsSync('webhookDebugger.js')) {
      const fileInfo = this.getFileInfo('webhookDebugger.js');
      this.foundFiles.tempFiles.push({
        path: 'webhookDebugger.js',
        name: 'webhookDebugger.js',
        size: fileInfo.size,
        modified: fileInfo.modified
      });
    }

    // Old audio files in uploads/audio
    if (fs.existsSync('uploads/audio')) {
      const audioFiles = fs.readdirSync('uploads/audio');
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      
      for (const file of audioFiles) {
        const filePath = path.join('uploads/audio', file);
        const fileInfo = this.getFileInfo(filePath);
        
        if (fileInfo && !fileInfo.isDirectory && new Date(fileInfo.modified).getTime() < oneDayAgo) {
          this.foundFiles.tempFiles.push({
            path: filePath,
            name: file,
            size: fileInfo.size,
            modified: fileInfo.modified
          });
        }
      }
    }

    // Temp files in root
    const tempPatterns = [/\.tmp$/, /\.temp$/];
    for (const file of rootFiles) {
      const filePath = path.join('.', file);
      const fileInfo = this.getFileInfo(filePath);
      
      if (fileInfo && !fileInfo.isDirectory) {
        for (const pattern of tempPatterns) {
          if (pattern.test(file)) {
            this.foundFiles.tempFiles.push({
              path: filePath,
              name: file,
              size: fileInfo.size,
              modified: fileInfo.modified
            });
            break;
          }
        }
      }
    }

    // 3. DEVELOPMENT ARTIFACTS
    log('  📸 Identifying development artifacts...', 'blue');
    if (fs.existsSync('attached_assets')) {
      const assets = fs.readdirSync('attached_assets');
      const devPatterns = [
        /^Screenshot.*\.(png|jpeg|jpg)$/i,
        /^Pasted-.*\.txt$/,
        /^IMG_.*\.PNG$/,
        /transcription_queue_rows_.*\.csv$/
      ];

      for (const file of assets) {
        const filePath = path.join('attached_assets', file);
        const fileInfo = this.getFileInfo(filePath);
        
        if (fileInfo && !fileInfo.isDirectory) {
          // Skip logo files
          if (/logo/i.test(file)) continue;
          
          for (const pattern of devPatterns) {
            if (pattern.test(file)) {
              this.foundFiles.devArtifacts.push({
                path: filePath,
                name: file,
                size: fileInfo.size,
                modified: fileInfo.modified
              });
              break;
            }
          }
        }
      }
    }

    // 4. LOG FILES
    log('  📜 Identifying log files...', 'blue');
    const logPatterns = [/\.log$/, /npm-debug\.log$/, /yarn-error\.log$/];
    
    const scanForLogs = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const fileInfo = this.getFileInfo(fullPath);
          
          if (fileInfo && !fileInfo.isDirectory) {
            for (const pattern of logPatterns) {
              if (pattern.test(item)) {
                this.foundFiles.logFiles.push({
                  path: fullPath,
                  name: item,
                  size: fileInfo.size,
                  modified: fileInfo.modified
                });
                break;
              }
            }
          }
        }
      } catch (error) {
        // Ignore scan errors
      }
    };

    scanForLogs('.');
    scanForLogs('logs');

    // 5. BUILD ARTIFACTS
    log('  🏗️ Identifying build artifacts...', 'blue');
    const buildPatterns = [/\.DS_Store$/, /Thumbs\.db$/];
    
    const scanForBuildArtifacts = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          
          if (item.isFile()) {
            for (const pattern of buildPatterns) {
              if (pattern.test(item.name)) {
                const fileInfo = this.getFileInfo(fullPath);
                this.foundFiles.buildArtifacts.push({
                  path: fullPath,
                  name: item.name,
                  size: fileInfo.size,
                  modified: fileInfo.modified
                });
                break;
              }
            }
          } else if (item.isDirectory() && item.name !== 'node_modules') {
            scanForBuildArtifacts(fullPath);
          }
        }
      } catch (error) {
        // Ignore scan errors
      }
    };

    scanForBuildArtifacts('.');

    // Check for node_modules/.cache
    if (fs.existsSync('node_modules/.cache')) {
      const cacheInfo = this.getFileInfo('node_modules/.cache');
      if (cacheInfo) {
        this.foundFiles.buildArtifacts.push({
          path: 'node_modules/.cache',
          name: '.cache (directory)',
          size: 0, // Directory size calculation would be complex
          modified: cacheInfo.modified
        });
      }
    }

    log('✅ File scan complete!', 'green');
  }

  displayFoundFiles() {
    log('\n📊 CLEANUP CANDIDATES FOUND:', 'cyan');
    log('='.repeat(60), 'cyan');

    const categories = [
      { key: 'testFiles', name: 'TEST FILES', color: 'yellow' },
      { key: 'tempFiles', name: 'TEMPORARY/DEBUG FILES', color: 'magenta' },
      { key: 'devArtifacts', name: 'DEVELOPMENT ARTIFACTS', color: 'blue' },
      { key: 'logFiles', name: 'LOG FILES', color: 'white' },
      { key: 'buildArtifacts', name: 'BUILD ARTIFACTS', color: 'green' }
    ];

    let totalFiles = 0;
    let totalSize = 0;

    for (const category of categories) {
      const files = this.foundFiles[category.key];
      if (files.length === 0) {
        log(`\n${category.name}: None found`, category.color);
        continue;
      }

      log(`\n${category.name} (${files.length} files):`, category.color);
      log('-'.repeat(40), category.color);

      files.forEach(file => {
        const sizeStr = this.formatFileSize(file.size);
        const modifiedDate = new Date(file.modified).toLocaleDateString();
        log(`  📄 ${file.path}`, 'white');
        log(`     Size: ${sizeStr} | Modified: ${modifiedDate}`, 'white');
        totalSize += file.size;
      });

      totalFiles += files.length;
    }

    log(`\n📈 SUMMARY:`, 'cyan');
    log(`Total files found: ${totalFiles}`, 'cyan');
    log(`Total size: ${this.formatFileSize(totalSize)}`, 'cyan');
  }

  async backupFiles(files) {
    for (const file of files) {
      try {
        const relativePath = path.relative('.', file.path);
        const backupPath = path.join(this.backupDir, relativePath);
        const backupDir = path.dirname(backupPath);

        // Create backup directory structure
        fs.mkdirSync(backupDir, { recursive: true });

        // Copy file to backup
        if (fs.existsSync(file.path)) {
          fs.copyFileSync(file.path, backupPath);
          this.writeLog(`BACKUP: ${file.path} -> ${backupPath}`);
        }
      } catch (error) {
        log(`⚠️ Failed to backup ${file.path}: ${error.message}`, 'yellow');
        this.writeLog(`BACKUP_ERROR: ${file.path} - ${error.message}`);
      }
    }
  }

  async deleteFiles(files) {
    for (const file of files) {
      try {
        if (fs.existsSync(file.path)) {
          const stats = fs.statSync(file.path);
          
          if (stats.isDirectory()) {
            fs.rmSync(file.path, { recursive: true, force: true });
          } else {
            fs.unlinkSync(file.path);
          }
          
          this.deletionLog.push(file.path);
          this.writeLog(`DELETED: ${file.path} (${this.formatFileSize(file.size)})`);
          log(`  ✅ Deleted: ${file.path}`, 'green');
        }
      } catch (error) {
        log(`  ❌ Failed to delete ${file.path}: ${error.message}`, 'red');
        this.writeLog(`DELETE_ERROR: ${file.path} - ${error.message}`);
      }
    }
  }

  async processCategory(categoryKey, categoryName) {
    const files = this.foundFiles[categoryKey];
    
    if (files.length === 0) {
      log(`\n${categoryName}: No files to process`, 'blue');
      return;
    }

    log(`\n${categoryName}:`, 'yellow');
    log(`Found ${files.length} files`, 'white');

    const answer = await askQuestion(`Delete these ${files.length} files? (y/n/s=show files): `);
    
    if (answer === 's' || answer === 'show') {
      log('\nFiles in this category:', 'white');
      files.forEach(file => {
        log(`  📄 ${file.path} (${this.formatFileSize(file.size)})`, 'white');
      });
      
      const secondAnswer = await askQuestion(`Now delete these ${files.length} files? (y/n): `);
      if (secondAnswer === 'y' || secondAnswer === 'yes') {
        log('  📦 Creating backups...', 'blue');
        await this.backupFiles(files);
        log('  🗑️ Deleting files...', 'red');
        await this.deleteFiles(files);
      } else {
        log('  ⏭️ Skipped', 'yellow');
        this.writeLog(`SKIPPED: ${categoryName} (${files.length} files)`);
      }
    } else if (answer === 'y' || answer === 'yes') {
      log('  📦 Creating backups...', 'blue');
      await this.backupFiles(files);
      log('  🗑️ Deleting files...', 'red');
      await this.deleteFiles(files);
    } else {
      log('  ⏭️ Skipped', 'yellow');
      this.writeLog(`SKIPPED: ${categoryName} (${files.length} files)`);
    }
  }

  async cleanup() {
    log('\n🚀 Starting interactive cleanup process...', 'green');
    log('You will be asked to confirm deletion for each category.', 'white');
    console.log();

    const categories = [
      { key: 'testFiles', name: 'TEST FILES' },
      { key: 'tempFiles', name: 'TEMPORARY/DEBUG FILES' },
      { key: 'devArtifacts', name: 'DEVELOPMENT ARTIFACTS' },
      { key: 'logFiles', name: 'LOG FILES' },
      { key: 'buildArtifacts', name: 'BUILD ARTIFACTS' }
    ];

    for (const category of categories) {
      await this.processCategory(category.key, category.name);
    }
  }

  generateSummary() {
    log('\n📋 CLEANUP SUMMARY:', 'cyan');
    log('='.repeat(50), 'cyan');
    log(`Files deleted: ${this.deletionLog.length}`, 'green');
    log(`Backup directory: ${this.backupDir}`, 'blue');
    log(`Log file: ${this.logFile}`, 'blue');
    
    this.writeLog('='.repeat(60));
    this.writeLog(`Cleanup completed at: ${new Date().toISOString()}`);
    this.writeLog(`Total files deleted: ${this.deletionLog.length}`);
    this.writeLog('Files deleted:');
    this.deletionLog.forEach(file => {
      this.writeLog(`  - ${file}`);
    });
    this.writeLog('='.repeat(60));

    if (this.deletionLog.length > 0) {
      log('\n💡 TIP: If you need to restore any files, they are available in:', 'yellow');
      log(`    ${this.backupDir}`, 'yellow');
    }
  }

  async run() {
    try {
      await this.init();
      await this.identifyFiles();
      this.displayFoundFiles();
      
      const proceed = await askQuestion('\nProceed with interactive cleanup? (y/n): ');
      if (proceed === 'y' || proceed === 'yes') {
        await this.cleanup();
        this.generateSummary();
      } else {
        log('\n⏹️ Cleanup cancelled. No files were deleted.', 'yellow');
        this.writeLog('CLEANUP_CANCELLED: User chose not to proceed');
      }
    } catch (error) {
      log(`\n❌ Error during cleanup: ${error.message}`, 'red');
      this.writeLog(`ERROR: ${error.message}`);
    } finally {
      rl.close();
      log('\n👋 Cleanup script finished.', 'cyan');
    }
  }
}

// Run the cleanup if called directly
if (require.main === module) {
  const cleaner = new ProjectCleaner();
  cleaner.run().catch(console.error);
}

module.exports = ProjectCleaner;
