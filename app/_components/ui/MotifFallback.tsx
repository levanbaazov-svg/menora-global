// Branded image fallback — a warm gradient + faint Magen David motif, shown
// wherever an entity has no real photo yet. Keeps the whole app on one
// intentional Jewish aesthetic instead of random stock placeholders.

type Variant = 'community' | 'place' | 'event' | 'program';

const GRAD: Record<Variant, string> = {
  community: 'from-[#2A6F5A] via-[#1C5446] to-[#123A30]', // deep emerald → Menorah brand
  place:     'from-[#C99B43] via-[#A9802F] to-[#7A5A1C]', // gold
  event:     'from-[#4A6B8A] via-[#385677] to-[#243A52]', // torah blue
  program:   'from-[#8A5A86] via-[#6E466B] to-[#4A2F48]', // plum
};

export function MotifFallback({
  variant = 'community',
  className = '',
}: {
  variant?: Variant;
  className?: string;
}) {
  return (
    <div className={`relative h-full w-full overflow-hidden bg-gradient-to-br ${GRAD[variant]} ${className}`}>
      {/* large faint Magen David, offset to a corner */}
      <svg
        viewBox="0 0 100 100"
        aria-hidden
        className="absolute -bottom-8 -end-8 h-40 w-40 text-white/[0.13] rtl:scale-x-[-1]"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinejoin="round"
      >
        <path d="M50 6 L89 73 L11 73 Z" />
        <path d="M50 94 L11 27 L89 27 Z" />
      </svg>
      {/* soft top sheen so overlaid white text stays readable */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/5" />
    </div>
  );
}
