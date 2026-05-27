import Link from 'next/link';
import { NewRequestForm } from './NewRequestForm';

export default function NewRequestPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <Link href="/dashboard/requests" className="text-sm text-(--color-muted) hover:text-(--color-deep) mb-4 inline-block">
        ← К доске просьб
      </Link>
      <h1 className="font-serif text-3xl font-semibold mb-2">Новая просьба</h1>
      <p className="text-sm text-(--color-muted) mb-8">
        Опиши что нужно. Члены общины увидят и смогут предложить помощь.
      </p>
      <NewRequestForm />
    </div>
  );
}
