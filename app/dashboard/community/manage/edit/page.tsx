// Edit community profile — rabbi/admin only.

import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { CommunityEditForm } from './CommunityEditForm';

const FETCH = /* GraphQL */ `
  query CommunityForEdit($id: uuid!) {
    communities_by_pk(id: $id) {
      id name description denomination founded_year address hero_image_url
      contact_phone contact_email website_url whatsapp_url instagram_url
    }
  }
`;

export default async function EditCommunityPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  const role = session.hasura.default_role;
  if (role !== 'rabbi' && role !== 'admin') redirect('/dashboard/community');

  const data = await hasuraAdmin.request<{
    communities_by_pk: {
      id: string; name: string; description: string | null; denomination: string | null;
      founded_year: number | null; address: string | null; hero_image_url: string | null;
      contact_phone: string | null; contact_email: string | null; website_url: string | null;
      whatsapp_url: string | null; instagram_url: string | null;
    } | null;
  }>(FETCH, { id: session.hasura.community_id });

  const c = data.communities_by_pk;
  if (!c) redirect('/dashboard/community');

  return (
    <div className="container mx-auto max-w-xl px-4 md:px-6 pt-3 pb-8">
      <Link
        href="/dashboard/community/manage"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
      >
        <ChevronLeft size={14} /> Управление
      </Link>
      <h1 className="font-serif text-2xl md:text-3xl font-semibold leading-tight tracking-tight mb-5">
        Профиль общины
      </h1>
      <CommunityEditForm
        defaults={{
          name: c.name,
          description: c.description ?? '',
          denomination: c.denomination ?? '',
          founded_year: c.founded_year != null ? String(c.founded_year) : '',
          address: c.address ?? '',
          hero_image_url: c.hero_image_url ?? '',
          contact_phone: c.contact_phone ?? '',
          contact_email: c.contact_email ?? '',
          website_url: c.website_url ?? '',
          whatsapp_url: c.whatsapp_url ?? '',
          instagram_url: c.instagram_url ?? '',
        }}
      />
    </div>
  );
}
