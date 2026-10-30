'use client';
import { useEffect, useState } from 'react';
import { can } from '@/lib/api';
import { Ext, Field, Found, NAMES, Place, Section, Snippet, Switch, btnSoft, code, found, inp, note } from './shared';

// ── Custom code ─────────────────────────────────────────────────────────────
export const PLACES: { key: Place; label: string; hint: string }[] = [
  { key: 'head', label: 'In <head>', hint: 'Where most services ask for it.' },
  { key: 'body-start', label: 'Start of <body>', hint: 'For “paste right after the opening <body> tag” (the <noscript> parts).' },
  { key: 'body-end', label: 'End of <body>', hint: 'Chat widgets and anything that should load last.' },
];

export type Group = 'chat' | 'analytics' | 'google' | 'meta' | 'ads' | 'seo' | 'other';
export const GROUPS: { key: Group; label: string }[] = [
  { key: 'chat', label: '💬 Live chat & AI assistants' },
  { key: 'analytics', label: '📊 Analytics & heatmaps' },
  { key: 'google', label: '🟢 Other Google products' },
  { key: 'meta', label: '🔵 Meta for Developers' },
  { key: 'ads', label: '🎯 Other ad pixels' },
  { key: 'seo', label: '🔎 SEO tools & site checks' },
  { key: 'other', label: '🧩 Anything else' },
];
/**
 * Tools admin can pick from. Each sets where its code goes and whether it
 * waits for the cookie choice, and says where to copy the code. Ones with
 * `meta` only need a code: the page builds the <meta> tag itself.
 */
export type Tool = { key: string; name: string; group: Group; place: Place; consent: boolean; where: string; link?: string; meta?: { name?: string; property?: string; label: string; placeholder: string } };
export const verify = (key: string, name: string, metaName: string, where: string, link?: string): Tool =>
  ({ key, name, group: 'seo', place: 'head', consent: false, where, link, meta: { name: metaName, label: 'Verification code', placeholder: 'abc123… or the whole <meta …> tag' } });
export const TOOLS: Tool[] = [
  { key: 'tawk', name: 'Tawk.to', group: 'chat', place: 'body-end', consent: false, link: 'https://dashboard.tawk.to', where: 'Administration → Channels → Chat Widget → copy the Widget Code.' },
  { key: 'tidio', name: 'Tidio', group: 'chat', place: 'body-end', consent: false, link: 'https://www.tidio.com/panel', where: 'Settings → Installation → JavaScript → copy the code.' },
  { key: 'crisp', name: 'Crisp', group: 'chat', place: 'body-end', consent: false, link: 'https://app.crisp.chat', where: 'Settings → Workspace settings → Setup & integrations → HTML → copy the code.' },
  { key: 'jivo', name: 'JivoChat', group: 'chat', place: 'body-end', consent: false, link: 'https://app.jivosite.com', where: 'Settings → Channels → Website → Installation → copy the code.' },
  { key: 'livechat', name: 'LiveChat', group: 'chat', place: 'body-end', consent: false, link: 'https://my.livechatinc.com', where: 'Settings → Channels → Website → Install manually → copy the code.' },
  { key: 'intercom', name: 'Intercom', group: 'chat', place: 'body-end', consent: false, link: 'https://app.intercom.com', where: 'Settings → Installation → Web → Install with code snippet → copy the code.' },
  { key: 'ai-chat', name: 'AI chat assistant (Chatbase, Botpress…)', group: 'chat', place: 'body-end', consent: false, where: 'In the tool, open your bot → Embed / Deploy / Connect → Website → copy the script code.' },
  { key: 'clarity', name: 'Microsoft Clarity', group: 'analytics', place: 'head', consent: true, link: 'https://clarity.microsoft.com', where: 'Your project → Settings → Setup → Install manually → copy the tracking code.' },
  { key: 'hotjar', name: 'Hotjar', group: 'analytics', place: 'head', consent: true, link: 'https://insights.hotjar.com', where: 'Settings → Sites & Organizations → Tracking code → copy the code.' },
  { key: 'yandex-metrica', name: 'Yandex Metrica', group: 'analytics', place: 'head', consent: true, link: 'https://metrika.yandex.com', where: 'Your tag → Settings → copy the tag code at the bottom.' },
  { key: 'plausible', name: 'Plausible', group: 'analytics', place: 'head', consent: false, link: 'https://plausible.io/sites', where: 'Site settings → General → Site installation → copy the script. It uses no cookies, so it doesn’t need to wait for consent.' },
  { key: 'matomo', name: 'Matomo', group: 'analytics', place: 'head', consent: true, where: 'Administration → Websites → Tracking code → copy the JavaScript code.' },
  { key: 'google-tag', name: 'Another Google tag (remarketing, Floodlight, a 2nd Analytics…)', group: 'google', place: 'head', consent: true, link: 'https://ads.google.com', where: 'In the Google product: Tag setup → Install manually → copy the code. The main Analytics, Tag Manager and Ads purchase tag go in Ads & analytics.' },
  { key: 'adsense', name: 'Google AdSense', group: 'google', place: 'head', consent: true, link: 'https://adsense.google.com', where: 'Sites → your site → copy the AdSense code.' },
  verify('google-verify', 'Google Search Console / Merchant Center (extra tag)', 'google-site-verification', 'Choose the “HTML tag” way of verifying, then paste the tag or just its code.', 'https://search.google.com/search-console'),
  { key: 'fb-app', name: 'Facebook App ID', group: 'meta', place: 'head', consent: false, link: 'https://developers.facebook.com/apps', where: 'Your app → App settings → Basic → copy the App ID. Links pupbox.ge to your app, for the Sharing Debugger and sharing insights.', meta: { property: 'fb:app_id', label: 'App ID', placeholder: '123456789012345' } },
  { key: 'meta-other', name: 'Other Meta code (2nd pixel, Meta SDK…)', group: 'meta', place: 'head', consent: true, link: 'https://developers.facebook.com', where: 'Paste the code Meta for Developers or Events Manager gives you. Your main pixel goes in Ads & analytics.' },
  { key: 'linkedin', name: 'LinkedIn Insight Tag', group: 'ads', place: 'body-end', consent: true, link: 'https://www.linkedin.com/campaignmanager', where: 'Campaign Manager → Analyze → Insight Tag → Install my tag → I will install the tag myself → copy the code.' },
  { key: 'pinterest', name: 'Pinterest Tag', group: 'ads', place: 'head', consent: true, link: 'https://ads.pinterest.com', where: 'Ads → Conversions → Install the Pinterest tag → Install code manually → copy the base code.' },
  { key: 'x-pixel', name: 'X (Twitter) pixel', group: 'ads', place: 'head', consent: true, link: 'https://ads.x.com', where: 'Tools → Events manager → Add event source → Install with pixel code → copy the base code.' },
  { key: 'snapchat', name: 'Snapchat Pixel', group: 'ads', place: 'head', consent: true, link: 'https://ads.snapchat.com', where: 'Events Manager → your pixel → Setup → Install the code manually → copy the code.' },
  { key: 'microsoft-ads', name: 'Microsoft Ads (Bing) UET tag', group: 'ads', place: 'head', consent: true, link: 'https://ads.microsoft.com', where: 'Tools → UET tag → your tag → View tag → copy the code.' },
  verify('ahrefs', 'Ahrefs Webmaster Tools', 'ahrefs-site-verification', 'Add the site → HTML tag → copy the code.', 'https://app.ahrefs.com'),
  verify('pinterest-verify', 'Pinterest — claim the website', 'p:domain_verify', 'Settings → Claimed accounts → Claim website → Add HTML tag → copy the code.', 'https://www.pinterest.com/settings/claim'),
  verify('baidu', 'Baidu', 'baidu-site-verification', 'Add the site → HTML tag verification → copy the code.', 'https://ziyuan.baidu.com'),
  { key: 'any-verify', name: 'Any other verification tag', group: 'seo', place: 'head', consent: false, where: 'Paste the <meta …> tag the service gives you. It goes into the page itself, where their check looks.' },
  { key: 'other', name: 'Any other tool', group: 'other', place: 'head', consent: true, where: 'Paste the code the tool gives you, then choose where it goes and whether it waits for cookie consent.' },
];
export const toolOf = (key: string) => TOOLS.find((t) => t.key === key);
export const metaTag = (m: NonNullable<Tool['meta']>, v: string) => (v ? `<meta ${m.name ? `name="${m.name}"` : `property="${m.property}"`} content="${v.replace(/"/g, '')}" />` : '');
export const contentOf = (codeText: string) => codeText.match(/content\s*=\s*["']([^"']*)["']/i)?.[1] ?? '';
export const newId = () => `s${Math.random().toString(36).slice(2, 10)}`;

/**
 * Any other service — live chat, AI assistants, heatmaps, other Google and
 * Meta products, other ad pixels, SEO tools' ownership checks — added to
 * every page without touching the site's code.
 */
export function CustomCode({ list, ro, roleNote, onChange, onMove }: { list: Snippet[]; ro: boolean; roleNote: boolean; onChange: (l: Snippet[]) => void; onMove: (id: string, f: Found) => void }) {
  const [picking, setPicking] = useState(false);
  const [q, setQ] = useState('');
  const [fresh, setFresh] = useState<string | null>(null);
  const set = (id: string, patch: Partial<Snippet>) => onChange(list.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const add = (t: Tool) => {
    const id = newId();
    onChange([...list, { id, tool: t.key, name: t.key === 'other' ? '' : t.name, place: t.place, code: '', consent: t.consent, category: t.group === 'analytics' ? 'analytics' : 'ads', on: true }]);
    setPicking(false); setQ(''); setFresh(id);
  };
  useEffect(() => { if (fresh) document.getElementById(`sn-${fresh}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, [fresh]);
  const shown = TOOLS.filter((t) => !q.trim() || `${t.name} ${t.where}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <>
      <Section title="Other tools" hint="Live chat, AI assistants, heatmaps, other Google and Meta products, other ad pixels, SEO tools — pick one, paste its code, Save. It goes on every page by itself; nothing needs adding to the site’s code. Meta, Google Analytics and TikTok go in Ads & analytics, so sales are counted with their amounts.">
        {roleNote && <p role="note" style={{ ...note, margin: '0 0 12px' }}>🔒 Changing these needs “Add custom code to the site” in Roles & Permissions.</p>}
        {list.length === 0 && !picking && <p style={{ ...note, margin: 0 }}>Nothing added yet.</p>}
        <div style={{ display: 'grid', gap: 12 }}>
          {list.map((sn) => {
            const t = toolOf(sn.tool);
            const f = found(sn.code);
            const known = (Object.keys(f) as (keyof Found)[]).filter((k) => k !== 'adsLabel');
            return (
              <div key={sn.id} id={`sn-${sn.id}`} style={{ border: `1px solid ${fresh === sn.id ? 'var(--teal-300, #5eead4)' : 'var(--slate-200b)'}`, borderRadius: 14, padding: 14, display: 'grid', gap: 12, background: sn.on ? 'var(--white)' : 'var(--slate-50)' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input value={sn.name} disabled={ro} placeholder="Name, e.g. Hotjar" maxLength={60} onChange={(e) => set(sn.id, { name: e.target.value })} style={{ ...inp, flex: 1, fontWeight: 700 }} aria-label="Name" />
                  <Switch on={sn.on} disabled={ro} label={sn.on ? 'On — on the site' : 'Off — not on the site'} onChange={(v) => set(sn.id, { on: v })} />
                </div>
                {t && (
                  <div style={{ fontSize: 12.5, color: 'var(--slate-600)', lineHeight: 1.5 }}>
                    <b>Where to find it:</b> {t.where}{t.link && <> <Ext href={t.link}>Open</Ext></>}
                  </div>
                )}
                {t?.meta ? (
                  <Field label={t.meta.label}>
                    <input value={contentOf(sn.code)} disabled={ro} autoFocus={fresh === sn.id} placeholder={t.meta.placeholder} spellCheck={false}
                      onChange={(e) => { const v = e.target.value.includes('<') ? contentOf(e.target.value) : e.target.value.trim(); set(sn.id, { code: metaTag(t.meta!, v) }); }}
                      style={{ ...inp, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13 }} aria-label={`${sn.name} ${t.meta.label}`} />
                  </Field>
                ) : (
                  <textarea value={sn.code} disabled={ro} autoFocus={fresh === sn.id} rows={6} spellCheck={false} onChange={(e) => set(sn.id, { code: e.target.value })} placeholder={'Paste the code here\n<script>…</script>'}
                    style={{ ...inp, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12.5, resize: 'vertical', whiteSpace: 'pre', overflowX: 'auto' }} aria-label={`Code for ${sn.name || 'this tool'}`} />
                )}
                {known.length > 0 && (
                  <div role="note" style={{ ...note, background: 'var(--amber-50)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ flex: '1 1 220px' }}>This looks like the <b>{known.map((k) => NAMES[k]).join(', ')}</b> code. Put it in Ads & analytics instead — then add to cart and purchases are reported too, and it isn’t counted twice.</span>
                    {!ro && <button type="button" onClick={() => onMove(sn.id, f)} style={btnSoft}>Move it there</button>}
                  </div>
                )}
                {!t?.meta && <>
                  <div role="radiogroup" aria-label="Where on the page" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {PLACES.map((p) => (
                      <button key={p.key} type="button" role="radio" aria-checked={sn.place === p.key} disabled={ro} title={p.hint} onClick={() => set(sn.id, { place: p.key })}
                        style={{ padding: '6px 12px', borderRadius: 99, fontSize: 12.5, fontWeight: 700, cursor: ro ? 'default' : 'pointer', border: `1.5px solid ${sn.place === p.key ? 'var(--teal-500)' : 'var(--slate-200)'}`, background: sn.place === p.key ? 'var(--teal-50)' : 'var(--white)', color: sn.place === p.key ? 'var(--teal-800)' : 'var(--slate-600)' }}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: -6 }}>{PLACES.find((p) => p.key === sn.place)!.hint}{sn.place === 'head' && /<meta\b/i.test(sn.code) ? ' Its <meta> tags go into the page itself, so ownership checks find them.' : ''}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-700)', marginBottom: 6 }}>When it loads</div>
                    <div role="radiogroup" aria-label="When it loads" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {([['now', 'Straight away'], ['analytics', 'After a yes to Analytics'], ['ads', 'After a yes to Ads']] as const).map(([k, label]) => {
                        const sel = k === 'now' ? !sn.consent : sn.consent && sn.category === k;
                        return (
                          <button key={k} type="button" role="radio" aria-checked={sel} disabled={ro} onClick={() => set(sn.id, k === 'now' ? { consent: false } : { consent: true, category: k })}
                            style={{ padding: '6px 12px', borderRadius: 99, fontSize: 12.5, fontWeight: 700, cursor: ro ? 'default' : 'pointer', border: `1.5px solid ${sel ? 'var(--teal-500)' : 'var(--slate-200)'}`, background: sel ? 'var(--teal-50)' : 'var(--white)', color: sel ? 'var(--teal-800)' : 'var(--slate-600)' }}>
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 6 }}>{!sn.consent ? 'For every visitor, without asking. Only for code that doesn’t track anyone (a chat widget, say).' : sn.category === 'analytics' ? 'Only for visitors who allow Analytics cookies — heatmaps, visitor statistics.' : 'Only for visitors who allow Ads cookies — ad pixels, remarketing.'}</div>
                  </div>
                </>}
                {!ro && (
                  <div>
                    <button type="button" onClick={() => { if (!sn.code.trim() || confirm(`Remove “${sn.name || 'this'}” from the site?`)) onChange(list.filter((x) => x.id !== sn.id)); }} style={{ ...btnSoft, color: 'var(--red-600)' }}>Remove</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!ro && list.length < 40 && !picking && <button type="button" onClick={() => setPicking(true)} style={{ ...btnSoft, marginTop: 12, borderColor: 'var(--teal-500)', color: 'var(--teal-800)', background: 'var(--teal-50)' }}>+ Add a tool</button>}
        {!ro && picking && (
          <div style={{ marginTop: 12, border: '1.5px solid var(--teal-200)', borderRadius: 14, padding: 14, display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: chat, Hotjar, Pinterest…" style={{ ...inp, flex: 1 }} aria-label="Search tools" />
              <button type="button" onClick={() => { setPicking(false); setQ(''); }} style={btnSoft}>Cancel</button>
            </div>
            {GROUPS.map((g) => {
              const items = shown.filter((t) => t.group === g.key);
              if (!items.length) return null;
              return (
                <div key={g.key}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--slate-600)', marginBottom: 6 }}>{g.label}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 6 }}>
                    {items.map((t) => (
                      <button key={t.key} type="button" onClick={() => add(t)}
                        style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 11, border: '1.5px solid var(--slate-200)', background: 'var(--white)', color: 'var(--slate-800)', fontSize: 13, fontWeight: 700, cursor: 'pointer', minHeight: 44 }}>
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {!shown.length && <p style={{ ...note, margin: 0 }}>Not on the list? Choose <button type="button" onClick={() => add(toolOf('other')!)} style={{ ...btnSoft, padding: '4px 10px' }}>Any other tool</button> and paste its code.</p>}
          </div>
        )}
      </Section>
      <p style={{ ...note, marginTop: 14 }}>⚠️ Code here runs on every page, for every visitor. Paste only code from services you trust, straight from their own site. If the site misbehaves after saving, switch it off and save.</p>
    </>
  );
}
