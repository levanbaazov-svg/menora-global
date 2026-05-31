'use client';

// Host action bar — informational. (Cancel/edit flows live in the events list
// host tools for now; a dedicated edit route is a future stage.)

export function HostBar({ eventId: _eventId }: { eventId: string }) {
  return (
    <div className="rounded-2xl bg-primary/10 text-primary px-4 py-3.5 text-sm font-medium text-center shadow-[0_6px_20px_-6px_rgba(20,24,31,0.12)]">
      Вы — хост этого события
    </div>
  );
}
