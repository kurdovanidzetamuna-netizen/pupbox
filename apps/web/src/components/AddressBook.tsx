'use client';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { authFetch, SessionExpiredError } from '@/lib/authFetch';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Field from '@/components/ui/Field';
import PhoneInput, { isValidPhone } from '@/components/ui/PhoneInput';
import IconButton from '@/components/ui/IconButton';
import Menu from '@/components/ui/Menu';
import { Icon } from '@/components/ui/icons';

/** Home, work or a pin, guessed from the address's name. */
const iconFor = (label: string | null) => /სახლ|home|ბინა/i.test(label ?? '') ? 'home' : /სამსახ|work|ოფის|office/i.test(label ?? '') ? 'work' : 'pin';

type Address = { id: string; label: string | null; firstName: string; lastName: string; phone: string; city: string; addressLine1: string; addressLine2: string | null; isDefault: boolean };
const EMPTY = { label: '', firstName: '', lastName: '', phone: '', city: '', addressLine1: '', addressLine2: '' };
const msg = async (res: Response, fallback: string) => {
  const d = await res.json().catch(() => ({}));
  return (Array.isArray(d?.message) ? d.message[0] : d?.message) || fallback;
};

/** Saved delivery addresses: add, edit, remove, and pick the default. */
export default function AddressBook({ onExpired }: { onExpired: () => void }) {
  const { t } = useLanguage();
  const [list, setList] = useState<Address[]>([]);
  const [editing, setEditing] = useState<Address | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toRemove, setToRemove] = useState<Address | null>(null);
  const [removeError, setRemoveError] = useState('');
  const [phoneOk, setPhoneOk] = useState(false);
  const [phoneErr, setPhoneErr] = useState('');

  const load = () => authFetch('/me/addresses').then((r) => r.json()).then((d) => Array.isArray(d) && setList(d))
    .catch((e) => { if (e instanceof SessionExpiredError) onExpired(); });
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function open(a: Address | 'new') {
    setEditing(a); setError(''); setPhoneErr('');
    setPhoneOk(a !== 'new' && isValidPhone(a.phone));
    setForm(a === 'new' ? EMPTY : { label: a.label ?? '', firstName: a.firstName, lastName: a.lastName, phone: a.phone, city: a.city, addressLine1: a.addressLine1, addressLine2: a.addressLine2 ?? '' });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!phoneOk) return setPhoneErr(t('reg.e.phone'));
    setBusy(true); setError('');
    try {
      const isNew = editing === 'new';
      const res = await authFetch(isNew ? '/me/addresses' : `/me/addresses/${(editing as Address).id}`, { method: isNew ? 'POST' : 'PATCH', body: JSON.stringify(form) });
      if (!res.ok) return setError(await msg(res, t('co.e.generic')));
      setEditing(null);
      load();
    } catch (err) {
      if (err instanceof SessionExpiredError) return onExpired();
      setError(t('co.e.generic'));
    } finally { setBusy(false); }
  }

  async function makeDefault(a: Address) {
    setList((l) => l.map((x) => ({ ...x, isDefault: x.id === a.id })));
    await authFetch(`/me/addresses/${a.id}`, { method: 'PATCH', body: JSON.stringify({ isDefault: true }) }).catch(() => {});
    load();
  }

  async function remove() {
    if (!toRemove) return;
    setBusy(true); setRemoveError('');
    try {
      const res = await authFetch(`/me/addresses/${toRemove.id}`, { method: 'DELETE' });
      if (!res.ok) return setRemoveError(await msg(res, t('co.e.generic')));
      setToRemove(null);
      load();
    } catch (err) {
      if (err instanceof SessionExpiredError) return onExpired();
    } finally { setBusy(false); }
  }

  const set = (k: keyof typeof EMPTY) => (v: string) => { setForm((f) => ({ ...f, [k]: v })); setError(''); };

  return (
    <section className="bg-white rounded-3xl ring-1 ring-gray-200/60 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-[15px] font-bold text-gray-900 flex items-center gap-2">
          {t('addr.book')}
          {list.length > 0 && <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{list.length}</span>}
        </h2>
        <IconButton icon="plus" label={t('addr.add')} tone="primary" onClick={() => open('new')} />
      </div>
      <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {list.map((a) => (
          <li key={a.id} className={`group relative rounded-2xl p-4 ring-1 transition-colors ${a.isDefault ? 'ring-teal-200 bg-gradient-to-br from-teal-50/70 to-white' : 'ring-gray-200/70 hover:ring-gray-300'}`}>
            <div className="flex items-start gap-3">
              <span className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${a.isDefault ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                <Icon name={iconFor(a.label)} className="w-5 h-5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-900 truncate flex items-center gap-1.5">
                  {a.label || `${a.firstName} ${a.lastName}`}
                  {a.isDefault && <span title={t('addr.default')} aria-label={t('addr.default')} className="text-amber-400"><Icon name="star" className="w-3.5 h-3.5" strokeWidth={2.4} /></span>}
                </p>
                <p className="text-[12px] text-gray-500 truncate">{a.city}, {a.addressLine1}</p>
                <p className="text-[12px] text-gray-400 truncate flex items-center gap-1 mt-0.5"><Icon name="phone" className="w-3 h-3" />{a.phone}</p>
              </div>
              <div className="-mr-1 -mt-1">
                <Menu label={t('addr.actions')} items={[
                  { icon: 'edit', label: t('dogs.edit'), onClick: () => open(a) },
                  ...(!a.isDefault ? [{ icon: 'star', label: t('addr.makeDefault'), onClick: () => makeDefault(a) }] : []),
                  { icon: 'trash', label: t('dogs.remove'), tone: 'danger' as const, onClick: () => { setRemoveError(''); setToRemove(a); } },
                ]} />
              </div>
            </div>
          </li>
        ))}
        <li>
          <button type="button" onClick={() => open('new')} aria-label={t('addr.add')}
            className="w-full h-full min-h-[84px] rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-teal-300 hover:text-teal-600 hover:bg-teal-50/40 transition-colors flex flex-col items-center justify-center gap-1">
            <Icon name="plus" className="w-5 h-5" strokeWidth={2.2} />
            {list.length === 0 && <span className="text-[12px] font-medium">{t('addr.add')}</span>}
          </button>
        </li>
      </ul>

      <Modal open={editing !== null} onClose={() => !busy && setEditing(null)} title={editing === 'new' ? t('addr.add') : t('addr.edit')} size="md">
        <form onSubmit={save} className="space-y-3" noValidate>
          <Field id="a-label" label={t('addr.label')} value={form.label} onChange={set('label')} maxLength={40} hint={t('addr.labelHint')} />
          <div className="grid grid-cols-2 gap-3">
            <Field id="a-first" label={t('co.f.firstName')} value={form.firstName} onChange={set('firstName')} autoComplete="given-name" required />
            <Field id="a-last" label={t('co.f.lastName')} value={form.lastName} onChange={set('lastName')} autoComplete="family-name" required />
          </div>
          <PhoneInput floatLabel key={editing === 'new' ? 'new' : editing?.id ?? 'none'} id="a-phone" label={t('co.f.phone')} value={form.phone} required
            onChange={(v, valid) => { set('phone')(v); setPhoneOk(valid); setPhoneErr(''); }} error={phoneErr} />
          <Field id="a-city" label={t('co.f.city')} value={form.city} onChange={set('city')} autoComplete="address-level2" required />
          <Field id="a-line1" label={t('co.f.address')} value={form.addressLine1} onChange={set('addressLine1')} autoComplete="address-line1" required />
          <Field id="a-line2" label={t('co.f.address2')} value={form.addressLine2} onChange={set('addressLine2')} autoComplete="address-line2" />
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditing(null)} className="px-5 py-2.5 rounded-full text-sm font-semibold text-gray-600 hover:bg-gray-100">{t('ui.cancel')}</button>
            <button type="submit" disabled={busy} className="bg-teal-600 text-white text-sm font-semibold px-6 py-2.5 hover:bg-teal-700">{busy ? t('ui.wait') : t('acc.save')}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!toRemove} onClose={() => setToRemove(null)} onConfirm={remove} busy={busy} error={removeError} tone="danger"
        title={t('addr.removeTitle')} message={toRemove ? `${toRemove.city}, ${toRemove.addressLine1}` : ''} confirmLabel={t('dogs.remove')} />
    </section>
  );
}
