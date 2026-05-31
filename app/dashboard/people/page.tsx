import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Avatar } from '../_Avatar';

const LIST = /* GraphQL */ `
  query People($community_id: uuid!) {
    memberships(
      where: { community_id: { _eq: $community_id }, status: { _eq: active } }
      order_by: { joined_at: asc }
    ) {
      role community_role
      user { id name image_url }
    }
  }
`;

interface Row {
  role: string; community_role: string | null;
  user: { id: string; name: string | null; image_url: string | null } | null;
}

const ROLE_TITLE: Record<string, string> = { rabbi: 'Раввин', admin: 'Админ' };

export default async function PeoplePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  const client = await hasuraAsCurrentUser({ role: session.hasura.default_role });
  const { memberships } = await client.request<{ memberships: Row[] }>(
    LIST, { community_id: session.hasura.community_id },
  );

  return (
    <div className="container mx-auto max-w-xl px-4 md:px-6 pt-3 pb-8">
      <header className="mb-4 px-0.5">
        <h1 className="font-serif text-2xl md:text-3xl font-semibold leading-tight tracking-tight">
          Участники
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{memberships.length} человек в общине</p>
      </header>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
        {memberships.map((m) => (
          <Link
            key={m.user?.id}
            href={`/dashboard/people/${m.user?.id}`}
            className="group rounded-2xl bg-card ring-1 ring-border/70 p-3 text-center hover:ring-primary/30 transition-all"
          >
            <div className="flex justify-center mb-2">
              <Avatar user={{ id: m.user?.id ?? '', name: m.user?.name ?? null, email: null, image_url: m.user?.image_url ?? null }} size="lg" />
            </div>
            <div className="font-medium text-xs leading-tight truncate">{m.user?.name ?? 'Без имени'}</div>
            {(m.community_role || ROLE_TITLE[m.role]) && (
              <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                {m.community_role ?? ROLE_TITLE[m.role]}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
