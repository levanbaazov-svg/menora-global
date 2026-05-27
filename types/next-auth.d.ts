import type { DefaultSession } from 'next-auth';

export interface HasuraClaims {
  allowed_roles: string[];
  default_role: string;
  community_id: string;
  allowed_community_ids: string[];
}

declare module 'next-auth' {
  interface Session {
    user: { id: string } & DefaultSession['user'];
    hasuraToken: string;
    hasura: HasuraClaims;
    onboardingStep: string;
    hasMembership: boolean;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    userId?: string;
    hasura?: HasuraClaims;
    hasuraToken?: string;
    hasuraTokenExpiresAt?: number;
    onboardingStep?: string;
    hasMembership?: boolean;
  }
}
