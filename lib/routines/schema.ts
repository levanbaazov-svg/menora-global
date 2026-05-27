import { z } from 'zod';

const trimmed = z.string().transform((s) => s.trim()).pipe(z.string());

export const ROUTINE_TYPES = [
  'modeh_ani', 'shacharit', 'mincha', 'maariv',
  'shema_al_hamita', 'tehilim', 'torah_learning', 'custom',
] as const;

export type RoutineType = typeof ROUTINE_TYPES[number];

export const ROUTINE_META: Record<RoutineType, {
  emoji: string;
  label: string;
  hebrewLabel: string;
  defaultTime: string;     // HH:MM
  description: string;
}> = {
  modeh_ani:       { emoji: '🌅', label: 'Модэ ани',         hebrewLabel: 'מודה אני',         defaultTime: '07:00', description: 'Утренняя благодарственная молитва' },
  shacharit:       { emoji: '🕊',  label: 'Шахарит',           hebrewLabel: 'שחרית',           defaultTime: '07:30', description: 'Утренняя молитва' },
  mincha:          { emoji: '☀️', label: 'Минха',             hebrewLabel: 'מנחה',             defaultTime: '13:30', description: 'Дневная молитва' },
  maariv:          { emoji: '🌙', label: 'Маарив',            hebrewLabel: 'מעריב',            defaultTime: '20:00', description: 'Вечерняя молитва' },
  shema_al_hamita: { emoji: '🛏',  label: 'Шма перед сном',    hebrewLabel: 'קריאת שמע על המיטה', defaultTime: '22:30', description: 'Молитва перед сном' },
  tehilim:         { emoji: '📖', label: 'Теилим',            hebrewLabel: 'תהילים',           defaultTime: '08:00', description: 'Чтение псалмов' },
  torah_learning:  { emoji: '📚', label: 'Учёба Торы',        hebrewLabel: 'לימוד תורה',       defaultTime: '21:00', description: 'Изучение Торы / Талмуда' },
  custom:          { emoji: '✦',  label: 'Своя рутина',       hebrewLabel: '',                 defaultTime: '09:00', description: 'Любая привычка по твоему' },
};

export const DAYS_OF_WEEK: Array<{ value: number; short: string; long: string }> = [
  { value: 0, short: 'Вс', long: 'Воскресенье' },
  { value: 1, short: 'Пн', long: 'Понедельник' },
  { value: 2, short: 'Вт', long: 'Вторник' },
  { value: 3, short: 'Ср', long: 'Среда' },
  { value: 4, short: 'Чт', long: 'Четверг' },
  { value: 5, short: 'Пт', long: 'Пятница' },
  { value: 6, short: 'Сб', long: 'Суббота' },
];

const time = z.string().regex(/^\d{1,2}:\d{2}$/, 'Формат: HH:MM').transform((s) => {
  const [h, m] = s.split(':').map(Number);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
});

export const createRoutineSchema = z.object({
  type:         z.enum(ROUTINE_TYPES),
  custom_label: trimmed.pipe(z.string().max(120)).optional().or(z.literal('').transform(() => undefined)),
  target_time:  time,
  days_of_week: z.union([z.string(), z.array(z.string())]).optional().transform((v) => {
    const arr = !v ? [] : Array.isArray(v) ? v : [v];
    const ints = arr.map((s) => parseInt(String(s), 10)).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
    return ints.length === 7 || ints.length === 0 ? null : ints;  // null = every day
  }),
  reminder_offset_minutes: z.coerce.number().int().min(0).max(120).default(10),
}).refine(
  (d) => d.type !== 'custom' || (d.custom_label && d.custom_label.length > 0),
  { message: 'Введи название для своей рутины', path: ['custom_label'] },
);

export type CreateRoutineInput = z.infer<typeof createRoutineSchema>;

export const routineIdSchema = z.object({
  routine_id: z.string().uuid(),
});

export const toggleCheckinSchema = z.object({
  routine_id: z.string().uuid(),
});
