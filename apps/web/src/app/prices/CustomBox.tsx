'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CATEGORIES = ['All', 'Treats', 'Toys', 'Grooming', 'Accessories'];

const CATALOG: {
  id: string; emoji: string; name: string; category: string;
  price: number; desc: string; popular?: boolean;
}[] = [
  { id: 't1', emoji: '🥩', name: 'Meat Chews',       category: 'Treats',      price: 8,  desc: 'Natural dried meat snacks', popular: true },
  { id: 't2', emoji: '🐟', name: 'Fish Bites',        category: 'Treats',      price: 7,  desc: 'Omega-rich salmon treats' },
  { id: 't3', emoji: '🍗', name: 'Chicken Jerky',     category: 'Treats',      price: 6,  desc: 'Slow-baked chicken strips', popular: true },
  { id: 't4', emoji: '🧀', name: 'Cheese Puffs',      category: 'Treats',      price: 5,  desc: 'Soft mini training bites' },
  { id: 't5', emoji: '🍪', name: 'Baked Biscuits',    category: 'Treats',      price: 5,  desc: 'Artisan grain-free biscuits' },
  { id: 't6', emoji: '🥕', name: 'Veggie Crunchers',  category: 'Treats',      price: 4,  desc: 'Light carrot & sweet potato' },
  { id: 'y1', emoji: '🦆', name: 'Squeaky Duck',      category: 'Toys',        price: 12, desc: 'Non-toxic plush with squeak', popular: true },
  { id: 'y2', emoji: '🪀', name: 'Rope Toy',          category: 'Toys',        price: 9,  desc: 'Durable braided rope' },
  { id: 'y3', emoji: '🏀', name: 'Bounce Ball',       category: 'Toys',        price: 7,  desc: 'High-bounce rubber ball' },
  { id: 'y4', emoji: '🧩', name: 'Puzzle Feeder',     category: 'Toys',        price: 18, desc: 'Mental stimulation slow-feeder' },
  { id: 'y5', emoji: '🐿️', name: 'Crinkle Squirrel', category: 'Toys',        price: 11, desc: 'Crinkly hide-and-seek plush' },
  { id: 'y6', emoji: '🪃', name: 'Fetch Stick',       category: 'Toys',        price: 8,  desc: 'Lightweight fetch toy' },
  { id: 'g1', emoji: '🧴', name: 'Dog Shampoo',       category: 'Grooming',    price: 14, desc: 'Hypoallergenic formula', popular: true },
  { id: 'g2', emoji: '💅', name: 'Paw Balm',          category: 'Grooming',    price: 10, desc: 'Soothing dry paw treatment' },
  { id: 'g3', emoji: '🪥', name: 'Dental Chew',       category: 'Grooming',    price: 8,  desc: 'Enzymatic breath freshener' },
  { id: 'g4', emoji: '💆', name: 'Massage Glove',     category: 'Grooming',    price: 12, desc: 'Rubber shedding glove' },
  { id: 'g5', emoji: '🌿', name: 'Ear Cleanser',      category: 'Grooming',    price: 9,  desc: 'Vet-approved ear solution' },
  { id: 'a1', emoji: '🎀', name: 'Bandana',           category: 'Accessories', price: 7,  desc: 'Seasonal snap-on bandana' },
  { id: 'a2', emoji: '🥣', name: 'Travel Bowl',       category: 'Accessories', price: 13, desc: 'Collapsible silicone bowl', popular: true },
  { id: 'a3', emoji: '🏷️', name: 'ID Tag',            category: 'Accessories', price: 10, desc: 'Laser-engraved steel tag' },
  { id: 'a4', emoji: '🧣', name: 'Fleece Scarf',      category: 'Accessories', price: 9,  desc: 'Cosy winter scarf' },
];

const BASE_CURATION_FEE = 10;
const GIFT_WRAPPING_FEE = 5;
const MIN_ITEMS = 3;

export default function CustomBox() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [isGift, setIsGift] = useState(false);
  const router = useRouter();

  const filtered = activeCategory === 'All' ? CATALOG : CATALOG.filter(i => i.category === activeCategory);

  function add(id: string) { setSelected(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 })); }
  function remove(id: string) {
    setSelected(prev => {
      const next = { ...prev };
      if ((next[id] || 0) <= 1) delete next[id];
      else next[id]--;
      return next;
    });
  }

  const selectedItems = Object.entries(selected).map(([id, qty]) => {
    const item = CATALOG.find(i => i.id === id)!;
    return { ...item, qty };
  });

  const itemsTotal = selectedItems.reduce((s, i) => s + i.price * i.qty, 0);
  const totalCount = selectedItems.reduce((s, i) => s + i.qty, 0);
  const extraFee = BASE_CURATION_FEE + (isGift ? GIFT_WRAPPING_FEE : 0);
  const grandTotal = totalCount > 0 ? itemsTotal + extraFee : 0;
  const canOrder = totalCount >= MIN_ITEMS;

  const accent = isGift ? {
    tab: 'bg-amber-400 text-white shadow-sm',
    badge: 'bg-amber-400',
    itemBorder: 'border-amber-300 shadow-amber-50',
    itemBg: 'bg-amber-50',
    addBtn: 'bg-amber-400 text-white hover:bg-amber-500',
    addBtnIdle: 'bg-amber-50 text-amber-700 hover:bg-amber-400 hover:text-white',
    header: 'from-amber-500 to-amber-400',
    total: 'text-amber-600',
    cta: 'bg-amber-400 hover:bg-amber-500 text-white shadow-amber-100',
    note: 'text-amber-100',
  } : {
    tab: 'bg-teal-600 text-white shadow-sm',
    badge: 'bg-teal-600',
    itemBorder: 'border-teal-400 shadow-teal-50',
    itemBg: 'bg-teal-50',
    addBtn: 'bg-teal-600 text-white hover:bg-teal-700',
    addBtnIdle: 'bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white',
    header: 'from-teal-600 to-teal-500',
    total: 'text-teal-600',
    cta: 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-100',
    note: 'text-teal-100',
  };

  return (
    <section className="py-16 bg-gradient-to-br from-teal-50 via-white to-amber-50">
      <div className="max-w-6xl mx-auto px-6">

        {/* Header */}
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-2 bg-white border border-teal-100 text-teal-700 text-xs font-bold px-4 py-2 rounded-full mb-4 shadow-sm tracking-wide uppercase">
            🛠️ Build your own box
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">
            Customise your perfect box
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Pick at least {MIN_ITEMS} items. We handle curation, packaging & delivery.
          </p>
        </div>

        {/* For me / Gift toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-gray-100 rounded-full p-1 gap-1">
            <button
              onClick={() => setIsGift(false)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-200 ${
                !isGift ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              🐾 For My Dog
            </button>
            <button
              onClick={() => setIsGift(true)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-200 ${
                isGift ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              🎁 Give as a Gift
            </button>
          </div>
        </div>

        {/* Gift info banner */}
        {isGift && (
          <div className="max-w-2xl mx-auto mb-8 bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 flex items-start gap-4">
            <span className="text-2xl shrink-0">🎁</span>
            <div>
              <p className="font-bold text-amber-800 text-sm mb-0.5">You're building a gift box</p>
              <p className="text-amber-700 text-xs leading-relaxed">
                Gift wrapping (+₾{GIFT_WRAPPING_FEE}) and a personalised message card are included. You'll enter the recipient's details at checkout.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ── LEFT: catalog ── */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-2 mb-6">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 ${
                    activeCategory === cat
                      ? accent.tab
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filtered.map(item => {
                const qty = selected[item.id] || 0;
                const inBox = qty > 0;
                return (
                  <div
                    key={item.id}
                    className={`relative bg-white rounded-2xl border-2 p-4 transition-all duration-200 ${
                      inBox ? `${accent.itemBorder} shadow-md` : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
                    }`}
                  >
                    {item.popular && !inBox && (
                      <span className="absolute -top-2 -right-2 bg-amber-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">Popular</span>
                    )}
                    {inBox && (
                      <span className={`absolute -top-2 -right-2 ${accent.badge} text-white text-xs font-bold px-2 py-0.5 rounded-full`}>
                        ×{qty} added
                      </span>
                    )}

                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 transition-colors ${inBox ? accent.itemBg : 'bg-gray-50'}`}>
                        {item.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm leading-tight">{item.name}</p>
                        <p className="text-gray-400 text-xs mt-0.5 leading-snug">{item.desc}</p>
                        <p className={`font-extrabold text-sm mt-1.5 ${accent.total}`}>₾{item.price}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 mt-3">
                      {inBox && (
                        <button
                          onClick={() => remove(item.id)}
                          className="w-7 h-7 rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-500 text-gray-500 font-bold text-base flex items-center justify-center transition-colors"
                        >−</button>
                      )}
                      <button
                        onClick={() => add(item.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 ${
                          inBox ? accent.addBtn : accent.addBtnIdle
                        }`}
                      >+ Add</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── RIGHT: summary panel ── */}
          <div className="lg:w-80 shrink-0 lg:sticky lg:top-24">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-lg overflow-hidden">

              <div className={`bg-gradient-to-r ${accent.header} px-6 py-5`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`${accent.note} text-xs font-semibold uppercase tracking-wide`}>
                      {isGift ? 'Your gift box' : 'Your custom box'}
                    </p>
                    <p className="text-white font-extrabold text-lg mt-0.5">
                      {totalCount === 0 ? 'Empty' : `${totalCount} item${totalCount !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">
                    {isGift ? '🎁' : '📦'}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-xs text-white/70 mb-1.5">
                    <span>{totalCount}/{MIN_ITEMS} minimum</span>
                    {canOrder && <span className="text-white font-bold">✓ Ready!</span>}
                  </div>
                  <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (totalCount / MIN_ITEMS) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-5">
                {selectedItems.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-3xl mb-2">{isGift ? '🎁' : '🐾'}</p>
                    <p className="text-gray-400 text-sm">
                      {isGift ? 'Pick items to build the perfect gift.' : 'Add items from the catalog to start building your box.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 mb-5 max-h-52 overflow-y-auto pr-1">
                    {selectedItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0">{item.emoji}</span>
                          <span className="text-gray-700 font-medium truncate">{item.name}</span>
                          {item.qty > 1 && <span className="text-xs text-gray-400 shrink-0">×{item.qty}</span>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`font-bold ${accent.total}`}>₾{item.price * item.qty}</span>
                          <button onClick={() => remove(item.id)} className="text-gray-300 hover:text-red-400 transition-colors text-xs">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {totalCount > 0 && (
                  <div className="border-t border-gray-100 pt-4 space-y-2 text-sm mb-5">
                    <div className="flex justify-between text-gray-500">
                      <span>Items ({totalCount})</span>
                      <span>₾{itemsTotal}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Curation & packaging</span>
                      <span>₾{BASE_CURATION_FEE}</span>
                    </div>
                    {isGift && (
                      <div className="flex justify-between text-amber-600 font-medium">
                        <span>🎁 Gift wrapping & card</span>
                        <span>₾{GIFT_WRAPPING_FEE}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-extrabold text-gray-900 text-base pt-1 border-t border-gray-100">
                      <span>Total</span>
                      <span className={accent.total}>₾{grandTotal}</span>
                    </div>
                  </div>
                )}

                <button
                  disabled={!canOrder}
                  onClick={() => router.push(isGift ? '/checkout?gift=true&custom=true' : '/checkout?custom=true')}
                  className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 ${
                    canOrder
                      ? `${accent.cta} shadow-md hover:scale-[1.02]`
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {canOrder
                    ? isGift
                      ? `🎁 Gift This Box — ₾${grandTotal} →`
                      : `Order Custom Box — ₾${grandTotal} →`
                    : `Add ${MIN_ITEMS - totalCount} more item${MIN_ITEMS - totalCount !== 1 ? 's' : ''} to continue`}
                </button>

                {canOrder && (
                  <p className="text-center text-xs text-gray-400 mt-3">
                    {isGift ? 'Recipient details entered at checkout' : 'Free delivery included · Cancel anytime'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
