// Server-only helpers for invitation token generation.

import 'server-only';
import { randomBytes, createHash } from 'node:crypto';

/** Generate a 32-character base64url token (24 random bytes). */
export function generateInviteToken(): string {
  return randomBytes(24).toString('base64url');
}

/** SHA-256 hex of token; what we store in DB. */
export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Build the public magic link to send by email/messenger. */
export function inviteUrl(token: string, base?: string): string {
  const baseUrl = base ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  return `${baseUrl}/invite?token=${token}`;
}
