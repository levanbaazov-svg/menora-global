// Server-side AI tools for the rabbi assistant.
// Each tool is a small function that hits Hasura via the admin client.
// The AI SDK invokes these by JSON schema; the result is fed back to the model.
//
// All tools are scoped to the rabbi's active community — never cross-community.

import 'server-only';
import { z } from 'zod';
import { tool } from 'ai';
import { hasuraAdmin } from '@/lib/hasura';

// ── Context (passed through closure) ───────────────────────────────────
export interface AssistantContext {
  userId: string;        // the rabbi using the assistant
  communityId: string;
}

// ── Helpers ────────────────────────────────────────────────────────────
function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}
function isoDateOrThrow(s: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error(`bad date: ${s}`);
  return s;
}

// ────────────────────────────────────────────────────────────────────────
// MEMBERS
// ────────────────────────────────────────────────────────────────────────
const LOOKUP_MEMBERS = /* GraphQL */ `
  query LookupMembers($community_id: uuid!, $q: String!) {
    memberships(
      where: {
        community_id: { _eq: $community_id }
        status: { _eq: active }
        user: {
          _or: [
            { name: { _ilike: $q } }
            { email: { _ilike: $q } }
          ]
        }
      }
      limit: 8
    ) {
      role joined_at
      user {
        id name email image_url
        profile { hebrew_name legal_first_name legal_last_name }
      }
    }
  }
`;

const GET_MEMBER_SUMMARY = /* GraphQL */ `
  query MemberSummary($community_id: uuid!, $user_id: uuid!) {
    memberships(
      where: { community_id: { _eq: $community_id }, user_id: { _eq: $user_id } }
      limit: 1
    ) {
      role status joined_at
      user {
        id name email image_url
        profile {
          hebrew_name legal_first_name legal_last_name
          gender date_of_birth phone_e164 marital_status
          has_children children_ages denomination observance_level
        }
      }
    }
    notes: member_notes(
      where: { community_id: { _eq: $community_id }, member_user_id: { _eq: $user_id } }
      order_by: { created_at: desc } limit: 8
    ) {
      id body source created_at
      author { id name }
    }
    recent_rsvps: rsvps(
      where: { user_id: { _eq: $user_id } }
      order_by: { created_at: desc } limit: 5
    ) {
      status created_at
      event { id title starts_at }
    }
    open_tasks: rabbi_tasks(
      where: {
        community_id: { _eq: $community_id }
        related_member_user_id: { _eq: $user_id }
        status: { _eq: open }
      }
      order_by: { due_date: asc_nulls_last } limit: 5
    ) {
      id title due_date due_at
    }
  }
`;

const ADD_NOTE = /* GraphQL */ `
  mutation AddNote($obj: member_notes_insert_input!) {
    insert_member_notes_one(object: $obj) { id created_at }
  }
`;

// ────────────────────────────────────────────────────────────────────────
// TASKS
// ────────────────────────────────────────────────────────────────────────
const ADD_TASK = /* GraphQL */ `
  mutation AddTask($obj: rabbi_tasks_insert_input!) {
    insert_rabbi_tasks_one(object: $obj) {
      id title due_date due_at status priority
    }
  }
`;

const LIST_TASKS = /* GraphQL */ `
  query ListTasks(
    $community_id: uuid!, $status: rabbi_task_status,
    $until: date, $member_id: uuid
  ) {
    rabbi_tasks(
      where: {
        community_id: { _eq: $community_id }
        status: { _eq: $status }
        due_date: { _lte: $until }
        related_member_user_id: { _eq: $member_id }
      }
      order_by: [{ due_date: asc_nulls_last }, { priority: desc }]
      limit: 30
    ) {
      id title body due_date due_at status priority
      related_member { id name }
      related_event { id title starts_at }
    }
  }
`;

const COMPLETE_TASK = /* GraphQL */ `
  mutation CompleteTask($id: uuid!, $by: uuid!) {
    update_rabbi_tasks_by_pk(
      pk_columns: { id: $id }
      _set: {
        status: done,
        completed_at: "now()",
        completed_by_user_id: $by
      }
    ) { id title }
  }
`;

// ────────────────────────────────────────────────────────────────────────
// EVENTS + REQUESTS
// ────────────────────────────────────────────────────────────────────────
const UPCOMING_EVENTS = /* GraphQL */ `
  query UpcomingEvents($community_id: uuid!, $until: timestamptz!) {
    events(
      where: {
        community_id: { _eq: $community_id }
        status: { _eq: published }
        starts_at: { _gte: "now()", _lte: $until }
      }
      order_by: { starts_at: asc } limit: 20
    ) {
      id title type starts_at location_text
      attendee_count_cached max_attendees
    }
  }
`;

const PENDING_REQUESTS = /* GraphQL */ `
  query PendingRequests($community_id: uuid!) {
    requests(
      where: {
        community_id: { _eq: $community_id }
        status: { _eq: open }
      }
      order_by: { created_at: desc } limit: 15
    ) {
      id title body category urgency created_at reply_count_cached
      user { id name }
    }
  }
`;

// ────────────────────────────────────────────────────────────────────────
// COMMUNITY STATS
// ────────────────────────────────────────────────────────────────────────
const COMMUNITY_STATS = /* GraphQL */ `
  query CommunityStats($community_id: uuid!, $today: date!, $week: date!) {
    members_count: memberships_aggregate(
      where: { community_id: { _eq: $community_id }, status: { _eq: active } }
    ) { aggregate { count } }

    pending_membership: memberships_aggregate(
      where: { community_id: { _eq: $community_id }, status: { _eq: pending } }
    ) { aggregate { count } }

    pending_places: places_aggregate(
      where: { community_id: { _eq: $community_id }, submission_status: { _eq: pending } }
    ) { aggregate { count } }

    open_requests: requests_aggregate(
      where: { community_id: { _eq: $community_id }, status: { _eq: open } }
    ) { aggregate { count } }

    open_tasks: rabbi_tasks_aggregate(
      where: { community_id: { _eq: $community_id }, status: { _eq: open } }
    ) { aggregate { count } }

    upcoming_events: events_aggregate(
      where: {
        community_id: { _eq: $community_id }
        status: { _eq: published }
        starts_at: { _gte: $today, _lte: $week }
      }
    ) { aggregate { count } }
  }
`;

// Birthdays within the next N days. We rely on Postgres' date_part comparison
// across years — done via a Hasura query parameter passed as raw filter.
const BIRTHDAYS_WEEK = /* GraphQL */ `
  query Birthdays($community_id: uuid!) {
    memberships(
      where: {
        community_id: { _eq: $community_id }
        status: { _eq: active }
        user: { profile: { date_of_birth: { _is_null: false } } }
      }
      limit: 200
    ) {
      user {
        id name profile { date_of_birth }
      }
    }
  }
`;

// ────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS (send on rabbi's behalf)
// ────────────────────────────────────────────────────────────────────────
const SEND_NOTIFICATION = /* GraphQL */ `
  mutation SendNotification($obj: notifications_insert_input!) {
    insert_notifications_one(object: $obj) { id }
  }
`;

// ────────────────────────────────────────────────────────────────────────
// CALENDAR helpers
// ────────────────────────────────────────────────────────────────────────
function googleCalendarQuickAddUrl(p: {
  title: string;
  description?: string;
  location?: string;
  startsAt?: string;   // ISO
  endsAt?: string;     // ISO
}): string {
  const toGcalDate = (iso: string) =>
    new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const params = new URLSearchParams();
  params.set('action', 'TEMPLATE');
  params.set('text', p.title);
  if (p.description) params.set('details', p.description);
  if (p.location) params.set('location', p.location);
  if (p.startsAt) {
    const start = toGcalDate(p.startsAt);
    const end = p.endsAt ? toGcalDate(p.endsAt) : toGcalDate(new Date(new Date(p.startsAt).getTime() + 3600_000).toISOString());
    params.set('dates', `${start}/${end}`);
  }
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// ────────────────────────────────────────────────────────────────────────
// Build the toolset, closing over context (so each tool knows the rabbi).
// ────────────────────────────────────────────────────────────────────────
export function buildTools(ctx: AssistantContext) {
  return {
    // ── Members ────────────────────────────────────────────────────────
    lookup_member: tool({
      description: 'Search active community members by name or email substring. Returns up to 8 matches with role + Hebrew name.',
      inputSchema: z.object({
        query: z.string().min(1).describe('Name or email fragment to search for'),
      }),
      execute: async ({ query }) => {
        const q = `%${query}%`;
        const r = await hasuraAdmin.request<{
          memberships: Array<{
            role: string; joined_at: string;
            user: {
              id: string; name: string | null; email: string | null; image_url: string | null;
              profile: { hebrew_name: string | null; legal_first_name: string | null; legal_last_name: string | null } | null;
            };
          }>;
        }>(LOOKUP_MEMBERS, { community_id: ctx.communityId, q });
        return r.memberships.map((m) => ({
          user_id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          hebrew_name: m.user.profile?.hebrew_name ?? null,
          legal_name: [m.user.profile?.legal_first_name, m.user.profile?.legal_last_name].filter(Boolean).join(' ') || null,
          role: m.role,
          joined_at: m.joined_at,
        }));
      },
    }),

    get_member_summary: tool({
      description: 'Get full info about a specific community member: profile, recent notes (rabbi-private), RSVP history, open tasks. Pass the user_id returned by lookup_member.',
      inputSchema: z.object({
        user_id: z.string().uuid(),
      }),
      execute: async ({ user_id }) => {
        const r = await hasuraAdmin.request<{
          memberships: Array<{
            role: string; status: string; joined_at: string;
            user: {
              id: string; name: string | null; email: string | null; image_url: string | null;
              profile: Record<string, unknown> | null;
            };
          }>;
          notes: Array<{ id: string; body: string; source: string | null; created_at: string; author: { id: string; name: string | null } | null }>;
          recent_rsvps: Array<{ status: string; created_at: string; event: { id: string; title: string; starts_at: string } | null }>;
          open_tasks: Array<{ id: string; title: string; due_date: string | null; due_at: string | null }>;
        }>(GET_MEMBER_SUMMARY, { community_id: ctx.communityId, user_id });

        const m = r.memberships[0];
        if (!m) return { error: 'Member not in your community' };
        return {
          user_id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          role: m.role,
          joined_at: m.joined_at,
          profile: m.user.profile,
          notes_count: r.notes.length,
          recent_notes: r.notes.map((n) => ({
            id: n.id, body: n.body, created_at: n.created_at, author: n.author?.name ?? null,
          })),
          recent_rsvps: r.recent_rsvps,
          open_tasks_for_member: r.open_tasks,
        };
      },
    }),

    add_member_note: tool({
      description: 'Add a private note about a community member. Visible only to rabbi/admin in your community — the member never sees it.',
      inputSchema: z.object({
        member_user_id: z.string().uuid(),
        body: z.string().min(2).max(2000),
      }),
      execute: async ({ member_user_id, body }) => {
        const r = await hasuraAdmin.request<{
          insert_member_notes_one: { id: string; created_at: string } | null;
        }>(ADD_NOTE, {
          obj: {
            community_id: ctx.communityId,
            member_user_id,
            author_user_id: ctx.userId,
            body,
            source: 'ai_assistant',
          },
        });
        return r.insert_member_notes_one ?? { error: 'failed' };
      },
    }),

    // ── Tasks ──────────────────────────────────────────────────────────
    add_task: tool({
      description: 'Create a new task/reminder for the rabbi. Optional due_date (YYYY-MM-DD). Can link to a member, event, or program.',
      inputSchema: z.object({
        title: z.string().min(2).max(200),
        body: z.string().max(1000).optional(),
        due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('YYYY-MM-DD'),
        due_at: z.string().optional().describe('Full ISO datetime if a specific time is meant'),
        priority: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
        related_member_user_id: z.string().uuid().optional(),
        related_event_id: z.string().uuid().optional(),
      }),
      execute: async (input) => {
        const r = await hasuraAdmin.request<{
          insert_rabbi_tasks_one: {
            id: string; title: string; due_date: string | null; due_at: string | null;
            status: string; priority: number;
          } | null;
        }>(ADD_TASK, {
          obj: {
            community_id: ctx.communityId,
            created_by_user_id: ctx.userId,
            assigned_to_user_id: ctx.userId,
            title: input.title,
            body: input.body,
            due_date: input.due_date,
            due_at: input.due_at,
            priority: input.priority,
            related_member_user_id: input.related_member_user_id,
            related_event_id: input.related_event_id,
            source: 'ai_assistant',
          },
        });
        return r.insert_rabbi_tasks_one ?? { error: 'failed' };
      },
    }),

    list_tasks: tool({
      description: 'List rabbi tasks. Filter by status (open/done/cancelled), optional until-date and member.',
      inputSchema: z.object({
        status: z.enum(['open','done','cancelled']).default('open'),
        until_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Only tasks due on/before this date'),
        related_member_user_id: z.string().uuid().optional(),
      }),
      execute: async ({ status, until_date, related_member_user_id }) => {
        const r = await hasuraAdmin.request<{
          rabbi_tasks: Array<{
            id: string; title: string; body: string | null;
            due_date: string | null; due_at: string | null;
            status: string; priority: number;
            related_member: { id: string; name: string | null } | null;
            related_event: { id: string; title: string; starts_at: string } | null;
          }>;
        }>(LIST_TASKS, {
          community_id: ctx.communityId,
          status,
          until: until_date ?? '9999-12-31',
          member_id: related_member_user_id ?? null,
        });
        return r.rabbi_tasks;
      },
    }),

    complete_task: tool({
      description: 'Mark a task as done.',
      inputSchema: z.object({ task_id: z.string().uuid() }),
      execute: async ({ task_id }) => {
        const r = await hasuraAdmin.request<{
          update_rabbi_tasks_by_pk: { id: string; title: string } | null;
        }>(COMPLETE_TASK, { id: task_id, by: ctx.userId });
        return r.update_rabbi_tasks_by_pk ?? { error: 'not found' };
      },
    }),

    // ── Events + Requests ──────────────────────────────────────────────
    get_upcoming_events: tool({
      description: 'List upcoming published events in the community within the next N days.',
      inputSchema: z.object({
        days_ahead: z.number().int().min(1).max(180).default(30),
      }),
      execute: async ({ days_ahead }) => {
        const until = new Date(Date.now() + days_ahead * 86_400_000).toISOString();
        const r = await hasuraAdmin.request<{
          events: Array<{
            id: string; title: string; type: string;
            starts_at: string; location_text: string | null;
            attendee_count_cached: number; max_attendees: number | null;
          }>;
        }>(UPCOMING_EVENTS, { community_id: ctx.communityId, until });
        return r.events;
      },
    }),

    get_pending_requests: tool({
      description: 'List open community help requests (people asking for things).',
      inputSchema: z.object({}),
      execute: async () => {
        const r = await hasuraAdmin.request<{
          requests: Array<{
            id: string; title: string; body: string; category: string;
            urgency: string; created_at: string; reply_count_cached: number;
            user: { id: string; name: string | null } | null;
          }>;
        }>(PENDING_REQUESTS, { community_id: ctx.communityId });
        return r.requests;
      },
    }),

    // ── Community-wide ─────────────────────────────────────────────────
    community_stats: tool({
      description: 'Overview of the community: counts of active/pending members, open tasks/requests, upcoming events this week.',
      inputSchema: z.object({}),
      execute: async () => {
        const today = isoToday();
        const week = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
        const r = await hasuraAdmin.request<{
          members_count: { aggregate: { count: number } | null };
          pending_membership: { aggregate: { count: number } | null };
          pending_places: { aggregate: { count: number } | null };
          open_requests: { aggregate: { count: number } | null };
          open_tasks: { aggregate: { count: number } | null };
          upcoming_events: { aggregate: { count: number } | null };
        }>(COMMUNITY_STATS, { community_id: ctx.communityId, today, week });
        return {
          active_members: r.members_count.aggregate?.count ?? 0,
          pending_membership_requests: r.pending_membership.aggregate?.count ?? 0,
          pending_place_submissions: r.pending_places.aggregate?.count ?? 0,
          open_help_requests: r.open_requests.aggregate?.count ?? 0,
          open_tasks: r.open_tasks.aggregate?.count ?? 0,
          events_this_week: r.upcoming_events.aggregate?.count ?? 0,
        };
      },
    }),

    birthdays_in_next_week: tool({
      description: 'Find community members with birthdays in the next 7 days. Use to plan a wish.',
      inputSchema: z.object({}),
      execute: async () => {
        const r = await hasuraAdmin.request<{
          memberships: Array<{
            user: { id: string; name: string | null; profile: { date_of_birth: string | null } | null };
          }>;
        }>(BIRTHDAYS_WEEK, { community_id: ctx.communityId });
        const today = new Date();
        const inWindow: Array<{ user_id: string; name: string | null; date_of_birth: string; days_until: number }> = [];
        for (const m of r.memberships) {
          const dob = m.user.profile?.date_of_birth;
          if (!dob) continue;
          const [y, mo, d] = dob.split('-').map(Number);
          if (!mo || !d) continue;
          const thisYear = new Date(today.getFullYear(), mo - 1, d);
          let next = thisYear;
          if (thisYear.getTime() < today.setHours(0,0,0,0)) {
            next = new Date(today.getFullYear() + 1, mo - 1, d);
          }
          const daysUntil = Math.round((next.getTime() - new Date().setHours(0,0,0,0)) / 86_400_000);
          if (daysUntil >= 0 && daysUntil <= 7) {
            inWindow.push({ user_id: m.user.id, name: m.user.name, date_of_birth: dob, days_until: daysUntil });
          }
        }
        inWindow.sort((a, b) => a.days_until - b.days_until);
        return inWindow;
      },
    }),

    // ── Send notification on rabbi's behalf ─────────────────────────────
    send_notification_to_member: tool({
      description: 'Send an in-app notification to a community member from the rabbi. They\'ll see it in their notification bell. Use sparingly — for important personal messages.',
      inputSchema: z.object({
        recipient_user_id: z.string().uuid(),
        title: z.string().min(2).max(120),
        body: z.string().min(2).max(500),
        link: z.string().max(200).optional().describe('Optional in-app path like /dashboard/events/<id>'),
      }),
      execute: async ({ recipient_user_id, title, body, link }) => {
        const r = await hasuraAdmin.request<{
          insert_notifications_one: { id: string } | null;
        }>(SEND_NOTIFICATION, {
          obj: {
            recipient_user_id,
            actor_user_id: ctx.userId,
            community_id: ctx.communityId,
            type: 'rabbi_message',
            title,
            body,
            link,
            metadata: { source: 'ai_assistant' },
          },
        });
        return r.insert_notifications_one ?? { error: 'failed' };
      },
    }),

    // ── Calendar quick-add (no OAuth) ───────────────────────────────────
    google_calendar_quick_add: tool({
      description: 'Generate a Google Calendar "Add event" URL the rabbi can click to add an event to their personal calendar. NO OAuth — just a prefilled link.',
      inputSchema: z.object({
        title: z.string().min(2).max(200),
        description: z.string().max(1000).optional(),
        location: z.string().max(200).optional(),
        starts_at: z.string().describe('ISO datetime'),
        ends_at: z.string().optional().describe('ISO datetime (defaults to start + 1h)'),
      }),
      execute: async (input) => {
        return {
          url: googleCalendarQuickAddUrl({
            title: input.title,
            description: input.description,
            location: input.location,
            startsAt: input.starts_at,
            endsAt: input.ends_at,
          }),
        };
      },
    }),
  };
}
