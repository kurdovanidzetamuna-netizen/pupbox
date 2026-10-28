import { Bone, Loading, TitleBones } from '@/components/ui/Skeleton';

/** The blog while it loads: title and post cards. */
export default function BlogLoading() {
  return (
    <Loading label="Loading · იტვირთება" className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-16">
      <TitleBones center />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 mt-10">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="rounded-3xl bg-white ring-1 ring-gray-100 overflow-hidden">
            <Bone className="aspect-[16/10] w-full rounded-none" />
            <div className="p-5 space-y-2.5"><Bone className="h-3 w-20" /><Bone className="h-5 w-11/12" /><Bone className="h-4 w-3/4" /></div>
          </div>
        ))}
      </div>
    </Loading>
  );
}
