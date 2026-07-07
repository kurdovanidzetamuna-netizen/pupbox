'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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
      { href: '/dashboard/subscription-plans', label: 'Plans', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
      { href: '/dashboard/subscriptions', label: 'Subscriptions', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
      { href: '/dashboard/box-items', label: 'Box Items', icon: 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z' },
      { href: '/dashboard/box-campaigns', label: 'Box Campaigns', icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4' },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { href: '/dashboard/orders', label: 'Orders', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
      { href: '/dashboard/products', label: 'Products', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
      { href: '/dashboard/categories', label: 'Categories', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-5 5a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' },
      { href: '/dashboard/coupons', label: 'Coupons', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' },
    ],
  },
  {
    label: 'CMS',
    items: [
      { href: '/dashboard/page-builder/homepage', label: 'Home Page', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
      { href: '/dashboard/page-builder/pricing', label: 'Pricing Page', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
      { href: '/dashboard/page-builder/how-it-works', label: 'How It Works', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
      { href: '/dashboard/page-builder/blog', label: 'Blog', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
      { href: '/dashboard/page-builder/terms', label: 'Terms & Conditions', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
      { href: '/dashboard/page-builder/privacy', label: 'Privacy Policy', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
      { href: '/dashboard/page-builder/contact', label: 'Contact', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
      { href: '/dashboard/faq', label: 'FAQ Manager', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
      { href: '/dashboard/promo-popups', label: 'Promo Popups', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
    ],
  },
  {
    label: 'People',
    items: [
      { href: '/dashboard/customers', label: 'Customers', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
      { href: '/dashboard/referrals', label: 'Referrals', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/dashboard/admin-users', label: 'Admin Users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
      { href: '/dashboard/admin-translations', label: 'Admin Translations', icon: 'M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129' },
      { href: '/dashboard/translations', label: 'Translations', icon: 'M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129' },
      { href: '/dashboard/roles', label: 'Roles & Permissions', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
      { href: '/dashboard/audit', label: 'Audit Log', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    ],
  },
];

const S = {
  sidebar: { position: 'fixed' as const, left: 0, top: 0, height: '100%', width: 224, display: 'flex', flexDirection: 'column' as const, zIndex: 40, backgroundColor: '#fff', borderRight: '1px solid #e8ecf0' },
  logo: { padding: '20px 20px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 },
  logoIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 },
  logoText: { color: '#0f172a', fontWeight: 700, fontSize: 14, lineHeight: 1 },
  logoSub: { color: '#94a3b8', fontSize: 11, marginTop: 3 },
  nav: { flex: 1, overflowY: 'auto' as const, padding: '16px 12px' },
  groupHeader: (open: boolean) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '5px 8px', borderRadius: 6, cursor: 'pointer', marginBottom: open ? 4 : 0,
    userSelect: 'none' as const,
  }),
  groupLabel: { color: '#b0bac5', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const },
  chevron: (open: boolean) => ({ color: '#b0bac5', transition: 'transform 0.18s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', display: 'flex' }),
  navLink: (active: boolean) => ({ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 8, fontSize: 13, fontWeight: active ? 600 : 400, textDecoration: 'none', color: active ? '#0d9488' : '#64748b', backgroundColor: active ? '#f0fdfa' : 'transparent', marginBottom: 1, transition: 'all 0.12s' }),
  bottom: { padding: '12px', borderTop: '1px solid #f1f5f9' },
  signOut: { display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' },
  main: { marginLeft: 224, minHeight: '100vh', backgroundColor: '#f8fafc', width: 'calc(100vw - 224px)' },
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.replace('/login');
    }
  }, [router]);

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={S.sidebar}>
        <div style={S.logo}>
          <div style={S.logoIcon}>🐾</div>
          <div>
            <div style={S.logoText}>Pupbox</div>
            <div style={S.logoSub}>Admin Panel</div>
          </div>
        </div>

        <div style={S.nav}>
          {NAV_GROUPS.map(group => (
            <NavGroup key={group.label} group={group} isActive={isActive} />
          ))}
        </div>

        <div style={S.bottom}>
          <button onClick={() => { localStorage.removeItem('admin_token'); router.push('/login'); }} style={S.signOut}>
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      <main style={S.main}>{children}</main>
    </div>
  );
}
