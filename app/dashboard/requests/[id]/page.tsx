import { auth } from '@/lib/auth';
import { hasuraAsCurrentUser } from '@/lib/hasura';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations, getLocale } from 'next-intl/server';
import { LOCALE_BCP47, type Locale } from '@/i18n/config';
import { REQUEST_CATEGORY_LABELS, STATUS_LABELS, URGENCY_LABELS } from '@/lib/requests/schema';
import { ReplyForm } from './ReplyForm';
import { AuthorActions, AcceptReplyButton } from './RequestActions';
import { WithdrawReplyButton } from './WithdrawReplyButton';

const FETCH = /* GraphQL */ `
  query FetchRequest($id: uuid!) {
    requests_by_pk(id: $id) {
      id title body category urgency status
      user_id accepted_reply_id expires_at fulfilled_at cancelled_at created_at
      author { id name }
      replies(order_by: { created_at: asc }) {
        id user_id body contact_method contact_phone contact_email
        withdrawn_at created_at
        user { id name }
      }
    }
  }
`;

interface Reply {
  id: string; user_id: string; body: string;
  contact_method: 'public_thread' | 'share_phone' | 'share_email';
  contact_phone: string | null; contact_email: string | null;
  withdrawn_at: string | null; created_at: string;
  user: { id: string; name: string | null } | null;
}

interface Detail {
  id: string; title: string; body: string;
  category: keyof typeof REQUEST_CATEGORY_LABELS;
  urgency: keyof typeof URGENCY_LABELS;
  status: keyof typeof STATUS_LABELS;
  user_id: string; accepted_reply_id: string | null;
  expires_at: string | null; fulfilled_at: string | null; cancelled_at: string | null;
  created_at: string;
  author: { id: string; name: string | null } | null;
  replies: Reply[];
}

function fmt(iso: string, bcp47: string) {
  return new Date(iso).toLocaleString(bcp47, {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const t = await getTranslations('requestsPage');
  const tReq = await getTranslations('requests');
  const locale = (await getLocale()) as Locale;
  const bcp47 = LOCALE_BCP47[locale];

  const client = await hasuraAsCurrentUser({ role: session.hasura.default_role });
  const { requests_by_pk: req } = await client.request<{ requests_by_pk: Detail | null }>(
    FETCH, { id },
  );
  if (!req) notFound();

  const isAuthor = req.user_id === session.user.id;
  const status = STATUS_LABELS[req.status];
  const statusLabel = t(`status.${req.status}`);
  const acceptedReply = req.accepted_reply_id
    ? req.replies.find((r) => r.id === req.accepted_reply_id)
    : null;

  const visibleReplies = req.replies.filter((r) => !r.withdrawn_at || r.user_id === session.user.id);
  // Has the current user already replied? (Show "you replied" indicator)
  const myReplyCount = req.replies.filter((r) => r.user_id === session.user.id && !r.withdrawn_at).length;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/dashboard/requests" className="text-sm text-(--color-fg-muted) hover:text-(--color-deep) mb-4 inline-block">
        <span className="inline-block rtl:-scale-x-100">←</span> {t('backToBoard')}
      </Link>

      <div className="flex items-center gap-2 flex-wrap mb-4">
        <span className="text-sm text-(--color-fg-muted)">{tReq(`categories.${req.category}`)}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${status.cls}`}>{statusLabel}</span>
        {req.urgency === 'high' && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">🔥 {t('urgent')}</span>
        )}
      </div>

      <h1 className="font-serif text-3xl font-semibold mb-3">{req.title}</h1>
      <p className="text-sm text-(--color-fg-muted) mb-6">
        {req.author?.name ?? '—'} · {fmt(req.created_at, bcp47)}
        {req.expires_at && ` · ${t('expires', { date: fmt(req.expires_at, bcp47) })}`}
      </p>

      <div className="border-l-4 border-(--color-gold) pl-5 mb-8 whitespace-pre-wrap text-base">
        {req.body}
      </div>

      {isAuthor && (
        <section className="mb-8 pb-8 border-b">
          <h2 className="font-serif text-base font-semibold mb-3">{t('management')}</h2>
          <AuthorActions requestId={req.id} status={req.status} />
        </section>
      )}

      {/* Replies */}
      <section className="mb-8">
        <h2 className="font-serif text-xl font-semibold mb-4">
          {t('repliesHeading', { count: visibleReplies.length })}
        </h2>
        {visibleReplies.length === 0 ? (
          <p className="text-sm text-(--color-fg-muted) mb-6">{t('noReplies')}</p>
        ) : (
          <div className="space-y-3 mb-6">
            {visibleReplies.map((reply) => (
              <ReplyCard
                key={reply.id}
                reply={reply}
                isAuthor={isAuthor}
                isMine={reply.user_id === session.user.id}
                isAccepted={req.accepted_reply_id === reply.id}
                requestId={req.id}
                canAccept={isAuthor && (req.status === 'open' || req.status === 'in_progress')}
                t={t}
                bcp47={bcp47}
              />
            ))}
          </div>
        )}

        {/* Reply form — only if status is open/in_progress, and viewer is not author */}
        {!isAuthor && (req.status === 'open' || req.status === 'in_progress') && (
          <>
            {myReplyCount > 0 && (
              <p className="text-xs text-(--color-fg-muted) mb-2">
                {t('alreadyReplied', { count: myReplyCount })}
              </p>
            )}
            <ReplyForm requestId={req.id} />
          </>
        )}
        {isAuthor && req.status === 'open' && visibleReplies.length === 0 && (
          <p className="text-sm text-(--color-fg-muted)">{t('waitingReplies')}</p>
        )}
      </section>

      {acceptedReply && (
        <section className="border-t pt-6 text-sm text-(--color-fg-muted)">
          ✓ {t('closedThanks')} <strong>{acceptedReply.user?.name ?? '—'}</strong>
        </section>
      )}
    </div>
  );
}

function ReplyCard({
  reply, isAuthor, isMine, isAccepted, requestId, canAccept, t, bcp47,
}: {
  reply: Reply; isAuthor: boolean; isMine: boolean; isAccepted: boolean;
  requestId: string; canAccept: boolean;
  t: Awaited<ReturnType<typeof getTranslations<'requestsPage'>>>;
  bcp47: string;
}) {
  const ts = new Date(reply.created_at).toLocaleString(bcp47, {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  // Contact info visible to: author of the request, replier themselves.
  // (At DB level, Hasura permission exposes to all members of the community —
  // we filter UI-side. Production would tighten via column-level or function.)
  const showContact = (isAuthor || isMine) && reply.contact_method !== 'public_thread';

  return (
    <div className={`border rounded-xl p-4 ${isAccepted ? 'border-(--color-gold) bg-(--color-gold-soft)' : ''} ${reply.withdrawn_at ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-3 mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-medium text-sm">{reply.user?.name ?? '—'}</span>
            {isMine && <span className="text-xs px-2 py-0.5 rounded-full bg-(--color-deep) text-white">{t('reply.mine')}</span>}
            {isAccepted && <span className="text-xs px-2 py-0.5 rounded-full bg-(--color-gold) text-(--color-deep)">{t('reply.accepted')}</span>}
            {reply.withdrawn_at && <span className="text-xs px-2 py-0.5 rounded border text-(--color-fg-muted)">{t('reply.withdrawn')}</span>}
          </div>
          <div className="text-xs text-(--color-fg-muted)">{ts}</div>
        </div>
      </div>
      <p className="text-sm whitespace-pre-wrap">{reply.body}</p>
      {showContact && (
        <div className="mt-3 px-3 py-2 bg-white border border-dashed rounded text-sm">
          {reply.contact_method === 'share_phone' && reply.contact_phone && (
            <>📞 <a href={`tel:${reply.contact_phone}`} className="font-medium hover:underline">{reply.contact_phone}</a></>
          )}
          {reply.contact_method === 'share_email' && reply.contact_email && (
            <>✉️ <a href={`mailto:${reply.contact_email}`} className="font-medium hover:underline">{reply.contact_email}</a></>
          )}
          <span className="text-xs text-(--color-fg-muted) ms-2">{t('reply.visibleOnlyToYou')}</span>
        </div>
      )}
      <div className="mt-3 flex items-center gap-3">
        {canAccept && !reply.withdrawn_at && !isAccepted && (
          <AcceptReplyButton requestId={requestId} replyId={reply.id} />
        )}
        {isMine && !reply.withdrawn_at && <WithdrawReplyButton replyId={reply.id} />}
      </div>
    </div>
  );
}
