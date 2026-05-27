import Link from 'next/link';
import { NewRoutineForm } from './NewRoutineForm';

export default function NewRoutinePage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <Link href="/dashboard/routines" className="text-sm text-(--color-muted) hover:text-(--color-deep) mb-4 inline-block">
        ← К моим рутинам
      </Link>
      <h1 className="font-serif text-3xl font-semibold mb-2">Новая рутина</h1>
      <p className="text-sm text-(--color-muted) mb-8">
        Выбери что-то из обычного списка или создай свою. Стрики начнутся с первого чекина.
      </p>
      <NewRoutineForm />
    </div>
  );
}
