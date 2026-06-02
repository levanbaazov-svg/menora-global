// Platform moderation queue — pending community requests. Platform admins only.

import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { isPlatformAdmin } from '@/lib/auth/platform';
import { CommunityModerationActions } from './CommunityModerationRow';

const FETCH = /* GraphQL */ `
  query PendingCommunities {
    communities(where: { approval_status: { _eq: "pending" } }, order_by: { created_at: asc }) {
      id slug name city country_code denomination created_at
      memberships(where: { role: { _eq: rabbi } }, limit: 1) { user { name email } }
    }
  }
`;

interface Row {
  id: string; slug: string; name: string; city: string | null; country_code: string | null;
  denomination: string | null; created_at: string;
  memberships: Array<{ user: { name: string | null; email: string } | null }>;
}

export default async function CommunityModerationPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  if (!(await isPlatformAdmin(session.user.id))) redirect('/dashboard');

  const t = await getTranslations('admin.platform');
  const { communities } = await hasuraAdmin.request<{ communities: Row[] }>(FETCH);

  return (
    <div className="container mx-auto max-w-xl px-4 md:px-6 pt-3 pb-32">
      <header className="mb-5 px-0.5">
        <h1 className="font-serif text-2xl md:text-3xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('subtitle')}</p>
      </header>

      {communities.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
          {t('empty')}
        </div>
      ) : (
        <div className="space-y-2.5">
          {communities.map((c) => {
            const rabbi = c.memberships[0]?.user;
            return (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl bg-card ring-1 ring-border/70 px-4 py-3">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/12 text-primary flex items-center justify-center">
                  <Building2 size={18} strokeWidth={1.9} />
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/dashboard/community/c/${c.slug}`} className="text-sm font-semibold leading-tight hover:text-primary truncate block">
                    {c.name}
                  </Link>
                  <div className="text-xs text-muted-foreground truncate">
                    {[c.city, c.country_code, c.denomination].filter(Boolean).join(' · ')}
                    {rabbi && ` · ${t('by')}: ${rabbi.name ?? rabbi.email}`}
                  </div>
                </div>
                <CommunityModerationActions communityId={c.id} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
