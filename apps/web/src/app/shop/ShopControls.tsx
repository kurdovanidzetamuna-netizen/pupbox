'use client';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

export default function ShopControls({ brands }: { brands: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { t } = useLanguage();

  function update(key: string, value: string) {
    const p = new URLSearchParams(params.toString());
    if (value) p.set(key, value); else p.delete(key);
    p.delete('page');
    router.push(`${pathname}?${p.toString()}`);
  }

  const inputClass = "h-10 border border-gray-200 rounded-xl px-3 text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-white transition";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Search */}
      <form method="GET" action="/shop">
        {params.get('category') && <input type="hidden" name="category" value={params.get('category')!} />}
        {params.get('brand') && <input type="hidden" name="brand" value={params.get('brand')!} />}
        {params.get('sort') && <input type="hidden" name="sort" value={params.get('sort')!} />}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input type="text" name="search" defaultValue={params.get('search') || ''} placeholder={t('shop.search')} aria-label={t('shop.search')} className={`${inputClass} pl-9 w-44`} />
        </div>
      </form>

      {/* Sort — icon button + select */}
      <div className="relative flex items-center">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="6" y1="12" x2="18" y2="12" />
            <line x1="9" y1="18" x2="15" y2="18" />
          </svg>
        </span>
        <select
          value={params.get('sort') || ''}
          onChange={e => update('sort', e.target.value)}
          className={`${inputClass} pl-9 pr-8 cursor-pointer appearance-none`}
        >
          {/* The default is the catalogue's own order — it was mislabelled
              "Price: Low → High", the same as the real price sort below. */}
          <option value="">{t('shop.sort.default')}</option>
          <option value="price_asc">{t('shop.sort.priceAsc')}</option>
          <option value="price_desc">{t('shop.sort.priceDesc')}</option>
          <option value="name_asc">{t('shop.sort.nameAsc')}</option>
          <option value="name_desc">{t('shop.sort.nameDesc')}</option>
        </select>
      </div>

      {/* Clear */}
      {(params.get('brand') || params.get('sort') || params.get('search')) && (
        <button
          onClick={() => {
            const p = new URLSearchParams(params.toString());
            ['brand', 'sort', 'search', 'page'].forEach(k => p.delete(k));
            router.push(`${pathname}?${p.toString()}`);
          }}
          className="h-10 px-3 text-sm text-gray-400 hover:text-red-500 border border-gray-200 rounded-xl transition font-medium"
        >
          {t('shop.clear')}
        </button>
      )}
    </div>
  );
}
