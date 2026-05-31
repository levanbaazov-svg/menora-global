import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import { MemberActions } from './MemberActions';

const LIST_MEMBERS = /* GraphQL */ `
  query ListMembers($community_id: uuid!) {
    memberships(
      where: { community_id: { _eq: $community_id } }
      order_by: [{ status: asc }, { created_at: desc }]
    ) {
      id user_id role status entry_method
      request_message rejected_reason member_since
      created_at joined_at rejected_at suspended_at
      user {
        id email name image_url
        profile {
          legal_first_name legal_last_name hebrew_name
          denomination observance_level kashrut_level
        }
      }
      inviter { id name }
    }
  }
`;

interface Membership {
  id: string; user_id: string;
  role: 'member' | 'rabbi' | 'admin';
  status: 'pending' | 'active' | 'suspended' | 'rejected' | 'left';
  entry_method: 'invite' | 'self_request' | 'rabbi_added';
  request_message: string | null;
  rejected_reason: string | null;
  member_since: string | null;
  created_at: string;
  joined_at: string | null;
  rejected_at: string | null;
  suspended_at: string | null;
  user: {
    id: string; email: string; name: string | null; image_url: string | null;
    profile: {
      legal_first_name: string | null; legal_last_name: string | null;
      hebrew_name: string | null; denomination: string | null;
      observance_level: string | null; kashrut_level: string | null;
    } | null;
  };
  inviter: { id: string; name: string | null } | null;
}

const STATUS_BADGE: Record<Membership['status'], { label: string; cls: string }> = {
  pending:   { label: 'Ждёт',         cls: 'bg-(--color-gold-soft) text-(--color-gold-dark)' },
  active:    { label: 'Активен',      cls: 'bg-green-100 text-green-800' },
  suspended: { label: 'Заморожен',    cls: 'bg-yellow-100 text-yellow-800' },
  rejected:  { label: 'Отклонён',     cls: 'bg-red-100 text-red-700' },
  left:      { label: 'Покинул',      cls: 'bg-gray-100 text-gray-600' },
};

const ENTRY_LABEL: Record<Membership['entry_method'], string> = {
  invite: 'приглашение',
  self_request: 'сам подал',
  rabbi_added: 'добавлен',
};

function fmt(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default async function MembersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const client = await hasuraAsCurrentUser({ role: session.hasura.default_role });
  const { memberships } = await client.request<{ memberships: Membership[] }>(
    LIST_MEMBERS, { community_id: session.hasura.community_id },
  );

  const groups = {
    pending:   memberships.filter((m) => m.status === 'pending'),
    active:    memberships.filter((m) => m.status === 'active'),
    suspended: memberships.filter((m) => m.status === 'suspended'),
    rejected:  memberships.filter((m) => m.status === 'rejected'),
    left:      memberships.filter((m) => m.status === 'left'),
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 md:px-6 pt-3 pb-8">
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-semibold leading-tight tracking-tight mb-1">Участники</h1>
        <p className="text-sm text-(--color-muted)">
          Всего {memberships.length}.
          {groups.pending.length > 0 && (
            <span className="ml-2 text-(--color-gold-dark) font-medium">
              {groups.pending.length} заявок ждут рассмотрения
            </span>
          )}
        </p>
      </div>

      {groups.pending.length > 0 && (
        <Section title="Ждут одобрения" badge={groups.pending.length} primary>
          {groups.pending.map((m) => (
            <Row key={m.id} m={m} selfId={session.user.id} />
          ))}
        </Section>
      )}

      {groups.active.length > 0 && (
        <Section title="Активные" badge={groups.active.length}>
          {groups.active.map((m) => (
            <Row key={m.id} m={m} selfId={session.user.id} />
          ))}
        </Section>
      )}

      {groups.suspended.length > 0 && (
        <Section title="Заморожены" badge={groups.suspended.length}>
          {groups.suspended.map((m) => (
            <Row key={m.id} m={m} selfId={session.user.id} />
          ))}
        </Section>
      )}

      {groups.rejected.length > 0 && (
        <Section title="Отклонённые" badge={groups.rejected.length} muted>
          {groups.rejected.map((m) => (
            <Row key={m.id} m={m} selfId={session.user.id} />
          ))}
        </Section>
      )}

      {groups.left.length > 0 && (
        <Section title="Покинувшие" badge={groups.left.length} muted>
          {groups.left.map((m) => (
            <Row key={m.id} m={m} selfId={session.user.id} />
          ))}
        </Section>
      )}

      {memberships.length === 0 && (
        <div className="border-2 border-dashed rounded-xl p-12 text-center text-(--color-muted)">
          В общине пока никого нет.
        </div>
      )}
    </div>
  );
}

function Section({
  title, badge, children, primary, muted,
}: { title: string; badge: number; children: React.ReactNode; primary?: boolean; muted?: boolean }) {
  return (
    <section className={`mb-10 ${muted ? 'opacity-60' : ''}`}>
      <h2 className="font-serif text-xl font-semibold mb-3 flex items-center gap-2">
        {title}
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          primary ? 'bg-(--color-gold) text-(--color-deep)' : 'bg-(--color-muted-bg) text-(--color-muted)'
        }`}>{badge}</span>
      </h2>
      <div className="border rounded-xl overflow-hidden divide-y">
        {children}
      </div>
    </section>
  );
}

function Row({ m, selfId }: { m: Membership; selfId: string }) {
  const isSelf = m.user_id === selfId;
  const displayName = m.user.profile?.legal_first_name
    ? `${m.user.profile.legal_first_name} ${m.user.profile.legal_last_name ?? ''}`.trim()
    : m.user.name ?? m.user.email;

  return (
    <div className="px-5 py-4 flex gap-4 items-start">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-medium">{displayName}</span>
          {isSelf && <span className="text-xs px-2 py-0.5 rounded-full bg-(--color-deep) text-white">Я</span>}
          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[m.status].cls}`}>
            {STATUS_BADGE[m.status].label}
          </span>
          <span className="text-xs px-2 py-0.5 rounded border text-(--color-muted)">
            {m.role}
          </span>
        </div>
        <div className="text-xs text-(--color-muted) flex flex-wrap gap-x-3">
          <span>{m.user.email}</span>
          {m.user.profile?.hebrew_name && <span>· {m.user.profile.hebrew_name}</span>}
          {m.user.profile?.denomination && <span>· {m.user.profile.denomination}</span>}
        </div>
        <div className="text-xs text-(--color-muted) mt-1">
          {ENTRY_LABEL[m.entry_method]}
          {m.inviter?.name && ` · приглашён ${m.inviter.name}`}
          {m.status === 'active' && m.joined_at && ` · с ${fmt(m.joined_at)}`}
          {m.status === 'pending' && ` · заявка ${fmt(m.created_at)}`}
        </div>
        {m.status === 'pending' && m.request_message && (
          <div className="mt-3 px-3 py-2 bg-(--color-muted-bg) rounded text-sm whitespace-pre-wrap">
            {m.request_message}
          </div>
        )}
        {m.status === 'rejected' && m.rejected_reason && (
          <div className="mt-2 text-xs text-red-700 italic">
            Причина: {m.rejected_reason}
          </div>
        )}
      </div>
      <div className="shrink-0 pt-1">
        <MemberActions
          membershipId={m.id}
          status={m.status}
          role={m.role}
          selfId={selfId}
          targetUserId={m.user_id}
        />
      </div>
    </div>
  );
}
