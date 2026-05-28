// Server-only helpers for Jewish ID card data + QR generation.
//
// Token lookup is admin-secret only (never exposed via member GraphQL),
// so a member's token stays private unless they share their QR.

import 'server-only';
import QRCode from 'qrcode';
import { hasuraAdmin } from '@/lib/hasura';

export interface JewishIdCard {
  user_id: string;
  token: string;
  enabled: boolean;
  regenerated_at: string | null;
  /** Display fields */
  display_name: string;
  hebrew_name: string | null;
  photo_url: string | null;
  denomination: string | null;
  /** From active membership */
  community: { id: string; slug: string; name: string; city: string | null; country_code: string | null } | null;
  role: 'member' | 'rabbi' | 'admin' | null;
  member_since: string | null;
}

// ── Queries ────────────────────────────────────────────────────────────────
const FETCH_OWN_CARD = /* GraphQL */ `
  query FetchOwnCard($user_id: uuid!) {
    users_by_pk(id: $user_id) {
      id name image_url jewish_id_token jewish_id_enabled jewish_id_regenerated_at
      profile { hebrew_name legal_first_name legal_last_name denomination }
      memberships(
        where: { status: { _eq: active } }
        order_by: { joined_at: asc }
        limit: 1
      ) {
        role joined_at
        community { id slug name city country_code }
      }
    }
  }
`;

const FETCH_PUBLIC_CARD = /* GraphQL */ `
  query FetchPublicCard($token: uuid!) {
    users(
      where: {
        jewish_id_token: { _eq: $token }
        jewish_id_enabled: { _eq: true }
        deactivated_at: { _is_null: true }
      }
      limit: 1
    ) {
      id name image_url jewish_id_token jewish_id_enabled jewish_id_regenerated_at
      profile { hebrew_name legal_first_name legal_last_name denomination }
      memberships(
        where: { status: { _eq: active } }
        order_by: { joined_at: asc }
        limit: 1
      ) {
        role joined_at
        community { id slug name city country_code }
      }
    }
  }
`;

interface RawUser {
  id: string;
  name: string | null;
  image_url: string | null;
  jewish_id_token: string;
  jewish_id_enabled: boolean;
  jewish_id_regenerated_at: string | null;
  profile: {
    hebrew_name: string | null;
    legal_first_name: string | null;
    legal_last_name: string | null;
    denomination: string | null;
  } | null;
  memberships: Array<{
    role: 'member' | 'rabbi' | 'admin';
    joined_at: string;
    community: { id: string; slug: string; name: string; city: string | null; country_code: string | null } | null;
  }>;
}

function shape(u: RawUser): JewishIdCard {
  const m = u.memberships[0];
  const profile = u.profile;
  const legalName = profile
    ? [profile.legal_first_name, profile.legal_last_name].filter(Boolean).join(' ').trim()
    : '';
  const displayName = legalName || u.name || 'Без имени';
  return {
    user_id: u.id,
    token: u.jewish_id_token,
    enabled: u.jewish_id_enabled,
    regenerated_at: u.jewish_id_regenerated_at,
    display_name: displayName,
    hebrew_name: profile?.hebrew_name ?? null,
    photo_url: u.image_url,
    denomination: profile?.denomination ?? null,
    community: m?.community ?? null,
    role: m?.role ?? null,
    member_since: m?.joined_at ?? null,
  };
}

// ── Public API ─────────────────────────────────────────────────────────────
export async function fetchOwnCard(userId: string): Promise<JewishIdCard | null> {
  const r = await hasuraAdmin.request<{ users_by_pk: RawUser | null }>(
    FETCH_OWN_CARD, { user_id: userId },
  );
  return r.users_by_pk ? shape(r.users_by_pk) : null;
}

export async function fetchPublicCardByToken(token: string): Promise<JewishIdCard | null> {
  const r = await hasuraAdmin.request<{ users: RawUser[] }>(FETCH_PUBLIC_CARD, { token });
  const u = r.users[0];
  return u ? shape(u) : null;
}

// ── Mutations ──────────────────────────────────────────────────────────────
// Hasura doesn't let us call gen_random_uuid() inline from GraphQL, so we
// generate the uuid on the Node side and pass it as a variable.

const SET_ENABLED = /* GraphQL */ `
  mutation SetEnabled($user_id: uuid!, $enabled: Boolean!) {
    update_users_by_pk(
      pk_columns: { id: $user_id }
      _set: { jewish_id_enabled: $enabled }
    ) { id }
  }
`;

const REGENERATE_TOKEN_INLINE = /* GraphQL */ `
  mutation RegenerateInline($user_id: uuid!, $token: uuid!) {
    update_users_by_pk(
      pk_columns: { id: $user_id }
      _set: { jewish_id_token: $token, jewish_id_regenerated_at: "now()" }
    ) { id jewish_id_token }
  }
`;

export async function regenerateToken(userId: string): Promise<string> {
  const { randomUUID } = await import('node:crypto');
  const newToken = randomUUID();
  await hasuraAdmin.request(REGENERATE_TOKEN_INLINE, { user_id: userId, token: newToken });
  return newToken;
}

export async function setEnabled(userId: string, enabled: boolean): Promise<void> {
  await hasuraAdmin.request(SET_ENABLED, { user_id: userId, enabled });
}

// ── QR generation ──────────────────────────────────────────────────────────
/**
 * Generates a QR as a base64-encoded PNG data URL for use in an <img> tag.
 *
 * Why PNG/data-URL instead of inline SVG:
 *  - SVG from qrcode includes hard-coded width/height attributes that bleed
 *    past CSS containers, making the QR overflow its card. Hard to constrain
 *    cleanly across browsers.
 *  - <img src="data:image/png;base64,..."> respects width/height attributes
 *    and CSS without surprises.
 *
 * Scannability:
 *  - errorCorrectionLevel 'H' is most forgiving against partial occlusion
 *  - margin 4 ('quiet zone') matches QR spec recommendation
 *  - solid colors for max contrast
 *  - 512px is hi-DPI for retina; CSS resizes down
 */
export async function qrDataUrlFor(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    type: 'image/png',
    errorCorrectionLevel: 'H',
    margin: 4,
    width: 512,
    color: { dark: '#0F172A', light: '#FFFFFF' },
  });
}

export function publicCardUrl(token: string, origin?: string): string {
  // Falls back to relative URL during build / SSR contexts without env.
  const base = origin ?? process.env.NEXTAUTH_URL ?? '';
  return `${base.replace(/\/$/, '')}/id/${token}`;
}
