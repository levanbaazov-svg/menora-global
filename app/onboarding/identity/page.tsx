import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import { StepShell } from '../_StepShell';
import { IdentityForm } from './IdentityForm';

const FETCH = /* GraphQL */ `
  query FetchIdentity($user_id: uuid!) {
    user_profiles_by_pk(user_id: $user_id) {
      legal_first_name legal_last_name hebrew_name gender date_of_birth phone_e164
    }
    users_by_pk(id: $user_id) { name }
  }
`;

export default async function IdentityStep() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const data = await hasuraAdmin.request<{
    user_profiles_by_pk: Record<string, string | null> | null;
    users_by_pk: { name: string | null } | null;
  }>(FETCH, { user_id: session.user.id });

  const p = data.user_profiles_by_pk;
  const googleName = data.users_by_pk?.name ?? '';
  const [defaultFirst, defaultLast] = googleName.split(' ', 2);

  const defaults = {
    legal_first_name: p?.legal_first_name ?? defaultFirst ?? '',
    legal_last_name:  p?.legal_last_name  ?? defaultLast  ?? '',
    hebrew_name:      p?.hebrew_name      ?? '',
    gender:           p?.gender           ?? '',
    date_of_birth:    p?.date_of_birth    ?? '',
    phone_e164:       p?.phone_e164       ?? '',
  };

  return (
    <StepShell step="identity" hasMembership={session.hasMembership}>
      <IdentityForm defaults={defaults} />
    </StepShell>
  );
}
