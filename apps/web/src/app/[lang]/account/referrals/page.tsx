'use client';
import { GlossyGift } from '@/components/Glossy3D';
import PawTrail from '@/components/PawTrail';
import ShareButtons from '@/components/ShareButtons';
import { formatDate } from '@/lib/dates';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import { authFetch, loginUrl, SessionExpiredError } from '@/lib/authFetch';
import { Icon } from '@/components/ui/icons';

// Where a friend is on the way to your reward: link → joined → ordered → reward.
const STAGE: Record<string, number> = { INVITED: 0, REGISTERED: 1, FIRST_ORDER_COMPLETED: 2, REWARD_GRANTED: 3 };
const TINTS = ['bg-teal-100 text-teal-800', 'bg-lilac-100 text-lilac-700', 'bg-sky-100 text-sky-800', 'bg-peach-100 text-peach-700'];

/**
 * Invite friends, mobile first: a bright card that says what you've earned,
 * one big Share button (the phone's own share sheet, or copy on computers)
 * with your code and the app icons under it; three steps for how it works;
 * then every friend as a little journey — joined, ordered, reward — so you
 * can see who is one order away.
 */
export default function ReferralsPage() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<'' | 'code' | 'link'>('');
  const [native, setNative] = useState(false);

  useEffect(() => {
    setNative(typeof navigator.share === 'function');
    authFetch('/referrals/my')
      .then(r => r.json())
      .then(setData)
      .catch(e => { if (e instanceof SessionExpiredError) router.replace(loginUrl('/account/referrals')); })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pupbox.ge';
  const link = data?.referralCode ? `${siteUrl}/register?ref=${data.referralCode}` : '';
  const reward = Number(data?.reward ?? 10);
  const earned = (data?.stats?.rewarded ?? 0) * reward;
  const message = fill(t('ref.shareText'), { n: reward });

  async function copy(what: 'code' | 'link') {
    try { await navigator.clipboard.writeText(what === 'code' ? data.referralCode : link); } catch { return; }
    setCopied(what);
    setTimeout(() => setCopied(''), 1800);
  }
  const share = () => (native ? navigator.share({ title: t('ref.title'), text: message, url: link }).catch(() => {}) : copy('link'));

  if (loading) {
    return <div className="flex justify-center py-24"><span className="text-4xl motion-safe:animate-[bob_1s_ease-in-out_infinite]" aria-hidden="true">🎁</span></div>;
  }
  if (!data?.stats) return null;

  const friends: any[] = data.referrals ?? [];
  const steps = [
    { emoji: '🔗', title: t('ref.how1'), text: t('ref.how1Sub') },
    { emoji: '🐶', title: t('ref.how2'), text: t('ref.how2Sub') },
    { emoji: '🎁', title: fill(t('ref.how3'), { n: reward }), text: t('ref.how3Sub') },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ── The invite ── */}
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-teal-500 via-teal-600 to-teal-700 text-white px-5 pt-6 pb-5 sm:px-8 sm:pt-8 sm:pb-7">
        <PawTrail className="opacity-20" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] font-bold uppercase tracking-wider text-teal-100">{t('ref.title')}</p>
            <h1 className="mt-1.5 text-[24px] sm:text-[30px] font-extrabold leading-[1.15] [text-wrap:balance]">{fill(t('ref.hero'), { n: reward })}</h1>
            <p className="mt-2 text-[13px] sm:text-[14px] text-teal-50/90 leading-relaxed max-w-md">{fill(t('ref.heroSub'), { n: reward })}</p>
          </div>
          <GlossyGift className="w-16 h-16 sm:w-24 sm:h-24 shrink-0 motion-safe:animate-[bob_3s_ease-in-out_infinite]" />
        </div>

        {/* What you've earned so far */}
        <div className="relative mt-5 grid grid-cols-3 gap-2">
          {[
            { v: friends.length, l: t('ref.sFriends') },
            { v: friends.filter(f => (STAGE[f.status] ?? 0) >= 2).length, l: t('ref.sOrdered') },
            { v: `₾${earned}`, l: t('ref.sEarned') },
          ].map((s, i) => (
            <div key={i} className={`rounded-[18px] px-2 py-2.5 text-center ${i === 2 ? 'bg-white text-teal-800' : 'bg-white/15'}`}>
              <p className="text-[20px] sm:text-[24px] font-extrabold leading-none tabular-nums">{s.v}</p>
              <p className={`mt-1 text-[11px] sm:text-[12px] font-semibold leading-tight ${i === 2 ? 'text-teal-700' : 'text-teal-50/90'}`}>{s.l}</p>
            </div>
          ))}
        </div>

        {/* Share: one big button, the code to read out, the apps */}
        <div className="relative mt-5 rounded-[22px] bg-white p-3 sm:p-4 text-gray-900">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => copy('code')} aria-label={`${t('ref.code')}: ${data.referralCode}. ${t('ref.copyCode')}`}
              className="group flex-1 min-w-0 h-12 rounded-[16px] border-2 border-dashed border-teal-200 bg-teal-50/60 px-3 flex items-center justify-between gap-2 hover:border-teal-400 transition-colors">
              <span className="min-w-0 text-left">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-teal-700/70 leading-none">{t('ref.code')}</span>
                <span className="block mt-0.5 font-mono text-[16px] font-extrabold tracking-[0.12em] text-gray-900 truncate">{data.referralCode}</span>
              </span>
              <span className={`shrink-0 text-[11.5px] font-bold inline-flex items-center gap-1 ${copied === 'code' ? 'text-teal-700' : 'text-gray-400 group-hover:text-teal-700'}`}>
                <Icon name={copied === 'code' ? 'check' : 'copy'} className="w-4 h-4" strokeWidth={2.4} />{copied === 'code' ? t('ref.copiedShort') : ''}
              </span>
            </button>
            <button type="button" onClick={() => copy('link')} aria-label={t('ref.copy')} title={t('ref.copy')}
              className={`w-12 h-12 shrink-0 rounded-[16px] flex items-center justify-center transition-colors ${copied === 'link' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-teal-50 hover:text-teal-700'}`}>
              <Icon name={copied === 'link' ? 'check' : 'link'} className="w-5 h-5" strokeWidth={2.2} />
            </button>
          </div>
          <button type="button" onClick={share}
            className="mt-2.5 w-full h-12 rounded-[16px] bg-teal-600 hover:bg-teal-700 text-white text-[14.5px] font-bold inline-flex items-center justify-center gap-2 shadow-[0_10px_24px_-12px_rgba(13,148,136,0.9)] transition-colors active:scale-[0.99]">
            <Icon name={copied === 'link' ? 'check' : 'send'} className="w-[18px] h-[18px]" />
            {copied === 'link' ? t('ref.copied') : native ? t('ref.share') : t('ref.copy')}
          </button>
          <div className="mt-3 flex items-center justify-center gap-1">
            <span className="text-[11.5px] font-semibold text-gray-400 mr-1">{t('ref.orSend')}</span>
            <ShareButtons title={message} url={link} size="w-9 h-9" appsOnly className="!gap-1.5" />
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section aria-labelledby="ref-how">
        <h2 id="ref-how" className="px-1 mb-3 text-[15px] font-extrabold text-gray-900">{t('ref.how')}</h2>
        <ol className="grid sm:grid-cols-3 gap-2.5">
          {steps.map((s, i) => (
            <li key={i} className="relative flex sm:flex-col items-center sm:items-start gap-3 rounded-[22px] bg-white ring-1 ring-gray-100 p-4">
              <span className="relative w-12 h-12 shrink-0 rounded-[16px] bg-teal-50 flex items-center justify-center text-[24px]" aria-hidden="true">
                {s.emoji}
                <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-extrabold flex items-center justify-center ring-2 ring-white">{i + 1}</span>
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-bold text-gray-900 leading-snug">{s.title}</span>
                <span className="block mt-0.5 text-[12.5px] text-gray-500 leading-snug">{s.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Friends ── */}
      <section aria-labelledby="ref-friends">
        <h2 id="ref-friends" className="px-1 mb-3 text-[15px] font-extrabold text-gray-900 flex items-center gap-2">
          {t('ref.friends')}
          {friends.length > 0 && <span className="h-6 min-w-[24px] px-2 rounded-full bg-teal-50 text-teal-700 text-[12px] font-bold inline-flex items-center justify-center">{friends.length}</span>}
        </h2>
        {friends.length === 0 ? (
          <div className="relative overflow-hidden rounded-[24px] bg-lilac-50/70 px-6 py-9 text-center">
            <PawTrail className="opacity-40" />
            <span className="relative inline-block text-5xl motion-safe:animate-[bob_2.2s_ease-in-out_infinite]" aria-hidden="true">🐕</span>
            <p className="relative mt-3 text-[15px] font-extrabold text-gray-900">{t('ref.emptyTitle')}</p>
            <p className="relative mt-1 text-[13px] text-gray-600 max-w-xs mx-auto">{fill(t('ref.emptySub'), { n: reward })}</p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {friends.map((r, i) => {
              const at = STAGE[r.status] ?? 0;
              const off = r.status === 'CANCELLED';
              const name = r.invited ? [r.invited.firstName, r.invited.lastName].filter(Boolean).join(' ') : t('ref.pending');
              const marks = [t('ref.m.joined'), t('ref.m.ordered'), fill(t('ref.m.reward'), { n: reward })];
              return (
                <li key={r.id} className={`rounded-[22px] p-4 ring-1 motion-safe:animate-[fadeUp_0.35s_ease-out_both] ${off ? 'bg-gray-50 ring-gray-100' : at === 3 ? 'bg-teal-50/60 ring-teal-200' : 'bg-white ring-gray-100'}`}
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                  <div className="flex items-center gap-3">
                    <span className={`w-11 h-11 shrink-0 rounded-[14px] flex items-center justify-center text-[16px] font-extrabold ${off ? 'bg-gray-200 text-gray-500' : TINTS[i % TINTS.length]}`}>
                      {(r.invited?.firstName?.[0] || '?').toUpperCase()}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[14px] font-bold text-gray-900 truncate">{name}</span>
                      <span className="block text-[12px] text-gray-500 truncate">
                        {off ? t('ref.status.CANCELLED') : at === 3 ? fill(t('ref.done'), { n: reward }) : at >= 1 ? t('ref.next') : t('ref.status.INVITED')}
                        {r.invited?.createdAt && <> · {formatDate(new Date(r.invited.createdAt), lang)}</>}
                      </span>
                    </span>
                    {at === 3 && !off && <span className="shrink-0 text-[22px] motion-safe:animate-[wiggle_2.4s_ease-in-out_infinite]" aria-hidden="true">🎉</span>}
                  </div>
                  {/* The journey: three marks, filled as the friend gets there */}
                  {!off && (
                    <ol className="mt-3 grid grid-cols-3 gap-1.5" aria-label={t('ref.status')}>
                      {marks.map((m, k) => {
                        const done = at >= k + 1;
                        return (
                          <li key={k} className="min-w-0" aria-current={at === k ? 'step' : undefined}>
                            <span className={`block h-1.5 rounded-full ${done ? 'bg-teal-500' : 'bg-gray-200'}`} />
                            <span className={`mt-1.5 flex items-center gap-1 text-[11px] font-semibold truncate ${done ? 'text-teal-700' : 'text-gray-400'}`}>
                              {done && <Icon name="check" className="w-3 h-3 shrink-0" strokeWidth={3} />}{m}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="px-1 text-[11.5px] text-gray-400 leading-relaxed">{fill(t('ref.fine'), { n: reward })}</p>
    </div>
  );
}
