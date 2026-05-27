import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import { StepShell } from '../_StepShell';
import { FamilyForm } from './FamilyForm';

const FETCH = /* GraphQL */ `
  query FetchFamily($user_id: uuid!) {
    user_profiles_by_pk(user_id: $user_id) {
      marital_status has_children children_ages spouse_hebrew_name
    }
  }
`;

export default async function FamilyStep() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const data = await hasuraAdmin.request<{
    user_profiles_by_pk: {
      marital_status: string | null; has_children: boolean | null;
      children_ages: number[] | null; spouse_hebrew_name: string | null;
    } | null;
  }>(FETCH, { user_id: session.user.id });
  const p = data.user_profiles_by_pk;

  return (
    <StepShell step="family" hasMembership={session.hasMembership}>
      <FamilyForm defaults={{
        marital_status: p?.marital_status ?? '',
        has_children: p?.has_children ?? false,
        children_ages: p?.children_ages?.join(', ') ?? '',
        spouse_hebrew_name: p?.spouse_hebrew_name ?? '',
      }} />
    </StepShell>
  );
}
