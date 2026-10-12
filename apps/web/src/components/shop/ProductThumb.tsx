import { categoryLook } from '@/lib/shopIcons';

/**
 * A basket line's small picture: the product's photo, or — like the shop
 * cards — its category's icon on that category's soft colour. A plan shows 📦.
 */
export default function ProductThumb({ item, className = 'w-12 h-12 rounded-xl text-xl' }: { item: any; className?: string }) {
  const img = item.product?.images?.[0];
  const look = categoryLook(item.product?.category);
  return (
    <span className={`shrink-0 overflow-hidden flex items-center justify-center ${img ? 'bg-gray-50' : item.product ? `bg-gradient-to-br ${look.tint}` : 'bg-teal-50'} ${className}`}>
      {img ? <img src={img.url} alt="" className="w-full h-full object-cover" />
        : <span aria-hidden="true">{item.product ? look.icon : '📦'}</span>}
    </span>
  );
}
