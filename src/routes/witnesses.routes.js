/**
 * Witnesses Routes for Car Crash Lawyer AI
 * Handles CRUD operations for incident witnesses
 */

const express = require('express');
const witnessesController = require('../controllers/witnesses.controller');

const router = express.Router();

/**
 * Create a new witness for an incident
 * POST /api/witnesses
 * Body: { incident_id, create_user_id, witness_name, witness_phone, witness_email, witness_address, witness_statement }
 */
router.post('/', witnessesController.createWitness);

/**
 * Get all witnesses for an incident
 * GET /api/witnesses/:incident_id
 */
router.get('/:incident_id', witnessesController.getWitnessesByIncident);

/**
 * Update a witness record
 * PUT /api/witnesses/:witness_id
 * Body: { witness_name, witness_phone, witness_email, witness_address, witness_statement }
 */
router.put('/:witness_id', witnessesController.updateWitness);

/**
 * Delete a witness record (soft delete)
 * DELETE /api/witnesses/:witness_id
 */
router.delete('/:witness_id', witnessesController.deleteWitness);

module.exports = router;
