/**
 * Groups Routes
 *
 * Subscription group management for Family and Business plans.
 *
 * Joining is by JOIN CODE (FAM-XXXXXX / BIZ-XXXXXX), not per-person email
 * tokens. Two endpoints are deliberately public so somebody with a code but no
 * account can be onboarded in a single step; everything else requires a session.
 *
 * SECURITY: these routes previously had no authentication at all, and the
 * controllers took the caller's identity from the request body - so supplying
 * someone else's adminId was enough to act as them. Identity now comes from the
 * session (req.userId) via requireAuth, and the body is never trusted for it.
 */

const express = require('express');
const router = express.Router();
const groupsController = require('../controllers/groups.controller');
const { requireAuth } = require('../middleware/authMiddleware');
const { strictLimiter } = require('../middleware/rateLimit');

// ===========================================================================
// PUBLIC (rate-limited) - joining with a code
// ===========================================================================

/**
 * POST /api/groups/join/validate
 * Check a code and report the group name and seats, without joining.
 *
 * Public because the /join page shows this before asking anyone to create an
 * account. strictLimiter throttles brute-force guessing of the code space.
 *
 * Body: { code }
 * Returns: { valid, groupName, groupType, seatsUsed, seatsTotal, seatsRemaining, full }
 */
router.post('/join/validate', strictLimiter, groupsController.validateJoinCode);

/**
 * POST /api/groups/join
 * Join a group with a code.
 *
 * Signed in  -> joins as the session user (body identity ignored).
 * Signed out -> invite-first signup from { email, name, password }, then joins.
 *
 * Body: { code, email?, name?, password? }
 * Returns: { success, createdAccount, groupId, groupName, seatsUsed, seatsTotal }
 */
router.post('/join', strictLimiter, groupsController.joinByCode);

/**
 * POST /api/groups/by-checkout-session
 * Return the join details for the group created by one specific purchase.
 *
 * Public because on the V2 flow the buyer has NO session when they land on
 * payment-success.html - their auth account is created by the webhook, after
 * the redirect. Stripe appends ?session_id=cs_live_... to that URL, and the id
 * is unguessable and tied to exactly one purchase, so it serves as the bearer.
 *
 * Returns { ready:false } while the webhook is still creating the group, so the
 * page can retry rather than showing an error or a blank space.
 *
 * Body: { sessionId }
 */
router.post('/by-checkout-session', strictLimiter, groupsController.getGroupByCheckoutSession);

// ===========================================================================
// AUTHENTICATED - everything below needs a session
// ===========================================================================
router.use(requireAuth);

/**
 * GET /api/groups/:groupId
 * Get group details including members
 */
router.get('/:groupId', groupsController.getGroup);

/**
 * GET /api/groups/user/:userId
 * Get user's group membership info
 */
router.get('/user/:userId', groupsController.getUserGroup);

/**
 * POST /api/groups/:groupId/regenerate-code
 * Rotate the join code (admin only). Existing members are unaffected; only
 * un-redeemed copies of the old code stop working.
 *
 * Returns: { success, joinCode, joinUrl }
 */
router.post('/:groupId/regenerate-code', groupsController.regenerateJoinCode);

/**
 * POST /api/groups/invite
 * Optional sugar: emails somebody the /join?code= link.
 *
 * Body: { groupId, email }
 */
router.post('/invite', groupsController.inviteMember);

/**
 * POST /api/groups/accept/:token
 * Legacy email-token acceptance. Superseded by /join, retained so any
 * invitation already sent still works.
 */
router.post('/accept/:token', groupsController.acceptInvitation);

/**
 * POST /api/groups/decline/:token
 * Decline a legacy invitation
 */
router.post('/decline/:token', groupsController.declineInvitation);

/**
 * POST /api/groups/remove
 * Remove a member from the group (admin only)
 */
router.post('/remove', groupsController.removeMember);

/**
 * POST /api/groups/leave
 * Leave a group (for members, not admin)
 */
router.post('/leave', groupsController.leaveGroup);

/**
 * PUT /api/groups/:groupId
 * Update group name (admin only)
 */
router.put('/:groupId', groupsController.updateGroup);

/**
 * GET /api/groups/:groupId/invitations
 * List invitations for a group (admin only)
 */
router.get('/:groupId/invitations', groupsController.listInvitations);

/**
 * DELETE /api/groups/invitation/:invitationId
 * Cancel a pending invitation (admin only)
 */
router.delete('/invitation/:invitationId', groupsController.cancelInvitation);

module.exports = router;
