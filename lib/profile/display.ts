// Small shared helpers for member display: name resolution, initials, denomination labels.

export interface UserDisplayProfile {
  legal_first_name?: string | null;
  legal_last_name?: string | null;
  hebrew_name?: string | null;
  denomination?: string | null;
  observance_level?: string | null;
  kashrut_level?: string | null;
  interests?: string[] | null;
  bio?: string | null;
  profile_visibility?: string | null;
}

export interface UserDisplay {
  id: string;
  name?: string | null;
  email?: string | null;
  image_url?: string | null;
  profile?: UserDisplayProfile | null;
}

/** Pick the best display name from profile → google name → email-local. */
export function displayName(u: UserDisplay): string {
  const first = u.profile?.legal_first_name?.trim();
  const last = u.profile?.legal_last_name?.trim();
  if (first || last) return [first, last].filter(Boolean).join(' ');
  if (u.name?.trim()) return u.name.trim();
  if (u.email) return u.email.split('@')[0];
  return 'Без имени';
}

/** Two-letter initials for avatar fallback. */
export function initials(u: UserDisplay): string {
  const n = displayName(u);
  const parts = n.split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export const DENOMINATION_LABELS: Record<string, string> = {
  reform: 'Reform',
  conservative: 'Conservative',
  modern_orthodox: 'Modern Orthodox',
  orthodox: 'Orthodox',
  chabad: 'Chabad',
  sephardi: 'Sephardi',
  reconstructionist: 'Reconstructionist',
  secular: 'Secular',
  other: 'Другое',
};

export const OBSERVANCE_LABELS: Record<string, string> = {
  curious: 'Только интересуюсь',
  traditional: 'Традиционный',
  observant: 'Соблюдающий',
  strictly_observant: 'Строго соблюдающий',
};

export const KASHRUT_LABELS: Record<string, string> = {
  none: 'Не соблюдаю',
  basic: 'Базовый',
  strict: 'Строгий',
  mehadrin: 'Мехадрин',
};

export const INTEREST_LABELS: Record<string, string> = {
  torah_learning: 'Тора',
  prayer: 'Молитва',
  social: 'Общение',
  volunteering: 'Волонтёрство',
  parenting: 'Дети',
  sports: 'Спорт',
  music: 'Музыка',
  cooking: 'Кулинария',
  hebrew: 'Иврит',
  israel: 'Израиль',
  arts: 'Искусство',
  outdoors: 'Природа',
  meditation: 'Медитация',
};

export const ROLE_BADGES: Record<string, { label: string; cls: string }> = {
  admin: { label: 'admin', cls: 'bg-(--color-deep) text-white' },
  rabbi: { label: 'rabbi', cls: 'bg-(--color-gold) text-(--color-deep)' },
  member: { label: 'member', cls: 'bg-(--color-muted-bg) text-(--color-muted)' },
};
