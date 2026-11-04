'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import { ActionButton } from '@/components/Toolbar';
import { FacebookMark, GoogleMark } from '@/components/SignInBadges';
import { api, API as API_URL } from '@/lib/api';

interface Social {
  google: { enabled: boolean; clientId: string; ready: boolean };
  facebook: { enabled: boolean; appId: string; appSecret: string; ready: boolean };
}

const card: CSSProperties = { background: 'var(--white)', border: '1px solid var(--slate-200b)', borderRadius: 14, padding: 22, marginBottom: 16 };
const input: CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1px solid var(--slate-200)', borderRadius: 10, padding: '9px 12px', fontSize: 13.5, background: 'var(--white)', color: 'var(--slate-900)', fontFamily: 'inherit' };
const label: CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--slate-600)', margin: '12px 0 5px' };
const steps: CSSProperties = { fontSize: 12.5, color: 'var(--slate-600)', lineHeight: 1.6, margin: '8px 0 0', paddingLeft: 18 };

/**
 * Settings → Sign in with Google & Facebook: the keys from each provider's
 * developer site, and a switch for each button. Saved on their own (the app
 * secret is private: it comes back masked, and only a new value replaces it).
 */
export default function SocialSignInCard() {
  const [s, setS] = useState<Social | null>(null);
  const [start, setStart] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => { api<Social>('/admin/social-login').then((x) => { setS(x); setStart(JSON.stringify(x)); }).catch(() => setMsg({ ok: false, text: 'Couldn’t load the sign-in settings.' })); }, []);
  if (!s) return msg ? <div style={card}><p style={{ margin: 0, color: 'var(--red-600)', fontSize: 13 }}>{msg.text}</p></div> : null;

  const set = (fn: (x: Social) => Social) => { setS((x) => (x ? fn(x) : x)); setMsg(null); };
  const dirty = JSON.stringify(s) !== start;

  async function save() {
    setSaving(true); setMsg(null);
    try {
      const saved = await api<Social>('/admin/social-login', { method: 'PUT', body: s });
      setS(saved); setStart(JSON.stringify(saved));
      setMsg({ ok: true, text: 'Saved. The buttons on the site follow straight away.' });
    } catch (e: any) { setMsg({ ok: false, text: e.message || 'Not saved.' }); } finally { setSaving(false); }
  }

  const status = (on: boolean, ready: boolean) => (
    <span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 9px', borderRadius: 99, whiteSpace: 'nowrap',
      background: on && ready ? 'var(--green-50)' : 'var(--slate-100)', color: on && ready ? 'var(--green-800)' : 'var(--slate-500)' }}>
      {!ready ? 'Not set up' : on ? 'On the site' : 'Switched off'}
    </span>
  );
  const toggle = (on: boolean, flip: () => void, name: string) => (
    <button type="button" role="switch" aria-checked={on} aria-label={`Show Continue with ${name}`} onClick={flip}
      style={{ width: 44, height: 26, borderRadius: 99, border: 'none', padding: 3, cursor: 'pointer', background: on ? 'var(--teal-600)' : 'var(--slate-300)', display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start', flexShrink: 0 }}>
      <span style={{ width: 20, height: 20, borderRadius: 99, background: '#fff' }} />
    </button>
  );
  const site = typeof window !== 'undefined' && window.location.hostname.endsWith('pupbox.ge') ? 'https://pupbox.ge' : 'http://localhost:3000';

  return (
    <div style={card}>
      <p style={{ fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 4px', fontSize: 15 }}>Sign in with Google & Facebook</p>
      <p style={{ fontSize: 13, color: 'var(--slate-500)', margin: '0 0 6px', lineHeight: 1.55 }}>
        “Continue with Google / Facebook” on sign-in, sign-up and checkout. A new customer gets an account with their confirmed email, then confirms their phone by SMS like everyone else. Someone who already has an account with the same email is signed into it.
      </p>

      {/* Google */}
      <div style={{ borderTop: '1px solid var(--slate-100)', marginTop: 14, paddingTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <GoogleMark size={20} />
          <strong style={{ flex: 1, fontSize: 14, color: 'var(--slate-900)' }}>Google</strong>
          {status(s.google.enabled, s.google.ready)}
          {toggle(s.google.enabled, () => set((x) => ({ ...x, google: { ...x.google, enabled: !x.google.enabled } })), 'Google')}
        </div>
        <label style={label} htmlFor="g-client">Client ID</label>
        <input id="g-client" value={s.google.clientId} onChange={(e) => set((x) => ({ ...x, google: { ...x.google, clientId: e.target.value.trim() } }))} placeholder="1234567890-abc….apps.googleusercontent.com" style={input} autoComplete="off" spellCheck={false} />
        <details style={{ marginTop: 8 }}>
          <summary style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--teal-700)', cursor: 'pointer' }}>Where do I get this?</summary>
          <ol style={steps}>
            <li>Open <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">Google Cloud → Credentials</a> and sign in.</li>
            <li>Set up the “OAuth consent screen” once: app name PupBox, your support email, and pupbox.ge as the domain.</li>
            <li>Create credentials → OAuth client ID → type “Web application”.</li>
            <li>Under “Authorised JavaScript origins” add <code>{site}</code> (and <code>https://www.pupbox.ge</code>).</li>
            <li>Copy the Client ID here and save. No secret is needed for Google.</li>
          </ol>
        </details>
      </div>

      {/* Facebook */}
      <div style={{ borderTop: '1px solid var(--slate-100)', marginTop: 14, paddingTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FacebookMark size={20} />
          <strong style={{ flex: 1, fontSize: 14, color: 'var(--slate-900)' }}>Facebook</strong>
          {status(s.facebook.enabled, s.facebook.ready)}
          {toggle(s.facebook.enabled, () => set((x) => ({ ...x, facebook: { ...x.facebook, enabled: !x.facebook.enabled } })), 'Facebook')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 12px' }}>
          <div>
            <label style={label} htmlFor="f-app">App ID</label>
            <input id="f-app" value={s.facebook.appId} onChange={(e) => set((x) => ({ ...x, facebook: { ...x.facebook, appId: e.target.value.trim() } }))} placeholder="1234567890123456" inputMode="numeric" style={input} autoComplete="off" />
          </div>
          <div>
            <label style={label} htmlFor="f-secret">App secret</label>
            <input id="f-secret" value={s.facebook.appSecret} onChange={(e) => set((x) => ({ ...x, facebook: { ...x.facebook, appSecret: e.target.value.trim() } }))} placeholder="Paste the app secret" style={input} autoComplete="off" spellCheck={false} />
          </div>
        </div>
        <details style={{ marginTop: 8 }}>
          <summary style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--teal-700)', cursor: 'pointer' }}>Where do I get these?</summary>
          <ol style={steps}>
            <li>Open <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer">Meta for Developers → My Apps</a> → Create app → “Authenticate and request data from users with Facebook Login”.</li>
            <li>In Facebook Login → Settings, add <code>{site}</code> to “Allowed domains for the JavaScript SDK”, and switch on “Login with the JavaScript SDK”.</li>
            <li>In App settings → Basic: add pupbox.ge under App domains, your privacy policy link (<code>https://pupbox.ge/pages/privacy</code>), then copy the App ID and App secret here.</li>
            <li>In App settings → Basic → “User data deletion”, choose “Data deletion callback URL” and paste <code>{API_URL}/auth/facebook/data-deletion</code>. When someone removes PupBox from their Facebook, we forget what Facebook shared (their Facebook link and email); their PupBox orders stay.</li>
            <li>Switch the app to “Live” so every customer can use it (in development only you and testers can).</li>
          </ol>
        </details>
      </div>

      {msg && <p role="status" style={{ fontSize: 13, margin: '14px 0 0', color: msg.ok ? 'var(--teal-700)' : 'var(--red-600)' }}>{msg.text}</p>}
      <div style={{ marginTop: 14 }}>
        <ActionButton onClick={save} disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save sign-in settings'}</ActionButton>
      </div>
    </div>
  );
}
