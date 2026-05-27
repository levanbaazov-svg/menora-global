import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import { StepShell } from '../_StepShell';
import { CommunityChoiceForm } from './CommunityChoiceForm';

const FETCH = /* GraphQL */ `
  query Communities {
    communities(order_by: { name: asc }) {
      id slug name city country_code
    }
  }
`;

export default async function CommunityChoiceStep() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  if (session.hasMembership) redirect('/onboarding/privacy');

  const data = await hasuraAdmin.request<{
    communities: Array<{ id: string; slug: string; name: string; city: string | null; country_code: string | null }>;
  }>(FETCH);

  return (
    <StepShell step="community_choice" hasMembership={false}>
      <CommunityChoiceForm communities={data.communities} />
    </StepShell>
  );
}
