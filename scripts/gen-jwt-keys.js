// One-time RSA 2048-bit key generation for Hasura JWT (RS256).
//
// Run: `node scripts/gen-jwt-keys.js`
// Copy printed env values into .env (and Vercel later).

'use strict';

const { generateKeyPairSync, randomBytes } = require('node:crypto');

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

function envEscape(pem) {
  return pem.replace(/\n/g, '\\n');
}

const nextAuthSecret = randomBytes(32).toString('base64url');

console.log('# Paste into .env (and Vercel env vars later)');
console.log('');
console.log(`NEXTAUTH_SECRET=${nextAuthSecret}`);
console.log('');
console.log(`HASURA_JWT_PRIVATE_KEY="${envEscape(privateKey)}"`);
console.log('');
console.log(`HASURA_JWT_PUBLIC_KEY="${envEscape(publicKey)}"`);
console.log('');
console.log('# For Hasura Cloud → Project → ENV VARS:');
console.log('# HASURA_GRAPHQL_JWT_SECRET=');
console.log(JSON.stringify({
  type: 'RS256',
  jwk_url: '<your-deployment-url>/api/auth/jwks',
  claims_map: {
    'x-hasura-allowed-roles':         { path: '$.hasura.allowed_roles',         default: ['member'] },
    'x-hasura-default-role':          { path: '$.hasura.default_role',          default: 'member'   },
    'x-hasura-user-id':               { path: '$.sub' },
    'x-hasura-community-id':          { path: '$.hasura.community_id',          default: '00000000-0000-0000-0000-000000000000' },
    'x-hasura-allowed-community-ids': { path: '$.hasura.allowed_community_ids', default: '{}' },
  },
  issuer: 'menora-global',
  allowed_skew: 30,
}, null, 2));
