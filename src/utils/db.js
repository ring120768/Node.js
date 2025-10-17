// src/utils/db.js - PostgreSQL Database Utility
// Direct connection to Supabase PostgreSQL database

const { Pool } = require('pg');
const logger = require('./logger');

// Create connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for Supabase
    },
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Pool error handling
pool.on('error', (err) => {
    logger.error('Unexpected database pool error:', err);
});

/**
 * Execute a query with parameters
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
async function query(text, params) {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        logger.debug('Executed query', { text, duration, rows: result.rowCount });
        return result;
    } catch (error) {
        logger.error('Database query error:', { text, error: error.message });
        throw error;
    }
}

/**
 * Get a client from the pool for transactions
 * @returns {Promise<Object>} Database client
 */
async function getClient() {
    const client = await pool.connect();
    const query = client.query.bind(client);
    const release = client.release.bind(client);

    // Set a timeout of 5 seconds for transaction
    const timeout = setTimeout(() => {
        logger.error('A client has been checked out for more than 5 seconds!');
    }, 5000);

    // Monkey patch the release method to clear timeout
    client.release = () => {
        clearTimeout(timeout);
        client.release = release;
        return release();
    };

    return client;
}

/**
 * Test database connection
 * @returns {Promise<boolean>} Connection status
 */
async function testConnection() {
    try {
        const result = await query('SELECT NOW() as now, current_database() as database');
        logger.info('Database connection successful', {
            time: result.rows[0].now,
            database: result.rows[0].database
        });
        return true;
    } catch (error) {
        logger.error('Database connection failed:', error);
        return false;
    }
}

/**
 * Get table schema information
 * @param {string} tableName - Name of the table
 * @returns {Promise<Array>} Column information
 */
async function getTableSchema(tableName) {
    const sql = `
        SELECT
            column_name,
            data_type,
            character_maximum_length,
            is_nullable,
            column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position;
    `;
    const result = await query(sql, [tableName]);
    return result.rows;
}

/**
 * Get table constraints (primary keys, foreign keys, etc.)
 * @param {string} tableName - Name of the table
 * @returns {Promise<Array>} Constraint information
 */
async function getTableConstraints(tableName) {
    const sql = `
        SELECT
            tc.constraint_name,
            tc.constraint_type,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
        LEFT JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_name = $1;
    `;
    const result = await query(sql, [tableName]);
    return result.rows;
}

/**
 * Get table indexes
 * @param {string} tableName - Name of the table
 * @returns {Promise<Array>} Index information
 */
async function getTableIndexes(tableName) {
    const sql = `
        SELECT
            indexname,
            indexdef
        FROM pg_indexes
        WHERE tablename = $1;
    `;
    const result = await query(sql, [tableName]);
    return result.rows;
}

/**
 * Count rows in a table
 * @param {string} tableName - Name of the table
 * @returns {Promise<number>} Row count
 */
async function countRows(tableName) {
    const sql = `SELECT COUNT(*) as count FROM ${tableName}`;
    const result = await query(sql);
    return parseInt(result.rows[0].count);
}

/**
 * Get sample rows from a table
 * @param {string} tableName - Name of the table
 * @param {number} limit - Number of rows to fetch
 * @returns {Promise<Array>} Sample rows
 */
async function getSampleRows(tableName, limit = 5) {
    const sql = `SELECT * FROM ${tableName} LIMIT $1`;
    const result = await query(sql, [limit]);
    return result.rows;
}

/**
 * Close the database pool
 */
async function close() {
    await pool.end();
    logger.info('Database pool closed');
}

module.exports = {
    query,
    getClient,
    testConnection,
    getTableSchema,
    getTableConstraints,
    getTableIndexes,
    countRows,
    getSampleRows,
    close,
    pool
};
