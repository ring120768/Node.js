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

const crypto = require('crypto');
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

// ===========================================================================
// JOIN CODES
// ===========================================================================

// Deliberately excludes characters that are misread when a code is spoken
// aloud or copied off a screen: O/0, I/1/L, U/V, S/5, B/8.
// 26 symbols ^ 6 places = ~309 million combinations.
const JOIN_CODE_ALPHABET = 'ACDEFGHJKMNPQRTWXY234679';
const JOIN_CODE_LENGTH = 6;

const GROUP_TYPE_PREFIX = {
  family: 'FAM',
  business: 'BIZ',
};

/**
 * Generate a random join code body using crypto, with rejection sampling so the
 * distribution stays uniform (a plain % would bias toward the early letters).
 *
 * @returns {string} e.g. "K7QM2X"
 */
function randomCodeBody() {
  const out = [];
  const max = Math.floor(256 / JOIN_CODE_ALPHABET.length) * JOIN_CODE_ALPHABET.length;

  while (out.length < JOIN_CODE_LENGTH) {
    for (const byte of crypto.randomBytes(JOIN_CODE_LENGTH * 2)) {
      if (byte >= max) continue; // reject, would skew the distribution
      out.push(JOIN_CODE_ALPHABET[byte % JOIN_CODE_ALPHABET.length]);
      if (out.length === JOIN_CODE_LENGTH) break;
    }
  }

  return out.join('');
}

/**
 * Normalise user input into the canonical stored form.
 * Accepts "fam k7qm2x", "FAM-K7QM2X", "k7qm2x" and returns "FAM-K7QM2X" given
 * the expected prefix, so a member typing it by hand is forgiving.
 *
 * @param {string} input - raw code as typed
 * @returns {string|null} canonical code, or null if unusable
 */
function normaliseJoinCode(input) {
  if (typeof input !== 'string') return null;

  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!cleaned) return null;

  const match = cleaned.match(/^(FAM|BIZ)?([A-Z0-9]+)$/);
  if (!match) return null;

  const [, prefix, body] = match;
  if (body.length !== JOIN_CODE_LENGTH) return null;
  if (!prefix) return null; // ambiguous without a prefix - reject rather than guess

  return `${prefix}-${body}`;
}

/**
 * Generate a join code that is not already in use.
 *
 * Collisions are vanishingly unlikely but a unique index enforces it anyway, so
 * check before insert and retry rather than surfacing a constraint violation.
 *
 * @param {string} groupType - 'family' or 'business'
 * @returns {Promise<string>} e.g. "FAM-K7QM2X"
 */
async function generateUniqueJoinCode(groupType) {
  const prefix = GROUP_TYPE_PREFIX[groupType] || 'GRP';

  for (let attempt = 0; attempt < 10; attempt++) {
    const code = `${prefix}-${randomCodeBody()}`;

    const { data, error } = await supabase
      .from('subscription_groups')
      .select('id')
      .eq('join_code', code)
      .maybeSingle();

    if (error) {
      console.error('[Groups] Join code uniqueness check failed:', error.message);
      throw new Error('Could not generate a join code');
    }

    if (!data) return code;

    console.warn('[Groups] Join code collision, retrying:', code);
  }

  throw new Error('Could not generate a unique join code after 10 attempts');
}

/**
 * Count members currently occupying seats in a group.
 * Soft-deleted rows do not hold a seat.
 *
 * @param {string} groupId
 * @returns {Promise<number>}
 */
async function countGroupMembers(groupId) {
  const { count, error } = await supabase
    .from('user_signup')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId)
    .is('deleted_at', null);

  if (error) {
    console.error('[Groups] Failed to count members:', error.message);
    throw new Error('Could not check group capacity');
  }

  return count || 0;
}

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

  // Members join with this code rather than per-person email tokens, so it has
  // to exist from the moment the group does.
  const joinCode = await generateUniqueJoinCode(config.type);

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
      join_code: joinCode,
      join_code_updated_at: new Date().toISOString(),
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

  // The path parameter is not trusted. Without this, any authenticated user
  // could read another user's group by editing the URL - and since this
  // response now carries the join code, that would hand out free seats rather
  // than merely leaking data.
  if (!req.userId || userId !== req.userId) {
    return res.status(403).json({ error: 'You can only view your own group membership' });
  }

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

    const isAdmin = user.group_role === 'admin';
    const seatsUsed = count || 0;
    const maxMembers = group?.max_members || 0;

    res.json({
      hasGroup: true,
      groupId: user.group_id,
      role: user.group_role,
      joinedAt: user.group_joined_at,
      group: group ? {
        name: group.name,
        type: group.type,
        maxMembers,
        memberCount: seatsUsed,
        seatsRemaining: Math.max(0, maxMembers - seatsUsed),
        full: seatsUsed >= maxMembers,
        subscriptionStatus: group.subscription_status,
        expiresAt: group.expires_at,
        // The join code is the admin's to share. Members do not receive it:
        // the payer controls who occupies the seats they are paying for, and
        // can rotate the code without disrupting anyone already in.
        ...(isAdmin ? {
          joinCode: group.join_code,
          joinUrl: group.join_code
            ? `${process.env.APP_URL || 'https://www.carcrashlawyerai.com'}/join?code=${encodeURIComponent(group.join_code)}`
            : null,
          joinCodeUpdatedAt: group.join_code_updated_at,
        } : {}),
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
  const { groupId, email } = req.body;
  // Identity comes from the session. Previously this was taken from the request
  // body, so anyone who knew a group's admin id could invite into it.
  const invitedBy = req.userId;

  if (!groupId || !email) {
    return res.status(400).json({ error: 'groupId and email are required' });
  }

  if (!invitedBy) {
    return res.status(401).json({ error: 'You must be signed in to invite members' });
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
      // Joining is by code now, so the email carries the /join link rather than
      // a per-person token. accept-invite.html never existed - every invitation
      // sent under the old scheme linked to a 404.
      const baseUrl = process.env.APP_URL || 'https://www.carcrashlawyerai.com';
      const acceptUrl = `${baseUrl}/join?code=${encodeURIComponent(group.join_code)}`;

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

    // Propagate to every member.
    //
    // The end date matters as much as the status: entitlement is
    // `ENTITLED_STATUSES.includes(status) && endDate > now`, and members get
    // their end date copied from the group when they join. Without carrying the
    // new period end through, a renewal would extend the payer's access but not
    // anyone else's - members would silently lose access on the old date while
    // the subscription was perfectly healthy.
    const memberUpdate = { subscription_status: status };
    if (expiresAt) memberUpdate.subscription_end_date = expiresAt;

    const { error: memberError, count } = await supabase
      .from('user_signup')
      .update(memberUpdate, { count: 'exact' })
      .eq('group_id', group.id)
      .is('deleted_at', null);

    if (memberError) {
      console.error('[Groups] Failed to update members:', memberError.message);
      return;
    }

    console.log('[Groups] Updated group status:', group.id, '→', status,
      `(${count ?? 0} member(s)${expiresAt ? ', end date ' + expiresAt.slice(0, 10) : ''})`);

  } catch (error) {
    console.error('[Groups] Update group status error:', error);
  }
}

/**
 * Look up a join code without joining.
 * PUBLIC (rate-limited): the /join page calls this to show the group name and
 * seat count before asking anyone to create an account.
 *
 * Deliberately reveals only the group name, type and seat counts - never member
 * identities, the admin, or billing details.
 *
 * POST /api/groups/join/validate   Body: { code }
 */
async function validateJoinCode(req, res) {
  const code = normaliseJoinCode(req.body?.code);

  if (!code) {
    return res.status(400).json({
      valid: false,
      error: 'That does not look like a join code. It should look like FAM-K7QM2X.',
    });
  }

  try {
    const { data: group, error } = await supabase
      .from('subscription_groups')
      .select('id, name, type, max_members, subscription_status')
      .eq('join_code', code)
      .maybeSingle();

    // Same response shape whether the code is unknown or the query failed, so
    // this cannot be used to probe which codes exist.
    if (error || !group) {
      return res.status(404).json({ valid: false, error: 'That code was not recognised.' });
    }

    if (group.subscription_status !== 'active') {
      return res.status(400).json({
        valid: false,
        error: 'This group\'s subscription is not active, so it cannot accept new members.',
      });
    }

    const used = await countGroupMembers(group.id);
    const seatsRemaining = Math.max(0, group.max_members - used);

    return res.json({
      valid: true,
      groupName: group.name,
      groupType: group.type,
      seatsUsed: used,
      seatsTotal: group.max_members,
      seatsRemaining,
      full: seatsRemaining === 0,
    });

  } catch (error) {
    console.error('[Groups] validateJoinCode error:', error.message);
    return res.status(500).json({ valid: false, error: 'Could not check that code just now.' });
  }
}

/**
 * Join a group using a code.
 * POST /api/groups/join   Body: { code, email?, name?, password? }
 *
 * Two paths:
 *  - Signed in (req.userId present): joins as that user. Identity comes from the
 *    session, never the request body.
 *  - Not signed in: invite-first signup. Creates a minimal account from
 *    email/name/password, then joins. This is the whole point of code-based
 *    joining - a family member who has never used the app can be onboarded in
 *    one step, which the old email-token flow could not do at all.
 *
 * Capacity is re-checked immediately before the write, so a code shared widely
 * cannot oversubscribe a group through concurrent joins.
 */
async function joinByCode(req, res) {
  const code = normaliseJoinCode(req.body?.code);

  if (!code) {
    return res.status(400).json({ error: 'That does not look like a join code.' });
  }

  try {
    const { data: group, error: groupError } = await supabase
      .from('subscription_groups')
      .select('*')
      .eq('join_code', code)
      .maybeSingle();

    if (groupError || !group) {
      return res.status(404).json({ error: 'That code was not recognised.' });
    }

    if (group.subscription_status !== 'active') {
      return res.status(400).json({ error: 'This group\'s subscription is not active.' });
    }

    // Capacity check BEFORE creating anything, so a full group does not leave a
    // stranded account behind.
    if (await countGroupMembers(group.id) >= group.max_members) {
      return res.status(409).json({ error: 'This group is full.' });
    }

    // ---- Identify or create the joining user -----------------------------
    let userId = req.userId || null;   // set by requireAuth/optionalAuth, never from the body
    let createdAccount = false;

    if (!userId) {
      const email = (req.body?.email || '').trim().toLowerCase();
      const name = (req.body?.name || '').trim();
      const password = req.body?.password || '';

      if (!email || !name || !password) {
        return res.status(400).json({
          error: 'Please provide your name, email and a password to join.',
          needsAccount: true,
        });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });
      }

      // Already registered? Ask them to sign in rather than silently creating a
      // second account against the same address.
      const { data: existing } = await supabase
        .from('user_signup')
        .select('create_user_id')
        .eq('email', email)
        .is('deleted_at', null)
        .maybeSingle();

      if (existing) {
        return res.status(409).json({
          error: 'An account already exists for that email. Please log in, then use the code again.',
          shouldLogin: true,
        });
      }

      const { supabaseAdmin } = require('../../lib/supabaseAdmin');
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (authError || !authData?.user) {
        console.error('[Groups] Invite-first account creation failed:', authError?.message);
        return res.status(500).json({ error: 'Could not create your account. Please try again.' });
      }

      userId = authData.user.id;
      createdAccount = true;

      const { error: rowError } = await supabase
        .from('user_signup')
        .insert({
          create_user_id: userId,
          email,
          driver_name: name,
          auth_pending: false,
        });

      if (rowError) {
        console.error('[Groups] Failed to create user_signup row:', rowError.message);
        return res.status(500).json({ error: 'Could not complete your signup. Please try again.' });
      }
    }

    // ---- Guard against double-joining ------------------------------------
    const { data: joiner, error: joinerError } = await supabase
      .from('user_signup')
      .select('create_user_id, email, group_id')
      .eq('create_user_id', userId)
      .maybeSingle();

    if (joinerError || !joiner) {
      return res.status(404).json({ error: 'Your account could not be found.' });
    }

    if (joiner.group_id === group.id) {
      return res.json({
        success: true,
        alreadyMember: true,
        groupId: group.id,
        groupName: group.name,
        message: `You are already part of ${group.name}.`,
      });
    }

    if (joiner.group_id) {
      return res.status(409).json({
        error: 'You already belong to another group. Leave it before joining a new one.',
      });
    }

    // Re-check capacity immediately before the write
    if (await countGroupMembers(group.id) >= group.max_members) {
      return res.status(409).json({ error: 'This group filled up while you were joining.' });
    }

    const { error: linkError } = await supabase
      .from('user_signup')
      .update({
        group_id: group.id,
        group_role: 'member',
        group_joined_at: new Date().toISOString(),
        // Members are covered by the group's subscription
        subscription_tier: group.subscription_tier,
        subscription_status: group.subscription_status,
        subscription_end_date: group.expires_at || null,
      })
      .eq('create_user_id', userId);

    if (linkError) {
      console.error('[Groups] Failed to link member to group:', linkError.message);
      return res.status(500).json({ error: 'Could not add you to the group.' });
    }

    // Best-effort audit trail. group_invitations is optional now, so a failure
    // here must not fail the join.
    try {
      await supabase.from('group_invitations').insert({
        group_id: group.id,
        email: joiner.email,
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        invited_by: group.admin_user_id,
      });
    } catch (auditError) {
      console.warn('[Groups] Could not write join audit row:', auditError.message);
    }

    const used = await countGroupMembers(group.id);
    console.log('[Groups] Member joined by code:', userId, '->', group.id, `(${used}/${group.max_members})`);

    return res.json({
      success: true,
      createdAccount,
      groupId: group.id,
      groupName: group.name,
      groupType: group.type,
      seatsUsed: used,
      seatsTotal: group.max_members,
      message: `Welcome to ${group.name}!`,
    });

  } catch (error) {
    console.error('[Groups] joinByCode error:', error.message);
    return res.status(500).json({ error: 'Could not complete joining. Please try again.' });
  }
}

/**
 * Rotate a group's join code. Admin only.
 * Existing members are unaffected - only un-redeemed copies of the old code
 * stop working, which is the point: it revokes a code that has been shared too
 * widely without disrupting anyone already in.
 *
 * POST /api/groups/:groupId/regenerate-code
 */
async function regenerateJoinCode(req, res) {
  const { groupId } = req.params;

  try {
    const { data: group, error } = await supabase
      .from('subscription_groups')
      .select('id, type, admin_user_id')
      .eq('id', groupId)
      .maybeSingle();

    if (error || !group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Identity from the session, not the body
    if (group.admin_user_id !== req.userId) {
      return res.status(403).json({ error: 'Only the group admin can regenerate the join code' });
    }

    const newCode = await generateUniqueJoinCode(group.type);

    const { error: updateError } = await supabase
      .from('subscription_groups')
      .update({ join_code: newCode, join_code_updated_at: new Date().toISOString() })
      .eq('id', group.id);

    if (updateError) {
      console.error('[Groups] Failed to regenerate join code:', updateError.message);
      return res.status(500).json({ error: 'Could not regenerate the code' });
    }

    console.log('[Groups] Join code regenerated for group:', group.id);

    return res.json({
      success: true,
      joinCode: newCode,
      joinUrl: `${process.env.APP_URL || 'https://www.carcrashlawyerai.com'}/join?code=${encodeURIComponent(newCode)}`,
      message: 'Previous code no longer works. Existing members are unaffected.',
    });

  } catch (err) {
    console.error('[Groups] regenerateJoinCode error:', err.message);
    return res.status(500).json({ error: 'Could not regenerate the code' });
  }
}

module.exports = {
  // Internal functions
  createGroup,
  updateGroupSubscriptionStatus,
  TIER_CONFIG,

  // Join codes
  validateJoinCode,
  joinByCode,
  regenerateJoinCode,
  normaliseJoinCode,
  generateUniqueJoinCode,

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
