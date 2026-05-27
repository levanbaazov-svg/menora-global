import { z } from 'zod';

const trimmed = z.string().transform((s) => s.trim()).pipe(z.string());

export const REQUEST_CATEGORIES = [
  'childcare', 'services', 'learning', 'community',
  'loan', 'housing', 'meals', 'other',
] as const;

export const REQUEST_CATEGORY_LABELS: Record<typeof REQUEST_CATEGORIES[number], string> = {
  childcare: '👶 Дети / няня',
  services:  '🔧 Услуги',
  learning:  '📚 Учёба / хеврута',
  community: '🤝 Помощь общине',
  loan:      '💰 Займ / взаймы',
  housing:   '🏠 Жильё',
  meals:     '🍽️ Еда / приют на шаббат',
  other:     '❓ Другое',
};

export const URGENCY_LABELS = {
  low: 'Не срочно',
  normal: 'Обычное',
  high: 'Срочно',
} as const;

export const STATUS_LABELS = {
  open:        { label: 'Открыто',     cls: 'bg-(--color-gold-soft) text-(--color-gold-dark)' },
  in_progress: { label: 'В работе',    cls: 'bg-blue-100 text-blue-800' },
  fulfilled:   { label: '✓ Закрыто',   cls: 'bg-green-100 text-green-800' },
  expired:     { label: 'Истекло',     cls: 'bg-gray-100 text-gray-600' },
  cancelled:   { label: 'Отменено',    cls: 'bg-gray-100 text-gray-600' },
} as const;

// ── Create request ─────────────────────────────────────────────────────────
export const createRequestSchema = z.object({
  category: z.enum(REQUEST_CATEGORIES),
  urgency:  z.enum(['low', 'normal', 'high']).default('normal'),
  title:    trimmed.pipe(z.string().min(5, 'Минимум 5 символов').max(200)),
  body:     trimmed.pipe(z.string().min(10, 'Опиши подробнее').max(5000)),
  expires_in_days: z.coerce.number().int().min(0).max(180).default(14).transform((n) => n === 0 ? undefined : n),
});
export type CreateRequestInput = z.infer<typeof createRequestSchema>;

// ── Post reply ─────────────────────────────────────────────────────────────
export const postReplySchema = z.object({
  request_id:     z.string().uuid(),
  body:           trimmed.pipe(z.string().min(2, 'Слишком коротко').max(2000)),
  contact_method: z.enum(['public_thread', 'share_phone', 'share_email']).default('public_thread'),
  contact_phone:  trimmed.pipe(z.string().max(50)).optional().or(z.literal('').transform(() => undefined)),
  contact_email:  trimmed.pipe(z.string().max(320)).optional().or(z.literal('').transform(() => undefined)),
}).refine(
  (d) => d.contact_method !== 'share_phone' || !!d.contact_phone,
  { message: 'Введи телефон если выбрал «поделиться телефоном»', path: ['contact_phone'] },
).refine(
  (d) => d.contact_method !== 'share_email' || !!d.contact_email,
  { message: 'Введи email если выбрал «поделиться email»', path: ['contact_email'] },
);
export type PostReplyInput = z.infer<typeof postReplySchema>;

// ── Update request status ──────────────────────────────────────────────────
export const requestIdSchema = z.object({
  request_id: z.string().uuid(),
});
export const acceptReplySchema = z.object({
  request_id: z.string().uuid(),
  reply_id:   z.string().uuid(),
});

export const replyIdSchema = z.object({
  reply_id: z.string().uuid(),
});
