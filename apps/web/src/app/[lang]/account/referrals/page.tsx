'use client';
import Caps from '@/components/ui/Caps';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { GlossyGift } from '@/components/Glossy3D';
import { formatDate } from '@/lib/dates';
import Link from '@/components/LangLink';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { authFetch, loginUrl, SessionExpiredError } from '@/lib/authFetch';
import { Heading } from '@/components/ui/Heading';

export default function ReferralsPage() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    authFetch('/referrals/my')
      .then(r => r.json())
      .then(setData)
      .catch(e => { if (e instanceof SessionExpiredError) router.replace(loginUrl('/account/referrals')); })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pupbox.ge';
  const referralLink = data?.referralCode ? `${siteUrl}/register?ref=${data.referralCode}` : '';

  async function copy() {
    try { await navigator.clipboard.writeText(referralLink); } catch { return; }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
        <Heading kind="section" as="h1" title={t('ref.title')} subtitle={t('ref.sub')} />

        {loading && (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" /></div>
        )}

        {data?.stats && (
          <>
            {/* The invite: a sunny card with the link and one big copy button */}
            <section className="relative overflow-hidden rounded-[24px] bg-pastel-sun p-5 sm:p-6 mb-4">
              <div className="flex items-start gap-3.5">
                <GlossyGift className="w-14 h-14 shrink-0 -mt-1 animate-[bob_3s_ease-in-out_infinite]" />
                <div className="min-w-0">
                  <h2 className="text-[16px] sm:text-[17px] font-extrabold text-gray-900"><Caps text={t('ref.yourLink')} /></h2>
                  <p className="text-[12.5px] text-gray-700 mt-1 leading-relaxed">{t('ref.reward')}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <input readOnly value={referralLink} aria-label={t('ref.yourLink')} onFocus={e => e.target.select()}
                  className="flex-1 min-w-0 h-11 rounded-[14px] bg-white px-3.5 text-[13px] text-gray-700 outline-none focus:ring-2 focus:ring-teal-300" />
                <Button onClick={copy} icon={copied ? 'check' : 'link'} label={copied ? t('ref.copied') : t('ref.copy')} className="!h-11" />
              </div>
            </section>

            <dl className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
              {[
                { k: 'ref.total', value: data.stats.total, tint: 'bg-pastel-mint' },
                { k: 'ref.registered', value: data.stats.registered, tint: 'bg-pastel-lilac' },
                { k: 'ref.rewards', value: data.stats.rewarded, tint: 'bg-pastel-peach' },
              ].map(s => (
                <div key={s.k} className={`rounded-[18px] ${s.tint} px-2 py-3 sm:p-4 text-center flex flex-col-reverse`}>
                  <dt className="text-[11.5px] sm:text-[12.5px] font-semibold text-gray-700 mt-1 leading-tight [overflow-wrap:anywhere]">{t(s.k)}</dt>
                  <dd className="text-[24px] sm:text-[28px] font-extrabold text-gray-900 leading-none">{s.value}</dd>
                </div>
              ))}
            </dl>

            {data.referrals?.length > 0 ? (
              <section className="bg-white rounded-[24px] ring-1 ring-gray-100 p-2">
                <h2 className="px-3 pt-2 pb-2 text-[14px] font-extrabold text-gray-900"><Caps text={t('ref.history')} /></h2>
                <ul className="divide-y divide-gray-100">
                  {data.referrals.map((r: any) => (
                    <li key={r.id} className="flex items-center gap-3 px-3 py-3">
                      <span className="w-9 h-9 shrink-0 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center text-[13px] font-bold">{(r.invited?.firstName?.[0] || '?').toUpperCase()}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13.5px] font-semibold text-gray-900 truncate">{r.invited ? `${r.invited.firstName} ${r.invited.lastName}` : t('ref.pending')}</span>
                        <span className="block text-[11.5px] text-gray-400">{r.invited?.createdAt ? formatDate(new Date(r.invited.createdAt), lang) : '—'}</span>
                      </span>
                      <span className={`shrink-0 text-[11.5px] font-bold px-2.5 py-1 rounded-full ${r.status === 'REWARD_GRANTED' ? 'bg-teal-50 text-teal-700' : r.status === 'REGISTERED' ? 'bg-lilac-50 text-lilac-600' : 'bg-gray-100 text-gray-600'}`}>
                        {t(`ref.status.${r.status}`, r.status)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <EmptyState compact art="heart" tint="bg-pastel-pink" title={t('ref.history')} text={t('ref.reward')} />
            )}
          </>
        )}
      </div>
  );
}
