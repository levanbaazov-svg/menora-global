// POST /api/ai/generate-cover — generates an event cover via gpt-image-1.

import { auth } from '@/lib/auth';
import { generateEventCover } from '@/lib/ai/image-gen';
import { z } from 'zod';

export const runtime = 'nodejs';
export const maxDuration = 60;

const schema = z.object({
  title: z.string().min(2).max(200),
  type: z.string().max(60).optional(),
  description: z.string().max(1000).optional(),
  community_city: z.string().max(120).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: 'Не авторизован' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const result = await generateEventCover({
    title: parsed.data.title,
    type: parsed.data.type,
    description: parsed.data.description,
    communityCity: parsed.data.community_city,
  });
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
