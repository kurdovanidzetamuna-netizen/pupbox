'use client';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface Role { id: string; name: string; }
interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  role: Role;
  createdAt: string;
  lastLoginAt: string | null;
}

const STATUS_BG: Record<string, string> = {
  ACTIVE: '#dcfce7',
  INACTIVE: '#f1f5f9',
  SUSPENDED: '#fee2e2',
};
const STATUS_COLOR: Record<string, string> = {
  ACTIVE: '#166534',
  INACTIVE: '#475569',
  SUSPENDED: '#991b1b',
};

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', width: '100%', maxWidth: 520, margin: '0 16px', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#94a3b8', cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const EMPTY_FORM = { email: '', firstName: '', lastName: '', password: '', roleId: '', status: 'ACTIVE' };

const inputStyle: React.CSSProperties = { width: '100%', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', color: '#0f172a', background: '#fff' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : '';
  const headers: HeadersInit = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  async function load(p = page, q = search) {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/users?page=${p}&limit=20${q ? `&search=${encodeURIComponent(q)}` : ''}`, { headers });
      if (res.ok) { const data = await res.json(); setUsers(data.items); setPages(data.pages); }
    } finally { setLoading(false); }
  }

  async function loadRoles() {
    const res = await fetch(`${API}/admin/roles`, { headers });
    if (res.ok) setRoles(await res.json());
  }

  useEffect(() => { load(); loadRoles(); }, []);

  function openCreate() { setEditing(null); setForm({ ...EMPTY_FORM }); setError(''); setShowModal(true); }

  function openEdit(u: AdminUser) {
    setEditing(u);
    setForm({ email: u.email, firstName: u.firstName, lastName: u.lastName, password: '', roleId: u.role?.id || '', status: u.status });
    setError(''); setShowModal(true);
  }

  async function save() {
    setSaving(true); setError('');
    try {
      const body: any = { ...form };
      if (!body.password) delete body.password;
      const res = await fetch(
        editing ? `${API}/admin/users/${editing.id}` : `${API}/admin/users`,
        { method: editing ? 'PATCH' : 'POST', headers, body: JSON.stringify(body) }
      );
      if (!res.ok) { const e = await res.json(); setError(e.message || 'Error'); return; }
      setShowModal(false); load();
    } finally { setSaving(false); }
  }

  async function doDelete(u: AdminUser) {
    await fetch(`${API}/admin/users/${u.id}`, { method: 'DELETE', headers });
    setConfirmDelete(null); load();
  }

  function handleSearch(v: string) { setSearch(v); setPage(1); load(1, v); }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Admin Users</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Manage admin panel access</p>
        </div>
        <button
          onClick={openCreate}
          style={{ background: '#0d9488', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          + Add User
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search by name or email…"
          style={{ ...inputStyle, maxWidth: 320 }}
        />
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e8ecf0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e8ecf0' }}>
              {['Name', 'Email', 'Role', 'Status', 'Last Login', ''].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, color: '#64748b', fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>Loading…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>No users found</td></tr>
            ) : users.map((u, i) => (
              <tr key={u.id} style={{ borderTop: i === 0 ? 'none' : '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{u.firstName} {u.lastName}</td>
                <td style={{ padding: '12px 16px', color: '#64748b' }}>{u.email}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ background: '#f0fdf4', color: '#166534', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600 }}>{u.role?.name}</span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ background: STATUS_BG[u.status] || '#f1f5f9', color: STATUS_COLOR[u.status] || '#475569', borderRadius: 20, padding: '3px 9px', fontSize: 11, fontWeight: 600 }}>{u.status}</span>
                </td>
                <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 12 }}>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : '—'}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button onClick={() => openEdit(u)} style={{ background: 'none', border: 'none', color: '#0d9488', fontWeight: 600, fontSize: 12, cursor: 'pointer', marginRight: 12 }}>Edit</button>
                  <button onClick={() => setConfirmDelete(u)} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 }}>
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => { setPage(p); load(p); }} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: p === page ? '#0d9488' : '#f1f5f9', color: p === page ? '#fff' : '#475569' }}>{p}</button>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <Modal title={editing ? 'Edit User' : 'Add Admin User'} onClose={() => setShowModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>First Name</label>
                <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Last Name</label>
                <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{editing ? 'New Password (leave blank to keep)' : 'Password'}</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Role</label>
              <select value={form.roleId} onChange={e => setForm(f => ({ ...f, roleId: e.target.value }))} style={inputStyle}>
                <option value="">— Select role —</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            {editing && (
              <div>
                <label style={labelStyle}>Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={inputStyle}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
            )}
            {error && <p style={{ margin: 0, color: '#ef4444', fontSize: 13 }}>{error}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 6 }}>
              <button onClick={() => setShowModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 13, color: '#475569', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ background: '#0d9488', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 13, color: '#fff', cursor: 'pointer', fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <Modal title="Delete User" onClose={() => setConfirmDelete(null)}>
          <p style={{ margin: '0 0 20px', color: '#475569', fontSize: 14 }}>
            Are you sure you want to delete <strong>{confirmDelete.firstName} {confirmDelete.lastName}</strong>? This cannot be undone.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={() => setConfirmDelete(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 13, color: '#475569', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
            <button onClick={() => doDelete(confirmDelete)} style={{ background: '#ef4444', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 13, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
