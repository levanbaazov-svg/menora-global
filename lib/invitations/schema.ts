import { z } from 'zod';

const trimmed = z.string().transform((s) => s.trim()).pipe(z.string());

export const createInvitationSchema = z.object({
  email:      z.string().email('Введи корректный email').max(320).transform((s) => s.toLowerCase()),
  role:       z.enum(['member', 'rabbi', 'admin']).default('member'),
  ttl_days:   z.coerce.number().int().min(1).max(60).default(14),
  message:    trimmed.pipe(z.string().max(2000)).optional()
                .or(z.literal('').transform(() => undefined)),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

export const acceptInvitationSchema = z.object({
  token: z.string().min(16).max(256),
});
