'use client';
import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';

const ITEMS: Record<string, { emoji: string; name: string; desc: string }[]> = {
  treats: [
    { emoji: '🥩', name: 'Meat Chews',        desc: 'Natural dried meat snacks, perfect for medium & large breeds.' },
    { emoji: '🐟', name: 'Fish Bites',         desc: 'Omega-rich salmon treats — great for coat health.' },
    { emoji: '🥕', name: 'Veggie Crunchers',   desc: 'Light, low-calorie carrot & sweet potato bites.' },
    { emoji: '🍗', name: 'Chicken Jerky',      desc: 'Slow-baked chicken strips — a crowd favourite.' },
    { emoji: '🧀', name: 'Cheese Puffs',       desc: 'Soft mini bites, ideal for training rewards.' },
    { emoji: '🍪', name: 'Baked Biscuits',     desc: 'Artisan baked biscuits, grain-free options available.' },
  ],
  toys: [
    { emoji: '🪀', name: 'Rope Toy',           desc: 'Durable braided rope — great for tug-of-war.' },
    { emoji: '🦆', name: 'Squeaky Duck',       desc: 'Non-toxic plush toy with satisfying squeak.' },
    { emoji: '🏀', name: 'Bounce Ball',        desc: 'High-bounce rubber ball, safe for all breeds.' },
    { emoji: '🧩', name: 'Puzzle Feeder',      desc: 'Slow-feed puzzle that keeps your pup mentally sharp.' },
    { emoji: '🪃', name: 'Fetch Stick',        desc: 'Lightweight fetch toy, floats on water.' },
    { emoji: '🐿️', name: 'Crinkle Squirrel',  desc: 'Crinkly hide-and-seek plush, multiple pieces.' },
  ],
  grooming: [
    { emoji: '🧴', name: 'Dog Shampoo',        desc: 'Hypoallergenic formula, gentle on sensitive skin.' },
    { emoji: '💆', name: 'Massage Glove',      desc: 'Rubber grooming glove for bonding & shedding control.' },
    { emoji: '🪥', name: 'Dental Chew',        desc: 'Enzymatic dental sticks — fresher breath daily.' },
    { emoji: '💅', name: 'Paw Balm',           desc: 'Soothing balm for dry, cracked paw pads.' },
    { emoji: '🌿', name: 'Ear Cleanser',       desc: 'Gentle, vet-approved ear cleaning solution.' },
    { emoji: '🪮', name: 'Dematting Comb',     desc: 'Ergonomic comb for tangle-free coats.' },
  ],
  accessories: [
    { emoji: '🎀', name: 'Bandana',            desc: 'Seasonal printed cotton bandana — snap-on style.' },
    { emoji: '🏷️', name: 'ID Tag',             desc: 'Laser-engraved stainless steel ID tag.' },
    { emoji: '🦺', name: 'Mini Harness',       desc: 'Lightweight mesh harness included in select plans.' },
    { emoji: '🥣', name: 'Travel Bowl',        desc: 'Collapsible silicone bowl, fits in any bag.' },
    { emoji: '🧣', name: 'Fleece Scarf',       desc: 'Cosy winter scarf, one size fits most breeds.' },
    { emoji: '🪪', name: 'Membership Card',    desc: 'Personalised Pupbox member card for your pup.' },
  ],
  surprise: [
    { emoji: '🎉', name: 'Mystery Item',       desc: 'A handpicked bonus product — different every month.' },
    { emoji: '🏆', name: 'Premium Upgrade',    desc: 'Best Value & Annual plans get an exclusive premium item.' },
    { emoji: '💌', name: 'Pup Letter',         desc: 'A personal note from the Pupbox team with tips & stories.' },
    { emoji: '🌟', name: 'Seasonal Special',   desc: 'Holiday & seasonal editions with themed items.' },
    { emoji: '🎟️', name: 'Referral Voucher',  desc: 'Share with a friend — they get ₾10 off their first box.' },
    { emoji: '📸', name: 'Photo Frame',        desc: "Mini frame for your pup's unboxing moment." },
  ],
};

export default function BoxContents() {
  const [active, setActive] = useState('treats');
  const [animKey, setAnimKey] = useState(0);
  const { t } = useLanguage();

  const CATEGORIES = [
    { key: 'treats',      labelKey: 'boxContents.tab.treats',      icon: '🦴' },
    { key: 'toys',        labelKey: 'boxContents.tab.toys',         icon: '🧸' },
    { key: 'grooming',    labelKey: 'boxContents.tab.grooming',     icon: '✨' },
    { key: 'accessories', labelKey: 'boxContents.tab.accessories',  icon: '🎀' },
    { key: 'surprise',    labelKey: 'boxContents.tab.surprise',     icon: '🎁' },
  ];

  function switchTab(key: string) {
    if (key === active) return;
    setActive(key);
    setAnimKey(k => k + 1);
  }

  const items = ITEMS[active] || [];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-6xl mx-auto px-6">

        {/* header */}
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 text-xs font-bold px-4 py-2 rounded-full mb-4 tracking-wide uppercase">
            {t('boxContents.heading')}
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">
            {t('boxContents.sub')}
          </h2>
        </div>

        {/* category tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => switchTab(cat.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 ${
                active === cat.key
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-100 scale-105'
                  : 'bg-gray-100 text-gray-600 hover:bg-teal-50 hover:text-teal-700'
              }`}
            >
              <span>{cat.icon}</span>
              {t(cat.labelKey)}
            </button>
          ))}
        </div>

        {/* items grid */}
        <div
          key={animKey}
          className="grid sm:grid-cols-2 md:grid-cols-3 gap-4"
          style={{ animation: 'fadeSlideIn 0.35s ease both' }}
        >
          {items.map((item, i) => (
            <div
              key={item.name}
              className="group flex items-start gap-4 bg-gray-50 hover:bg-teal-50 border border-transparent hover:border-teal-100 rounded-2xl p-5 transition-all duration-200 cursor-default"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform duration-200">
                {item.emoji}
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm mb-0.5">{item.name}</p>
                <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* bottom note */}
        <p className="text-center text-xs text-gray-400 mt-8">
          {t('boxContents.note')}
        </p>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
