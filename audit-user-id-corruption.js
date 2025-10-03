
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function auditUserIdCorruption() {
    console.log('🔍 COMPREHENSIVE USER ID CORRUPTION AUDIT');
    console.log('==========================================');
    
    const findings = {
        database: {},
        codebase: {},
        recommendations: []
    };

    // 1. Audit Database for Corruption
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.log('📊 Auditing database for corrupted user IDs...');
        
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const tablesToAudit = [
            'user_signup',
            'incident_reports', 
            'ai_transcription',
            'ai_summary',
            'transcription_queue',
            'gdpr_audit_log'
        ];

        for (const table of tablesToAudit) {
            try {
                const { data, error } = await supabase
                    .from(table)
                    .select('create_user_id, user_id')
                    .limit(1000);

                if (error) {
                    console.warn(`⚠️ Could not audit ${table}:`, error.message);
                    continue;
                }

                const corrupted = [];
                const suspicious = [];
                
                data.forEach(row => {
                    const userIds = [row.create_user_id, row.user_id].filter(Boolean);
                    
                    userIds.forEach(userId => {
                        if (userId) {
                            // Check for obvious corruption
                            if (userId.startsWith('temp_') || userId.startsWith('user_') || 
                                userId.includes('dummy') || userId.includes('test_') ||
                                userId.includes('mock_') || userId.includes('generated_')) {
                                corrupted.push(userId);
                            }
                            // Check for suspicious patterns
                            else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
                                suspicious.push(userId);
                            }
                            // Check for timestamp patterns
                            else if (/\d{13}/.test(userId)) {
                                suspicious.push(userId);
                            }
                        }
                    });
                });

                findings.database[table] = {
                    total_records: data.length,
                    corrupted_ids: [...new Set(corrupted)],
                    suspicious_ids: [...new Set(suspicious)],
                    corruption_count: [...new Set(corrupted)].length,
                    suspicious_count: [...new Set(suspicious)].length
                };

                if (corrupted.length > 0) {
                    console.log(`🚨 ${table}: Found ${corrupted.length} corrupted user IDs`);
                    corrupted.slice(0, 5).forEach(id => console.log(`  - ${id}`));
                }
                if (suspicious.length > 0) {
                    console.log(`⚠️ ${table}: Found ${suspicious.length} suspicious user IDs`);
                    suspicious.slice(0, 5).forEach(id => console.log(`  - ${id}`));
                }
                if (corrupted.length === 0 && suspicious.length === 0) {
                    console.log(`✅ ${table}: Clean`);
                }

            } catch (tableError) {
                console.warn(`❌ Error auditing ${table}:`, tableError.message);
            }
        }
    }

    // 2. Audit Codebase for ID Generation
    console.log('\n🔍 Auditing codebase for ID generation patterns...');
    
    const filesToAudit = [
        'index.js',
        'lib/mockFunctions.js',
        'lib/transcriptionService.js',
        'lib/incidentEndpoints.js',
        'services/gdprService.js'
    ];

    const dangerousPatterns = [
        /temp_.*=.*user/gi,
        /user.*=.*temp_/gi,
        /userId.*=.*['"]\w+_\d+/gi,
        /create_user_id.*=.*['"]\w+_/gi,
        /generateUserId/gi,
        /createUserId/gi,
        /Math\.random.*user/gi,
        /Date\.now.*user/gi,
        /uuid.*user/gi,
        /randomUUID.*user/gi
    ];

    for (const filePath of filesToAudit) {
        if (fs.existsSync(filePath)) {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const matches = [];
                
                dangerousPatterns.forEach((pattern, index) => {
                    const found = content.match(pattern);
                    if (found) {
                        matches.push(...found.map(match => ({ pattern: index, match })));
                    }
                });

                findings.codebase[filePath] = {
                    suspicious_patterns: matches.length,
                    matches: matches
                };

                if (matches.length > 0) {
                    console.log(`🚨 ${filePath}: Found ${matches.length} suspicious patterns`);
                    matches.forEach(m => console.log(`  - ${m.match}`));
                } else {
                    console.log(`✅ ${filePath}: Clean`);
                }

            } catch (fileError) {
                console.warn(`❌ Error reading ${filePath}:`, fileError.message);
            }
        }
    }

    // 3. Generate Recommendations
    console.log('\n📋 Generating recommendations...');
    
    const totalCorrupted = Object.values(findings.database)
        .reduce((sum, table) => sum + (table.corruption_count || 0), 0);
    
    const totalSuspicious = Object.values(findings.database)
        .reduce((sum, table) => sum + (table.suspicious_count || 0), 0);

    if (totalCorrupted > 0) {
        findings.recommendations.push(`CRITICAL: Found ${totalCorrupted} corrupted user IDs in database - immediate cleanup required`);
    }
    
    if (totalSuspicious > 0) {
        findings.recommendations.push(`WARNING: Found ${totalSuspicious} suspicious user IDs - review and validate`);
    }

    const codeIssues = Object.values(findings.codebase)
        .reduce((sum, file) => sum + (file.suspicious_patterns || 0), 0);
    
    if (codeIssues > 0) {
        findings.recommendations.push(`CODE: Found ${codeIssues} suspicious patterns in code - review for ID generation`);
    }

    // 4. Output Results
    console.log('\n🎯 AUDIT SUMMARY');
    console.log('================');
    console.log(`Database corrupted IDs: ${totalCorrupted}`);
    console.log(`Database suspicious IDs: ${totalSuspicious}`);
    console.log(`Code suspicious patterns: ${codeIssues}`);
    
    console.log('\n📋 RECOMMENDATIONS:');
    findings.recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. ${rec}`);
    });

    if (totalCorrupted === 0 && totalSuspicious === 0 && codeIssues === 0) {
        console.log('\n🎉 ✅ NO CORRUPTION DETECTED - System appears clean!');
    } else {
        console.log('\n⚠️ 🚨 CORRUPTION DETECTED - Action required!');
    }

    // Save detailed report
    const reportPath = path.join(__dirname, 'corruption-audit-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(findings, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    return findings;
}

// Run audit if called directly
if (require.main === module) {
    auditUserIdCorruption().catch(console.error);
}

module.exports = { auditUserIdCorruption };
