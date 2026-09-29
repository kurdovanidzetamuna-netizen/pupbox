'use client';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const ALL_ACTIONS = ['view', 'create', 'edit', 'delete', 'export'];

const GROUPS = [
  {
    group: 'Overview',
    modules: [
      { key: 'dashboard',              label: 'Dashboard',                  actions: ['view', 'create', 'edit', 'delete', 'export'] },
      { key: 'reports',                label: 'Reports',                    actions: ['view', 'create', 'edit', 'delete', 'export'] },
    ],
  },
  {
    group: 'Subscriptions',
    modules: [
      { key: 'subscription_plans',     label: 'Plans',                      actions: ['view', 'create', 'edit', 'delete', 'export'] },
      { key: 'subscriptions',          label: 'Subscriptions',              actions: ['view', 'create', 'edit', 'delete', 'export'] },
      { key: 'subscriptions_pause',    label: 'Subscriptions — Pause',      actions: ['view', 'create', 'edit', 'delete', 'export'] },
      { key: 'subscriptions_cancel',   label: 'Subscriptions — Cancel',     actions: ['view', 'create', 'edit', 'delete', 'export'] },
      { key: 'subscriptions_resume',   label: 'Subscriptions — Resume',     actions: ['view', 'create', 'edit', 'delete', 'export'] },
      { key: 'box_items',              label: 'Box Items',                  actions: ['view', 'create', 'edit', 'delete', 'export'] },
      { key: 'box_campaigns',          label: 'Box Campaigns',              actions: ['view', 'create', 'edit', 'delete', 'export'] },
    ],
  },
  {
    group: 'Commerce',
    modules: [
      { key: 'orders',                 label: 'Orders',                     actions: ['view', 'create', 'edit', 'delete', 'export'] },
      { key: 'orders_refund',          label: 'Orders — Refund',            actions: ['view', 'create', 'edit', 'delete', 'export'] },
      { key: 'orders_export',          label: 'Orders — Export',            actions: ['view', 'create', 'edit', 'delete', 'export'] },
      { key: 'products',               label: 'Products',                   actions: ['view', 'create', 'edit', 'delete', 'export'] },
      { key: 'products_publish',       label: 'Products — Publish/Draft',   actions: ['view', 'create', 'edit', 'delete', 'export'] },
      { key: 'categories',             label: 'Categories',                 actions: ['view', 'create', 'edit', 'delete', 'export'] },
      { key: 'coupons',                label: 'Coupons',                    actions: ['view', 'create', 'edit', 'delete', 'export'] },
    ],
  },
  {
    group: 'CMS',
    modules: [
      { key: 'cms_homepage',           label: 'CMS — Home Page',            actions: ['view', 'create', 'edit', 'delete', 'export'] },
      { key: 'cms_pricing',            label: 'CMS — Pricing Page',         actions: ['view', 'create', 'edit', 'delete', 'export'] },
      { key: 'cms_how_it_works',       label: 'CMS — How It Works',         actions: ['view', 'create', 'edit', 'delete', 'export'] },
      { key: 'cms_blog_page',          label: 'CMS — Blog Page',            actions: ['view', 'create', 'edit', 'delete', 'export'] },
      { key: 'cms_terms',              label: 'CMS — Terms & Conditions',   actions: ['view', 'create', 'edit', 'delete', 'export'] },
      { key: 'cms_privacy',            label: 'CMS — Privacy Policy',       actions: ['view', 'create', 'edit', 'delete', 'export'] },
      { key: 'cms_contact',            label: 'CMS — Contact',              actions: ['view', 'create', 'edit', 'delete', 'export'] },
      { key: 'translations',           label: 'Translations',               actions: ['view', 'create', 'edit', 'delete', 'export'] },
      { key: 'faq',                    label: 'FAQ Manager',                actions: ['view', 'create', 'edit', 'delete', 'export'] },
      { key: 'promo_popups',           label: 'Promo Popups',               actions: ['view', 'create', 'edit', 'delete', 'export'] },
      { key: 'blog',                   label: 'Blog Posts',                 actions: ['view', 'create', 'edit', 'delete', 'export'] },
      { key: 'blog_publish',           label: 'Blog Posts — Publish',       actions: ['view', 'create', 'edit', 'delete', 'export'] },
    ],
  },
  {
    group: 'People',
    modules: [
      { key: 'customers',              label: 'Customers',                  actions: ['view', 'create', 'edit', 'delete', 'export'] },
      { key: 'customers_block',        label: 'Customers — Block/Unblock',  actions: ['view', 'create', 'edit', 'delete', 'export'] },
      { key: 'customers_export',       label: 'Customers — Export',         actions: ['view', 'create', 'edit', 'delete', 'export'] },
      { key: 'referrals',              label: 'Referrals',                  actions: ['view', 'create', 'edit', 'delete', 'export'] },
    ],
  },
  {
    group: 'System',
    modules: [
      { key: 'admin_users',            label: 'Admin Users',                actions: ['view', 'create', 'edit', 'delete', 'export'] },
      { key: 'roles',                  label: 'Roles & Permissions',        actions: ['view', 'create', 'edit', 'delete', 'export'] },
      { key: 'audit',                  label: 'Audit Log',                  actions: ['view', 'create', 'edit', 'delete', 'export'] },
    ],
  },
];

// Flat list for iteration
const MODULES = GROUPS.flatMap(g => g.modules);

const ACTION_COLORS: Record<string, string> = {
  view: 'var(--sky-700)', create: 'var(--green-800)', edit: 'var(--amber-800)', delete: 'var(--red-800)', export: 'var(--purple-800)',
};
const ACTION_BG: Record<string, string> = {
  view: 'var(--sky-100)', create: 'var(--green-100)', edit: 'var(--yellow-100)', delete: 'var(--red-100)', export: 'var(--purple-100)',
};

interface RolePermission { permission: { key: string } }
interface Role {
  id: string; name: string; description: string | null; isSystem: boolean;
  permissions: RolePermission[]; _count: { adminUsers: number };
}

const inp: React.CSSProperties = { width: '100%', border: '1px solid var(--slate-200)', borderRadius: 10, padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', color: 'var(--slate-900)', background: 'var(--white)' };
const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--slate-500)', marginBottom: 4 };
const btnStyle = (color: string, text = 'var(--white)'): React.CSSProperties => ({ background: color, border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 13, color: text, cursor: 'pointer', fontWeight: 600 });

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: 'var(--white)', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', width: '100%', maxWidth: 780, margin: '0 16px', padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--slate-900)' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: 'var(--slate-400)', cursor: 'pointer' }}>&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange} style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${checked ? 'var(--teal-600)' : 'var(--slate-300)'}`, background: checked ? 'var(--teal-600)' : 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
      {checked && <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1 4.5l2.5 2.5 4.5-5" stroke="var(--white)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
    </div>
  );
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  // selectedKeys: Set of "module.action" strings e.g. "orders.view"
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Role | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : '';
  const headers: HeadersInit = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/roles`, { headers });
      if (res.ok) setRoles(await res.json());
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null); setForm({ name: '', description: '' }); setSelectedKeys(new Set()); setError(''); setShowModal(true);
  }

  function openEdit(r: Role) {
    setEditing(r); setForm({ name: r.name, description: r.description || '' });
    setSelectedKeys(new Set(r.permissions.map(rp => rp.permission.key)));
    setError(''); setShowModal(true);
  }

  function toggleKey(key: string) {
    setSelectedKeys(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }

  function toggleRow(mod: string) {
    const keys = MODULES.find(m => m.key === mod)?.actions.map(a => `${mod}.${a}`) || [];
    const allOn = keys.every(k => selectedKeys.has(k));
    setSelectedKeys(prev => { const n = new Set(prev); keys.forEach(k => allOn ? n.delete(k) : n.add(k)); return n; });
  }

  function toggleAction(action: string) {
    const keys = MODULES.map(m => `${m.key}.${action}`).filter(k => {
      const mod = MODULES.find(m => k.startsWith(m.key + '.'));
      return mod?.actions.includes(action);
    });
    const allOn = keys.every(k => selectedKeys.has(k));
    setSelectedKeys(prev => { const n = new Set(prev); keys.forEach(k => allOn ? n.delete(k) : n.add(k)); return n; });
  }

  function selectAll() {
    setSelectedKeys(new Set(MODULES.flatMap(m => m.actions.map(a => `${m.key}.${a}`))));
  }

  async function save() {
    setSaving(true); setError('');
    try {
      // Ensure all needed permissions exist, then save role
      const permissionKeys = [...selectedKeys];

      // First sync permissions to DB
      await fetch(`${API}/admin/permissions/sync`, {
        method: 'POST', headers, body: JSON.stringify({ keys: MODULES.flatMap(m => m.actions.map(a => ({ key: `${m.key}.${a}`, name: `${a.charAt(0).toUpperCase() + a.slice(1)} ${m.label}`, module: m.key, description: `${a} access for ${m.label}` }))) })
      });

      const res = await fetch(
        editing ? `${API}/admin/roles/${editing.id}` : `${API}/admin/roles`,
        { method: editing ? 'PATCH' : 'POST', headers, body: JSON.stringify({ ...form, permissionKeys }) }
      );
      if (!res.ok) { const e = await res.json(); setError(e.message || 'Error'); return; }
      setShowModal(false); load();
    } finally { setSaving(false); }
  }

  async function doDelete(r: Role) {
    await fetch(`${API}/admin/roles/${r.id}`, { method: 'DELETE', headers });
    setConfirmDelete(null); load();
  }

  const allActions = ['view', 'create', 'edit', 'delete', 'export'];
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(GROUPS.map(g => g.group)));
  function toggleGroup(g: string) { setOpenGroups(prev => { const n = new Set(prev); n.has(g) ? n.delete(g) : n.add(g); return n; }); }
  function toggleGroupAll(grp: typeof GROUPS[0]) {
    const keys = grp.modules.flatMap(m => m.actions.map(a => `${m.key}.${a}`));
    const allOn = keys.every(k => selectedKeys.has(k));
    setSelectedKeys(prev => { const n = new Set(prev); keys.forEach(k => allOn ? n.delete(k) : n.add(k)); return n; });
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: 'var(--slate-900)' }}>Roles & Permissions</h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--slate-500)' }}>Define what each role can access</p>
        </div>
        <button onClick={openCreate} style={btnStyle('var(--teal-600)')}>+ Create Role</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--slate-400)' }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {roles.map(r => {
            const grouped = r.permissions.reduce<Record<string, string[]>>((acc, rp) => {
              const parts = rp.permission.key.split('.');
              const mod = parts.slice(0, -1).join('.');
              const action = parts[parts.length - 1];
              if (!acc[mod]) acc[mod] = [];
              acc[mod].push(action);
              return acc;
            }, {});
            return (
              <div key={r.id} style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--slate-200b)', padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--slate-900)' }}>{r.name}</span>
                      {r.isSystem && <span style={{ fontSize: 10, background: 'var(--yellow-100)', color: 'var(--amber-800)', borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>System</span>}
                    </div>
                    {r.description && <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--slate-500)' }}>{r.description}</p>}
                    {Object.keys(grouped).length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {Object.entries(grouped).map(([mod, actions]) => {
                          const modLabel = MODULES.find(m => m.key === mod)?.label || mod;
                          return (
                            <span key={mod} style={{ fontSize: 11, background: 'var(--slate-50)', border: '1px solid var(--slate-200)', color: 'var(--slate-700)', borderRadius: 8, padding: '3px 8px' }}>
                              <strong>{modLabel}:</strong> {actions.map(a => (
                                <span key={a} style={{ marginLeft: 4, background: ACTION_BG[a], color: ACTION_COLORS[a], borderRadius: 4, padding: '1px 5px', fontSize: 10, fontWeight: 600 }}>{a}</span>
                              ))}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--slate-400)', fontStyle: 'italic' }}>No permissions assigned</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: 'var(--slate-400)' }}>{r._count.adminUsers} user{r._count.adminUsers !== 1 ? 's' : ''}</span>
                    <button onClick={() => openEdit(r)} style={{ background: 'none', border: 'none', color: 'var(--teal-600)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Edit</button>
                    {!r.isSystem && <button onClick={() => setConfirmDelete(r)} style={{ background: 'none', border: 'none', color: 'var(--red-500)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Delete</button>}
                  </div>
                </div>
              </div>
            );
          })}
          {roles.length === 0 && <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--slate-400)' }}>No roles yet</div>}
        </div>
      )}

      {/* Role modal */}
      {showModal && (
        <Modal title={editing ? `Edit: ${editing.name}` : 'Create Role'} onClose={() => setShowModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Role Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} disabled={editing?.isSystem} style={{ ...inp, background: editing?.isSystem ? 'var(--slate-50)' : 'var(--white)' }} placeholder="e.g. Content Manager" />
              </div>
              <div>
                <label style={lbl}>Description</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={inp} placeholder="Optional description" />
              </div>
            </div>

            {/* Permission matrix */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={lbl}>Page Access ({selectedKeys.size} permissions)</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" onClick={selectAll} style={{ background: 'none', border: 'none', color: 'var(--teal-600)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Select All</button>
                  <button type="button" onClick={() => setSelectedKeys(new Set())} style={{ background: 'none', border: 'none', color: 'var(--slate-400)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Clear All</button>
                </div>
              </div>

              <div style={{ border: '1px solid var(--slate-200)', borderRadius: 12, overflow: 'hidden' }}>
                {/* Header row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 72px 72px 72px 72px 72px', gap: 0, background: 'var(--slate-50)', borderBottom: '1px solid var(--slate-200)', padding: '8px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate-500)' }}>PAGE / MODULE</div>
                  {allActions.map(a => (
                    <div key={a} onClick={() => toggleAction(a)} style={{ textAlign: 'center', cursor: 'pointer' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, background: ACTION_BG[a], color: ACTION_COLORS[a], borderRadius: 6, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{a}</span>
                    </div>
                  ))}
                </div>

                {/* Module rows grouped */}
                {GROUPS.map((grp, gi) => {
                  const isOpen = openGroups.has(grp.group);
                  const grpKeys = grp.modules.flatMap(m => m.actions.map(a => `${m.key}.${a}`));
                  const grpAllOn = grpKeys.every(k => selectedKeys.has(k));
                  const grpSomeOn = !grpAllOn && grpKeys.some(k => selectedKeys.has(k));
                  const grpCount = grpKeys.filter(k => selectedKeys.has(k)).length;
                  return (
                    <div key={grp.group}>
                      {/* Group header — clickable to expand/collapse */}
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', background: 'var(--slate-100)', borderTop: gi === 0 ? 'none' : '1px solid var(--slate-200)', cursor: 'pointer', userSelect: 'none' }}
                      >
                        {/* Group-level checkbox */}
                        <div
                          onClick={e => { e.stopPropagation(); toggleGroupAll(grp); }}
                          style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${grpAllOn ? 'var(--teal-600)' : grpSomeOn ? 'var(--teal-300)' : 'var(--slate-300)'}`, background: grpAllOn ? 'var(--teal-600)' : grpSomeOn ? 'var(--teal-100)' : 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                        >
                          {(grpAllOn || grpSomeOn) && <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1 4.5l2.5 2.5 4.5-5" stroke={grpAllOn ? 'var(--white)' : 'var(--teal-600)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        </div>
                        {/* Expand arrow + label */}
                        <div onClick={() => toggleGroup(grp.group)} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s', flexShrink: 0 }}>
                            <path d="M4 2l4 4-4 4" stroke="var(--slate-500)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--slate-600)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{grp.group}</span>
                          <span style={{ fontSize: 11, color: 'var(--slate-400)', marginLeft: 4 }}>({grpCount}/{grpKeys.length})</span>
                        </div>
                      </div>

                      {/* Rows — shown only when open */}
                      {isOpen && grp.modules.map((mod) => {
                        const rowKeys = mod.actions.map(a => `${mod.key}.${a}`);
                        const allOn = rowKeys.every(k => selectedKeys.has(k));
                        const isSub = mod.label.includes('—');
                        return (
                          <div key={mod.key} style={{ display: 'grid', gridTemplateColumns: '1fr 72px 72px 72px 72px 72px', alignItems: 'center', padding: '8px 14px', borderTop: '1px solid var(--slate-100)', background: allOn ? 'var(--green-50)' : 'var(--white)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: isSub ? 24 : 0 }}>
                              <Checkbox checked={allOn} onChange={() => toggleRow(mod.key)} />
                              <span style={{ fontSize: isSub ? 12 : 13, fontWeight: isSub ? 400 : 500, color: isSub ? 'var(--slate-500)' : 'var(--slate-900)' }}>{mod.label}</span>
                            </div>
                            {allActions.map(action => {
                              const key = `${mod.key}.${action}`;
                              const available = mod.actions.includes(action);
                              const checked = available && selectedKeys.has(key);
                              return (
                                <div key={action} style={{ display: 'flex', justifyContent: 'center' }}>
                                  {available ? (
                                    <Checkbox checked={checked} onChange={() => toggleKey(key)} />
                                  ) : (
                                    <div style={{ width: 16, height: 16, borderRadius: 4, background: 'var(--slate-100)' }} />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            {error && <p style={{ margin: 0, color: 'var(--red-500)', fontSize: 13 }}>{error}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
              <button onClick={() => setShowModal(false)} style={btnStyle('var(--slate-100)', 'var(--slate-600)')}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ ...btnStyle('var(--teal-600)'), opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Role'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Delete Role" onClose={() => setConfirmDelete(null)}>
          <p style={{ margin: '0 0 8px', color: 'var(--slate-600)', fontSize: 14 }}>Delete role <strong>{confirmDelete.name}</strong>?</p>
          {confirmDelete._count.adminUsers > 0 && (
            <p style={{ margin: '0 0 16px', color: 'var(--amber-600)', fontSize: 13 }}>Has {confirmDelete._count.adminUsers} user{confirmDelete._count.adminUsers !== 1 ? 's' : ''} — unassign them first.</p>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button onClick={() => setConfirmDelete(null)} style={btnStyle('var(--slate-100)', 'var(--slate-600)')}>Cancel</button>
            <button onClick={() => doDelete(confirmDelete)} disabled={confirmDelete._count.adminUsers > 0} style={{ ...btnStyle('var(--red-500)'), opacity: confirmDelete._count.adminUsers > 0 ? 0.5 : 1 }}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
