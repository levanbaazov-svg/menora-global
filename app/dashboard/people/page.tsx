import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import { PeopleDirectory } from './PeopleDirectory';
import type { UserDisplay } from '@/lib/profile/display';

const LIST = /* GraphQL */ `
  query ListMembers($community_id: uuid!) {
    memberships(
      where: { community_id: { _eq: $community_id }, status: { _eq: active } }
      order_by: [{ role: desc }, { joined_at: desc }]
    ) {
      id user_id role joined_at member_since
      user {
        id email name image_url
        profile {
          legal_first_name legal_last_name hebrew_name
          denomination observance_level kashrut_level
          interests bio profile_visibility
        }
      }
    }
  }
`;

interface Row {
  id: string; user_id: string;
  role: 'member' | 'rabbi' | 'admin';
  joined_at: string | null;
  member_since: string | null;
  user: UserDisplay;
}

export default async function PeoplePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const client = await hasuraAsCurrentUser({ role: session.hasura.default_role });
  const { memberships } = await client.request<{ memberships: Row[] }>(
    LIST, { community_id: session.hasura.community_id },
  );

  const role = session.hasura.default_role;
  const isStaff = role === 'rabbi' || role === 'admin';
  const visible = memberships.filter((m) => {
    if (m.user_id === session.user.id) return true;
    if (isStaff) return true;
    return m.user.profile?.profile_visibility !== 'private';
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold mb-1">Участники</h1>
      </div>

      <PeopleDirectory members={visible} selfId={session.user.id} />
    </div>
  );
}
