/** How a customer signs in, as small marks: Google, Facebook, password. */

const LABEL = { GOOGLE: 'Google', FACEBOOK: 'Facebook', EMAIL: 'Email' } as const;
export const signupLabel = (m?: string | null) => LABEL[(m ?? 'EMAIL') as keyof typeof LABEL] ?? 'Email';

export function GoogleMark({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}

export function FacebookMark({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#1877F2" d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
    </svg>
  );
}

function KeyMark({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" stroke="var(--slate-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="8" cy="15" r="4" /><path d="M10.8 12.2L19 4m-3 3l2 2m-4-0l2 2" />
    </svg>
  );
}

const chip: React.CSSProperties = { width: 22, height: 22, borderRadius: 7, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--white)', border: '1px solid var(--slate-200)', flexShrink: 0 };

/** The marks in a row; each says in words what it means on hover and to screen readers. */
export default function SignInBadges({ providers = [], hasPassword }: { providers?: string[]; hasPassword?: boolean }) {
  const ways = [
    ...(providers.includes('GOOGLE') ? [{ k: 'g', title: 'Signs in with Google', mark: <GoogleMark /> }] : []),
    ...(providers.includes('FACEBOOK') ? [{ k: 'f', title: 'Signs in with Facebook', mark: <FacebookMark /> }] : []),
    ...(hasPassword ? [{ k: 'p', title: 'Has a password', mark: <KeyMark /> }] : []),
  ];
  if (!ways.length) return null;
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }} aria-label={ways.map((w) => w.title).join(', ')} role="img">
      {ways.map((w) => <span key={w.k} title={w.title} style={chip}>{w.mark}</span>)}
    </span>
  );
}
