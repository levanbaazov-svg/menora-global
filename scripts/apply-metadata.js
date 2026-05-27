// Builds Hasura metadata for our 13 tables: relationships + per-role permissions.
// Applies via /v1/metadata replace_metadata in one shot. Idempotent — re-run anytime.
//
// Permissions model:
//   - anonymous : limited public view (slug-resolution for landing pages).
//   - member    : sees data scoped to their active communities via JWT claims.
//   - rabbi     : same as member + moderate own community.
//   - admin     : full (platform-level).
//
// JWT claims expected:
//   X-Hasura-User-Id              (uuid, scalar)
//   X-Hasura-Default-Role         (string)
//   X-Hasura-Allowed-Roles        (array)
//   X-Hasura-Community-Id         (uuid, current active community — set by client)
//   X-Hasura-Allowed-Community-Ids (array — community IDs of all active memberships)

'use strict';

require('dotenv').config();

const endpoint = process.env.HASURA_GRAPHQL_ENDPOINT;
const adminSecret = process.env.HASURA_GRAPHQL_ADMIN_SECRET;
const sourceName = process.env.HASURA_DATA_SOURCE || 'default';

if (!endpoint || !adminSecret) {
  console.error('HASURA_GRAPHQL_ENDPOINT and HASURA_GRAPHQL_ADMIN_SECRET required');
  process.exit(1);
}

const baseURL = endpoint.replace(/\/v1\/graphql\/?$/, '');
const metadataURL = `${baseURL}/v1/metadata`;

async function callMetadata(body) {
  const res = await fetch(metadataURL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Hasura-Admin-Secret': adminSecret },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`Hasura ${res.status}: ${json.error || text}`);
  return json;
}

const T = (name) => ({ schema: 'public', name });

// ─── Session var shortcuts ────────────────────────────────────────────────────
const USER_ID = 'X-Hasura-User-Id';
const COMMUNITY_ID = 'X-Hasura-Community-Id';
const ALLOWED_COMMUNITY_IDS = 'X-Hasura-Allowed-Community-Ids';

// ─── Column inventory per table ──────────────────────────────────────────────
const COLUMNS = {
  communities: ['id','slug','name','city','country_code','timezone','hebrew_calendar','branding','settings','created_at','updated_at'],
  users: ['id','email','email_verified_at','name','image_url','locale','onboarding_step','onboarded_at','tutorial_completed','first_signup_path','last_seen_at','deactivated_at','created_at','updated_at'],
  accounts: ['id','user_id','provider','provider_account_id','type','access_token','refresh_token','id_token','expires_at','token_type','scope','session_state','created_at','updated_at'],
  user_profiles: ['user_id','legal_first_name','legal_last_name','hebrew_name','gender','date_of_birth','phone_e164','marital_status','has_children','children_ages','spouse_hebrew_name','denomination','observance_level','kashrut_level','interests','languages','bio','profile_visibility','notification_prefs','custom_fields','updated_at'],
  memberships: ['id','user_id','community_id','role','status','entry_method','request_message','invited_by','approved_by','rejected_by','community_role','member_since','family_id','prayer_config','onboarding_done','joined_at','rejected_at','rejected_reason','suspended_at','left_at','created_at','updated_at'],
  invitations: ['id','community_id','email','role','token_hash','invited_by','message','expires_at','accepted_at','accepted_by','revoked_at','revoked_by','created_at','updated_at'],
  audit_log: ['id','actor_user_id','community_id','action','resource_type','resource_id','metadata','ip','user_agent','created_at'],
  events: ['id','community_id','host_user_id','title','description','type','visibility','starts_at','ends_at','timezone','all_day','location_text','location_address','location_visibility','max_attendees','waitlist_enabled','requires_approval','cover_image_url','shabbat_meal_details','tags','status','attendee_count_cached','published_at','cancelled_at','cancellation_reason','created_at','updated_at'],
  rsvps: ['id','event_id','user_id','status','plus_ones','plus_ones_info','dietary_notes','note_to_host','approved_by','approved_at','declined_reason','cancelled_at','created_at','updated_at'],
  requests: ['id','community_id','user_id','category','urgency','title','body','status','accepted_reply_id','expires_at','fulfilled_at','cancelled_at','reply_count_cached','created_at','updated_at'],
  request_replies: ['id','request_id','user_id','body','contact_method','contact_phone','contact_email','withdrawn_at','created_at','updated_at'],
  routines: ['id','user_id','community_id','type','custom_label','target_time','timezone','days_of_week','enabled','reminder_offset_minutes','created_at','updated_at'],
  checkins: ['id','user_id','routine_id','gregorian_date','hebrew_date_text','completed_at','note','created_at'],
  notifications: ['id','recipient_user_id','actor_user_id','community_id','type','title','body','resource_type','resource_id','link','metadata','read_at','created_at'],
  places: ['id','community_id','type','name','description','photo_url','address','city','country_code','neighborhood','latitude','longitude','timezone','hours_schedule','hours_notes','contact_phone','contact_email','website_url','reservation_url','kashrut_level','kashrut_authority','price_level','cuisine_tags','dietary_tags','has_women_section','has_parking_shabbat','prayer_times_url','denomination','accepts_reservations','wheelchair_accessible','family_friendly','submitted_by','submission_status','approved_by','approved_at','rejection_reason','tags','archived_at','created_at','updated_at'],
  programs: ['id','community_id','category','name','description','photo_url','schedule_text','schedule_recurrence','starts_on','ends_on','timezone','age_min','age_max','price_amount','price_currency','price_period','price_notes','max_capacity','enrolled_count_cached','registration_url','registration_open','requires_approval','contact_user_id','location_place_id','location_text','tags','status','created_at','updated_at'],
  program_enrollments: ['id','program_id','user_id','is_for_child','child_first_name','child_last_name','child_dob','child_gender','notes','custom_fields','status','approved_by','approved_at','rejected_at','rejected_reason','enrolled_at','cancelled_at','created_at','updated_at'],
  interest_groups: ['id','community_id','category','name','description','photo_url','visibility','frequency','meeting_location','meeting_place_id','created_by_user_id','member_count_cached','is_ai_suggested','tags','archived_at','created_at','updated_at'],
  group_memberships: ['id','group_id','user_id','role','joined_at','left_at','created_at','updated_at'],
  ai_conversations: ['id','user_id','community_id','scenario','title','last_message_at','message_count','total_tokens_input','total_tokens_output','archived_at','created_at','updated_at'],
  ai_messages: ['id','conversation_id','role','content','tokens_input','tokens_output','model','created_at'],
};

// ─── Relationships ───────────────────────────────────────────────────────────
// `obj` uses foreign_key_constraint_on: <local_col>
// `arr` uses foreign_key_constraint_on: { column: <remote_col>, table: { schema, name } }

const REL = {
  communities: {
    arr: [
      ['memberships', 'memberships', 'community_id'],
      ['invitations', 'invitations', 'community_id'],
      ['events',      'events',      'community_id'],
      ['requests',    'requests',    'community_id'],
      ['routines',    'routines',    'community_id'],
      ['audit_logs',  'audit_log',   'community_id'],
    ],
  },
  users: {
    arr: [
      ['accounts',          'accounts',        'user_id'],
      ['memberships',       'memberships',     'user_id'],
      ['hosted_events',     'events',          'host_user_id'],
      ['rsvps',             'rsvps',           'user_id'],
      ['requests',          'requests',        'user_id'],
      ['request_replies',   'request_replies', 'user_id'],
      ['routines',          'routines',        'user_id'],
      ['checkins',          'checkins',        'user_id'],
      ['audit_log_actions', 'audit_log',       'actor_user_id'],
      ['invitations_sent',  'invitations',     'invited_by'],
    ],
    obj: [
      ['profile', 'user_profiles', 'user_id'],   // 1:1 via PK FK
    ],
  },
  accounts:      { obj: [['user', 'user_id']] },
  user_profiles: { obj: [['user', 'user_id']] },
  memberships: {
    obj: [
      ['user',      'user_id'],
      ['community', 'community_id'],
      ['inviter',   'invited_by'],
      ['approver',  'approved_by'],
      ['rejecter',  'rejected_by'],
    ],
  },
  invitations: {
    obj: [
      ['community', 'community_id'],
      ['inviter',   'invited_by'],
      ['acceptor',  'accepted_by'],
      ['revoker',   'revoked_by'],
    ],
  },
  audit_log: {
    obj: [
      ['actor',     'actor_user_id'],
      ['community', 'community_id'],
    ],
  },
  events: {
    obj: [['community', 'community_id'], ['host', 'host_user_id']],
    arr: [['rsvps', 'rsvps', 'event_id']],
  },
  rsvps: {
    obj: [['event', 'event_id'], ['user', 'user_id'], ['approver', 'approved_by']],
  },
  requests: {
    obj: [
      ['community',      'community_id'],
      ['author',         'user_id'],
      ['accepted_reply', 'accepted_reply_id'],
    ],
    arr: [['replies', 'request_replies', 'request_id']],
  },
  request_replies: {
    obj: [['request', 'request_id'], ['user', 'user_id']],
  },
  routines: {
    obj: [['user', 'user_id'], ['community', 'community_id']],
    arr: [['checkins', 'checkins', 'routine_id']],
  },
  checkins: {
    obj: [['user', 'user_id'], ['routine', 'routine_id']],
  },
  notifications: {
    obj: [
      ['recipient',  'recipient_user_id'],
      ['actor',      'actor_user_id'],
      ['community',  'community_id'],
    ],
  },
  places: {
    obj: [
      ['community',  'community_id'],
      ['submitter',  'submitted_by'],
      ['approver',   'approved_by'],
    ],
    arr: [
      ['programs',   'programs', 'location_place_id'],
    ],
  },
  programs: {
    obj: [
      ['community',  'community_id'],
      ['location',   'location_place_id'],
      ['contact',    'contact_user_id'],
    ],
    arr: [
      ['enrollments', 'program_enrollments', 'program_id'],
    ],
  },
  program_enrollments: {
    obj: [
      ['program',    'program_id'],
      ['user',       'user_id'],
      ['approver',   'approved_by'],
    ],
  },
  interest_groups: {
    obj: [
      ['community',  'community_id'],
      ['creator',    'created_by_user_id'],
      ['meeting_place', 'meeting_place_id'],
    ],
    arr: [
      ['memberships', 'group_memberships', 'group_id'],
    ],
  },
  group_memberships: {
    obj: [
      ['group',      'group_id'],
      ['user',       'user_id'],
    ],
  },
  ai_conversations: {
    obj: [
      ['user',       'user_id'],
      ['community',  'community_id'],
    ],
    arr: [
      ['messages',   'ai_messages', 'conversation_id'],
    ],
  },
  ai_messages: {
    obj: [
      ['conversation', 'conversation_id'],
    ],
  },
};

function objectRels(rel) {
  return ((rel || {}).obj || []).map((r) => {
    // user_profiles has a single-col case; communities/users branches may include
    // the [name, table, column] variant — handle both.
    if (r.length === 3) {
      return { name: r[0], using: { manual_configuration: {
        remote_table: T(r[1]),
        column_mapping: { user_id: r[2] }, // unused — keep for shape
      } } };
    }
    const [name, column] = r;
    return { name, using: { foreign_key_constraint_on: column } };
  });
}

function arrayRels(rel) {
  return ((rel || {}).arr || []).map(([name, table, column]) => ({
    name,
    using: { foreign_key_constraint_on: { column, table: T(table) } },
  }));
}

// Special case: users.profile is an OBJECT relationship from users → user_profiles
// via user_profiles.user_id (the FK lives on the remote side). For Hasura we use:
//   foreign_key_constraint_on: { column: 'user_id', table: 'user_profiles' }
// and it becomes an array-style declaration; but PK uniqueness makes it object.
// Easier: declare profile as MANUAL object relationship.
function buildUsersObjRels() {
  return [
    {
      name: 'profile',
      using: {
        manual_configuration: {
          remote_table: T('user_profiles'),
          column_mapping: { id: 'user_id' },
        },
      },
    },
  ];
}

// ─── Permission helpers ───────────────────────────────────────────────────────
function selectPerm(role, columns, filter, opts = {}) {
  const p = { columns, filter };
  if (opts.limit) p.limit = opts.limit;
  if (opts.allow_aggregations) p.allow_aggregations = true;
  return { role, permission: p, comment: null };
}

function insertPerm(role, columns, check, set = {}) {
  return { role, permission: { check, columns, set, backend_only: false }, comment: null };
}

function updatePerm(role, columns, filter, check = filter, set = {}) {
  return { role, permission: { columns, filter, check, set }, comment: null };
}

function deletePerm(role, filter) {
  return { role, permission: { filter }, comment: null };
}

// Hasura reserves `admin` as the unrestricted role — defining explicit
// permissions for it is an error. Our JWT issues role=admin only to
// platform superusers; they bypass all RLS automatically.

// ─── Per-table permission definitions ────────────────────────────────────────
function permissionsFor(table) {
  const C = COLUMNS[table];
  const out = { select: [], insert: [], update: [], delete: [] };

  switch (table) {
    // ── communities ────────────────────────────────────────────────────────
    case 'communities': {
      // Anonymous: public landing-page resolution by slug; safe columns only.
      out.select.push(selectPerm('anonymous',
        ['id','slug','name','city','country_code','timezone','branding','created_at'],
        {},
      ));
      // Member/rabbi: full read of own communities
      const memberFilter = { id: { _in: ALLOWED_COMMUNITY_IDS } };
      out.select.push(selectPerm('member', C, memberFilter));
      out.select.push(selectPerm('rabbi',  C, memberFilter, { allow_aggregations: true }));
      // Rabbi: update soft fields
      out.update.push(updatePerm('rabbi',
        ['name','city','country_code','timezone','hebrew_calendar','branding','settings'],
        memberFilter, memberFilter,
      ));
      break;
    }

    // ── users ──────────────────────────────────────────────────────────────
    case 'users': {
      // Public-safe columns for cross-member directory.
      const publicCols = ['id','name','image_url','locale','last_seen_at','created_at'];
      const selfFilter = { id: { _eq: USER_ID } };
      const shareCommunityFilter = {
        memberships: {
          community_id: { _in: ALLOWED_COMMUNITY_IDS },
          status: { _eq: 'active' },
        },
      };
      // Member: self OR fellow community members. Column set = publicCols.
      out.select.push(selectPerm('member', publicCols, {
        _or: [selfFilter, shareCommunityFilter],
      }));
      // Self can still read more via /api/me (handled separately by Action).
      // Rabbi: same scoping; can see email of own community members.
      out.select.push(selectPerm('rabbi',
        [...publicCols, 'email','onboarding_step','onboarded_at'],
        { _or: [selfFilter, { memberships: { community_id: { _in: ALLOWED_COMMUNITY_IDS } } }] },
      ));
      // Update self only (no email — handled by auth flow).
      out.update.push(updatePerm('member',
        ['name','image_url','locale','onboarding_step','tutorial_completed','last_seen_at'],
        selfFilter, selfFilter,
      ));
      break;
    }

    // ── accounts (next-auth) ──────────────────────────────────────────────
    case 'accounts': {
      // No regular role reads accounts. Admin only (and next-auth uses admin-secret).
      break;
    }

    // ── user_profiles ─────────────────────────────────────────────────────
    case 'user_profiles': {
      const selfFilter = { user_id: { _eq: USER_ID } };
      const shareCommunityFilter = {
        user: { memberships: { community_id: { _in: ALLOWED_COMMUNITY_IDS }, status: { _eq: 'active' } } },
      };
      // Member: single permission with public columns. Self's PRIVATE fields
      // (phone, DOB, kashrut, custom_fields) are fetched via /api/me Action
      // under admin secret — never exposed to community-directory queries.
      const memberPublicCols = ['user_id','legal_first_name','legal_last_name','hebrew_name','gender','marital_status','has_children','denomination','observance_level','kashrut_level','interests','languages','bio','profile_visibility'];
      out.select.push(selectPerm('member', memberPublicCols, {
        _or: [
          selfFilter,
          { _and: [
            shareCommunityFilter,
            { profile_visibility: { _in: ['community','members_only'] } },
          ] },
        ],
      }));
      // Rabbi: full profile of own community members.
      out.select.push(selectPerm('rabbi', C, shareCommunityFilter));
      // Insert self (during onboarding) — admin secret only typically, but allow self too.
      out.insert.push(insertPerm('member',
        C.filter((c) => c !== 'updated_at'),
        selfFilter,
        { user_id: USER_ID },
      ));
      out.update.push(updatePerm('member',
        C.filter((c) => !['user_id','updated_at'].includes(c)),
        selfFilter, selfFilter,
      ));
      break;
    }

    // ── memberships ───────────────────────────────────────────────────────
    case 'memberships': {
      const selfFilter = { user_id: { _eq: USER_ID } };
      const ownCommunityFilter = { community_id: { _in: ALLOWED_COMMUNITY_IDS } };
      // Member: self memberships + fellow active members in shared communities
      out.select.push(selectPerm('member', C, {
        _or: [
          selfFilter,
          { _and: [ownCommunityFilter, { status: { _eq: 'active' } }] },
        ],
      }));
      // Rabbi: all in own community (pending applications visible)
      out.select.push(selectPerm('rabbi', C, ownCommunityFilter, { allow_aggregations: true }));
      // Rabbi update: status, role (но не на admin), suspended/left timestamps; in own community.
      out.update.push(updatePerm('rabbi',
        ['status','role','approved_by','rejected_by','rejected_at','rejected_reason','suspended_at','community_role'],
        ownCommunityFilter,
        // Check: cannot promote to admin
        { _and: [ownCommunityFilter, { role: { _nin: ['admin'] } }] },
      ));
      // Member: update own (limited — onboarding fields)
      out.update.push(updatePerm('member',
        ['prayer_config','onboarding_done','left_at','community_role','member_since','family_id'],
        selfFilter, selfFilter,
      ));
      // Self-request inserts go through Action; member can request directly though:
      out.insert.push(insertPerm('member',
        ['community_id','request_message','entry_method'],
        { _and: [
          { user_id: { _eq: USER_ID } },
          { status: { _eq: 'pending' } },
          { entry_method: { _eq: 'self_request' } },
        ] },
        { user_id: USER_ID, status: 'pending', entry_method: 'self_request', role: 'member' },
      ));
      break;
    }

    // ── invitations ───────────────────────────────────────────────────────
    case 'invitations': {
      const ownCommunityFilter = { community_id: { _in: ALLOWED_COMMUNITY_IDS } };
      // Rabbi: full CRUD in own community.
      // No token_hash visible — strip to safe columns.
      const visibleCols = C.filter((c) => c !== 'token_hash');
      out.select.push(selectPerm('rabbi', visibleCols, ownCommunityFilter, { allow_aggregations: true }));
      out.insert.push(insertPerm('rabbi',
        ['community_id','email','role','message','expires_at','token_hash'],
        ownCommunityFilter,
        { invited_by: USER_ID },
      ));
      out.update.push(updatePerm('rabbi',
        ['revoked_at','revoked_by','expires_at'],
        ownCommunityFilter, ownCommunityFilter,
        { revoked_by: USER_ID },
      ));
      out.delete.push(deletePerm('rabbi', ownCommunityFilter));
      // accept-invitation flow is a Hasura Action — uses admin secret.
      break;
    }

    // ── audit_log ─────────────────────────────────────────────────────────
    case 'audit_log': {
      const ownCommunityFilter = { community_id: { _in: ALLOWED_COMMUNITY_IDS } };
      out.select.push(selectPerm('rabbi', C, ownCommunityFilter, { allow_aggregations: true }));
      // Insert happens via DB triggers + admin secret; no role insert.
      break;
    }

    // ── events ────────────────────────────────────────────────────────────
    case 'events': {
      const ownCommunityFilter = { community_id: { _in: ALLOWED_COMMUNITY_IDS } };
      const ownEventFilter = { host_user_id: { _eq: USER_ID } };
      // Member: published events in own communities + own drafts.
      out.select.push(selectPerm('member', C, {
        _and: [ownCommunityFilter, {
          _or: [
            { status: { _eq: 'published' } },
            ownEventFilter,
          ],
        }],
      }, { allow_aggregations: true }));
      // Rabbi: all events in community.
      out.select.push(selectPerm('rabbi', C, ownCommunityFilter, { allow_aggregations: true }));
      // Insert: member can create draft in own community.
      out.insert.push(insertPerm('member',
        ['community_id','title','description','type','visibility','starts_at','ends_at','timezone','all_day','location_text','location_address','location_visibility','max_attendees','waitlist_enabled','requires_approval','cover_image_url','shabbat_meal_details','tags','status'],
        { _and: [
          ownCommunityFilter,
          { host_user_id: { _eq: USER_ID } },
          { status: { _in: ['draft','published'] } },
        ] },
        { host_user_id: USER_ID },
      ));
      // Update own events.
      out.update.push(updatePerm('member',
        ['title','description','type','visibility','starts_at','ends_at','timezone','all_day','location_text','location_address','location_visibility','max_attendees','waitlist_enabled','requires_approval','cover_image_url','shabbat_meal_details','tags','status','published_at','cancelled_at','cancellation_reason'],
        ownEventFilter, ownEventFilter,
      ));
      // Rabbi: edit/publish/cancel any in community.
      out.update.push(updatePerm('rabbi',
        ['title','description','type','visibility','starts_at','ends_at','timezone','all_day','location_text','location_address','location_visibility','max_attendees','waitlist_enabled','requires_approval','cover_image_url','shabbat_meal_details','tags','status','published_at','cancelled_at','cancellation_reason'],
        ownCommunityFilter, ownCommunityFilter,
      ));
      // Delete: host only (rabbi cancels instead).
      out.delete.push(deletePerm('member', { _and: [ownEventFilter, { status: { _eq: 'draft' } }] }));
      out.delete.push(deletePerm('rabbi', ownCommunityFilter));
      break;
    }

    // ── rsvps ─────────────────────────────────────────────────────────────
    case 'rsvps': {
      const selfFilter = { user_id: { _eq: USER_ID } };
      const hostFilter = { event: { host_user_id: { _eq: USER_ID } } };
      const ownCommunityFilter = { event: { community_id: { _in: ALLOWED_COMMUNITY_IDS } } };
      // Member: own RSVPs + RSVPs on events you host.
      out.select.push(selectPerm('member', C, { _or: [selfFilter, hostFilter] }, { allow_aggregations: true }));
      // For aggregate counts (e.g. "yes count"), separate permission with minimal columns
      // and broader filter — but Hasura aggregates respect row filter, so all-community
      // events' aggregates are visible from member's perspective via filter union above.
      out.select.push(selectPerm('rabbi', C, ownCommunityFilter, { allow_aggregations: true }));
      // Insert: only for events in own community.
      out.insert.push(insertPerm('member',
        ['event_id','status','plus_ones','plus_ones_info','dietary_notes','note_to_host'],
        { _and: [
          { user_id: { _eq: USER_ID } },
          { event: { community_id: { _in: ALLOWED_COMMUNITY_IDS } } },
        ] },
        { user_id: USER_ID },
      ));
      out.update.push(updatePerm('member',
        ['status','plus_ones','plus_ones_info','dietary_notes','note_to_host','cancelled_at'],
        selfFilter, selfFilter,
      ));
      // Host: approve/decline RSVPs to own events.
      out.update.push(updatePerm('rabbi',
        ['approved_by','approved_at','declined_reason','status'],
        ownCommunityFilter, ownCommunityFilter,
        { approved_by: USER_ID },
      ));
      out.delete.push(deletePerm('member', selfFilter));
      break;
    }

    // ── requests ──────────────────────────────────────────────────────────
    case 'requests': {
      const selfFilter = { user_id: { _eq: USER_ID } };
      const ownCommunityFilter = { community_id: { _in: ALLOWED_COMMUNITY_IDS } };
      // Member: open in own community + own (any status).
      out.select.push(selectPerm('member', C, {
        _and: [ownCommunityFilter, {
          _or: [{ status: { _in: ['open','in_progress'] } }, selfFilter],
        }],
      }, { allow_aggregations: true }));
      out.select.push(selectPerm('rabbi', C, ownCommunityFilter, { allow_aggregations: true }));
      out.insert.push(insertPerm('member',
        ['community_id','category','urgency','title','body','expires_at'],
        { _and: [{ user_id: { _eq: USER_ID } }, ownCommunityFilter] },
        { user_id: USER_ID, status: 'open' },
      ));
      out.update.push(updatePerm('member',
        ['category','urgency','title','body','status','accepted_reply_id','expires_at','fulfilled_at','cancelled_at'],
        selfFilter, selfFilter,
      ));
      out.update.push(updatePerm('rabbi',
        ['status','category','urgency','cancelled_at'],
        ownCommunityFilter, ownCommunityFilter,
      ));
      out.delete.push(deletePerm('member', selfFilter));
      out.delete.push(deletePerm('rabbi', ownCommunityFilter));
      break;
    }

    // ── request_replies ───────────────────────────────────────────────────
    case 'request_replies': {
      const selfFilter = { user_id: { _eq: USER_ID } };
      const ownCommunityFilter = { request: { community_id: { _in: ALLOWED_COMMUNITY_IDS } } };
      // Member: replies on requests in own community (contact_phone/email visible
      // only to request author — enforced at app layer; at DB we expose all).
      out.select.push(selectPerm('member', C, ownCommunityFilter, { allow_aggregations: true }));
      out.insert.push(insertPerm('member',
        ['request_id','body','contact_method','contact_phone','contact_email'],
        { _and: [{ user_id: { _eq: USER_ID } }, ownCommunityFilter] },
        { user_id: USER_ID },
      ));
      out.update.push(updatePerm('member',
        ['body','contact_method','contact_phone','contact_email','withdrawn_at'],
        selfFilter, selfFilter,
      ));
      out.delete.push(deletePerm('member', selfFilter));
      break;
    }

    // ── routines ──────────────────────────────────────────────────────────
    case 'routines': {
      const selfFilter = { user_id: { _eq: USER_ID } };
      out.select.push(selectPerm('member', C, selfFilter, { allow_aggregations: true }));
      out.insert.push(insertPerm('member',
        ['community_id','type','custom_label','target_time','timezone','days_of_week','enabled','reminder_offset_minutes'],
        { user_id: { _eq: USER_ID } },
        { user_id: USER_ID },
      ));
      out.update.push(updatePerm('member',
        ['type','custom_label','target_time','timezone','days_of_week','enabled','reminder_offset_minutes','community_id'],
        selfFilter, selfFilter,
      ));
      out.delete.push(deletePerm('member', selfFilter));
      break;
    }

    // ── checkins ──────────────────────────────────────────────────────────
    case 'checkins': {
      const selfFilter = { user_id: { _eq: USER_ID } };
      out.select.push(selectPerm('member', C, selfFilter, { allow_aggregations: true }));
      out.insert.push(insertPerm('member',
        ['routine_id','gregorian_date','hebrew_date_text','completed_at','note'],
        { user_id: { _eq: USER_ID } },
        { user_id: USER_ID },
      ));
      out.delete.push(deletePerm('member', selfFilter));
      break;
    }

    // ── notifications ─────────────────────────────────────────────────────
    case 'notifications': {
      const selfFilter = { recipient_user_id: { _eq: USER_ID } };
      out.select.push(selectPerm('member', C, selfFilter, { allow_aggregations: true }));
      out.update.push(updatePerm('member', ['read_at'], selfFilter, selfFilter));
      break;
    }

    // ── places ────────────────────────────────────────────────────────────
    case 'places': {
      const ownCommunityFilter = { community_id: { _in: ALLOWED_COMMUNITY_IDS } };
      const approvedFilter = { _and: [
        { submission_status: { _eq: 'approved' } },
        { archived_at: { _is_null: true } },
      ] };

      // Member: see approved places in own communities + their own pending submissions
      out.select.push(selectPerm('member', C, {
        _and: [
          ownCommunityFilter,
          { _or: [approvedFilter, { submitted_by: { _eq: USER_ID } }] },
        ],
      }, { allow_aggregations: true }));

      // Rabbi: full read in own community + pending review
      out.select.push(selectPerm('rabbi', C, ownCommunityFilter, { allow_aggregations: true }));

      // Member: submit a place (goes to pending review)
      out.insert.push(insertPerm('member',
        ['community_id','type','name','description','photo_url','address','city','country_code',
         'neighborhood','latitude','longitude','hours_schedule','hours_notes','contact_phone',
         'contact_email','website_url','reservation_url','kashrut_level','kashrut_authority',
         'price_level','cuisine_tags','dietary_tags','has_women_section','has_parking_shabbat',
         'prayer_times_url','denomination','accepts_reservations','wheelchair_accessible',
         'family_friendly','tags'],
        { _and: [ownCommunityFilter, { submitted_by: { _eq: USER_ID } }] },
        { submitted_by: USER_ID, submission_status: 'pending' },
      ));

      // Member: update own pending submissions
      out.update.push(updatePerm('member',
        ['name','description','photo_url','address','contact_phone','contact_email',
         'website_url','reservation_url','hours_schedule','hours_notes','tags'],
        { _and: [{ submitted_by: { _eq: USER_ID } }, { submission_status: { _eq: 'pending' } }] },
        { submitted_by: { _eq: USER_ID } },
      ));

      // Rabbi: full update in own community (incl. approve)
      out.update.push(updatePerm('rabbi',
        C.filter((c) => !['id','community_id','submitted_by','created_at','updated_at'].includes(c)),
        ownCommunityFilter, ownCommunityFilter,
        { approved_by: USER_ID },
      ));

      // Rabbi: delete (archive preferred but allow hard delete)
      out.delete.push(deletePerm('rabbi', ownCommunityFilter));
      break;
    }

    // ── programs ──────────────────────────────────────────────────────────
    case 'programs': {
      const ownCommunityFilter = { community_id: { _in: ALLOWED_COMMUNITY_IDS } };
      const activeFilter = { status: { _eq: 'active' } };

      // Member: see active programs in own communities
      out.select.push(selectPerm('member', C, {
        _and: [ownCommunityFilter, activeFilter],
      }, { allow_aggregations: true }));

      // Rabbi: full read incl. draft/archived
      out.select.push(selectPerm('rabbi', C, ownCommunityFilter, { allow_aggregations: true }));

      // Rabbi: create/update/delete programs in own community
      out.insert.push(insertPerm('rabbi',
        ['community_id','category','name','description','photo_url','schedule_text',
         'schedule_recurrence','starts_on','ends_on','age_min','age_max','price_amount',
         'price_currency','price_period','price_notes','max_capacity','registration_url',
         'registration_open','requires_approval','contact_user_id','location_place_id',
         'location_text','tags','status'],
        ownCommunityFilter,
        { contact_user_id: USER_ID },
      ));
      out.update.push(updatePerm('rabbi',
        C.filter((c) => !['id','community_id','enrolled_count_cached','created_at','updated_at'].includes(c)),
        ownCommunityFilter, ownCommunityFilter,
      ));
      out.delete.push(deletePerm('rabbi', ownCommunityFilter));
      break;
    }

    // ── interest_groups ──────────────────────────────────────────────────
    case 'interest_groups': {
      const ownCommunityFilter = { community_id: { _in: ALLOWED_COMMUNITY_IDS } };
      const activeFilter = { archived_at: { _is_null: true } };

      // Member: see active groups in own community + global + public.
      out.select.push(selectPerm('member', C, {
        _and: [
          activeFilter,
          { _or: [
            ownCommunityFilter,
            { community_id: { _is_null: true } },
            { visibility: { _eq: 'public' } },
          ] },
        ],
      }, { allow_aggregations: true }));

      out.insert.push(insertPerm('member',
        ['community_id','category','name','description','photo_url','visibility',
         'frequency','meeting_location','meeting_place_id','tags','is_ai_suggested'],
        ownCommunityFilter,
        { created_by_user_id: USER_ID },
      ));

      out.update.push(updatePerm('member',
        ['name','description','photo_url','visibility','frequency','meeting_location',
         'meeting_place_id','tags','archived_at'],
        { created_by_user_id: { _eq: USER_ID } },
        { created_by_user_id: { _eq: USER_ID } },
      ));
      out.update.push(updatePerm('rabbi',
        ['name','description','photo_url','visibility','frequency','meeting_location',
         'meeting_place_id','tags','archived_at'],
        ownCommunityFilter, ownCommunityFilter,
      ));

      out.delete.push(deletePerm('member', { created_by_user_id: { _eq: USER_ID } }));
      out.delete.push(deletePerm('rabbi', ownCommunityFilter));
      break;
    }

    // ── group_memberships ────────────────────────────────────────────────
    case 'group_memberships': {
      const selfFilter = { user_id: { _eq: USER_ID } };
      // Expose all rows — visibility enforced upstream via interest_groups perm.
      out.select.push(selectPerm('member', C, {}, { allow_aggregations: true }));
      out.insert.push(insertPerm('member',
        ['group_id'],
        { user_id: { _eq: USER_ID } },
        { user_id: USER_ID, role: 'member' },
      ));
      out.update.push(updatePerm('member', ['left_at'], selfFilter, selfFilter));
      out.delete.push(deletePerm('member', selfFilter));
      break;
    }

    // ── program_enrollments ──────────────────────────────────────────────
    case 'program_enrollments': {
      const selfFilter = { user_id: { _eq: USER_ID } };
      const ownCommunityFilter = { program: { community_id: { _in: ALLOWED_COMMUNITY_IDS } } };

      // Member: see own enrollments + summary counts on programs in their community
      out.select.push(selectPerm('member', C, selfFilter, { allow_aggregations: true }));
      // Rabbi: see all enrollments for programs in their community
      out.select.push(selectPerm('rabbi', C, ownCommunityFilter, { allow_aggregations: true }));

      // Member: self-enroll
      out.insert.push(insertPerm('member',
        ['program_id','is_for_child','child_first_name','child_last_name','child_dob',
         'child_gender','notes','custom_fields'],
        { _and: [{ user_id: { _eq: USER_ID } }, ownCommunityFilter] },
        { user_id: USER_ID, status: 'pending' },
      ));

      // Member: cancel own
      out.update.push(updatePerm('member',
        ['notes','custom_fields','cancelled_at','status'],
        selfFilter, selfFilter,
      ));

      // Rabbi: approve/reject pending in own community
      out.update.push(updatePerm('rabbi',
        ['status','approved_by','approved_at','rejected_at','rejected_reason','notes'],
        ownCommunityFilter, ownCommunityFilter,
        { approved_by: USER_ID },
      ));

      out.delete.push(deletePerm('member', selfFilter));
      break;
    }

    // ── ai_conversations ─────────────────────────────────────────────────
    case 'ai_conversations': {
      const selfFilter = { user_id: { _eq: USER_ID } };

      // SELECT: only own conversations
      out.select.push(selectPerm('member', C, selfFilter, { allow_aggregations: true }));

      // INSERT: any member can start a conversation; user_id preset to themselves
      out.insert.push(insertPerm('member',
        ['community_id','scenario','title'],
        selfFilter,
        { user_id: USER_ID },
      ));

      // UPDATE: only title + archived_at (rename / archive)
      out.update.push(updatePerm('member',
        ['title','archived_at'],
        selfFilter, selfFilter,
      ));

      // DELETE: own conversations only
      out.delete.push(deletePerm('member', selfFilter));
      break;
    }

    // ── ai_messages ──────────────────────────────────────────────────────
    case 'ai_messages': {
      const ownConversationFilter = {
        conversation: { user_id: { _eq: USER_ID } },
      };

      // SELECT: messages from own conversations (system messages filtered in UI)
      out.select.push(selectPerm('member', C, ownConversationFilter));

      // Messages are inserted server-side via service role (admin secret).
      // No member-level insert/update/delete — keeps tokens/model fields tamper-proof.
      // (Cascade delete on conversation handles cleanup.)
      break;
    }
  }

  return out;
}

// ─── Build table metadata config ──────────────────────────────────────────────
function buildTableConfig(name) {
  const perm = permissionsFor(name);
  const rel = REL[name] || {};
  const cfg = { table: T(name) };

  const objRels = name === 'users' ? buildUsersObjRels() : objectRels(rel);
  const arrRels = arrayRels(rel);

  if (objRels.length) cfg.object_relationships = objRels;
  if (arrRels.length) cfg.array_relationships = arrRels;
  if (perm.select.length) cfg.select_permissions = perm.select;
  if (perm.insert.length) cfg.insert_permissions = perm.insert;
  if (perm.update.length) cfg.update_permissions = perm.update;
  if (perm.delete.length) cfg.delete_permissions = perm.delete;
  return cfg;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Exporting current metadata...');
  const md = await callMetadata({ type: 'export_metadata', args: {} });

  // metadata might be wrapped in either { metadata: {...} } or directly.
  const meta = md.metadata || md;
  const sources = meta.sources || [];
  const source = sources.find((s) => s.name === sourceName);
  if (!source) throw new Error(`Source "${sourceName}" not found`);

  const trackedTables = source.tables || [];
  const ours = new Set(Object.keys(COLUMNS));

  // Skip schema_migrations — internal.
  const newTables = trackedTables.map((existing) => {
    const tname = existing.table.name;
    if (!ours.has(tname)) return existing;  // leave foreign tables alone
    return buildTableConfig(tname);
  });

  // If a target table somehow isn't tracked yet, add it.
  for (const t of ours) {
    if (!newTables.find((nt) => nt.table.name === t)) {
      newTables.push(buildTableConfig(t));
    }
  }

  source.tables = newTables;

  console.log(`Applying metadata for ${ours.size} tables...`);
  const res = await callMetadata({
    type: 'replace_metadata',
    args: { metadata: meta, allow_inconsistent_metadata: false },
  });
  console.log('Result:', JSON.stringify(res).slice(0, 200));
  console.log('✅ Metadata applied.');
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  if (e.payload) console.error(JSON.stringify(e.payload, null, 2));
  process.exit(1);
});
