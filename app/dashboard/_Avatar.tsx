import { initials, type UserDisplay } from '@/lib/profile/display';

interface Props {
  user: UserDisplay;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const SIZES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-base',
  xl: 'w-24 h-24 text-xl',
} as const;

export function Avatar({ user, size = 'md' }: Props) {
  const cls = SIZES[size];
  if (user.image_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={user.image_url}
        alt={user.name ?? ''}
        className={`${cls} rounded-full object-cover shrink-0`}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <div className={`${cls} rounded-full bg-(--color-gold-soft) text-(--color-deep) flex items-center justify-center font-semibold shrink-0`}>
      {initials(user)}
    </div>
  );
}
