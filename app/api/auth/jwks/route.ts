// JWKS endpoint — Hasura's `jwk_url` points here to verify our signed JWTs.
// Cache-Control honored by Hasura: it auto-refreshes on TTL.

import { NextResponse } from 'next/server';
import { getJwtKeys } from '@/lib/jwt-keys';

export async function GET() {
  const { publicJWK } = await getJwtKeys();
  return NextResponse.json(
    { keys: [publicJWK] },
    { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' } },
  );
}
