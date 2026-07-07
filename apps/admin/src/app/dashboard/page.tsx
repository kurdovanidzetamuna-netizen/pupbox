'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function StatCard({ label, value, sub, change, emoji, bg, accent }: any) {
  const up = (change ?? 0) >= 0;
  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8ecf0', padding: 24, display: 'flex', gap: 16, alignItems: 'flex-start', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{sub}</div>}
        {change !== undefined && (
          <div style={{ fontSize: 12, fontWeight: 600, color: up ? '#10b981' : '#ef4444', marginTop: 6, display: 'flex', alignItems: 'center', gap: 3 }}>
            {up ? '↑' : '↓'} {Math.abs(change)}% vs last month
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [chart, setChart] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  function token() { return localStorage.getItem('admin_token') || ''; }

  useEffect(() => {
    async function load() {
      try {
        const headers = { Authorization: `Bearer ${token()}` };
        const [mRes, cRes, pRes] = await Promise.all([
          fetch(`${API}/analytics/dashboard`, { headers }),
          fetch(`${API}/analytics/revenue-chart?months=6`, { headers }),
          fetch(`${API}/analytics/top-products?limit=5`, { headers }),
        ]);
        const [m, c, p] = await Promise.all([
          mRes.ok ? mRes.json() : {},
          cRes.ok ? cRes.json() : [],
          pRes.ok ? pRes.json() : [],
        ]);
        setMetrics(m || {});
        setChart(Array.isArray(c) ? c : []);
        setTopProducts(Array.isArray(p) ? p : []);
      } catch {
        // network/parse error — show empty dashboard
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const maxRevenue = Math.max(...chart.map(d => d.revenue), 1);

  return (
    <div style={{ padding: 32 }}>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>Dashboard</h1>
        <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>Welcome back — here's what's happening today.</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: '4px solid #ccfbf1', borderTopColor: '#0d9488', animation: 'spin 0.7s linear infinite' }} />
          <p style={{ fontSize: 13, color: '#94a3b8' }}>Loading metrics…</p>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            <StatCard label="Revenue This Month" value={`₾${(metrics?.revenue?.thisMonth ?? 0).toFixed(0)}`} sub={`Total ₾${(metrics?.revenue?.total ?? 0).toFixed(0)}`} change={metrics?.revenue?.change} emoji="💰" bg="#f0fdf4" accent="#10b981" />
            <StatCard label="Active Subscriptions" value={String(metrics?.subscriptions?.active ?? 0)} sub="subscribers" emoji="🔄" bg="#eff6ff" accent="#3b82f6" />
            <StatCard label="Orders This Month" value={String(metrics?.orders?.thisMonth ?? 0)} sub={`${metrics?.orders?.pending ?? 0} pending · ${metrics?.orders?.today ?? 0} today`} change={metrics?.orders?.change} emoji="📦" bg="#f5f3ff" accent="#8b5cf6" />
            <StatCard label="Registered Users" value={String(metrics?.users?.total ?? 0)} sub={`+${metrics?.users?.thisMonth ?? 0} this month`} change={metrics?.users?.change} emoji="👥" bg="#f0fdfa" accent="#0d9488" />
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, marginBottom: 24 }}>
            {/* Revenue bar chart */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8ecf0', padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Revenue</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Last 6 months</div>
              </div>
              {chart.length === 0 ? (
                <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: 13 }}>No data yet</div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 140 }}>
                  {chart.map((d, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>
                        ₾{d.revenue > 999 ? `${(d.revenue / 1000).toFixed(1)}k` : d.revenue.toFixed(0)}
                      </div>
                      <div style={{ width: '100%', borderRadius: '6px 6px 0 0', backgroundColor: '#99f6e4', minHeight: 4, height: Math.max(4, (d.revenue / maxRevenue) * 100), transition: 'height 0.3s', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', backgroundColor: '#0d9488', borderRadius: '4px 4px 0 0' }} />
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>{d.month}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top products */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8ecf0', padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Top Products</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 20 }}>By revenue</div>
              {topProducts.length === 0 ? (
                <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: 13 }}>No sales yet</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {topProducts.map((p, i) => (
                    <div key={p.productId || i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', backgroundColor: i === 0 ? '#0d9488' : '#f1f5f9', color: i === 0 ? '#fff' : '#64748b', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{p.totalQty} units</div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', flexShrink: 0 }}>₾{p.totalRevenue.toFixed(0)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'View Orders', href: '/dashboard/orders', desc: 'Manage all orders', emoji: '📦', bg: '#f5f3ff' },
              { label: 'Manage Products', href: '/dashboard/products', desc: 'Add or edit products', emoji: '🛍️', bg: '#eff6ff' },
              { label: 'Write Blog Post', href: '/dashboard/blog', desc: 'Publish new content', emoji: '✍️', bg: '#f0fdf4' },
              { label: 'Download Reports', href: '/dashboard/reports', desc: 'Export CSV data', emoji: '📊', bg: '#f0fdfa' },
            ].map(q => (
              <Link key={q.href} href={q.href} style={{ background: '#fff', border: '1px solid #e8ecf0', borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', transition: 'box-shadow 0.15s' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: q.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{q.emoji}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{q.label}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{q.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
