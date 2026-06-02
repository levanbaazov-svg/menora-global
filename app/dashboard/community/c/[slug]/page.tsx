// Visitor view of another community — tabbed full profile (Инфо/Гид/Контакты)
// + sticky join CTA. Uses admin secret (public-safe data only).

import { auth } from '@/lib/auth';
import { MotifFallback } from '@/app/_components/ui/MotifFallback';
import { hasuraAdmin } from '@/lib/hasura';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations, getLocale } from 'next-intl/server';
import { LOCALE_BCP47, type Locale } from '@/i18n/config';
import {
  MapPin, Users, Phone, Mail, Globe, MessageCircle, Navigation,
  ChevronRight, ChevronLeft, CalendarDays, AtSign,
} from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';
import { Avatar } from '@/app/dashboard/_Avatar';
import { CommunityTabs } from '../../CommunityTabs';
import { SwitchToCommunityButton } from './SwitchToCommunityButton';
import { JoinCommunityButton } from './JoinCommunityButton';
import { PLACE_TYPE_LABELS, type PlaceType } from '@/lib/places/schema';

const FETCH = /* GraphQL */ `
  query VisitorCommunity($slug: citext!) {
    communities(where: { slug: { _eq: $slug } }, limit: 1) {
      id slug name city country_code timezone denomination description
      hero_image_url founded_year address contact_phone contact_email
      website_url whatsapp_url instagram_url member_count_cached
    }
  }
`;

const FETCH_DATA = /* GraphQL */ `
  query VisitorData($cid: uuid!, $user_id: uuid!) {
    leaders: memberships(
      where: { community_id: { _eq: $cid }, status: { _eq: active }, role: { _in: [rabbi, admin] } }
      order_by: { role: asc } limit: 6
    ) {
      role community_role
      user { id name image_url }
    }
    events(
      where: { community_id: { _eq: $cid }, status: { _eq: published },
               visibility: { _in: [community, public_in_app] }, starts_at: { _gte: "now()" } }
      order_by: { starts_at: asc } limit: 6
    ) { id title starts_at location_text cover_image_url attendee_count_cached }
    programs(
      where: { community_id: { _eq: $cid }, status: { _eq: active } }
      order_by: [{ category: asc }] limit: 6
    ) { id name photo_url schedule_text }
    members: memberships(
      where: { community_id: { _eq: $cid }, status: { _eq: active } }
      order_by: { joined_at: asc } limit: 12
    ) { user { id name image_url } }
    places(
      where: { community_id: { _eq: $cid }, submission_status: { _eq: approved }, archived_at: { _is_null: true } }
      order_by: { type: asc }
    ) { id type name photo_url address }
    my_membership: memberships(
      where: { community_id: { _eq: $cid }, user_id: { _eq: $user_id } } limit: 1
    ) { status }
  }
`;

interface CommunityRow {
  id: string; slug: string; name: string; city: string | null; country_code: string | null;
  timezone: string; denomination: string | null; description: string | null;
  hero_image_url: string | null; founded_year: number | null; address: string | null;
  contact_phone: string | null; contact_email: string | null; website_url: string | null;
  whatsapp_url: string | null; instagram_url: string | null; member_count_cached: number;
}
interface PlaceRow { id: string; type: PlaceType; name: string; photo_url: string | null; address: string | null; }

export default async function VisitorCommunityPage({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const tab = (await searchParams).tab ?? 'info';
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const found = await hasuraAdmin.request<{ communities: CommunityRow[] }>(FETCH, { slug });
  const c = found.communities[0];
  if (!c) notFound();

  if (c.id === session.hasura.community_id) redirect('/dashboard/community');

  const data = await hasuraAdmin.request<{
    leaders: Array<{ role: string; community_role: string | null; user: { id: string; name: string | null; image_url: string | null } | null }>;
    events: Array<{ id: string; title: string; starts_at: string; location_text: string | null; cover_image_url: string | null; attendee_count_cached: number }>;
    programs: Array<{ id: string; name: string; photo_url: string | null; schedule_text: string | null }>;
    members: Array<{ user: { id: string; name: string | null; image_url: string | null } | null }>;
    places: PlaceRow[];
    my_membership: Array<{ status: string }>;
  }>(FETCH_DATA, { cid: c.id, user_id: session.user.id });

  const membership = data.my_membership[0];
  const base = `/dashboard/community/c/${c.slug}`;
  const t = await getTranslations('communityPages');
  const locale = (await getLocale()) as Locale;
  const roleTitle = (role: string) =>
    role === 'rabbi' || role === 'admin' ? t(`visitor.roles.${role}`) : role;

  return (
    <div className="container mx-auto max-w-xl px-0 md:px-6 pt-0 md:pt-3 pb-32">
      {/* Hero */}
      <Reveal>
        <section className="relative">
          <div className="relative h-56 md:h-64 md:rounded-2xl overflow-hidden">
            {c.hero_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.hero_image_url} alt={c.name} className="h-full w-full object-cover" />
            ) : (
              <MotifFallback variant="community" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10" />
            <Link
              href="/dashboard/community/discover"
              className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/85 backdrop-blur px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-white transition-colors"
            >
              <ChevronLeft size={14} className="rtl:-scale-x-100" /> {t('back.communities')}
            </Link>
            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <div className="text-[10px] uppercase tracking-[0.15em] text-white/80 mb-1">
                {c.denomination ?? t('visitor.denomination')}
              </div>
              <h1 className="font-serif text-3xl font-semibold leading-tight drop-shadow-sm">{c.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/90">
                {(c.city || c.country_code) && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} strokeWidth={2} />
                    {[c.city, c.country_code].filter(Boolean).join(', ')}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Users size={12} strokeWidth={2} />{c.member_count_cached}
                </span>
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      <div className="px-4 md:px-0 mt-4">
        <CommunityTabs basePath={base} />

        <div className="mt-5 space-y-6">
          {tab === 'info' && (
            <>
              {c.description && (
                <Reveal delay={0.04}>
                  <section>
                    <p className="text-sm leading-relaxed text-foreground/85">{c.description}</p>
                    {c.founded_year && <div className="mt-3 text-xs text-muted-foreground">{t('visitor.foundedIn', { year: c.founded_year })}</div>}
                  </section>
                </Reveal>
              )}

              {data.leaders.length > 0 && (
                <Reveal delay={0.06}>
                  <Sect title={t('visitor.leadership')}>
                    <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-1">
                      {data.leaders.map((l) => (
                        <div key={l.user?.id} className="shrink-0 w-20 text-center">
                          <div className="mx-auto mb-1.5">
                            <Avatar user={{ id: l.user?.id ?? '', name: l.user?.name ?? null, email: null, image_url: l.user?.image_url ?? null }} size="lg" />
                          </div>
                          <div className="text-xs font-medium leading-tight truncate">{l.user?.name ?? t('visitor.noName')}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{l.community_role ?? roleTitle(l.role)}</div>
                        </div>
                      ))}
                    </div>
                  </Sect>
                </Reveal>
              )}

              {data.events.length > 0 && (
                <Reveal delay={0.08}>
                  <Sect title={t('visitor.upcomingEvents')}>
                    <div className="grid grid-cols-2 gap-3">
                      {data.events.map((e) => (
                        <div key={e.id} className="overflow-hidden rounded-2xl bg-card ring-1 ring-border/70">
                          <div className="relative h-24 overflow-hidden">
                            {e.cover_image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={e.cover_image_url} alt={e.title} className="h-full w-full object-cover" />
                            ) : (
                              <MotifFallback variant="place" />
                            )}
                          </div>
                          <div className="p-3">
                            <div className="text-sm font-medium leading-tight line-clamp-2">{e.title}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {new Date(e.starts_at).toLocaleDateString(LOCALE_BCP47[locale], { timeZone: c.timezone || undefined, day: 'numeric', month: 'short' })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Sect>
                </Reveal>
              )}

              {data.programs.length > 0 && (
                <Reveal delay={0.1}>
                  <Sect title={t('visitor.programs')}>
                    <div className="grid grid-cols-2 gap-3">
                      {data.programs.map((p) => (
                        <div key={p.id} className="overflow-hidden rounded-2xl bg-card ring-1 ring-border/70">
                          <div className="relative h-24 overflow-hidden">
                            {p.photo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.photo_url} alt={p.name} className="h-full w-full object-cover" />
                            ) : (
                              <MotifFallback variant="place" />
                            )}
                          </div>
                          <div className="p-3">
                            <div className="text-sm font-medium leading-tight line-clamp-1">{p.name}</div>
                            {p.schedule_text && <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{p.schedule_text}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Sect>
                </Reveal>
              )}

              {data.members.length > 0 && (
                <Reveal delay={0.12}>
                  <Sect title={t('visitor.members')}>
                    <div className="flex flex-wrap gap-2">
                      {data.members.map((m) => (
                        <Avatar key={m.user?.id} user={{ id: m.user?.id ?? '', name: m.user?.name ?? null, email: null, image_url: m.user?.image_url ?? null }} size="md" />
                      ))}
                      {c.member_count_cached > data.members.length && (
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                          +{c.member_count_cached - data.members.length}
                        </span>
                      )}
                    </div>
                  </Sect>
                </Reveal>
              )}
            </>
          )}

          {tab === 'guide' && <GuideTab places={data.places} t={t} locale={locale} />}
          {tab === 'contacts' && <ContactsTab c={c} t={t} />}
        </div>
      </div>

      {/* Sticky join CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-24 md:pb-6 pt-3 bg-gradient-to-t from-background via-background to-transparent">
        <div className="container mx-auto max-w-xl">
          {!membership ? (
            <JoinCommunityButton communityId={c.id} />
          ) : membership.status === 'pending' ? (
            <div className="rounded-full h-13 leading-[3.25rem] bg-muted text-center font-medium text-foreground">
              {t('visitor.pendingRequest')}
            </div>
          ) : membership.status === 'active' ? (
            <SwitchToCommunityButton communityId={c.id} />
          ) : (
            <div className="rounded-full h-13 leading-[3.25rem] bg-muted text-center font-medium text-foreground">
              {t('visitor.youAreMember')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Guide tab ─────────────────────────────────────────────────────────────
function GuideTab({ places, t, locale }: {
  places: PlaceRow[];
  t: Awaited<ReturnType<typeof getTranslations>>;
  locale: Locale;
}) {
  if (places.length === 0) {
    return <EmptyHint Icon={MapPin} text={t('visitor.guideEmpty')} />;
  }
  const byType = new Map<PlaceType, PlaceRow[]>();
  for (const p of places) {
    const arr = byType.get(p.type) ?? [];
    arr.push(p);
    byType.set(p.type, arr);
  }
  return (
    <div className="space-y-6">
      {Array.from(byType.entries()).map(([type, items]) => (
        <Reveal key={type} delay={0.04}>
          <section>
            <h2 className="font-serif text-base font-semibold mb-2.5">
              {PLACE_TYPE_LABELS[type]?.[locale] ?? type}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {items.map((p) => (
                <Link key={p.id} href={`/dashboard/community/places/${p.id}`}
                  className="group overflow-hidden rounded-2xl bg-card ring-1 ring-border/70 hover:ring-primary/30 transition-all">
                  <div className="relative h-24 overflow-hidden">
                    {p.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photo_url} alt={p.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <MotifFallback variant="place" />
                    )}
                  </div>
                  <div className="p-3">
                    <div className="text-sm font-medium leading-tight line-clamp-1">{p.name}</div>
                    {p.address && <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{p.address}</div>}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </Reveal>
      ))}
    </div>
  );
}

// ── Contacts tab ──────────────────────────────────────────────────────────
function ContactsTab({ c, t }: {
  c: CommunityRow;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const rows = [
    c.contact_phone && { Icon: Phone, label: t('visitor.contact.phone'), value: c.contact_phone, href: `tel:${c.contact_phone}` },
    c.whatsapp_url && { Icon: MessageCircle, label: t('visitor.contact.whatsapp'), value: t('visitor.contact.whatsappValue'), href: c.whatsapp_url, external: true },
    c.contact_email && { Icon: Mail, label: t('visitor.contact.email'), value: c.contact_email, href: `mailto:${c.contact_email}` },
    c.website_url && { Icon: Globe, label: t('visitor.contact.website'), value: c.website_url.replace(/^https?:\/\//, ''), href: c.website_url, external: true },
    c.instagram_url && { Icon: AtSign, label: t('visitor.contact.instagram'), value: t('visitor.contact.instagramValue'), href: c.instagram_url, external: true },
    c.address && { Icon: Navigation, label: t('visitor.contact.address'), value: c.address, href: `https://maps.google.com/?q=${encodeURIComponent(c.address)}`, external: true },
  ].filter(Boolean) as Array<{ Icon: typeof Phone; label: string; value: string; href: string; external?: boolean }>;

  if (rows.length === 0) return <EmptyHint Icon={Phone} text={t('visitor.contactsEmpty')} />;
  return (
    <Reveal delay={0.04}>
      <div className="rounded-2xl bg-card ring-1 ring-border/70 divide-y divide-border/60 overflow-hidden">
        {rows.map((r) => (
          <a key={r.label} href={r.href}
            {...(r.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors">
            <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/12 text-primary flex items-center justify-center">
              <r.Icon size={16} strokeWidth={1.9} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{r.label}</div>
              <div className="text-sm font-medium leading-tight truncate">{r.value}</div>
            </div>
            <ChevronRight size={15} className="shrink-0 text-muted-foreground/50" />
          </a>
        ))}
      </div>
    </Reveal>
  );
}

function Sect({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-serif text-lg font-semibold leading-tight mb-3">{title}</h2>
      {children}
    </section>
  );
}

function EmptyHint({ Icon, text }: { Icon: typeof CalendarDays; text: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
      <Icon size={18} strokeWidth={1.7} className="opacity-60" />
      {text}
    </div>
  );
}
