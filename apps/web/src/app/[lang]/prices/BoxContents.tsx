'use client';
import { useState } from 'react';
import { pricingPage, type StoredContent } from '@pupbox/content';
import { usePage } from '@/lib/usePage';
import { Heading } from '@/components/ui/Heading';

/** Tabs and items are edited in admin → Page Builder → Pricing Page. */
export default function BoxContents({ content }: { content: StoredContent | null }) {
  const [active, setActive] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const c = usePage(pricingPage, content);
  const box = c.boxContents;
  const tabs: { icon: string; label: string; items: { icon: string; name: string; desc: string }[] }[] = box.tabs;

  function switchTab(i: number) {
    if (i === active) return;
    setActive(i);
    setAnimKey(k => k + 1);
  }

  if (!c.on('boxContents') || !tabs.length) return null;
  const items = tabs[Math.min(active, tabs.length - 1)]?.items ?? [];

  return (
    <section className="py-12 sm:py-14 bg-white">
      <div className="max-w-7xl mx-auto px-6">

        {/* header */}
        <Heading kind="section" align="center" eyebrow={box.badge || undefined} title={box.heading} />

        {/* category tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {tabs.map((cat, i) => (
            <button
              key={i}
              onClick={() => switchTab(i)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 ${
                active === i
                  ? 'bg-teal-600 text-white scale-105'
                  : 'bg-gray-100 text-gray-600 hover:bg-teal-50 hover:text-teal-700'
              }`}
            >
              <span>{cat.icon}</span>
              {cat.label}
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
              key={i}
              className="group flex items-start gap-4 bg-gray-50 hover:bg-teal-50 border border-transparent hover:border-teal-100 rounded-2xl p-5 transition-all duration-200 cursor-default"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform duration-200">
                {item.icon}
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
          {box.note}
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
