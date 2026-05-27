import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function MembersLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/');
  const role = session.hasura.default_role;
  if (role !== 'rabbi' && role !== 'admin') redirect('/dashboard');
  return <>{children}</>;
}
