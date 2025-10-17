#!/usr/bin/env node
// scripts/test-supabase-client.js - Test using Supabase JS Client
// Alternative to direct PostgreSQL connection

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

async function main() {
    console.log('\n' + '='.repeat(80));
    log('🔌 TESTING SUPABASE CONNECTION (JS Client)', colors.cyan);
    console.log('='.repeat(80) + '\n');

    // Get credentials from environment
    const supabaseUrl = process.env.SUPABASE_URL || 'https://kctlcmbjmhcfoobmkfrs.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseKey || supabaseKey.includes('your-')) {
        log('❌ ERROR: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY not configured in .env', colors.red);
        log('\nPlease add to your .env file:', colors.yellow);
        log('SUPABASE_URL=https://kctlcmbjmhcfoobmkfrs.supabase.co', colors.blue);
        log('SUPABASE_SERVICE_ROLE_KEY=your-actual-key-here', colors.blue);
        log('\nYou can find these in Supabase Dashboard → Settings → API\n', colors.yellow);
        process.exit(1);
    }

    log(`📍 Supabase URL: ${supabaseUrl}`, colors.blue);
    log(`🔑 Using Service Role Key: ${supabaseKey.substring(0, 20)}...`, colors.blue);

    try {
        // Create Supabase client
        const supabase = createClient(supabaseUrl, supabaseKey);

        log('\n✅ Supabase client created successfully', colors.green);

        // Test 1: Query incident_reports table
        log('\n' + '-'.repeat(60), colors.yellow);
        log('📊 Testing incident_reports table...', colors.yellow);
        log('-'.repeat(60));

        const { data: reports, error: reportsError, count: reportsCount } = await supabase
            .from('incident_reports')
            .select('*', { count: 'exact', head: false })
            .limit(5);

        if (reportsError) {
            log(`❌ Error querying incident_reports: ${reportsError.message}`, colors.red);
        } else {
            log(`✅ Successfully queried incident_reports table`, colors.green);
            log(`   Total rows: ${reportsCount}`, colors.blue);
            log(`   Sample size: ${reports?.length || 0}`, colors.blue);

            if (reports && reports.length > 0) {
                console.log('\nSample data:');
                console.table(reports.map(r => ({
                    id: r.id,
                    user_id: r.user_id?.substring(0, 8) + '...',
                    location: r.accident_location?.substring(0, 30) + '...',
                    what3words: r.what3words,
                    created: new Date(r.created_at).toLocaleDateString()
                })));
            }
        }

        // Test 2: Query images table
        log('\n' + '-'.repeat(60), colors.yellow);
        log('📸 Testing images table...', colors.yellow);
        log('-'.repeat(60));

        const { data: images, error: imagesError, count: imagesCount } = await supabase
            .from('images')
            .select('*', { count: 'exact', head: false })
            .limit(5);

        if (imagesError) {
            log(`❌ Error querying images: ${imagesError.message}`, colors.red);
        } else {
            log(`✅ Successfully queried images table`, colors.green);
            log(`   Total rows: ${imagesCount}`, colors.blue);
            log(`   Sample size: ${images?.length || 0}`, colors.blue);

            if (images && images.length > 0) {
                console.log('\nSample data:');
                console.table(images.map(i => ({
                    id: i.id,
                    incident_id: i.incident_report_id,
                    type: i.image_type,
                    size: i.file_size,
                    uploaded: new Date(i.uploaded_at).toLocaleDateString()
                })));
            }
        }

        // Test 3: Check relationship
        log('\n' + '-'.repeat(60), colors.yellow);
        log('🔗 Testing table relationships...', colors.yellow);
        log('-'.repeat(60));

        const { data: reportsWithImages, error: joinError } = await supabase
            .from('incident_reports')
            .select(`
                id,
                accident_location,
                images (
                    id,
                    image_type,
                    storage_path
                )
            `)
            .limit(3);

        if (joinError) {
            log(`❌ Error testing relationship: ${joinError.message}`, colors.red);
        } else {
            log(`✅ Successfully tested incident_reports → images relationship`, colors.green);
            log(`   Found ${reportsWithImages?.length || 0} reports with image data`, colors.blue);

            if (reportsWithImages && reportsWithImages.length > 0) {
                reportsWithImages.forEach(report => {
                    const imageCount = report.images?.length || 0;
                    log(`   Report ${report.id}: ${imageCount} images`, colors.blue);
                });
            }
        }

        log('\n' + '='.repeat(80));
        log('✅ Supabase connection test complete!', colors.green);
        log('='.repeat(80) + '\n');

    } catch (error) {
        log(`\n❌ Fatal error: ${error.message}`, colors.red);
        console.error(error);
        process.exit(1);
    }
}

main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
