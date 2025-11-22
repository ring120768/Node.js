/**
 * Analyze Supabase Schema
 *
 * Queries database schema for all relevant tables to identify:
 * - Existing columns and data types
 * - Missing fields that need to be added
 * - Field gaps between HTML forms and database
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const logger = {
  info: (msg, data) => console.log(`\x1b[34mℹ\x1b[0m ${msg}`, data || ''),
  success: (msg, data) => console.log(`\x1b[32m✓\x1b[0m ${msg}`, data || ''),
  error: (msg, data) => console.log(`\x1b[31m✗\x1b[0m ${msg}`, data || ''),
  warn: (msg, data) => console.log(`\x1b[33m⚠\x1b[0m ${msg}`, data || '')
};

async function analyzeTableSchema(tableName) {
  logger.info(`\nAnalyzing table: ${tableName}`);
  logger.info('─'.repeat(80));

  try {
    // Query information_schema to get column details
    const { data, error } = await supabase
      .rpc('get_table_schema', { table_name: tableName })
      .select('*');

    if (error) {
      // Fallback: Try direct query if RPC doesn't exist
      logger.warn('RPC not available, using direct query...');

      const { data: columns, error: colError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (colError) throw colError;

      if (columns && columns.length > 0) {
        const columnNames = Object.keys(columns[0]);
        logger.success(`Found ${columnNames.length} columns`);
        logger.info('Columns:', columnNames.sort().join(', '));
        return columnNames;
      } else {
        logger.warn('Table exists but is empty');
        return [];
      }
    }

    if (data && data.length > 0) {
      logger.success(`Found ${data.length} columns`);
      data.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(required)';
        const defaultVal = col.column_default ? `[default: ${col.column_default}]` : '';
        logger.info(`  ${col.column_name}: ${col.data_type} ${nullable} ${defaultVal}`);
      });
      return data.map(col => col.column_name);
    }

    return [];

  } catch (err) {
    logger.error(`Error analyzing ${tableName}:`, err.message);
    return null;
  }
}

async function checkMissingDVLAFields() {
  logger.info('\n\n' + '='.repeat(80));
  logger.info('CHECKING FOR MISSING DVLA FIELDS IN WITNESS/VEHICLE TABLES');
  logger.info('='.repeat(80));

  const requiredDVLAFields = [
    'driver_email',
    'mot_status',
    'mot_expiry_date',
    'tax_status',
    'tax_due_date',
    'fuel_type',
    'engine_capacity'
  ];

  // Check incident_other_vehicles table
  const vehicleColumns = await analyzeTableSchema('incident_other_vehicles');

  if (vehicleColumns) {
    logger.info('\n\nMissing DVLA fields in incident_other_vehicles:');
    const missing = requiredDVLAFields.filter(field => !vehicleColumns.includes(field));

    if (missing.length > 0) {
      logger.warn(`Missing ${missing.length} fields:`);
      missing.forEach(field => logger.warn(`  - ${field}`));
    } else {
      logger.success('All DVLA fields present!');
    }
  }
}

async function main() {
  logger.info('╔' + '═'.repeat(78) + '╗');
  logger.info('║  SUPABASE SCHEMA ANALYSIS FOR FIELD MAPPING PROJECT           ║');
  logger.info('╚' + '═'.repeat(78) + '╝');

  const tables = [
    'user_signup',
    'incident_reports',
    'incident_witnesses',
    'incident_other_vehicles'
  ];

  const results = {};

  for (const table of tables) {
    const columns = await analyzeTableSchema(table);
    if (columns) {
      results[table] = columns;
    }
  }

  // Check for missing DVLA fields
  await checkMissingDVLAFields();

  // Summary
  logger.info('\n\n' + '='.repeat(80));
  logger.info('SUMMARY');
  logger.info('='.repeat(80));

  Object.entries(results).forEach(([table, columns]) => {
    if (columns) {
      logger.success(`${table}: ${columns.length} columns`);
    } else {
      logger.error(`${table}: ANALYSIS FAILED`);
    }
  });

  logger.info('\n');
  logger.success('Schema analysis complete!');
  logger.info('Next step: Compare with HTML form fields to identify gaps');
}

main().catch(err => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
