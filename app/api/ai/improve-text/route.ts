// POST /api/ai/improve-text — takes a draft + kind, returns refined text.

import { auth } from '@/lib/auth';
import { improveDescription, type ContentKind } from '@/lib/ai/text-helper';
import { z } from 'zod';

export const runtime = 'nodejs';
export const maxDuration = 30;

const schema = z.object({
  draft: z.string().min(1).max(1500),
  kind: z.enum([
    'place_synagogue','place_restaurant','place_cafe','place_store','place_generic',
    'program','group','event',
  ]),
  name: z.string().max(200).optional(),
  community_name: z.string().max(200).optional(),
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

  const result = await improveDescription(
    parsed.data.draft,
    parsed.data.kind as ContentKind,
    {
      name: parsed.data.name,
      communityName: parsed.data.community_name,
    },
  );
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
