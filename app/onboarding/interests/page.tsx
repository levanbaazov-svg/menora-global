import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import { StepShell } from '../_StepShell';
import { InterestsForm } from './InterestsForm';

const FETCH = /* GraphQL */ `
  query FetchInterests($user_id: uuid!) {
    user_profiles_by_pk(user_id: $user_id) { interests languages bio }
  }
`;

export default async function InterestsStep() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  const data = await hasuraAdmin.request<{
    user_profiles_by_pk: { interests: string[] | null; languages: string[] | null; bio: string | null } | null;
  }>(FETCH, { user_id: session.user.id });
  const p = data.user_profiles_by_pk;

  return (
    <StepShell step="interests" hasMembership={session.hasMembership}>
      <InterestsForm defaults={{
        interests: p?.interests ?? [],
        languages: p?.languages ?? ['en'],
        bio: p?.bio ?? '',
      }} />
    </StepShell>
  );
}
