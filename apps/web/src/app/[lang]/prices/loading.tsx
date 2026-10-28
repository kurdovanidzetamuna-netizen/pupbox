import { Bone, Loading, TitleBones } from '@/components/ui/Skeleton';

/** Pricing while it loads: title, the length switch, three box cards and the button. */
export default function PricesLoading() {
  return (
    <Loading label="Loading · იტვირთება" className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-16">
      <TitleBones center />
      <Bone className="h-12 w-full max-w-sm mx-auto rounded-full mt-8 mb-5" />
      <div className="grid md:grid-cols-3 gap-3.5 md:gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex md:flex-col items-center md:items-stretch gap-3 rounded-[22px] bg-white ring-1 ring-gray-100 p-3.5 md:p-5">
            <Bone className="w-11 h-11 md:w-12 md:h-12 rounded-[14px] shrink-0" />
            <div className="flex-1 space-y-2"><Bone className="h-4 w-2/3" /><Bone className="h-3 w-1/2" /></div>
            <Bone className="h-7 w-20 md:w-28" />
          </div>
        ))}
      </div>
      <Bone className="h-14 w-full max-w-md mx-auto rounded-full mt-5" />
    </Loading>
  );
}
