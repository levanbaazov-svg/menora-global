// Instant skeleton shown the moment a dashboard tab/link is tapped, while the
// server renders the real page. Without this, the App Router holds the previous
// screen until the RSC payload arrives — which feels like a frozen 2-3s tap.
// It also lets Next prefetch the route boundary so navigation starts instantly.

function Block({ className = '' }: { className?: string }) {
  return <div className={`rounded-2xl bg-foreground/[0.06] animate-pulse ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="container mx-auto max-w-xl w-full px-4 md:px-6 pt-3 pb-3 space-y-3">
      <Block className="h-8 w-1/2" />
      <Block className="h-4 w-2/3 !rounded-lg" />
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <Block className="h-[84px]" />
        <Block className="h-[84px]" />
        <Block className="h-[84px]" />
        <Block className="h-[84px]" />
      </div>
      <Block className="h-20 mt-2" />
      <Block className="h-24" />
    </div>
  );
}
