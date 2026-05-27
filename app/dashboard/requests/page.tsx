import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { REQUEST_CATEGORY_LABELS, STATUS_LABELS, URGENCY_LABELS } from '@/lib/requests/schema';

const LIST = /* GraphQL */ `
  query ListRequests($community_id: uuid!) {
    requests(
      where: { community_id: { _eq: $community_id } }
      order_by: [{ urgency: desc }, { created_at: desc }]
    ) {
      id title body category urgency status
      reply_count_cached expires_at created_at
      user_id
      author { id name }
    }
  }
`;

interface Row {
  id: string; title: string; body: string;
  category: keyof typeof REQUEST_CATEGORY_LABELS;
  urgency: keyof typeof URGENCY_LABELS;
  status: keyof typeof STATUS_LABELS;
  reply_count_cached: number;
  expires_at: string | null; created_at: string;
  user_id: string;
  author: { id: string; name: string | null } | null;
}

function ago(iso: string): string {
  const sec = (Date.now() - new Date(iso).getTime()) / 1000;
  if (sec < 60) return 'только что';
  if (sec < 3600) return `${Math.floor(sec / 60)} мин назад`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} ч назад`;
  return `${Math.floor(sec / 86400)} д назад`;
}

export default async function RequestsListPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const client = await hasuraAsCurrentUser({ role: session.hasura.default_role });
  const { requests } = await client.request<{ requests: Row[] }>(
    LIST, { community_id: session.hasura.community_id },
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl font-semibold mb-1">Просьбы</h1>
          <p className="text-sm text-(--color-muted)">{requests.length} {requests.length === 1 ? 'просьба' : 'просьб'}</p>
        </div>
        <Link
          href="/dashboard/requests/new"
          className="px-5 py-2.5 rounded-full bg-(--color-deep) text-white text-sm font-semibold hover:opacity-90"
        >
          + Попросить
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl p-12 text-center">
          <p className="text-(--color-muted) mb-4">Никто пока не просил помощи.</p>
          <Link
            href="/dashboard/requests/new"
            className="px-5 py-2.5 rounded-full bg-(--color-gold) text-(--color-deep) text-sm font-semibold hover:scale-105 inline-block transition-transform"
          >
            Создать первую
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            const isMine = r.user_id === session.user.id;
            const status = STATUS_LABELS[r.status];
            return (
              <Link
                key={r.id}
                href={`/dashboard/requests/${r.id}`}
                className="block border rounded-xl p-5 hover:border-(--color-gold) transition-colors"
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold leading-tight">{r.title}</h2>
                    <p className="text-sm text-(--color-muted) mt-1 line-clamp-2">{r.body}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${status.cls}`}>{status.label}</span>
                    {r.urgency === 'high' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">🔥 Срочно</span>
                    )}
                    {isMine && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-(--color-deep) text-white">Моя</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-(--color-muted)">
                  <span>{REQUEST_CATEGORY_LABELS[r.category]}</span>
                  <span>·</span>
                  <span>{r.author?.name ?? '—'}</span>
                  <span>·</span>
                  <span>{ago(r.created_at)}</span>
                  <span>·</span>
                  <span>{r.reply_count_cached === 0 ? 'Нет ответов' : `${r.reply_count_cached} ${r.reply_count_cached === 1 ? 'ответ' : 'ответов'}`}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
