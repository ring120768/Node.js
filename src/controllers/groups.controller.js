/**
 * Groups Controller
 *
 * Manages subscription groups for Family and Business plans.
 * Handles invitations, member management, and group administration.
 *
 * Endpoints:
 * - GET  /api/groups/:groupId        - Get group details
 * - GET  /api/groups/user/:userId    - Get user's group membership
 * - POST /api/groups/invite          - Invite member to group
 * - POST /api/groups/accept/:token   - Accept invitation
 * - POST /api/groups/decline/:token  - Decline invitation
 * - POST /api/groups/remove          - Remove member from group
 * - POST /api/groups/leave           - Leave a group
 * - PUT  /api/groups/:groupId        - Update group name
 * - GET  /api/groups/:groupId/invitations - List pending invitations
 * - DELETE /api/groups/invitation/:invitationId - Cancel invitation
 */

const { createClient } = require('@supabase/supabase-js');

// Initialise Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Tier configuration with member limits
const TIER_CONFIG = {
  standard: { type: 'individual', maxMembers: 1 },
  premium: { type: 'individual', maxMembers: 1 },
  family: { type: 'family', maxMembers: 4 },
  business_10: { type: 'business', maxMembers: 10 },
  business_25: { type: 'business', maxMembers: 25 },
  business_50: { type: 'business', maxMembers: 50 },
  business_75: { type: 'business', maxMembers: 75 },
  business_100: { type: 'business', maxMembers: 100 },
};

/**
 * Create a new subscription group
 * Called internally when a user subscribes to a family/business plan
 *
 * @param {string} adminUserId - The user ID of the group admin (payer)
 * @param {string} tier - The subscription tier
 * @param {string} stripeSubscriptionId - Stripe subscription ID
 * @returns {Object} The created group
 */
async function createGroup(adminUserId, tier, stripeSubscriptionId) {
  const config = TIER_CONFIG[tier];

  if (!config || config.type === 'individual') {
    // Individual plans don't need groups
    return null;
  }

  console.log(`[Groups] Creating ${config.type} group for user:`, adminUserId);

  // Create the group
  const { data: group, error: groupError } = await supabase
    .from('subscription_groups')
    .insert({
      name: config.type === 'family' ? 'My Family' : 'My Business',
      type: config.type,
      max_members: config.maxMembers,
      admin_user_id: adminUserId,
      stripe_subscription_id: stripeSubscriptionId,
      subscription_tier: tier,
      subscription_status: 'active',
    })
    .select()
    .single();

  if (groupError) {
    console.error('[Groups] Failed to create group:', groupError);
    throw new Error('Failed to create subscription group');
  }

  // Link admin to the group
  const { error: linkError } = await supabase
    .from('user_signup')
    .update({
      group_id: group.id,
      group_role: 'admin',
      group_joined_at: new Date().toISOString(),
    })
    .eq('create_user_id', adminUserId);

  if (linkError) {
    console.error('[Groups] Failed to link admin to group:', linkError);
    // Rollback group creation
    await supabase.from('subscription_groups').delete().eq('id', group.id);
    throw new Error('Failed to link admin to group');
  }

  console.log(`[Groups] Group created:`, group.id);
  return group;
}

/**
 * Get group details
 * GET /api/groups/:groupId
 */
async function getGroup(req, res) {
  const { groupId } = req.params;
  const { userId } = req.query; // For authorization

  try {
    // Get group with member count
    const { data: group, error: groupError } = await supabase
      .from('subscription_groups')
      .select('*')
      .eq('id', groupId)
      .is('deleted_at', null)
      .single();

    if (groupError || !group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if user has access to this group
    if (userId) {
      const { data: member } = await supabase
        .from('user_signup')
        .select('group_id')
        .eq('create_user_id', userId)
        .single();

      if (!member || member.group_id !== groupId) {
        return res.status(403).json({ error: 'Not a member of this group' });
      }
    }

    // Get members
    const { data: members, error: membersError } = await supabase
      .from('user_signup')
      .select('create_user_id, driver_name, email, group_role, group_joined_at')
      .eq('group_id', groupId)
      .is('deleted_at', null);

    if (membersError) {
      console.error('[Groups] Failed to get members:', membersError);
    }

    res.json({
      id: group.id,
      name: group.name,
      type: group.type,
      maxMembers: group.max_members,
      memberCount: members?.length || 0,
      subscriptionTier: group.subscription_tier,
      subscriptionStatus: group.subscription_status,
      expiresAt: group.expires_at,
      createdAt: group.created_at,
      members: members?.map(m => ({
        userId: m.create_user_id,
        name: m.driver_name,
        email: m.email,
        role: m.group_role,
        joinedAt: m.group_joined_at,
      })) || [],
      isAdmin: userId === group.admin_user_id,
      spotsRemaining: group.max_members - (members?.length || 0),
    });

  } catch (error) {
    console.error('[Groups] Get group error:', error);
    res.status(500).json({ error: 'Failed to get group details' });
  }
}

/**
 * Get user's group membership
 * GET /api/groups/user/:userId
 */
async function getUserGroup(req, res) {
  const { userId } = req.params;

  try {
    // Get user's group info
    const { data: user, error: userError } = await supabase
      .from('user_signup')
      .select('group_id, group_role, group_joined_at')
      .eq('create_user_id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.group_id) {
      return res.json({
        hasGroup: false,
        message: 'User is not part of any subscription group',
      });
    }

    // Get full group details
    const { data: group } = await supabase
      .from('subscription_groups')
      .select('*')
      .eq('id', user.group_id)
      .single();

    // Get member count
    const { count } = await supabase
      .from('user_signup')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', user.group_id)
      .is('deleted_at', null);

    res.json({
      hasGroup: true,
      groupId: user.group_id,
      role: user.group_role,
      joinedAt: user.group_joined_at,
      group: group ? {
        name: group.name,
        type: group.type,
        maxMembers: group.max_members,
        memberCount: count,
        subscriptionStatus: group.subscription_status,
        expiresAt: group.expires_at,
      } : null,
    });

  } catch (error) {
    console.error('[Groups] Get user group error:', error);
    res.status(500).json({ error: 'Failed to get user group' });
  }
}

/**
 * Invite a member to the group
 * POST /api/groups/invite
 *
 * Body: { groupId, email, invitedBy }
 */
async function inviteMember(req, res) {
  const { groupId, email, invitedBy } = req.body;

  if (!groupId || !email || !invitedBy) {
    return res.status(400).json({ error: 'groupId, email, and invitedBy are required' });
  }

  try {
    // Get group and verify admin
    const { data: group, error: groupError } = await supabase
      .from('subscription_groups')
      .select('*')
      .eq('id', groupId)
      .is('deleted_at', null)
      .single();

    if (groupError || !group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (group.admin_user_id !== invitedBy) {
      return res.status(403).json({ error: 'Only the group admin can invite members' });
    }

    if (group.subscription_status !== 'active') {
      return res.status(400).json({ error: 'Group subscription is not active' });
    }

    // Check member count
    const { count } = await supabase
      .from('user_signup')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId)
      .is('deleted_at', null);

    if (count >= group.max_members) {
      return res.status(400).json({
        error: 'Group is full',
        currentMembers: count,
        maxMembers: group.max_members,
      });
    }

    // Check if email is already a member
    const { data: existingMember } = await supabase
      .from('user_signup')
      .select('create_user_id, group_id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingMember?.group_id === groupId) {
      return res.status(400).json({ error: 'This email is already a member of the group' });
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await supabase
      .from('group_invitations')
      .select('id')
      .eq('group_id', groupId)
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .single();

    if (existingInvite) {
      return res.status(400).json({ error: 'An invitation has already been sent to this email' });
    }

    // Create invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('group_invitations')
      .insert({
        group_id: groupId,
        email: email.toLowerCase(),
        invited_by: invitedBy,
        status: 'pending',
      })
      .select()
      .single();

    if (inviteError) {
      console.error('[Groups] Failed to create invitation:', inviteError);
      return res.status(500).json({ error: 'Failed to create invitation' });
    }

    // Send invitation email
    try {
      const emailService = require('../../lib/emailService');

      const { data: admin } = await supabase
        .from('user_signup')
        .select('driver_name')
        .eq('create_user_id', invitedBy)
        .single();

      // Build accept URL
      const acceptUrl = `${process.env.APP_URL || 'https://carcrashlawyerai.co.uk'}/accept-invite.html?token=${invitation.token}`;

      await emailService.sendEmail({
        to: email,
        subject: `You've been invited to join ${group.name} on Car Crash Lawyer AI`,
        html: `
          <h2>You've Been Invited!</h2>
          <p>${admin?.driver_name || 'Someone'} has invited you to join their ${group.type === 'family' ? 'family' : 'business'} subscription on Car Crash Lawyer AI.</p>
          <p>This gives you full access to all premium features at no additional cost.</p>
          <p><a href="${acceptUrl}" style="display:inline-block;padding:12px 24px;background:#007bff;color:#fff;text-decoration:none;border-radius:5px;">Accept Invitation</a></p>
          <p><small>This invitation expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.</small></p>
        `,
      });

      console.log('[Groups] Invitation email sent to:', email);
    } catch (emailError) {
      console.error('[Groups] Failed to send invitation email:', emailError);
      // Don't fail the request - invitation was created successfully
    }

    res.json({
      success: true,
      invitationId: invitation.id,
      message: `Invitation sent to ${email}`,
      expiresAt: invitation.expires_at,
    });

  } catch (error) {
    console.error('[Groups] Invite member error:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
}

/**
 * Accept an invitation
 * POST /api/groups/accept/:token
 *
 * Body: { userId } - The user accepting the invitation
 */
async function acceptInvitation(req, res) {
  const { token } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    // Find invitation by token
    const { data: invitation, error: inviteError } = await supabase
      .from('group_invitations')
      .select('*, subscription_groups(*)')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invitation) {
      return res.status(404).json({ error: 'Invitation not found or already used' });
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      await supabase
        .from('group_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    // Verify user email matches invitation
    const { data: user, error: userError } = await supabase
      .from('user_signup')
      .select('email, group_id')
      .eq('create_user_id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return res.status(403).json({
        error: 'This invitation was sent to a different email address',
        invitedEmail: invitation.email,
      });
    }

    if (user.group_id) {
      return res.status(400).json({ error: 'User is already a member of a group' });
    }

    const group = invitation.subscription_groups;

    // Check group still has space
    const { count } = await supabase
      .from('user_signup')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', group.id)
      .is('deleted_at', null);

    if (count >= group.max_members) {
      return res.status(400).json({ error: 'Group is now full' });
    }

    // Add user to group
    const { error: joinError } = await supabase
      .from('user_signup')
      .update({
        group_id: group.id,
        group_role: 'member',
        group_joined_at: new Date().toISOString(),
        // Inherit subscription from group
        subscription_tier: group.subscription_tier,
        subscription_status: group.subscription_status,
      })
      .eq('create_user_id', userId);

    if (joinError) {
      console.error('[Groups] Failed to add user to group:', joinError);
      return res.status(500).json({ error: 'Failed to join group' });
    }

    // Mark invitation as accepted
    await supabase
      .from('group_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    console.log('[Groups] User joined group:', userId, '→', group.id);

    res.json({
      success: true,
      message: `Welcome to ${group.name}!`,
      groupId: group.id,
      groupName: group.name,
      groupType: group.type,
    });

  } catch (error) {
    console.error('[Groups] Accept invitation error:', error);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
}

/**
 * Decline an invitation
 * POST /api/groups/decline/:token
 */
async function declineInvitation(req, res) {
  const { token } = req.params;

  try {
    const { data: invitation, error } = await supabase
      .from('group_invitations')
      .update({ status: 'declined' })
      .eq('token', token)
      .eq('status', 'pending')
      .select()
      .single();

    if (error || !invitation) {
      return res.status(404).json({ error: 'Invitation not found or already processed' });
    }

    res.json({ success: true, message: 'Invitation declined' });

  } catch (error) {
    console.error('[Groups] Decline invitation error:', error);
    res.status(500).json({ error: 'Failed to decline invitation' });
  }
}

/**
 * Remove a member from the group
 * POST /api/groups/remove
 *
 * Body: { groupId, memberId, adminId }
 */
async function removeMember(req, res) {
  const { groupId, memberId, adminId } = req.body;

  if (!groupId || !memberId || !adminId) {
    return res.status(400).json({ error: 'groupId, memberId, and adminId are required' });
  }

  try {
    // Verify admin
    const { data: group, error: groupError } = await supabase
      .from('subscription_groups')
      .select('admin_user_id, name')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (group.admin_user_id !== adminId) {
      return res.status(403).json({ error: 'Only the group admin can remove members' });
    }

    if (memberId === adminId) {
      return res.status(400).json({ error: 'Admin cannot remove themselves. Transfer ownership or delete the group.' });
    }

    // Verify member belongs to group
    const { data: member } = await supabase
      .from('user_signup')
      .select('group_id, email')
      .eq('create_user_id', memberId)
      .single();

    if (!member || member.group_id !== groupId) {
      return res.status(404).json({ error: 'Member not found in this group' });
    }

    // Remove from group
    const { error: removeError } = await supabase
      .from('user_signup')
      .update({
        group_id: null,
        group_role: null,
        group_joined_at: null,
        // Revert to free tier
        subscription_tier: null,
        subscription_status: 'inactive',
      })
      .eq('create_user_id', memberId);

    if (removeError) {
      console.error('[Groups] Failed to remove member:', removeError);
      return res.status(500).json({ error: 'Failed to remove member' });
    }

    // Notify removed member via email
    try {
      const emailService = require('../../lib/emailService');
      await emailService.sendEmail({
        to: member.email,
        subject: `You've been removed from ${group.name}`,
        html: `
          <h2>Group Membership Ended</h2>
          <p>Your membership in the group "${group.name}" on Car Crash Lawyer AI has ended.</p>
          <p>Your premium subscription access has been revoked. You can subscribe individually to continue using premium features.</p>
          <p><a href="${process.env.APP_URL || 'https://carcrashlawyerai.co.uk'}/subscribe.html">View Subscription Options</a></p>
        `,
      });
    } catch (emailError) {
      console.error('[Groups] Failed to send removal email:', emailError);
    }

    console.log('[Groups] Member removed:', memberId, 'from group:', groupId);

    res.json({ success: true, message: 'Member removed from group' });

  } catch (error) {
    console.error('[Groups] Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
}

/**
 * Leave a group (for members, not admin)
 * POST /api/groups/leave
 *
 * Body: { userId }
 */
async function leaveGroup(req, res) {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    // Get user's group info
    const { data: user, error: userError } = await supabase
      .from('user_signup')
      .select('group_id, group_role')
      .eq('create_user_id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.group_id) {
      return res.status(400).json({ error: 'User is not part of any group' });
    }

    if (user.group_role === 'admin') {
      return res.status(400).json({
        error: 'Admin cannot leave the group. Transfer ownership first or cancel the subscription.',
      });
    }

    // Leave group
    const { error: leaveError } = await supabase
      .from('user_signup')
      .update({
        group_id: null,
        group_role: null,
        group_joined_at: null,
        subscription_tier: null,
        subscription_status: 'inactive',
      })
      .eq('create_user_id', userId);

    if (leaveError) {
      console.error('[Groups] Failed to leave group:', leaveError);
      return res.status(500).json({ error: 'Failed to leave group' });
    }

    console.log('[Groups] User left group:', userId);

    res.json({ success: true, message: 'Successfully left the group' });

  } catch (error) {
    console.error('[Groups] Leave group error:', error);
    res.status(500).json({ error: 'Failed to leave group' });
  }
}

/**
 * Update group name
 * PUT /api/groups/:groupId
 *
 * Body: { name, adminId }
 */
async function updateGroup(req, res) {
  const { groupId } = req.params;
  const { name, adminId } = req.body;

  if (!name || !adminId) {
    return res.status(400).json({ error: 'name and adminId are required' });
  }

  try {
    // Verify admin
    const { data: group, error: groupError } = await supabase
      .from('subscription_groups')
      .select('admin_user_id')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (group.admin_user_id !== adminId) {
      return res.status(403).json({ error: 'Only the group admin can update the group' });
    }

    // Update name
    const { error: updateError } = await supabase
      .from('subscription_groups')
      .update({ name: name.trim() })
      .eq('id', groupId);

    if (updateError) {
      console.error('[Groups] Failed to update group:', updateError);
      return res.status(500).json({ error: 'Failed to update group' });
    }

    res.json({ success: true, message: 'Group updated' });

  } catch (error) {
    console.error('[Groups] Update group error:', error);
    res.status(500).json({ error: 'Failed to update group' });
  }
}

/**
 * List pending invitations for a group
 * GET /api/groups/:groupId/invitations
 */
async function listInvitations(req, res) {
  const { groupId } = req.params;
  const { adminId } = req.query;

  try {
    // Verify admin
    const { data: group, error: groupError } = await supabase
      .from('subscription_groups')
      .select('admin_user_id')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (group.admin_user_id !== adminId) {
      return res.status(403).json({ error: 'Only the group admin can view invitations' });
    }

    // Get invitations
    const { data: invitations, error: invitesError } = await supabase
      .from('group_invitations')
      .select('id, email, status, created_at, expires_at, accepted_at')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (invitesError) {
      console.error('[Groups] Failed to get invitations:', invitesError);
      return res.status(500).json({ error: 'Failed to get invitations' });
    }

    res.json({
      invitations: invitations.map(inv => ({
        id: inv.id,
        email: inv.email,
        status: inv.status,
        createdAt: inv.created_at,
        expiresAt: inv.expires_at,
        acceptedAt: inv.accepted_at,
        isExpired: inv.status === 'pending' && new Date(inv.expires_at) < new Date(),
      })),
    });

  } catch (error) {
    console.error('[Groups] List invitations error:', error);
    res.status(500).json({ error: 'Failed to list invitations' });
  }
}

/**
 * Cancel/revoke an invitation
 * DELETE /api/groups/invitation/:invitationId
 *
 * Query: { adminId }
 */
async function cancelInvitation(req, res) {
  const { invitationId } = req.params;
  const { adminId } = req.query;

  try {
    // Get invitation with group info
    const { data: invitation, error: inviteError } = await supabase
      .from('group_invitations')
      .select('*, subscription_groups(admin_user_id)')
      .eq('id', invitationId)
      .single();

    if (inviteError || !invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invitation.subscription_groups.admin_user_id !== adminId) {
      return res.status(403).json({ error: 'Only the group admin can cancel invitations' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: 'Can only cancel pending invitations' });
    }

    // Update to revoked
    const { error: updateError } = await supabase
      .from('group_invitations')
      .update({ status: 'revoked' })
      .eq('id', invitationId);

    if (updateError) {
      console.error('[Groups] Failed to cancel invitation:', updateError);
      return res.status(500).json({ error: 'Failed to cancel invitation' });
    }

    res.json({ success: true, message: 'Invitation cancelled' });

  } catch (error) {
    console.error('[Groups] Cancel invitation error:', error);
    res.status(500).json({ error: 'Failed to cancel invitation' });
  }
}

/**
 * Update group subscription status
 * Called when Stripe subscription status changes
 */
async function updateGroupSubscriptionStatus(stripeSubscriptionId, status, expiresAt = null) {
  try {
    const updateData = { subscription_status: status };
    if (expiresAt) {
      updateData.expires_at = expiresAt;
    }

    const { data: group, error } = await supabase
      .from('subscription_groups')
      .update(updateData)
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .select()
      .single();

    if (error) {
      console.error('[Groups] Failed to update group status:', error);
      return;
    }

    if (!group) return;

    // Update all members' subscription status
    await supabase
      .from('user_signup')
      .update({ subscription_status: status })
      .eq('group_id', group.id);

    console.log('[Groups] Updated group status:', group.id, '→', status);

  } catch (error) {
    console.error('[Groups] Update group status error:', error);
  }
}

module.exports = {
  // Internal functions
  createGroup,
  updateGroupSubscriptionStatus,
  TIER_CONFIG,

  // API endpoints
  getGroup,
  getUserGroup,
  inviteMember,
  acceptInvitation,
  declineInvitation,
  removeMember,
  leaveGroup,
  updateGroup,
  listInvitations,
  cancelInvitation,
};
