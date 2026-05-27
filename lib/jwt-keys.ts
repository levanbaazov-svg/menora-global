// RSA key loading + JWK derivation for Hasura JWT verification.
//
// Private key signs JWTs (Auth.js → Hasura).
// Public key is published at /api/auth/jwks so Hasura can verify.

import { createHash, createPublicKey } from 'node:crypto';
import { importPKCS8, importSPKI, exportJWK, type JWK } from 'jose';

type PrivateKey = Awaited<ReturnType<typeof importPKCS8>>;

interface Keys {
  privateKey: PrivateKey;
  publicJWK: JWK;
  kid: string;
}

function unescape(pem: string): string {
  return pem.replace(/\\n/g, '\n');
}

function readKeyEnv(name: string): string {
  const raw = process.env[name];
  if (!raw) throw new Error(`${name} env var not set. Run: node scripts/gen-jwt-keys.js`);
  return unescape(raw);
}

let cached: Keys | null = null;

export async function getJwtKeys(): Promise<Keys> {
  if (cached) return cached;

  const privatePem = readKeyEnv('HASURA_JWT_PRIVATE_KEY');
  const publicPem = process.env.HASURA_JWT_PUBLIC_KEY
    ? unescape(process.env.HASURA_JWT_PUBLIC_KEY)
    : derivePublicFromPrivate(privatePem);

  const privateKey = await importPKCS8(privatePem, 'RS256');
  const publicKey = await importSPKI(publicPem, 'RS256');

  const publicJWK = await exportJWK(publicKey);
  const kid = createHash('sha256')
    .update(`${publicJWK.kty}|${publicJWK.n}|${publicJWK.e}`)
    .digest('base64url')
    .slice(0, 16);

  publicJWK.alg = 'RS256';
  publicJWK.use = 'sig';
  publicJWK.kid = kid;

  const out: Keys = { privateKey, publicJWK, kid };
  cached = out;
  return out;
}

function derivePublicFromPrivate(privatePem: string): string {
  return createPublicKey({ key: privatePem, format: 'pem' })
    .export({ type: 'spki', format: 'pem' }) as string;
}
