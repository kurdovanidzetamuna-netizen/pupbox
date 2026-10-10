'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { cmsSlug, mergedSections, pageByKey, type StoredContent } from '@pupbox/content';
import { FieldEditor } from '../_components/fields';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

type Values = Record<string, Record<string, unknown>>;

/**
 * Edits one page of the site. What each page is made of — and the text it
 * starts with — comes from @pupbox/content, the same description the site
 * renders from, so every field here appears on the site.
 */
export default function PageEditor() {
  const { pageKey } = useParams<{ pageKey: string }>();
  const page = pageByKey(pageKey);

  const [values, setValues] = useState<Values>({});
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [savedSnapshot, setSavedSnapshot] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const snapshot = useMemo(() => JSON.stringify({ values, enabled }), [values, enabled]);
  const dirty = !loading && snapshot !== savedSnapshot;

  const load = useCallback(async () => {
    if (!page) return;
    setLoading(true);
    let stored: StoredContent | null = null;
    try {
      const res = await fetch(`${API}/cms/admin/${cmsSlug(page)}`, { headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` } });
      if (res.ok) stored = (await res.json())?.content ?? null;
    } catch {}
    const v = mergedSections(page, stored);
    const e = stored?.enabled ?? {};
    setValues(v);
    setEnabled(e);
    setSavedSnapshot(JSON.stringify({ values: v, enabled: e }));
    setOpen(page.sections[0]?.id ?? null);
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  // Leaving with unsaved edits loses them; ask first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  async function save() {
    if (!page) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${API}/cms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
        body: JSON.stringify({
          key: cmsSlug(page), slug: cmsSlug(page), title: page.label, status: 'PUBLISHED',
          content: { version: 2, sections: values, enabled } satisfies StoredContent,
        }),
      });
      if (!res.ok) throw new Error(res.status === 401 ? 'Your session expired — sign in again, then save.' : `Not saved (error ${res.status}).`);
      setSavedSnapshot(snapshot);
      setMessage({ ok: true, text: 'Saved. The site shows it within 30 seconds.' });
    } catch (e: any) {
      setMessage({ ok: false, text: e.message || 'Not saved.' });
    } finally {
      setSaving(false);
    }
  }

  function resetSection(id: string) {
    if (!page || !confirm('Put this section back to its original content? Your changes in it will be lost when you save.')) return;
    setValues((v) => ({ ...v, [id]: mergedSections(page, null)[id] }));
    setEnabled((e) => { const { [id]: _, ...rest } = e; return rest; });
  }

  if (!page) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--slate-500)' }}>There is no editable page called “{pageKey}”.</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--slate-50)' }}>
      <div style={{ background: 'var(--white)', borderBottom: '1px solid var(--slate-200b)', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>{page.icon} {page.label}</h1>
          <p style={{ fontSize: 12, color: message ? (message.ok ? 'var(--teal-700)' : 'var(--red-600)') : 'var(--slate-400)', margin: '3px 0 0' }}>
            {message?.text ?? (dirty ? 'You have unsaved changes.' : 'Everything here appears on the site. English and Georgian side by side.')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a href={`${SITE}${page.path}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--slate-600)', border: '1px solid var(--slate-200)', borderRadius: 8, padding: '7px 12px', textDecoration: 'none' }}>View page ↗</a>
          <button onClick={save} disabled={saving || !dirty}
            style={{ background: dirty ? 'var(--teal-600)' : 'var(--slate-200)', color: dirty ? 'var(--white)' : 'var(--slate-500)', border: 'none', borderRadius: 9, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: dirty && !saving ? 'pointer' : 'default' }}>
            {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ padding: 60, textAlign: 'center', color: 'var(--slate-400)' }}>Loading…</p>
      ) : (
        <div style={{ padding: 28, maxWidth: 900, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {page.sections.map((section) => {
            const on = enabled[section.id] !== false;
            const expanded = open === section.id;
            const canHide = section.canHide !== false;
            return (
              <div key={section.id} style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--slate-200b)', opacity: on ? 1 : 0.7 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px' }}>
                  {canHide && (
                    <button type="button" role="switch" aria-checked={on} aria-label={`Show ${section.label} on the site`}
                      onClick={() => setEnabled((e) => ({ ...e, [section.id]: !on }))}
                      style={{ width: 40, height: 22, borderRadius: 11, background: on ? 'var(--teal-600)' : 'var(--slate-200)', position: 'relative', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: 'var(--white)', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                    </button>
                  )}
                  <button type="button" onClick={() => setOpen(expanded ? null : section.id)} aria-expanded={expanded}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                    <span style={{ fontSize: 18 }}>{section.icon}</span>
                    <span style={{ flex: 1 }}>
                      <span style={{ display: 'block', fontWeight: 700, color: 'var(--slate-900)', fontSize: 14 }}>{section.label}</span>
                      <span style={{ display: 'block', fontSize: 11, color: 'var(--slate-400)', marginTop: 2 }}>{canHide ? (on ? 'Shown on the site' : 'Hidden from the site') : 'Always shown'}</span>
                    </span>
                    <span style={{ color: 'var(--slate-400)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>⌄</span>
                  </button>
                </div>
                {expanded && (
                  <div style={{ borderTop: '1px solid var(--slate-100)', padding: '20px 20px 18px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {section.fields.map((f) => (
                      <FieldEditor key={f.key} field={f} value={values[section.id]?.[f.key]}
                        onChange={(v) => setValues((all) => ({ ...all, [section.id]: { ...all[section.id], [f.key]: v } }))} />
                    ))}
                    <div style={{ textAlign: 'right' }}>
                      <button type="button" onClick={() => resetSection(section.id)} style={{ background: 'none', border: 'none', color: 'var(--slate-400)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
                        Reset this section to the original
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
