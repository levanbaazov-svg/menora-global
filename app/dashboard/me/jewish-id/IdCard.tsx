// Visual Jewish ID card. Used in /dashboard/me/jewish-id (own) and /id/[token] (public).
// Hero-gradient with photo, name, community badge, role chip, QR.

import type { JewishIdCard } from '@/lib/jewish-id';
import { LOCALE_BCP47, type Locale } from '@/i18n/config';

type Translator = (key: string, values?: Record<string, string | number>) => string;

const ROLE_TONES = {
  member: 'bg-white/15 text-white',
  rabbi:  'bg-(--color-gold) text-(--color-deep)',
  admin:  'bg-(--color-deep) text-(--color-gold) border border-(--color-gold)/30',
} as const;

interface Props {
  card: JewishIdCard;
  /** PNG data URL for the QR (server-generated) */
  qrDataUrl: string;
  /** Optional URL printed under QR */
  publicUrl?: string;
  /** Compact mode hides QR (for nav previews) */
  compact?: boolean;
  /** Translator from the `personal` namespace */
  t: Translator;
  /** Active locale for date formatting */
  locale: Locale;
}

export function IdCard({ card, qrDataUrl, publicUrl, compact, t, locale }: Props) {
  const initials = (card.display_name || '?').slice(0, 1).toUpperCase();

  return (
    <article
      className="relative w-full max-w-[400px] mx-auto rounded-[28px] overflow-hidden shadow-[var(--shadow-lg)]"
      style={{
        background:
          'linear-gradient(135deg, #1A1F2E 0%, #2A3144 40%, #3E4665 75%, #C7A862 100%)',
      }}
    >
      {/* Subtle radial highlight — top corner only, far from QR */}
      <div
        aria-hidden
        className="absolute -top-24 -right-16 w-64 h-64 rounded-full opacity-40 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #C7A862 0%, transparent 70%)' }}
      />

      <div className="relative p-6 md:p-7 text-white">
        {/* Top row — brand + chip */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="text-(--color-gold) text-lg">✦</span>
            <div className="leading-none">
              <div className="font-serif italic text-base font-semibold tracking-wide">
                Menorah
              </div>
              <div className="text-[10px] uppercase tracking-widest opacity-70">
                Jewish ID
              </div>
            </div>
          </div>
          {card.role && (
            <span
              className={`text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full font-semibold ${ROLE_TONES[card.role]}`}
            >
              {t(`jewishId.card.roles.${card.role}`)}
            </span>
          )}
        </header>

        {/* Identity */}
        <div className="flex items-start gap-4 mb-6">
          <div className="shrink-0 w-20 h-20 rounded-full bg-white/10 border-2 border-(--color-gold)/40 overflow-hidden flex items-center justify-center text-2xl font-bold backdrop-blur">
            {card.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.photo_url} alt={card.display_name} className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <h2 className="font-serif text-2xl leading-tight font-semibold drop-shadow-md">
              {card.display_name}
            </h2>
            {card.hebrew_name && (
              <div
                className="font-serif text-base opacity-80 mt-0.5"
                dir="rtl" lang="he"
              >
                {card.hebrew_name}
              </div>
            )}
            {card.denomination && (
              <div className="text-[11px] uppercase tracking-widest opacity-60 mt-1">
                {card.denomination}
              </div>
            )}
          </div>
        </div>

        {/* Community */}
        {card.community && (
          <div className="mb-6 rounded-2xl bg-white/8 border border-white/10 backdrop-blur p-3.5">
            <div className="text-[10px] uppercase tracking-widest opacity-60 mb-0.5">
              {t('jewishId.card.community')}
            </div>
            <div className="font-medium text-sm leading-tight">{card.community.name}</div>
            {(card.community.city || card.community.country_code) && (
              <div className="text-xs opacity-75 mt-0.5">
                📍 {[card.community.city, card.community.country_code].filter(Boolean).join(', ')}
              </div>
            )}
            {card.member_since && (
              <div className="text-[10px] opacity-60 mt-1.5">
                {t('jewishId.card.memberSince', {
                  date: new Date(card.member_since).toLocaleDateString(LOCALE_BCP47[locale], {
                    month: 'long', year: 'numeric',
                  }),
                })}
              </div>
            )}
          </div>
        )}

        {/* QR block — solid white card with maximum contrast for scanning.
            QR is a PNG <img> with quiet-zone baked into the data URL, so we
            don't add extra padding (would just enlarge the empty border). */}
        {!compact && (
          <div className="rounded-2xl bg-white p-2 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt="QR — Jewish ID verification"
              className="block w-56 h-56"
              width={224}
              height={224}
            />
          </div>
        )}
        {!compact && publicUrl && (
          <div className="text-[10px] text-white/60 mt-2 text-center tracking-wide uppercase">
            {t('jewishId.card.qrCaption')}
          </div>
        )}

        {/* Footer brand */}
        <footer className="mt-5 flex items-center justify-between text-[10px] uppercase tracking-widest opacity-50">
          <span>menorah-global.app</span>
          <span>v1.0</span>
        </footer>
      </div>
    </article>
  );
}

/** Disabled-card placeholder (for /id/[token] when user revoked the card) */
export function DisabledCardPlaceholder({ t }: { t: Translator }) {
  return (
    <article className="relative w-full max-w-[400px] mx-auto rounded-[28px] overflow-hidden shadow-[var(--shadow-md)] bg-(--color-bg-elevated) border border-(--color-border) p-8 text-center">
      <div className="text-6xl mb-4 opacity-30">🔒</div>
      <h2 className="font-serif text-xl font-semibold mb-2">
        {t('jewishId.card.disabledPlaceholderTitle')}
      </h2>
      <p className="text-sm text-(--color-fg-muted)">
        {t('jewishId.card.disabledPlaceholderDesc')}
      </p>
    </article>
  );
}
