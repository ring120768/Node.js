/**
 * Vehicles Routes for Car Crash Lawyer AI
 * Handles CRUD operations for other vehicles involved in incidents
 * Includes DVLA API integration for automatic vehicle details lookup
 */

const express = require('express');
const vehiclesController = require('../controllers/vehicles.controller');

const router = express.Router();

/**
 * Create a new other vehicle for an incident with DVLA lookup
 * POST /api/other-vehicles
 * Body: {
 *   incident_id, create_user_id, vehicle_license_plate,
 *   driver_name, driver_phone, driver_address,
 *   insurance_company, policy_number, policy_cover, policy_holder,
 *   damage_description
 * }
 */
router.post('/', vehiclesController.createVehicle);

/**
 * Get all vehicles for an incident
 * GET /api/other-vehicles/:incident_id
 */
router.get('/:incident_id', vehiclesController.getVehiclesByIncident);

/**
 * Update a vehicle record
 * PUT /api/other-vehicles/:vehicle_id
 * Body: { driver_name, driver_phone, etc. }
 */
router.put('/:vehicle_id', vehiclesController.updateVehicle);

/**
 * Delete a vehicle record (soft delete)
 * DELETE /api/other-vehicles/:vehicle_id
 */
router.delete('/:vehicle_id', vehiclesController.deleteVehicle);

/**
 * Lookup vehicle details via DVLA (standalone endpoint for frontend use)
 * POST /api/other-vehicles/dvla-lookup
 * Body: { vehicle_license_plate }
 */
router.post('/dvla-lookup', vehiclesController.dvlaLookup);

/**
 * Generate PDF for a vehicle
 * POST /api/other-vehicles/:vehicle_id/generate-pdf
 */
router.post('/:vehicle_id/generate-pdf', vehiclesController.generateVehiclePdf);

module.exports = router;
