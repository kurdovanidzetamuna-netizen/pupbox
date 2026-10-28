import { Bone, CardBones, Loading, TitleBones } from '@/components/ui/Skeleton';

/** The shop while it loads: title, the filter row, and product cards. */
export default function ShopLoading() {
  return (
    <Loading label="Loading · იტვირთება" className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-14">
      <TitleBones />
      <div className="flex gap-2 mt-6 mb-6 overflow-hidden">{Array.from({ length: 6 }, (_, i) => <Bone key={i} className="h-10 w-24 rounded-full shrink-0" />)}</div>
      <CardBones count={8} />
    </Loading>
  );
}
