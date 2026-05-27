import { z } from 'zod';

const trimmed = z.string().transform((s) => s.trim()).pipe(z.string());

export const approveSchema = z.object({
  membership_id: z.string().uuid(),
});

export const rejectSchema = z.object({
  membership_id: z.string().uuid(),
  reason: trimmed.pipe(z.string().min(1, 'Укажи причину').max(500)),
});

export const changeRoleSchema = z.object({
  membership_id: z.string().uuid(),
  // admin role is intentionally not changeable from this UI —
  // promote to admin requires direct DB action (security).
  role: z.enum(['member', 'rabbi']),
});

export const suspendSchema = z.object({
  membership_id: z.string().uuid(),
});

export const unsuspendSchema = z.object({
  membership_id: z.string().uuid(),
});
