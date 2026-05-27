import Link from 'next/link';
import { KASHRUT_LABELS, type KashrutLevel } from '@/lib/places/schema';

interface PlaceCardProps {
  id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  address: string | null;
  kashrut_level: KashrutLevel | null;
  kashrut_authority: string | null;
  price_level: string | null;
  cuisine_tags?: string[] | null;
  dietary_tags?: string[] | null;
}

export function PlaceCard(p: PlaceCardProps) {
  const kashrutBadge = p.kashrut_level && p.kashrut_level !== 'none'
    ? KASHRUT_LABELS[p.kashrut_level]
    : null;

  return (
    <Link
      href={`/dashboard/community/places/${p.id}`}
      className="block rounded-2xl bg-(--color-bg-elevated) border border-(--color-border)/60 overflow-hidden hover:border-(--color-gold)/40 hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all"
    >
      {/* Photo */}
      <div
        className="aspect-[4/3] bg-(--color-muted-bg) relative"
        style={p.photo_url ? { background: `url(${p.photo_url}) center/cover no-repeat` } : undefined}
      >
        {!p.photo_url && (
          <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-30">
            ✦
          </div>
        )}
        {kashrutBadge && (
          <span className={`absolute top-3 left-3 text-xs px-2 py-1 rounded-full font-medium ${kashrutBadge.color}`}>
            {kashrutBadge.label}
          </span>
        )}
        {p.price_level && (
          <span className="absolute top-3 right-3 text-xs px-2 py-1 rounded-full bg-white/90 backdrop-blur font-medium text-(--color-deep)">
            {p.price_level}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="font-serif text-lg font-semibold leading-tight">{p.name}</h3>
        {p.address && (
          <p className="text-xs text-(--color-fg-muted) mt-1 line-clamp-1">📍 {p.address}</p>
        )}
        {(p.cuisine_tags?.length ?? 0) > 0 && (
          <div className="text-xs text-(--color-fg-subtle) mt-2 line-clamp-1">
            {p.cuisine_tags!.join(' · ')}
          </div>
        )}
        {p.description && !p.cuisine_tags?.length && (
          <p className="text-xs text-(--color-fg-muted) mt-2 line-clamp-2">{p.description}</p>
        )}
      </div>
    </Link>
  );
}
