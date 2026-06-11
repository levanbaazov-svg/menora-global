// Full community profile page (member's own community), with tabs:
//   Инфо     — about · leaders · upcoming events · programs · members
//   Гид      — kosher city guide (places grouped by type)
//   Контакты — phone / whatsapp / email / website / address
// If the user has no active community → redirect to the Discover feed.

import { auth } from '@/lib/auth';
import { MotifFallback } from '@/app/_components/ui/MotifFallback';
import { hasuraAdmin } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import Link from 'next/link';
import { cookies } from 'next/headers';
import {
  MapPin, Users, Phone, Mail, Globe, MessageCircle, Navigation,
  ChevronRight, Search, CalendarDays, BookOpenText, Flame, AtSign,
} from 'lucide-react';
import { getServicesForCommunity } from '@/lib/services/catalog';
import { ServiceRequestRow } from './_ServiceRequestRow';
import { Reveal } from '@/components/motion/Reveal';
import { Avatar } from '@/app/dashboard/_Avatar';
import { CommunityTabs } from './CommunityTabs';
import { PLACE_TYPE_LABELS, type PlaceType } from '@/lib/places/schema';
import { LOCALE_BCP47, type Locale } from '@/i18n/config';

type T = Awaited<ReturnType<typeof getTranslations<'community'>>>;
import { upcomingShabbat } from '@/lib/hebcal';
import { resolveLocation } from '@/lib/hebcal/timezone';
import { COOKIE_NAME as TZ_COOKIE } from '@/app/api/me/timezone/route';

const FETCH = /* GraphQL */ `
  query OwnCommunity($cid: uuid!) {
    communities_by_pk(id: $cid) {
      id slug name city country_code timezone denomination description
      hero_image_url founded_year address contact_phone contact_email
      website_url whatsapp_url instagram_url member_count_cached
    }
    leaders: memberships(
      where: { community_id: { _eq: $cid }, status: { _eq: active }, role: { _in: [rabbi, admin] } }
      order_by: { role: asc } limit: 6
    ) {
      role community_role
      user { id name image_url profile { hebrew_name } }
    }
    events(
      where: { community_id: { _eq: $cid }, status: { _eq: published }, starts_at: { _gte: "now()" } }
      order_by: { starts_at: asc } limit: 4
    ) {
      id title type starts_at location_text attendee_count_cached max_attendees
    }
    programs(
      where: { community_id: { _eq: $cid }, status: { _eq: active } }
      order_by: [{ category: asc }, { name: asc }] limit: 6
    ) {
      id category name photo_url schedule_text enrolled_count_cached
    }
    members: memberships(
      where: { community_id: { _eq: $cid }, status: { _eq: active } }
      order_by: { joined_at: asc } limit: 14
    ) {
      user { id name image_url }
    }
    places(
      where: { community_id: { _eq: $cid }, submission_status: { _eq: approved }, archived_at: { _is_null: true } }
      order_by: { type: asc }
    ) {
      id type name description photo_url address kashrut_level
    }
  }
`;

interface Leader {
  role: string; community_role: string | null;
  user: { id: string; name: string | null; image_url: string | null; profile: { hebrew_name: string | null } | null } | null;
}
interface EventRow {
  id: string; title: string; type: string; starts_at: string;
  location_text: string | null; attendee_count_cached: number; max_attendees: number | null;
}
interface ProgramRow {
  id: string; category: string; name: string; photo_url: string | null;
  schedule_text: string | null; enrolled_count_cached: number;
}
interface PlaceRow {
  id: string; type: PlaceType; name: string; description: string | null;
  photo_url: string | null; address: string | null; kashrut_level: string | null;
}

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const tab = (await searchParams).tab ?? 'info';

  const cid = session.hasura.community_id;
  if (!cid || cid === '00000000-0000-0000-0000-000000000000') {
    redirect('/dashboard/community/discover');
  }

  const data = await hasuraAdmin.request<{
    communities_by_pk: {
      id: string; slug: string; name: string; city: string | null; country_code: string | null;
      timezone: string; denomination: string | null; description: string | null;
      hero_image_url: string | null; founded_year: number | null; address: string | null;
      contact_phone: string | null; contact_email: string | null; website_url: string | null;
      whatsapp_url: string | null; instagram_url: string | null; member_count_cached: number;
    } | null;
    leaders: Leader[];
    events: EventRow[];
    programs: ProgramRow[];
    members: Array<{ user: { id: string; name: string | null; image_url: string | null } | null }>;
    places: PlaceRow[];
  }>(FETCH, { cid });

  const c = data.communities_by_pk;
  if (!c) redirect('/dashboard/community/discover');

  const t = await getTranslations('community');
  const locale = (await getLocale()) as Locale;

  const cookieStore = await cookies();
  const userTz = cookieStore.get(TZ_COOKIE)?.value ?? null;
  const resolved = resolveLocation(userTz, c);
  const shabbat = resolved ? upcomingShabbat(resolved.location) : null;
  const candle = shabbat?.candleLighting
    ? shabbat.candleLighting.toLocaleTimeString(LOCALE_BCP47[locale], {
        timeZone: resolved!.location.getTzid(), hour: '2-digit', minute: '2-digit',
      })
    : null;

  return (
    <div className="container mx-auto max-w-xl px-0 md:px-6 pt-0 md:pt-3 pb-8">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
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
              className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/85 backdrop-blur px-3 py-1.5 text-xs font-medium text-foreground hover:bg-white transition-colors"
            >
              <Search size={13} strokeWidth={2} />
              {t('otherCommunity')}
            </Link>

            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <div className="text-[10px] uppercase tracking-[0.15em] text-white/80 mb-1">
                {c.denomination ?? t('myCommunity')}
              </div>
              <h1 className="font-serif text-3xl font-semibold leading-tight drop-shadow-sm">
                {c.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/90">
                {(c.city || c.country_code) && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} strokeWidth={2} />
                    {[c.city, c.country_code].filter(Boolean).join(', ')}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Users size={12} strokeWidth={2} />
                  {t('members', { count: c.member_count_cached })}
                </span>
                {candle && (
                  <span className="inline-flex items-center gap-1 text-white">
                    <Flame size={12} strokeWidth={2} />
                    {t('candles', { time: candle })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      <div className="px-4 md:px-0 mt-4">
        {/* Tabs */}
        <CommunityTabs />

        {/* ── Tab content ─────────────────────────────────────────────── */}
        <div className="mt-5 space-y-6">
          {tab === 'info' && (
            <>
              {c.description && (
                <Reveal delay={0.04}>
                  <section>
                    <p className="text-sm leading-relaxed text-foreground/85">{c.description}</p>
                    {c.founded_year && (
                      <div className="mt-3 text-xs text-muted-foreground">{t('foundedIn', { year: c.founded_year })}</div>
                    )}
                  </section>
                </Reveal>
              )}

              {data.leaders.length > 0 && (
                <Reveal delay={0.06}>
                  <Section title={t('leadership')}>
                    <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-1">
                      {data.leaders.map((l) => (
                        <Link key={l.user?.id} href={`/dashboard/people/${l.user?.id}`} className="shrink-0 w-20 text-center group">
                          <div className="mx-auto mb-1.5 transition-transform group-hover:scale-105">
                            <Avatar user={{ id: l.user?.id ?? '', name: l.user?.name ?? null, email: null, image_url: l.user?.image_url ?? null }} size="lg" />
                          </div>
                          <div className="text-xs font-medium leading-tight truncate">{l.user?.name ?? '—'}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                            {l.community_role ?? (l.role === 'rabbi' || l.role === 'admin' ? t(`roles.${l.role}`) : l.role)}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </Section>
                </Reveal>
              )}

              <Reveal delay={0.08}>
                <Section title={t('upcomingEvents')} action={<SeeAll href="/dashboard/events" label={t('seeAll')} />}>
                  {data.events.length === 0 ? (
                    <EmptyHint Icon={CalendarDays} text={t('noEvents')} />
                  ) : (
                    <div className="space-y-2">
                      {data.events.map((e) => (
                        <Link key={e.id} href={`/dashboard/events/${e.id}`}
                          className="group flex items-center gap-3 rounded-2xl bg-card ring-1 ring-border/70 px-4 py-3 hover:ring-primary/30 transition-all">
                          <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/12 text-primary flex items-center justify-center">
                            <CalendarDays size={16} strokeWidth={1.9} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium leading-tight truncate">{e.title}</div>
                            <div className="text-xs text-muted-foreground mt-0.5 truncate">
                              {new Date(e.starts_at).toLocaleString(LOCALE_BCP47[locale], {
                                timeZone: c.timezone || undefined, weekday: 'short', day: 'numeric', month: 'short',
                                hour: '2-digit', minute: '2-digit',
                              })}
                              {e.location_text ? ` · ${e.location_text}` : ''}
                            </div>
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                            {e.attendee_count_cached}{e.max_attendees ? `/${e.max_attendees}` : ''}
                          </span>
                          <ChevronRight size={15} className="shrink-0 text-muted-foreground/50" />
                        </Link>
                      ))}
                    </div>
                  )}
                </Section>
              </Reveal>

              <Reveal delay={0.1}>
                <Section title={t('programs')} action={<SeeAll href="/dashboard/community/manage" label={t('manage')} />}>
                  {data.programs.length === 0 ? (
                    <EmptyHint Icon={BookOpenText} text={t('noPrograms')} />
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {data.programs.map((p) => (
                        <Link key={p.id} href={`/dashboard/community/programs/${p.id}`}
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
                            {p.schedule_text && (
                              <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{p.schedule_text}</div>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </Section>
              </Reveal>

              <Reveal delay={0.11}>
                <div id="services" className="scroll-mt-20">
                  <Section title={t('servicesTitle')}>
                    <ServicesSection communitySlug={c.slug} t={t} />
                  </Section>
                </div>
              </Reveal>

              <Reveal delay={0.12}>
                <Section title={t('membersTitle')} action={<SeeAll href="/dashboard/people" label={t('seeAll')} />}>
                  <div className="flex flex-wrap gap-2">
                    {data.members.map((m) => (
                      <Link key={m.user?.id} href={`/dashboard/people/${m.user?.id}`} title={m.user?.name ?? ''}>
                        <Avatar user={{ id: m.user?.id ?? '', name: m.user?.name ?? null, email: null, image_url: m.user?.image_url ?? null }} size="md" />
                      </Link>
                    ))}
                    {c.member_count_cached > data.members.length && (
                      <Link href="/dashboard/people"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground hover:bg-muted/70">
                        +{c.member_count_cached - data.members.length}
                      </Link>
                    )}
                  </div>
                </Section>
              </Reveal>
            </>
          )}

          {tab === 'guide' && <GuideTab places={data.places} t={t} locale={locale} />}

          {tab === 'contacts' && <ContactsTab c={c} t={t} />}
        </div>
      </div>
    </div>
  );
}

// ── Services section (info tab) ────────────────────────────────────────────
// Сервисы общины — «мезуза в дом», «шабатний набор» и т.п. Один тап создаёт
// заявку ('services' request) — раввин видит её в «Просьбах».
function ServicesSection({ communitySlug, t }: { communitySlug: string; t: T }) {
  const services = getServicesForCommunity(communitySlug);
  if (services.length === 0) return null;
  const labels = {
    free: t('serviceFree'),
    request: t('serviceRequest'),
    sentTitle: t('serviceSentTitle'),
    sentBody: t('serviceSentBody'),
    error: t('serviceError'),
  };
  return (
    <div className="space-y-2">
      {services.map((s) => (
        <ServiceRequestRow key={s.slug} service={s} labels={labels} />
      ))}
    </div>
  );
}

// ── Guide tab ─────────────────────────────────────────────────────────────
function GuideTab({ places, t, locale }: { places: PlaceRow[]; t: T; locale: Locale }) {
  if (places.length === 0) {
    return <EmptyHint Icon={MapPin} text={t('guideEmpty')} />;
  }
  // Group by type
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
                    {p.address && (
                      <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{p.address}</div>
                    )}
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
function ContactsTab({ c, t }: { c: {
  contact_phone: string | null; whatsapp_url: string | null; contact_email: string | null;
  website_url: string | null; instagram_url: string | null; address: string | null;
}; t: T }) {
  const rows = [
    c.contact_phone && { Icon: Phone, label: t('contact.phone'), value: c.contact_phone, href: `tel:${c.contact_phone}` },
    c.whatsapp_url && { Icon: MessageCircle, label: t('contact.whatsapp'), value: t('contact.whatsappValue'), href: c.whatsapp_url, external: true },
    c.contact_email && { Icon: Mail, label: t('contact.email'), value: c.contact_email, href: `mailto:${c.contact_email}` },
    c.website_url && { Icon: Globe, label: t('contact.website'), value: c.website_url.replace(/^https?:\/\//, ''), href: c.website_url, external: true },
    c.instagram_url && { Icon: AtSign, label: t('contact.instagram'), value: t('contact.instagramValue'), href: c.instagram_url, external: true },
    c.address && { Icon: Navigation, label: t('contact.address'), value: c.address, href: `https://maps.google.com/?q=${encodeURIComponent(c.address)}`, external: true },
  ].filter(Boolean) as Array<{ Icon: typeof Phone; label: string; value: string; href: string; external?: boolean }>;

  if (rows.length === 0) {
    return <EmptyHint Icon={Phone} text={t('contactsEmpty')} />;
  }
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

// ── Shared sub-components ──────────────────────────────────────────────────
function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-end justify-between mb-3">
        <h2 className="font-serif text-lg font-semibold leading-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function SeeAll({ href, label = 'Все' }: { href: string; label?: string }) {
  return (
    <Link href={href} className="text-xs text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-0.5">
      {label} <ChevronRight size={13} />
    </Link>
  );
}

function EmptyHint({ Icon, text }: { Icon: typeof CalendarDays; text: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
      <Icon size={18} strokeWidth={1.9} className="opacity-60" />
      {text}
    </div>
  );
}
