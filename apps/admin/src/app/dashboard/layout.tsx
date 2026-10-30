'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', exact: true, icon: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z' },
      { href: '/dashboard/reports', label: 'Reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    ],
  },
  {
    label: 'Subscriptions',
    items: [
      { href: '/dashboard/box-tiers', label: 'Box types', icon: 'M4 7h16M4 12h16M4 17h10' },
      { href: '/dashboard/subscription-plans', label: 'Plans', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
      { href: '/dashboard/subscriptions', label: 'Subscriptions', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
      { href: '/dashboard/box-items', label: 'Box Items', icon: 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z' },
      { href: '/dashboard/custom-box-items', label: 'Custom Box Items', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
      { href: '/dashboard/monthly-boxes', label: 'Monthly Boxes', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
      { href: '/dashboard/box-campaigns', label: 'Box Campaigns', icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4' },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { href: '/dashboard/orders', label: 'Orders', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
      { href: '/dashboard/products', label: 'Products', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
      { href: '/dashboard/categories', label: 'Categories', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-5 5a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' },
      { href: '/dashboard/sellers', label: 'Sellers', icon: 'M3 9l1.5-5h15L21 9M3 9h18M3 9v1a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0V9M5 13v7h14v-7M10 20v-4h4v4' },
      { href: '/dashboard/seller-payouts', label: 'Seller payouts', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
      { href: '/dashboard/delivery', label: 'Delivery', icon: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0' },
      { href: '/dashboard/coupons', label: 'Promo codes', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' },
    ],
  },
  {
    label: 'CMS',
    items: [
      { href: '/dashboard/page-builder/site', label: 'Header & Footer', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
      { href: '/dashboard/page-builder/homepage', label: 'Home Page', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
      { href: '/dashboard/page-builder/pricing', label: 'Pricing Page', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
      { href: '/dashboard/page-builder/how-it-works', label: 'How It Works', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
      { href: '/dashboard/page-builder/shop', label: 'Shop Page', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
      { href: '/dashboard/page-builder/blog', label: 'Blog Page', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
      { href: '/dashboard/blog', label: 'Blog Posts', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
      { href: '/dashboard/cms', label: 'Terms & Privacy', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
      { href: '/dashboard/faq', label: 'FAQ Manager', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
      { href: '/dashboard/marketing', label: 'SEO & tracking', icon: 'M3 3v18h18M7 15l4-4 3 3 5-6' },
      { href: '/dashboard/promo-popups', label: 'Promo Popups', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
    ],
  },
  {
    label: 'People',
    items: [
      { href: '/dashboard/customers', label: 'Customers', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
      { href: '/dashboard/notifications', label: 'Notifications', icon: 'M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-4-5.7V5a2 2 0 10-4 0v.3C7.7 6.2 6 8.4 6 11v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
      { href: '/dashboard/messages', label: 'Send messages', icon: 'M8 10h8M8 14h5M21 12c0 4.4-4 8-9 8a9.9 9.9 0 01-4-.8L3 20l1.3-3.9A7.5 7.5 0 013 12c0-4.4 4-8 9-8s9 3.6 9 8z' },
      { href: '/dashboard/crm', label: 'Dogs & CRM', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
      { href: '/dashboard/referrals', label: 'Referrals', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/dashboard/settings', label: 'Settings', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
      { href: '/dashboard/emails', label: 'Emails', icon: 'M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
      { href: '/dashboard/sms', label: 'Text messages', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
      { href: '/dashboard/admin-users', label: 'Admin Users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
      { href: '/dashboard/admin-translations', label: 'Admin Translations', icon: 'M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129' },
      { href: '/dashboard/translations', label: 'Translations', icon: 'M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129' },
      { href: '/dashboard/roles', label: 'Roles & Permissions', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
      { href: '/dashboard/audit', label: 'Audit Log', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    ],
  },
];

const S = {
  sidebar: { position: 'fixed' as const, left: 0, top: 0, height: '100%', width: 224, display: 'flex', flexDirection: 'column' as const, zIndex: 40, backgroundColor: 'var(--white)', borderRight: '1px solid var(--slate-200b)' },
  logo: { padding: '20px 20px 16px', borderBottom: '1px solid var(--slate-100)', display: 'flex', alignItems: 'center', gap: 10 },
  logoIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: 'var(--teal-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 },
  logoText: { color: 'var(--slate-900)', fontWeight: 700, fontSize: 14, lineHeight: 1 },
  logoSub: { color: 'var(--slate-400)', fontSize: 11, marginTop: 3 },
  nav: { flex: 1, overflowY: 'auto' as const, padding: '16px 12px' },
  groupHeader: (open: boolean) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '5px 8px', borderRadius: 6, cursor: 'pointer', marginBottom: open ? 4 : 0,
    userSelect: 'none' as const,
  }),
  groupLabel: { color: 'var(--slate-400b)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const },
  chevron: (open: boolean) => ({ color: 'var(--slate-400b)', transition: 'transform 0.18s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', display: 'flex' }),
  navLink: (active: boolean) => ({ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 8, fontSize: 13, fontWeight: active ? 600 : 400, textDecoration: 'none', color: active ? 'var(--teal-600)' : 'var(--slate-500)', backgroundColor: active ? 'var(--teal-50)' : 'transparent', marginBottom: 1, transition: 'all 0.12s' }),
  bottom: { padding: '12px', borderTop: '1px solid var(--slate-100)', display: 'flex', flexDirection: 'column' as const, gap: 2 },
  themeToggle: { display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13, color: 'var(--slate-400)', background: 'none', border: 'none', cursor: 'pointer' },
  signOut: { display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13, color: 'var(--slate-400)', background: 'none', border: 'none', cursor: 'pointer' },
  main: { marginLeft: 224, minHeight: '100vh', backgroundColor: 'var(--slate-50)', width: 'calc(100vw - 224px)' },
};

function NavGroup({ group, isActive }: { group: typeof NAV_GROUPS[0]; isActive: (href: string, exact?: boolean) => boolean }) {
  const hasActive = group.items.some(item => isActive(item.href, item.exact));
  const [open, setOpen] = useState(hasActive || group.label === 'Overview');

  return (
    <div style={{ marginBottom: 4 }}>
      <div style={S.groupHeader(open)} onClick={() => setOpen(o => !o)}>
        <span style={S.groupLabel}>{group.label}</span>
        <span style={S.chevron(open)}>
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </div>

      {open && (
        <div style={{ overflow: 'hidden' }}>
          {group.items.map(item => {
            const active = isActive(item.href, item.exact);
            return (
              <Link key={item.href} href={item.href} style={S.navLink(active)}>
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                  <path d={item.icon} />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** The permission a section needs before it appears in the sidebar (the API enforces the same). */
const NEEDS: [prefix: string, perm: string][] = [
  ['/dashboard/admin-users', 'admin.manage'], ['/dashboard/roles', 'admin.manage'], ['/dashboard/audit', 'admin.manage'],
  ['/dashboard/reports', 'reports.view'], ['/dashboard/orders', 'orders.view'], ['/dashboard/customers', 'users.view'],
  ['/dashboard/referrals', 'users.view'], ['/dashboard/crm', 'crm.view'], ['/dashboard/notifications', 'crm.view'], ['/dashboard/messages', 'crm.message'], ['/dashboard/coupons', 'coupons.manage'], ['/dashboard/sellers', 'sellers.view'], ['/dashboard/seller-payouts', 'sellers.payouts'],
  ['/dashboard/products', 'products.view'], ['/dashboard/categories', 'products.view'], ['/dashboard/box-items', 'products.view'], ['/dashboard/custom-box-items', 'products.view'],
  ['/dashboard/box-tiers', 'subscriptions.view'], ['/dashboard/subscription-plans', 'subscriptions.view'], ['/dashboard/subscriptions', 'subscriptions.view'],
  ['/dashboard/monthly-boxes', 'subscriptions.view'], ['/dashboard/box-campaigns', 'subscriptions.view'],
  ['/dashboard/page-builder', 'cms.view'], ['/dashboard/blog', 'cms.view'], ['/dashboard/cms', 'cms.view'], ['/dashboard/faq', 'cms.view'],
  ['/dashboard/promo-popups', 'cms.view'], ['/dashboard/emails', 'cms.view'], ['/dashboard/translations', 'cms.view'], ['/dashboard/admin-translations', 'cms.view'],
  ['/dashboard/marketing', 'marketing.view'],
  ['/dashboard/delivery', 'cms.view'],
  ['/dashboard/settings', 'cms.edit'],
  ['/dashboard/sms', 'cms.edit'],
];
const needFor = (href: string) => NEEDS.find(([p]) => href === p || href.startsWith(p + '/'))?.[1];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [perms, setPerms] = useState<string[] | null>(null);
  const [denied, setDenied] = useState('');
  const pathname = usePathname();
  // A "no access" notice belongs to the screen it came from.
  useEffect(() => { setDenied(''); }, [pathname]);
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  // Phones and small tablets: the menu slides in from the left.
  const [menu, setMenu] = useState(false);
  useEffect(() => { setMenu(false); }, [pathname]);

  useEffect(() => {
    function signOut() {
      localStorage.removeItem('admin_token');
      router.replace('/login');
    }

    // Presence alone is not enough. An expired token passes a null check, then
    // every page's fetch 401s and the `catch {}` around it renders an empty
    // state — so the panel silently looks like a database with no data in it
    // rather than a session that has run out.
    const token = localStorage.getItem('admin_token');
    if (!token) return signOut();

    try {
      const { exp, permissions } = JSON.parse(atob(token.split('.')[1]));
      if (!exp || exp * 1000 <= Date.now()) return signOut();
      setPerms(Array.isArray(permissions) ? permissions : []);
    } catch {
      return signOut(); // malformed token is no better than none
    }

    // The token's permission list is from sign-in time; a role edited since
    // (e.g. CRM access added) shows at once with the current list.
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/admin/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => { if (Array.isArray(me?.permissions)) setPerms(me.permissions); })
      .catch(() => {});

    // The local check cannot catch a token the server rejects for other
    // reasons (secret rotated, admin removed), so treat any 401 from our API
    // as the end of the session too.
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const res = await originalFetch(...args);
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url ?? '';
      if (res.status === 401) {
        if (url.includes('/api/v1/') && !url.includes('/auth/login')) signOut();
      }
      // The role doesn't cover this: say so, instead of an empty screen.
      if (res.status === 403 && url.includes('/api/v1/')) setDenied('Your role doesn’t allow this. Ask an administrator for access.');
      return res;
    };
    return () => { window.fetch = originalFetch; };
  }, [router]);

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Small screens: a bar with the menu button; the sidebar is a drawer */}
      <div className="adm-topbar">
        <button type="button" onClick={() => setMenu(true)} aria-label="Open menu" aria-expanded={menu} className="adm-burger">
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <div style={S.logoIcon}>🐾</div>
        <div style={S.logoText}>Pupbox</div>
      </div>
      {menu && <div className="adm-backdrop" onClick={() => setMenu(false)} aria-hidden="true" />}
      <aside style={S.sidebar} className="adm-sidebar" data-open={menu || undefined}>
        <div style={S.logo}>
          <div style={S.logoIcon}>🐾</div>
          <div>
            <div style={S.logoText}>Pupbox</div>
            <div style={S.logoSub}>Admin Panel</div>
          </div>
        </div>

        <div style={S.nav}>
          {NAV_GROUPS
            .map(group => ({ ...group, items: group.items.filter(i => { const n = needFor(i.href); return !n || !perms || perms.includes(n); }) }))
            .filter(group => group.items.length > 0)
            .map(group => (
              <NavGroup key={group.label} group={group} isActive={isActive} />
            ))}
        </div>

        <div style={S.bottom}>
          <button onClick={toggleTheme} style={S.themeToggle}>
            {theme === 'dark' ? (
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            ) : (
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <button onClick={() => { localStorage.removeItem('admin_token'); router.push('/login'); }} style={S.signOut}>
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      <main style={S.main} className="adm-main">
        {denied && (
          <div role="alert" style={{ margin: '16px 28px 0', padding: '10px 14px', borderRadius: 10, background: 'var(--amber-50)', border: '1px solid var(--amber-200)', color: 'var(--amber-800)', fontSize: 13, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span>{denied}</span>
            <button onClick={() => setDenied('')} aria-label="Dismiss" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
