/**
 * Group invite card
 *
 * Renders the join code, seat usage and a copy button for the admin of a
 * family or business plan. Used on payment-success.html (immediately after
 * purchase) and dashboard.html (where they will look for it later, having
 * closed the success page).
 *
 * Usage:  <div id="groupInviteCard"></div>
 *         <script src="/js/group-invite-card.js"></script>
 *         GroupInviteCard.mount('groupInviteCard');
 *
 * Renders nothing at all for individual plans or for members, so it is safe to
 * drop onto any page unconditionally.
 */
(function (global) {
  'use strict';

  const STYLE_ID = 'group-invite-card-styles';

  const CSS = `
    .gic {
      background: #fff;
      border: 2px solid #0B7AB0;
      border-radius: 14px;
      padding: 24px;
      margin: 24px 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #1e293b;
      text-align: left;
    }
    .gic h3 { font-size: 20px; color: #0B7AB0; margin: 0 0 6px; }
    .gic p { margin: 0 0 14px; color: #475569; line-height: 1.6; font-size: 15px; }
    .gic .gic-seats {
      display: inline-block; background: #ecfeff; color: #155e75;
      border-radius: 999px; padding: 4px 12px; font-size: 14px;
      font-weight: 600; margin-bottom: 14px;
    }
    .gic .gic-seats.full { background: #fef2f2; color: #991b1b; }
    .gic-coderow { display: flex; gap: 10px; align-items: stretch; flex-wrap: wrap; }
    .gic-code {
      flex: 1 1 200px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 24px; font-weight: 700; letter-spacing: 0.14em;
      background: #f8fafc; border: 2px dashed #94a3b8; border-radius: 10px;
      padding: 14px 16px; text-align: center; color: #0f172a; user-select: all;
    }
    .gic-copy {
      flex: 0 0 auto; background: #0B7AB0; color: #fff; border: none;
      border-radius: 10px; padding: 0 22px; font-size: 15px; font-weight: 600;
      cursor: pointer; font-family: inherit; min-height: 56px;
    }
    .gic-copy:hover { background: #095e88; }
    .gic-copy.copied { background: #059669; }
    .gic-link { margin-top: 12px; font-size: 14px; color: #475569; word-break: break-all; }
    .gic-link a { color: #0B7AB0; }
    .gic-note { margin-top: 14px; font-size: 13px; color: #64748b; }
    @media (max-width: 520px) {
      .gic-code { font-size: 20px; }
      .gic-copy { width: 100%; min-height: 48px; padding: 12px; }
    }
  `;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
  }

  async function currentUserId() {
    try {
      const res = await fetch('/api/auth/session', { credentials: 'include' });
      if (!res.ok) return null;
      const j = await res.json();
      return (j.authenticated && j.user && j.user.id) ? j.user.id : null;
    } catch (e) {
      return null;
    }
  }

  async function copyToClipboard(text) {
    // navigator.clipboard needs a secure context and can be blocked; fall back
    // to a hidden textarea so the button still works.
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) { /* fall through */ }

    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) {
      return false;
    }
  }

  function render(container, data) {
    const g = data.group;
    const isFamily = g.type === 'family';
    const word = isFamily ? 'family' : 'team';

    const card = document.createElement('div');
    card.className = 'gic';

    const h = document.createElement('h3');
    h.textContent = `Invite your ${word}`;
    card.appendChild(h);

    const seats = document.createElement('div');
    seats.className = 'gic-seats' + (g.full ? ' full' : '');
    seats.textContent = g.full
      ? `All ${g.maxMembers} seats used`
      : `${g.memberCount} of ${g.maxMembers} seats used · ${g.seatsRemaining} remaining`;
    card.appendChild(seats);

    const p = document.createElement('p');
    p.textContent = g.full
      ? `Your ${g.name} plan is full. Remove a member to free up a seat.`
      : `Share this code with your ${word}. They enter it when they sign up — there is nothing more for them to pay.`;
    card.appendChild(p);

    if (!g.full && g.joinCode) {
      const row = document.createElement('div');
      row.className = 'gic-coderow';

      const code = document.createElement('div');
      code.className = 'gic-code';
      code.textContent = g.joinCode;
      row.appendChild(code);

      const btn = document.createElement('button');
      btn.className = 'gic-copy';
      btn.type = 'button';
      btn.textContent = 'Copy link';
      btn.addEventListener('click', async function () {
        const ok = await copyToClipboard(g.joinUrl || g.joinCode);
        btn.textContent = ok ? '✓ Copied' : 'Press Ctrl+C';
        btn.classList.toggle('copied', ok);
        setTimeout(function () {
          btn.textContent = 'Copy link';
          btn.classList.remove('copied');
        }, 2500);
      });
      row.appendChild(btn);
      card.appendChild(row);

      if (g.joinUrl) {
        const link = document.createElement('div');
        link.className = 'gic-link';
        link.textContent = 'Or send them this link: ';
        const a = document.createElement('a');
        a.href = g.joinUrl;
        a.textContent = g.joinUrl;
        link.appendChild(a);
        card.appendChild(link);
      }

      const note = document.createElement('div');
      note.className = 'gic-note';
      note.textContent = 'Anyone with this code can take a seat on your plan, so share it only with people you want covered.';
      card.appendChild(note);
    }

    // replaceChildren rather than innerHTML: every value below comes from the
    // API (group name, join code) and is set with textContent, but clearing via
    // a DOM method keeps this file free of innerHTML entirely.
    container.replaceChildren(card);
  }

  /**
   * Waiting/failed states.
   *
   * The rule: silent-nothing is reserved for people who legitimately should not
   * see a code - individual plans and members. Anyone who IS entitled to a code
   * but cannot be shown one yet gets told what is happening, because a blank
   * space after paying £35 reads as a failure.
   */
  function renderPending(container, message, detail) {
    injectStyles();
    const card = document.createElement('div');
    card.className = 'gic';

    const h = document.createElement('h3');
    h.textContent = message;
    card.appendChild(h);

    const p = document.createElement('p');
    p.textContent = detail;
    p.style.marginBottom = '0';
    card.appendChild(p);

    container.replaceChildren(card);
  }

  /**
   * Success-page path: resolve the group from the Stripe checkout session id,
   * which is the only credential available before the webhook has created the
   * buyer's auth account.
   *
   * Polls while the webhook catches up. Bounded, and it says so when it gives
   * up rather than spinning forever.
   */
  async function mountFromCheckoutSession(containerId, sessionId, options) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const opts = options || {};
    const timeoutMs = opts.timeoutMs || 30000;
    const intervalMs = opts.intervalMs || 2500;
    const started = Date.now();
    let announced = false;

    while (Date.now() - started < timeoutMs) {
      try {
        const res = await fetch('/api/groups/by-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        });

        if (res.ok) {
          const data = await res.json();

          // Individual plan - correctly shows nothing at all
          if (data.ready && data.isGroupPlan === false) {
            container.replaceChildren();
            return;
          }

          if (data.ready && data.isGroupPlan && data.joinCode) {
            injectStyles();
            render(container, {
              group: {
                name: data.groupName,
                type: data.groupType,
                maxMembers: data.seatsTotal,
                memberCount: data.seatsUsed,
                seatsRemaining: data.seatsRemaining,
                full: data.full,
                joinCode: data.joinCode,
                joinUrl: data.joinUrl
              }
            });
            console.log('[GroupInviteCard] rendered from checkout session');
            return;
          }
        } else if (res.status === 400 || res.status === 404) {
          // Bad or unknown session id - retrying will not help
          console.warn('[GroupInviteCard] checkout session not recognised');
          return;
        }
      } catch (e) {
        console.warn('[GroupInviteCard] lookup failed, will retry:', e.message);
      }

      // Only claim we are setting something up once we know it is worth waiting
      if (!announced) {
        renderPending(container,
          'Setting up your plan…',
          'This usually takes a few seconds. Your invite code will appear here shortly.');
        announced = true;
      }

      await new Promise(r => setTimeout(r, intervalMs));
    }

    // Bounded wait exceeded. Never leave a blank space - say where to find it.
    if (announced) {
      renderPending(container,
        'Your plan is being set up',
        'It is taking longer than usual. Your invite code will be in your welcome email, and on your dashboard once you log in.');
      console.warn('[GroupInviteCard] timed out waiting for group creation');
    }
  }

  async function mount(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      const userId = await currentUserId();
      if (!userId) return;                     // signed out - render nothing

      const res = await fetch(`/api/groups/user/${encodeURIComponent(userId)}`, {
        credentials: 'include'
      });
      if (!res.ok) return;

      const data = await res.json();

      // Individual plans, and members rather than admins, get no card.
      // The API only returns joinCode to the admin, so this is belt and braces.
      if (!data.hasGroup || !data.group) return;
      if (data.role !== 'admin') return;
      if (!data.group.joinCode && !data.group.full) return;

      injectStyles();
      render(container, data);
      console.log('[GroupInviteCard] rendered for group', data.groupId);

    } catch (error) {
      // Never break the host page over an invite card
      console.warn('[GroupInviteCard] could not render:', error.message);
    }
  }

  /**
   * Prefers the checkout-session route when a session id is present (the buyer
   * has just paid and may not be logged in), and falls back to the session
   * route otherwise. Safe to call on any page.
   */
  async function auto(containerId) {
    const sessionId = new URLSearchParams(window.location.search).get('session_id');
    if (sessionId) return mountFromCheckoutSession(containerId, sessionId);
    return mount(containerId);
  }

  global.GroupInviteCard = { mount, mountFromCheckoutSession, auto };

})(window);
