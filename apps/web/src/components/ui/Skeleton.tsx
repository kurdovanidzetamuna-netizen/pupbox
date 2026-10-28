/**
 * Grey shapes where content is about to appear, so a page never jumps or
 * sits blank while it loads. A soft shimmer runs across them (still for
 * people who ask for less motion). Screen readers hear one "loading" note,
 * not the shapes.
 */
export function Bone({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`skel block rounded-xl ${className}`} />;
}

/** Wraps a skeleton: one polite "loading" for assistive tech. */
export function Loading({ label = 'Loading', children, className = '' }: { label?: string; children: React.ReactNode; className?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** A page title with its line underneath. */
export function TitleBones({ center = false }: { center?: boolean }) {
  return (
    <div className={`flex flex-col gap-3 ${center ? 'items-center' : ''}`}>
      <Bone className="h-8 sm:h-10 w-3/4 sm:w-1/2 rounded-2xl" />
      <Bone className="h-4 w-2/3 sm:w-1/3" />
    </div>
  );
}

/** Product-style cards: a square picture, a name and a price. */
export function CardBones({ count = 8, className = 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' }: { count?: number; className?: string }) {
  return (
    <div className={`grid gap-3 sm:gap-4 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-3xl bg-white ring-1 ring-gray-100 p-2 sm:p-2.5">
          <Bone className="aspect-square w-full rounded-[20px]" />
          <div className="px-1.5 pt-3 pb-2 space-y-2">
            <Bone className="h-3.5 w-4/5" />
            <Bone className="h-3.5 w-2/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Rows with a round picture and two lines: orders, notifications, friends. */
export function RowBones({ count = 4 }: { count?: number }) {
  return (
    <div className="rounded-3xl bg-white ring-1 ring-gray-100 divide-y divide-gray-100">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3 p-4">
          <Bone className="w-11 h-11 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Bone className="h-3.5 w-1/2" />
            <Bone className="h-3 w-4/5" />
          </div>
          <Bone className="h-8 w-16 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** White panels with a heading and a few lines: account sections. */
export function PanelBones({ count = 2, className = 'grid gap-4 md:grid-cols-2' }: { count?: number; className?: string }) {
  return (
    <div className={className}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-3xl bg-white ring-1 ring-gray-100 p-5 space-y-3">
          <Bone className="h-5 w-2/5" />
          <Bone className="h-12 w-full rounded-2xl" />
          <Bone className="h-12 w-full rounded-2xl" />
        </div>
      ))}
    </div>
  );
}
