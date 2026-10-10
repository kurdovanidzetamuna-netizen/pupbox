'use client';
import { useEffect, useMemo, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

/** One permission, as the API lists it (the API is the only source of the list). */
interface Perm { key: string; group: string; name: string; description: string }
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
      <div style={{ position: 'relative', background: 'var(--white)', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', width: '100%', maxWidth: 680, margin: '0 16px', padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--slate-900)' }}>{title}</h2>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: 22, color: 'var(--slate-400)', cursor: 'pointer' }}>&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Permissions in their groups, keeping the API's order. */
function byGroup(perms: Perm[]) {
  const groups: { group: string; perms: Perm[] }[] = [];
  for (const p of perms) {
    const g = groups.find((x) => x.group === p.group);
    g ? g.perms.push(p) : groups.push({ group: p.group, perms: [p] });
  }
  return groups;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [perms, setPerms] = useState<Perm[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Role | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : '';
  const headers: HeadersInit = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const groups = useMemo(() => byGroup(perms), [perms]);
  const nameOf = (key: string) => perms.find((p) => p.key === key)?.name ?? key;

  async function load() {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([fetch(`${API}/admin/roles`, { headers }), fetch(`${API}/admin/permissions`, { headers })]);
      if (r.ok) setRoles(await r.json());
      if (p.ok) setPerms(await p.json());
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null); setForm({ name: '', description: '' }); setSelected(new Set()); setError(''); setShowModal(true);
  }

  function openEdit(r: Role) {
    setEditing(r); setForm({ name: r.name, description: r.description || '' });
    setSelected(new Set(r.permissions.map((rp) => rp.permission.key)));
    setError(''); setShowModal(true);
  }

  function toggle(keys: string[]) {
    const allOn = keys.every((k) => selected.has(k));
    setSelected((prev) => { const n = new Set(prev); keys.forEach((k) => (allOn ? n.delete(k) : n.add(k))); return n; });
  }

  async function save() {
    if (!form.name.trim()) { setError('Give the role a name.'); return; }
    setSaving(true); setError('');
    try {
      const body = editing?.isSystem
        ? { description: form.description }
        : { ...form, name: form.name.trim(), permissionKeys: [...selected] };
      const res = await fetch(editing ? `${API}/admin/roles/${editing.id}` : `${API}/admin/roles`, {
        method: editing ? 'PATCH' : 'POST', headers, body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        setError(Array.isArray(e.message) ? e.message.join(' ') : e.message || `Not saved (error ${res.status}).`);
        return;
      }
      setShowModal(false); load();
    } finally { setSaving(false); }
  }

  async function doDelete(r: Role) {
    const res = await fetch(`${API}/admin/roles/${r.id}`, { method: 'DELETE', headers });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      alert(e.message || 'Not deleted.');
    }
    setConfirmDelete(null); load();
  }

  const locked = !!editing?.isSystem;

  return (
    <div style={{ padding: '28px 32px', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: 'var(--slate-900)' }}>Roles & Permissions</h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--slate-500)' }}>What each role can see and do. Changes apply on the admin’s next click.</p>
        </div>
        <button onClick={openCreate} style={btnStyle('var(--teal-600)')}>+ Create Role</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--slate-400)' }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {roles.map((r) => {
            const keys = r.permissions.map((rp) => rp.permission.key);
            return (
              <div key={r.id} style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--slate-200b)', padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--slate-900)' }}>{r.name}</span>
                      {r.isSystem && <span style={{ fontSize: 10, background: 'var(--yellow-100)', color: 'var(--amber-800)', borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>Full access</span>}
                    </div>
                    {r.description && <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--slate-500)' }}>{r.description}</p>}
                    {r.isSystem ? null : keys.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {perms.filter((p) => keys.includes(p.key)).map((p) => (
                          <span key={p.key} style={{ fontSize: 11, background: 'var(--slate-50)', border: '1px solid var(--slate-200)', color: 'var(--slate-700)', borderRadius: 8, padding: '3px 8px' }}>{nameOf(p.key)}</span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--slate-400)', fontStyle: 'italic' }}>No permissions — admins with this role can only sign in.</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: 'var(--slate-400)' }}>{r._count.adminUsers} admin{r._count.adminUsers !== 1 ? 's' : ''}</span>
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

      {showModal && (
        <Modal title={editing ? `Edit: ${editing.name}` : 'Create Role'} onClose={() => setShowModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Role name</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} disabled={locked} maxLength={80} style={{ ...inp, background: locked ? 'var(--slate-50)' : 'var(--white)' }} placeholder="e.g. Packer" />
              </div>
              <div>
                <label style={lbl}>Description</label>
                <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} maxLength={300} style={inp} placeholder="Optional" />
              </div>
            </div>

            {locked ? (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--slate-600)', background: 'var(--slate-50)', borderRadius: 10, padding: '12px 14px' }}>
                {editing!.name} always has every permission, so the shop can never lock itself out of its own admin. For limited access, create a new role.
              </p>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={{ ...lbl, marginBottom: 0 }}>Permissions ({selected.size} of {perms.length})</label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button type="button" onClick={() => setSelected(new Set(perms.map((p) => p.key)))} style={{ background: 'none', border: 'none', color: 'var(--teal-600)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Select all</button>
                    <button type="button" onClick={() => setSelected(new Set())} style={{ background: 'none', border: 'none', color: 'var(--slate-400)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Clear</button>
                  </div>
                </div>
                <div style={{ border: '1px solid var(--slate-200)', borderRadius: 12, overflow: 'hidden' }}>
                  {groups.map((g, gi) => {
                    const keys = g.perms.map((p) => p.key);
                    const on = keys.filter((k) => selected.has(k)).length;
                    return (
                      <div key={g.group} style={{ borderTop: gi === 0 ? 'none' : '1px solid var(--slate-200)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', background: 'var(--slate-100)', cursor: 'pointer' }}>
                          <input type="checkbox" checked={on === keys.length} ref={(el) => { if (el) el.indeterminate = on > 0 && on < keys.length; }} onChange={() => toggle(keys)} />
                          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--slate-600)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{g.group}</span>
                          <span style={{ fontSize: 11, color: 'var(--slate-400)' }}>({on}/{keys.length})</span>
                        </label>
                        {g.perms.map((p) => (
                          <label key={p.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 14px 9px 38px', borderTop: '1px solid var(--slate-100)', cursor: 'pointer', background: selected.has(p.key) ? 'var(--green-50)' : 'var(--white)' }}>
                            <input type="checkbox" checked={selected.has(p.key)} onChange={() => toggle([p.key])} style={{ marginTop: 2 }} />
                            <span>
                              <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--slate-900)' }}>{p.name}</span>
                              <span style={{ display: 'block', fontSize: 12, color: 'var(--slate-500)', marginTop: 1 }}>{p.description}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {error && <p style={{ margin: 0, color: 'var(--red-500)', fontSize: 13 }}>{error}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
              <button onClick={() => setShowModal(false)} style={btnStyle('var(--slate-100)', 'var(--slate-600)')}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ ...btnStyle('var(--teal-600)'), opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create role'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Delete role" onClose={() => setConfirmDelete(null)}>
          <p style={{ margin: '0 0 8px', color: 'var(--slate-600)', fontSize: 14 }}>Delete the role <strong>{confirmDelete.name}</strong>?</p>
          {confirmDelete._count.adminUsers > 0 && (
            <p style={{ margin: '0 0 16px', color: 'var(--amber-600)', fontSize: 13 }}>{confirmDelete._count.adminUsers} admin{confirmDelete._count.adminUsers !== 1 ? 's have' : ' has'} this role — give them another role first.</p>
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
