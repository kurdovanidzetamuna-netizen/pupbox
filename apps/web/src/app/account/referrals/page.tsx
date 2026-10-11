'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { authFetch, loginUrl, SessionExpiredError } from '@/lib/authFetch';

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
        <h1 className="text-3xl font-extrabold text-gray-900 mt-2 mb-2">{t('ref.title')}</h1>
        <p className="text-gray-500 mb-8">{t('ref.sub')}</p>

        {loading && (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" /></div>
        )}

        {data?.stats && (
          <>
            <dl className="grid grid-cols-3 gap-4 mb-8">
              {[
                { k: 'ref.total', value: data.stats.total, color: 'text-gray-900' },
                { k: 'ref.registered', value: data.stats.registered, color: 'text-blue-700' },
                { k: 'ref.rewards', value: data.stats.rewarded, color: 'text-teal-700' },
              ].map(s => (
                <div key={s.k} className="bg-white rounded-[28px] ring-1 ring-gray-200/60 p-5 text-center">
                  <dd className={`text-3xl font-bold ${s.color}`}>{s.value}</dd>
                  <dt className="text-sm text-gray-500 mt-1">{t(s.k)}</dt>
                </div>
              ))}
            </dl>

            <section className="bg-white rounded-[28px] ring-1 ring-gray-200/60 p-6 mb-8">
              <h2 className="font-semibold text-gray-800 mb-4">{t('ref.yourLink')}</h2>
              <div className="flex items-center gap-3">
                <input readOnly value={referralLink} aria-label={t('ref.yourLink')}
                  className="flex-1 min-w-0 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-600 bg-gray-50 focus:outline-none" />
                <button onClick={copy} className="bg-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-teal-700 transition shrink-0">
                  {copied ? t('ref.copied') : t('ref.copy')}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-3">{t('ref.reward')}</p>
            </section>

            {data.referrals?.length > 0 && (
              <section className="bg-white rounded-[28px] ring-1 ring-gray-200/60 overflow-hidden">
                <h2 className="px-6 py-4 border-b border-gray-50 font-semibold text-gray-800">{t('ref.history')}</h2>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{t('ref.friend')}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{t('ref.joined')}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{t('ref.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.referrals.map((r: any) => (
                      <tr key={r.id} className="border-t border-gray-50">
                        <td className="px-4 py-3 text-gray-700">{r.invited ? `${r.invited.firstName} ${r.invited.lastName}` : t('ref.pending')}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{r.invited?.createdAt ? new Date(r.invited.createdAt).toLocaleDateString(lang === 'ka' ? 'ka-GE' : 'en-GB') : '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${r.status === 'REWARD_GRANTED' ? 'bg-teal-100 text-teal-800' : r.status === 'REGISTERED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                            {t(`ref.status.${r.status}`, r.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </>
        )}
      </div>
  );
}
