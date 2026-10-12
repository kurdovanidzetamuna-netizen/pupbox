import { categoryLook } from '@/lib/shopIcons';
import { Icon } from '@/components/ui/icons';

/**
 * A basket line's small picture: the product's photo, or — like the shop
 * cards — its category's icon on that category's soft colour. A plan or a
 * built box shows a mint box line icon.
 */
export default function ProductThumb({ item, className = 'w-12 h-12 rounded-xl text-xl' }: { item: any; className?: string }) {
  const img = item.product?.images?.[0];
  const look = categoryLook(item.product?.category);
  return (
    <span className={`shrink-0 overflow-hidden flex items-center justify-center ${img ? 'bg-gray-50' : item.product ? `bg-gradient-to-br ${look.tint}` : 'bg-teal-50'} ${className}`}>
      {img ? <img src={img.url} alt="" className="w-full h-full object-cover" />
        : item.product ? <span aria-hidden="true">{look.icon}</span>
        : <Icon name="box" className="w-1/2 h-1/2 text-teal-600" strokeWidth={1.7} />}
    </span>
  );
}
