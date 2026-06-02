import { z } from 'zod';

const trimmed = z.string().transform((s) => s.trim()).pipe(z.string());
const optUrl = z.string().url('Нужна корректная ссылка').optional().or(z.literal('').transform(() => undefined));
const optText = z.string().max(2000).optional().transform((v) => v?.trim() || undefined);

export const updateCommunitySchema = z.object({
  name:          trimmed.pipe(z.string().min(2, 'Название обязательно').max(160)),
  description:   z.string().max(4000).optional().transform((v) => v?.trim() || undefined),
  denomination:  z.string().max(60).optional().transform((v) => v?.trim() || undefined),
  founded_year:  z.coerce.number().int().min(1000).max(2100).optional().or(z.literal('').transform(() => undefined)),
  address:       optText,
  hero_image_url: optUrl,
  contact_phone: z.string().max(50).optional().transform((v) => v?.trim() || undefined),
  contact_email: z.string().email('Нужен корректный email').optional().or(z.literal('').transform(() => undefined)),
  website_url:   optUrl,
  whatsapp_url:  optUrl,
  instagram_url: optUrl,
});

export type UpdateCommunityInput = z.infer<typeof updateCommunitySchema>;

// Creating a new community (a rabbi starting their Beit Chabad on the platform).
// Slug is derived server-side from the name; city/country/timezone are required
// so the community is locatable and Shabbat times resolve.
export const createCommunitySchema = updateCommunitySchema.extend({
  city:         trimmed.pipe(z.string().min(2, 'Укажи город').max(120)),
  country_code: trimmed.pipe(z.string().min(2, 'Укажи страну (код)').max(2)),
  timezone:     trimmed.pipe(z.string().min(2, 'Укажи часовой пояс').max(64)),
});

export type CreateCommunityInput = z.infer<typeof createCommunitySchema>;
