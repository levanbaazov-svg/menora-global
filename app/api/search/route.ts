// GET /api/search?q=... — global platform search.
// Returns grouped results: communities, programs, events, requests, people, groups.
// Uses admin secret server-side; only public-safe fields returned.

import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';

export const runtime = 'nodejs';

const SEARCH = /* GraphQL */ `
  query GlobalSearch($q: String!, $community_id: uuid!) {
    communities(
      where: { is_public: { _eq: true }, _or: [{ name: { _ilike: $q } }, { city: { _ilike: $q } }, { description: { _ilike: $q } }] }
      limit: 6
    ) {
      slug name city country_code denomination hero_image_url member_count_cached
    }
    programs(
      where: { status: { _eq: active }, community_id: { _eq: $community_id }, _or: [{ name: { _ilike: $q } }, { description: { _ilike: $q } }] }
      limit: 6
    ) {
      id name schedule_text photo_url
    }
    places(
      where: { submission_status: { _eq: approved }, archived_at: { _is_null: true }, _or: [{ name: { _ilike: $q } }, { description: { _ilike: $q } }, { address: { _ilike: $q } }] }
      limit: 6
    ) {
      id name type address
    }
    events(
      where: { status: { _eq: published }, community_id: { _eq: $community_id }, starts_at: { _gte: "now()" }, _or: [{ title: { _ilike: $q } }, { description: { _ilike: $q } }] }
      order_by: { starts_at: asc } limit: 6
    ) {
      id title starts_at location_text cover_image_url
    }
    interest_groups(
      where: { archived_at: { _is_null: true }, _or: [{ name: { _ilike: $q } }, { description: { _ilike: $q } }] }
      limit: 6
    ) {
      id name category member_count_cached
    }
    requests(
      where: { status: { _eq: open }, community_id: { _eq: $community_id }, _or: [{ title: { _ilike: $q } }, { body: { _ilike: $q } }] }
      limit: 6
    ) {
      id title category
    }
    memberships(
      where: { status: { _eq: active }, community_id: { _eq: $community_id }, user: { name: { _ilike: $q } } }
      limit: 8
    ) {
      user { id name image_url }
    }
  }
`;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Не авторизован' }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  if (q.length < 2) {
    return Response.json({ communities: [], programs: [], places: [], events: [], interest_groups: [], requests: [], people: [] });
  }

  const like = `%${q}%`;
  const data = await hasuraAdmin.request<Record<string, unknown[]>>(SEARCH, {
    q: like,
    community_id: session.hasura.community_id,
  });

  return Response.json({
    communities: data.communities ?? [],
    programs: data.programs ?? [],
    places: data.places ?? [],
    events: data.events ?? [],
    interest_groups: data.interest_groups ?? [],
    requests: data.requests ?? [],
    people: ((data.memberships ?? []) as Array<{ user: unknown }>).map((m) => m.user).filter(Boolean),
  });
}
