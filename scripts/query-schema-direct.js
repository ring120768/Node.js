/**
 * Direct Schema Query via SQL
 *
 * Queries PostgreSQL information_schema to get complete table structures
 * even when tables have no data.
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

async function getTableColumns(tableName) {
  logger.info(`\nQuerying schema for: ${tableName}`);

  const query = `
    SELECT
      column_name,
      data_type,
      is_nullable,
      column_default,
      character_maximum_length
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = '${tableName}'
    ORDER BY ordinal_position;
  `;

  const { data, error } = await supabase.rpc('exec_sql', { query });

  if (error) {
    logger.error('Error:', error.message);
    return null;
  }

  return data;
}

async function main() {
  logger.info('═══════════════════════════════════════════════════════════');
  logger.success('DIRECT SCHEMA QUERY - PostgreSQL information_schema');
  logger.info('═══════════════════════════════════════════════════════════\n');

  const tables = [
    'user_signup',
    'incident_reports',
    'incident_witnesses',
    'incident_other_vehicles'
  ];

  for (const table of tables) {
    const columns = await getTableColumns(table);

    if (columns) {
      logger.success(`${table}: ${columns.length} columns`);

      // Display first 10 columns as sample
      const sample = columns.slice(0, 10);
      sample.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? '?' : '!';
        logger.info(`  ${col.column_name} (${col.data_type}${nullable})`);
      });

      if (columns.length > 10) {
        logger.info(`  ... and ${columns.length - 10} more columns`);
      }

      // Export full list
      const filename = `/tmp/schema_${table}.json`;
      require('fs').writeFileSync(filename, JSON.stringify(columns, null, 2));
      logger.info(`  → Full schema saved to: ${filename}\n`);
    }
  }

  logger.success('Schema query complete!');
}

main().catch(err => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
