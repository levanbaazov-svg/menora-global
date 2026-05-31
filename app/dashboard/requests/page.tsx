// Requests board — compact prototype-style cards: title, urgency pill,
// body snippet, category + author + replies count.

import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, MessageCircle, ChevronRight } from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';
import {
  REQUEST_CATEGORY_LABELS, REQUEST_URGENCY_LABELS,
  type RequestCategory, type RequestUrgency,
} from '@/lib/requests/schema';

const LIST = /* GraphQL */ `
  query ListRequests($community_id: uuid!) {
    requests(
      where: { community_id: { _eq: $community_id } }
      order_by: [{ status: asc }, { created_at: desc }]
    ) {
      id title body category urgency status created_at reply_count_cached
      user { id name image_url }
    }
  }
`;

interface RequestRow {
  id: string; title: string; body: string;
  category: RequestCategory; urgency: RequestUrgency; status: string;
  created_at: string; reply_count_cached: number;
  user: { id: string; name: string | null; image_url: string | null } | null;
}

const URGENCY_STYLE: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  normal: 'bg-sky-50 text-sky-700',
  high: 'bg-amber-100 text-amber-800',
  urgent: 'bg-destructive/10 text-destructive',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600_000);
  if (h < 1) return 'только что';
  if (h < 24) return `${h} ч назад`;
  return `${Math.floor(h / 24)} дн назад`;
}

export default async function RequestsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const client = await hasuraAsCurrentUser({ role: session.hasura.default_role });
  const { requests } = await client.request<{ requests: RequestRow[] }>(
    LIST, { community_id: session.hasura.community_id },
  );

  const open = requests.filter((r) => r.status === 'open');
  const resolved = requests.filter((r) => r.status !== 'open');

  return (
    <div className="container mx-auto max-w-xl px-4 md:px-6 pt-3 pb-8">
      <header className="flex items-start justify-between gap-3 mb-4 px-0.5">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-semibold leading-tight tracking-tight">
            Просьбы
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Доска взаимопомощи общины</p>
        </div>
        <Link
          href="/dashboard/requests/new"
          className="shrink-0 inline-flex items-center gap-1 rounded-full bg-foreground text-background px-3.5 h-9 text-sm font-semibold hover:opacity-90 active:scale-95 transition-all"
        >
          <Plus size={15} strokeWidth={2.4} /> Создать
        </Link>
      </header>

      {requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
          <HandHeartIcon />
          <p className="text-sm text-muted-foreground mb-4 mt-2">Пока нет просьб в общине.</p>
          <Link href="/dashboard/requests/new" className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-4 h-9 text-sm font-semibold">
            Создать первую
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="space-y-2.5">
            {open.map((r, i) => (
              <Reveal key={r.id} delay={0.03 * i}><RequestCard r={r} /></Reveal>
            ))}
          </div>
          {resolved.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-2 px-0.5">Решённые</h2>
              <div className="space-y-2.5 opacity-55">
                {resolved.map((r) => <RequestCard key={r.id} r={r} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function RequestCard({ r }: { r: RequestRow }) {
  return (
    <Link
      href={`/dashboard/requests/${r.id}`}
      className="group block rounded-2xl bg-card ring-1 ring-border/70 p-4 hover:ring-primary/30 hover:shadow-[0_6px_18px_-6px_rgba(20,24,31,0.12)] transition-all"
    >
      <div className="flex items-start gap-2 mb-1.5">
        <h3 className="font-medium text-sm leading-tight flex-1">{r.title}</h3>
        {r.urgency !== 'normal' && r.urgency !== 'low' && (
          <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${URGENCY_STYLE[r.urgency]}`}>
            {REQUEST_URGENCY_LABELS[r.urgency]}
          </span>
        )}
      </div>
      <p className="text-[13px] text-muted-foreground line-clamp-2 mb-2.5 leading-snug">{r.body}</p>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-foreground/70">
          {REQUEST_CATEGORY_LABELS[r.category]}
        </span>
        <span>{r.user?.name ?? 'Аноним'}</span>
        <span>·</span>
        <span>{timeAgo(r.created_at)}</span>
        <span className="ml-auto inline-flex items-center gap-1">
          <MessageCircle size={12} strokeWidth={2} /> {r.reply_count_cached}
        </span>
      </div>
    </Link>
  );
}

function HandHeartIcon() {
  return <div className="text-3xl">🙋</div>;
}
