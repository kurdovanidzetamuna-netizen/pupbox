import { Bone, CardBones, Loading, TitleBones } from '@/components/ui/Skeleton';

/** Any page while it loads: its title and a few cards, in the page's own frame. */
export default function PageLoading() {
  return (
    <Loading label="Loading · იტვირთება" className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-16">
      <TitleBones center />
      <div className="flex justify-center gap-3 mt-6 mb-10"><Bone className="h-11 w-36 rounded-full" /><Bone className="h-11 w-28 rounded-full" /></div>
      <CardBones count={6} className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" />
    </Loading>
  );
}
