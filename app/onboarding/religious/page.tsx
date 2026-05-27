import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import { StepShell } from '../_StepShell';
import { ReligiousForm } from './ReligiousForm';

const FETCH = /* GraphQL */ `
  query FetchReligious($user_id: uuid!) {
    user_profiles_by_pk(user_id: $user_id) {
      denomination observance_level kashrut_level
    }
  }
`;

export default async function ReligiousStep() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  const data = await hasuraAdmin.request<{
    user_profiles_by_pk: { denomination: string | null; observance_level: string | null; kashrut_level: string | null } | null;
  }>(FETCH, { user_id: session.user.id });
  const p = data.user_profiles_by_pk;

  return (
    <StepShell step="religious" hasMembership={session.hasMembership}>
      <ReligiousForm defaults={{
        denomination: p?.denomination ?? '',
        observance_level: p?.observance_level ?? '',
        kashrut_level: p?.kashrut_level ?? '',
      }} />
    </StepShell>
  );
}
