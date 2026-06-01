import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { NewInvitationForm } from './NewInvitationForm';

export default async function NewInvitationPage() {
  const t = await getTranslations('directory');
  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <Link href="/dashboard/invitations" className="text-sm text-(--color-fg-muted) hover:text-(--color-deep) mb-4 inline-block">
        {t('invitations.new.back')}
      </Link>
      <h1 className="font-serif text-3xl font-semibold mb-2">{t('invitations.new.title')}</h1>
      <p className="text-sm text-(--color-fg-muted) mb-8">
        {t('invitations.new.subtitle')}
      </p>
      <NewInvitationForm />
    </div>
  );
}
