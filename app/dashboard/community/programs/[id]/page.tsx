// Program detail page — hero, schedule, location, price, contact, enroll.

import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import {
  CalendarClock, MapPin, Wallet, Users, ChevronLeft, BadgeCheck,
} from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';
import { Avatar } from '@/app/dashboard/_Avatar';
import { PROGRAM_CATEGORY_LABELS, type ProgramCategory } from '@/lib/places/schema';
import { EnrollButton } from './EnrollButton';

const FETCH = /* GraphQL */ `
  query ProgramDetail($id: uuid!, $user_id: uuid!) {
    programs_by_pk(id: $id) {
      id community_id category name description photo_url
      schedule_text schedule_recurrence starts_on ends_on
      age_min age_max price_amount price_currency price_period price_notes
      max_capacity enrolled_count_cached registration_url registration_open
      requires_approval location_text status
      community { id name }
      contact_user { id name image_url profile { hebrew_name } }
      location_place { id name address }
    }
    my_enrollment: program_enrollments(
      where: { program_id: { _eq: $id }, user_id: { _eq: $user_id } }
      limit: 1
    ) { id status }
  }
`;

const PERIOD_LABEL: Record<string, string> = {
  one_time: 'разово', monthly: 'в месяц', yearly: 'в год', per_session: 'за занятие',
};

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  const { id } = await params;

  const data = await hasuraAdmin.request<{
    programs_by_pk: {
      id: string; community_id: string; category: ProgramCategory; name: string;
      description: string | null; photo_url: string | null;
      schedule_text: string | null; schedule_recurrence: string | null;
      starts_on: string | null; ends_on: string | null;
      age_min: number | null; age_max: number | null;
      price_amount: number | null; price_currency: string | null; price_period: string | null; price_notes: string | null;
      max_capacity: number | null; enrolled_count_cached: number;
      registration_url: string | null; registration_open: boolean; requires_approval: boolean;
      location_text: string | null; status: string;
      community: { id: string; name: string } | null;
      contact_user: { id: string; name: string | null; image_url: string | null; profile: { hebrew_name: string | null } | null } | null;
      location_place: { id: string; name: string; address: string | null } | null;
    } | null;
    my_enrollment: Array<{ id: string; status: string }>;
  }>(FETCH, { id, user_id: session.user.id });

  const p = data.programs_by_pk;
  if (!p) notFound();

  const meta = PROGRAM_CATEGORY_LABELS[p.category];
  const enrollment = data.my_enrollment[0] ?? null;
  const isFull = p.max_capacity != null && p.enrolled_count_cached >= p.max_capacity;
  const price = p.price_amount != null && p.price_amount > 0
    ? `${p.price_amount} ${p.price_currency ?? ''}${p.price_period ? ` / ${PERIOD_LABEL[p.price_period] ?? p.price_period}` : ''}`
    : 'Бесплатно';
  const ageRange = p.age_min != null || p.age_max != null
    ? `${p.age_min ?? 0}${p.age_max != null ? `–${p.age_max}` : '+'} лет`
    : null;

  return (
    <div className="container mx-auto max-w-xl px-0 md:px-6 pt-0 md:pt-3 pb-32">
      {/* Hero */}
      <Reveal>
        <section className="relative">
          <div className="relative h-52 md:h-60 md:rounded-2xl overflow-hidden">
            {p.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.photo_url} alt={p.name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-primary/35 to-foreground/45" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/5" />

            <Link
              href="/dashboard/community"
              className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/85 backdrop-blur px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-white transition-colors"
            >
              <ChevronLeft size={14} /> Община
            </Link>

            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <span className="inline-block rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-semibold text-foreground mb-2">
                {meta?.ru ?? p.category}
              </span>
              <h1 className="font-serif text-2xl md:text-3xl font-semibold leading-tight drop-shadow-sm">
                {p.name}
              </h1>
              {p.community && (
                <div className="text-xs text-white/85 mt-1">{p.community.name}</div>
              )}
            </div>
          </div>
        </section>
      </Reveal>

      <div className="px-4 md:px-0 space-y-6 mt-5">
        {/* Quick facts */}
        <Reveal delay={0.04}>
          <div className="grid grid-cols-2 gap-3">
            <Fact Icon={CalendarClock} label="Расписание" value={p.schedule_text ?? '—'} />
            <Fact Icon={Wallet} label="Стоимость" value={price} />
            {ageRange && <Fact Icon={Users} label="Возраст" value={ageRange} />}
            {(p.location_place || p.location_text) && (
              <Fact Icon={MapPin} label="Место" value={p.location_place?.name ?? p.location_text ?? '—'} />
            )}
          </div>
        </Reveal>

        {/* Capacity */}
        <Reveal delay={0.06}>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users size={15} strokeWidth={1.9} />
            <span>
              {p.enrolled_count_cached} записаны
              {p.max_capacity != null ? ` · осталось ${Math.max(0, p.max_capacity - p.enrolled_count_cached)} мест` : ''}
            </span>
          </div>
        </Reveal>

        {/* Description */}
        {p.description && (
          <Reveal delay={0.08}>
            <p className="text-sm leading-relaxed text-foreground/85 whitespace-pre-line">{p.description}</p>
          </Reveal>
        )}

        {/* Contact person */}
        {p.contact_user && (
          <Reveal delay={0.1}>
            <Link
              href={`/dashboard/people/${p.contact_user.id}`}
              className="flex items-center gap-3 rounded-2xl bg-card ring-1 ring-border/70 p-4 hover:ring-primary/30 transition-all"
            >
              <Avatar user={{ id: p.contact_user.id, name: p.contact_user.name, email: null, image_url: p.contact_user.image_url }} size="md" />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Контактное лицо</div>
                <div className="text-sm font-medium leading-tight">{p.contact_user.name ?? 'Без имени'}</div>
              </div>
              {p.requires_approval && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <BadgeCheck size={13} /> по одобрению
                </span>
              )}
            </Link>
          </Reveal>
        )}
      </div>

      {/* Sticky enroll bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-24 md:pb-6 pt-3 bg-gradient-to-t from-background via-background to-transparent">
        <div className="container mx-auto max-w-xl">
          <EnrollButton
            programId={p.id}
            enrolled={Boolean(enrollment)}
            enrollmentStatus={enrollment?.status ?? null}
            registrationOpen={p.registration_open && !isFull}
            isFull={isFull}
            externalUrl={p.registration_url}
          />
        </div>
      </div>
    </div>
  );
}

function Fact({ Icon, label, value }: { Icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card ring-1 ring-border/70 p-3.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
        <Icon size={13} strokeWidth={2} /> {label}
      </div>
      <div className="text-sm font-medium leading-snug">{value}</div>
    </div>
  );
}
