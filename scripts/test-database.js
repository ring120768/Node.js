#!/usr/bin/env node
// scripts/test-database.js - Comprehensive Database Testing Script
// Tests incident_reports and images tables thoroughly

require('dotenv').config();
const db = require('../src/utils/db');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function header(title) {
    console.log('\n' + '='.repeat(80));
    log(title, colors.bright + colors.cyan);
    console.log('='.repeat(80) + '\n');
}

function section(title) {
    console.log('\n' + '-'.repeat(60));
    log(title, colors.yellow);
    console.log('-'.repeat(60));
}

async function testConnection() {
    header('🔌 TESTING DATABASE CONNECTION');

    try {
        const connected = await db.testConnection();
        if (connected) {
            log('✅ Database connection successful!', colors.green);
            return true;
        } else {
            log('❌ Database connection failed!', colors.red);
            return false;
        }
    } catch (error) {
        log(`❌ Connection error: ${error.message}`, colors.red);
        return false;
    }
}

async function inspectTable(tableName) {
    header(`📊 INSPECTING TABLE: ${tableName}`);

    try {
        // Get table schema
        section('Column Schema');
        const schema = await db.getTableSchema(tableName);

        if (schema.length === 0) {
            log(`⚠️  Table '${tableName}' not found or has no columns`, colors.yellow);
            return false;
        }

        console.table(schema);
        log(`Total columns: ${schema.length}`, colors.blue);

        // Get constraints
        section('Constraints (Primary Keys, Foreign Keys)');
        const constraints = await db.getTableConstraints(tableName);
        console.table(constraints);

        // Get indexes
        section('Indexes');
        const indexes = await db.getTableIndexes(tableName);
        console.table(indexes);

        // Count rows
        section('Row Count');
        const count = await db.countRows(tableName);
        log(`Total rows: ${count}`, colors.blue);

        // Get sample data
        section('Sample Data (First 5 Rows)');
        const samples = await db.getSampleRows(tableName, 5);
        if (samples.length > 0) {
            console.table(samples);
        } else {
            log('⚠️  No data in table', colors.yellow);
        }

        return true;
    } catch (error) {
        log(`❌ Error inspecting table: ${error.message}`, colors.red);
        console.error(error);
        return false;
    }
}

async function testIncidentReports() {
    header('🚗 TESTING INCIDENT_REPORTS TABLE');

    try {
        // Check if table exists
        const exists = await inspectTable('incident_reports');
        if (!exists) {
            log('❌ incident_reports table not found', colors.red);
            return;
        }

        section('Custom Queries - Recent Reports');
        const recentReports = await db.query(`
            SELECT
                id,
                user_id,
                accident_location,
                what3words,
                created_at,
                status
            FROM incident_reports
            ORDER BY created_at DESC
            LIMIT 5
        `);

        if (recentReports.rows.length > 0) {
            console.table(recentReports.rows);
            log(`✅ Found ${recentReports.rows.length} recent reports`, colors.green);
        } else {
            log('⚠️  No incident reports found', colors.yellow);
        }

        // Check for reports with images
        section('Reports with Associated Images');
        const reportsWithImages = await db.query(`
            SELECT
                ir.id,
                ir.accident_location,
                COUNT(img.id) as image_count
            FROM incident_reports ir
            LEFT JOIN images img ON img.incident_report_id = ir.id
            GROUP BY ir.id, ir.accident_location
            HAVING COUNT(img.id) > 0
            LIMIT 5
        `);

        if (reportsWithImages.rows.length > 0) {
            console.table(reportsWithImages.rows);
            log(`✅ Found ${reportsWithImages.rows.length} reports with images`, colors.green);
        } else {
            log('⚠️  No reports with images found', colors.yellow);
        }

    } catch (error) {
        log(`❌ Error testing incident_reports: ${error.message}`, colors.red);
        console.error(error);
    }
}

async function testImages() {
    header('📸 TESTING IMAGES TABLE');

    try {
        // Check if table exists
        const exists = await inspectTable('images');
        if (!exists) {
            log('❌ images table not found', colors.red);
            return;
        }

        section('Custom Queries - Recent Images');
        const recentImages = await db.query(`
            SELECT
                id,
                incident_report_id,
                storage_path,
                image_type,
                file_size,
                uploaded_at
            FROM images
            ORDER BY uploaded_at DESC
            LIMIT 5
        `);

        if (recentImages.rows.length > 0) {
            console.table(recentImages.rows);
            log(`✅ Found ${recentImages.rows.length} recent images`, colors.green);
        } else {
            log('⚠️  No images found', colors.yellow);
        }

        // Check image types distribution
        section('Image Types Distribution');
        const imageTypes = await db.query(`
            SELECT
                image_type,
                COUNT(*) as count
            FROM images
            GROUP BY image_type
            ORDER BY count DESC
        `);

        if (imageTypes.rows.length > 0) {
            console.table(imageTypes.rows);
        } else {
            log('⚠️  No image type data available', colors.yellow);
        }

    } catch (error) {
        log(`❌ Error testing images: ${error.message}`, colors.red);
        console.error(error);
    }
}

async function testRelationships() {
    header('🔗 TESTING TABLE RELATIONSHIPS');

    try {
        section('Foreign Key Relationships');

        // Check images -> incident_reports relationship
        const fkCheck = await db.query(`
            SELECT
                COUNT(DISTINCT img.id) as total_images,
                COUNT(DISTINCT ir.id) as linked_reports,
                COUNT(DISTINCT CASE WHEN ir.id IS NULL THEN img.id END) as orphaned_images
            FROM images img
            LEFT JOIN incident_reports ir ON img.incident_report_id = ir.id
        `);

        console.table(fkCheck.rows);

        if (fkCheck.rows[0].orphaned_images > 0) {
            log(`⚠️  Found ${fkCheck.rows[0].orphaned_images} orphaned images (no matching incident report)`, colors.yellow);
        } else {
            log('✅ All images are properly linked to incident reports', colors.green);
        }

    } catch (error) {
        log(`❌ Error testing relationships: ${error.message}`, colors.red);
        console.error(error);
    }
}

async function testDataIntegrity() {
    header('🔍 TESTING DATA INTEGRITY');

    try {
        section('Checking for NULL values in required fields');

        // Check incident_reports for NULL user_ids
        const nullUserIds = await db.query(`
            SELECT COUNT(*) as count
            FROM incident_reports
            WHERE user_id IS NULL
        `);

        log(`Incident reports with NULL user_id: ${nullUserIds.rows[0].count}`,
            nullUserIds.rows[0].count > 0 ? colors.yellow : colors.green);

        // Check images for NULL incident_report_ids
        const nullIncidentIds = await db.query(`
            SELECT COUNT(*) as count
            FROM images
            WHERE incident_report_id IS NULL
        `);

        log(`Images with NULL incident_report_id: ${nullIncidentIds.rows[0].count}`,
            nullIncidentIds.rows[0].count > 0 ? colors.yellow : colors.green);

        section('Checking for duplicate entries');

        // Check for potential duplicates in incident_reports
        const duplicates = await db.query(`
            SELECT
                user_id,
                accident_location,
                DATE_TRUNC('minute', created_at) as created_minute,
                COUNT(*) as count
            FROM incident_reports
            WHERE user_id IS NOT NULL AND accident_location IS NOT NULL
            GROUP BY user_id, accident_location, DATE_TRUNC('minute', created_at)
            HAVING COUNT(*) > 1
        `);

        if (duplicates.rows.length > 0) {
            log(`⚠️  Found ${duplicates.rows.length} potential duplicate reports`, colors.yellow);
            console.table(duplicates.rows);
        } else {
            log('✅ No duplicate reports found', colors.green);
        }

    } catch (error) {
        log(`❌ Error testing data integrity: ${error.message}`, colors.red);
        console.error(error);
    }
}

async function showSummary() {
    header('📋 DATABASE SUMMARY');

    try {
        const summary = await db.query(`
            SELECT
                (SELECT COUNT(*) FROM incident_reports) as total_reports,
                (SELECT COUNT(*) FROM images) as total_images,
                (SELECT COUNT(*) FROM incident_reports WHERE created_at > NOW() - INTERVAL '7 days') as reports_last_7_days,
                (SELECT COUNT(*) FROM images WHERE uploaded_at > NOW() - INTERVAL '7 days') as images_last_7_days
        `);

        console.table(summary.rows);

        log('\n✅ Database testing complete!', colors.bright + colors.green);

    } catch (error) {
        log(`❌ Error generating summary: ${error.message}`, colors.red);
        console.error(error);
    }
}

async function main() {
    log('\n🚀 Starting Comprehensive Database Test...', colors.bright + colors.blue);
    log(`📅 ${new Date().toLocaleString()}`, colors.blue);

    try {
        // Test connection
        const connected = await testConnection();
        if (!connected) {
            log('\n❌ Cannot proceed without database connection', colors.red);
            process.exit(1);
        }

        // Test incident_reports table
        await testIncidentReports();

        // Test images table
        await testImages();

        // Test relationships
        await testRelationships();

        // Test data integrity
        await testDataIntegrity();

        // Show summary
        await showSummary();

    } catch (error) {
        log(`\n❌ Fatal error: ${error.message}`, colors.red);
        console.error(error);
        process.exit(1);
    } finally {
        // Close database connection
        await db.close();
        log('\n👋 Database connection closed', colors.blue);
    }
}

// Run the tests
main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
