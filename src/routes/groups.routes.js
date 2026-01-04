/**
 * Groups Routes
 *
 * Subscription group management for Family and Business plans.
 * Handles member invitations, acceptance, and group administration.
 */

const express = require('express');
const router = express.Router();
const groupsController = require('../controllers/groups.controller');

/**
 * GET /api/groups/:groupId
 * Get group details including members
 *
 * Query: { userId } - for authorization check
 * Returns: Group details with member list
 */
router.get('/:groupId', groupsController.getGroup);

/**
 * GET /api/groups/user/:userId
 * Get user's group membership info
 *
 * Returns: Group membership details or null if not in a group
 */
router.get('/user/:userId', groupsController.getUserGroup);

/**
 * POST /api/groups/invite
 * Invite a new member to the group
 *
 * Body: { groupId, email, invitedBy }
 * Returns: { success, invitationId, expiresAt }
 */
router.post('/invite', groupsController.inviteMember);

/**
 * POST /api/groups/accept/:token
 * Accept an invitation to join a group
 *
 * Params: token - the invitation token from email
 * Body: { userId } - the user accepting
 * Returns: { success, groupId, groupName }
 */
router.post('/accept/:token', groupsController.acceptInvitation);

/**
 * POST /api/groups/decline/:token
 * Decline an invitation
 *
 * Params: token - the invitation token
 * Returns: { success }
 */
router.post('/decline/:token', groupsController.declineInvitation);

/**
 * POST /api/groups/remove
 * Remove a member from the group (admin only)
 *
 * Body: { groupId, memberId, adminId }
 * Returns: { success }
 */
router.post('/remove', groupsController.removeMember);

/**
 * POST /api/groups/leave
 * Leave a group (for members, not admin)
 *
 * Body: { userId }
 * Returns: { success }
 */
router.post('/leave', groupsController.leaveGroup);

/**
 * PUT /api/groups/:groupId
 * Update group name (admin only)
 *
 * Body: { name, adminId }
 * Returns: { success }
 */
router.put('/:groupId', groupsController.updateGroup);

/**
 * GET /api/groups/:groupId/invitations
 * List all invitations for a group (admin only)
 *
 * Query: { adminId }
 * Returns: { invitations: [...] }
 */
router.get('/:groupId/invitations', groupsController.listInvitations);

/**
 * DELETE /api/groups/invitation/:invitationId
 * Cancel/revoke a pending invitation (admin only)
 *
 * Query: { adminId }
 * Returns: { success }
 */
router.delete('/invitation/:invitationId', groupsController.cancelInvitation);

module.exports = router;
