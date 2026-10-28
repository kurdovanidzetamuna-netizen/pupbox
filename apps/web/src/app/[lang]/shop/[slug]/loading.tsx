import { Bone, Loading } from '@/components/ui/Skeleton';

/** A product while it loads: the picture beside its name, price and button. */
export default function ProductLoading() {
  return (
    <Loading label="Loading · იტვირთება" className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-16">
      <Bone className="h-4 w-40 mb-6" />
      <div className="grid gap-6 md:gap-10 md:grid-cols-2">
        <Bone className="aspect-square w-full rounded-[28px]" />
        <div className="space-y-4 md:pt-4">
          <Bone className="h-9 w-4/5 rounded-2xl" />
          <Bone className="h-7 w-28" />
          <div className="space-y-2 pt-2"><Bone className="h-4 w-full" /><Bone className="h-4 w-11/12" /><Bone className="h-4 w-3/5" /></div>
          <Bone className="h-14 w-full rounded-full mt-6" />
        </div>
      </div>
    </Loading>
  );
}
