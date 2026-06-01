import Link from 'next/link';
import { getTranslations, getLocale } from 'next-intl/server';
import { PROGRAM_CATEGORY_LABELS, type ProgramCategory } from '@/lib/places/schema';
import { type Locale } from '@/i18n/config';

interface Props {
  id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  category: ProgramCategory;
  schedule_text: string | null;
  age_min: number | null;
  age_max: number | null;
  price_amount: number | null;
  price_currency: string | null;
  price_period: string | null;
  enrolled_count_cached: number;
  max_capacity: number | null;
}

export async function ProgramCard(p: Props) {
  const t = await getTranslations('communityMisc');
  const locale = (await getLocale()) as Locale;
  const PERIOD_LABEL: Record<string, string> = {
    one_time: t('periodOneTime'), monthly: t('periodMonthly'),
    yearly: t('periodYearly'), per_session: t('periodPerSession'),
  };
  const cat = PROGRAM_CATEGORY_LABELS[p.category];
  const seatsLeft = p.max_capacity != null ? p.max_capacity - p.enrolled_count_cached : null;
  const ageRange = p.age_min != null && p.age_max != null ? t('ageYears', { min: p.age_min, max: p.age_max })
                : p.age_min != null ? t('ageFrom', { min: p.age_min }) : null;

  return (
    <Link
      href={`/dashboard/community/programs/${p.id}`}
      className="block rounded-2xl bg-(--color-bg-elevated) border border-(--color-border)/60 overflow-hidden hover:border-(--color-gold)/40 hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all"
    >
      <div
        className="aspect-[4/3] relative photo-overlay"
        style={p.photo_url
          ? { background: `url(${p.photo_url}) center/cover no-repeat` }
          : { background: 'linear-gradient(135deg, var(--color-pastel-yellow), var(--color-pastel-lavender))' }}
      >
        <span className="absolute top-3 left-3 z-10 text-xs px-2 py-1 rounded-full bg-white/90 backdrop-blur font-medium text-(--color-deep)">
          {cat.emoji} {cat[locale].toUpperCase()}
        </span>
        <div className="absolute bottom-0 inset-x-0 p-4 z-10 text-white">
          <h3 className="font-serif text-lg font-semibold leading-tight">{p.name}</h3>
          {p.schedule_text && <p className="text-xs opacity-90 mt-1">{p.schedule_text}</p>}
        </div>
      </div>

      <div className="p-4 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-(--color-fg-muted) flex-wrap">
          {ageRange && <span>{ageRange}</span>}
          {p.price_amount != null && (
            <span className="font-medium text-(--color-deep)">
              {p.price_amount} {p.price_currency ?? 'USD'} {p.price_period ? PERIOD_LABEL[p.price_period] : ''}
            </span>
          )}
        </div>
        {seatsLeft != null && (
          <span className={seatsLeft > 0 ? 'text-(--color-success)' : 'text-(--color-danger)'}>
            {seatsLeft > 0 ? t('seatsLeft', { count: seatsLeft }) : t('noSeats')}
          </span>
        )}
      </div>
    </Link>
  );
}
