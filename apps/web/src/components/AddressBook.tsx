'use client';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { authFetch, SessionExpiredError } from '@/lib/authFetch';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Field from '@/components/ui/Field';
import MapPicker, { type Pin } from '@/components/MapPicker';
import PhoneInput, { isValidPhone } from '@/components/ui/PhoneInput';
import Menu from '@/components/ui/Menu';
import { Icon } from '@/components/ui/icons';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

/** Home, work or a pin, guessed from the address's name. */
/** +995 599 11 12 22 rather than +995599111222. */
const prettyPhone = (p: string) => parsePhoneNumberFromString(p, 'GE')?.formatInternational() ?? p;

const iconFor = (label: string | null) => /სახლ|home|ბინა/i.test(label ?? '') ? 'home' : /სამსახ|work|ოფის|office/i.test(label ?? '') ? 'work' : 'pin';

type Address = { id: string; label: string | null; firstName: string; lastName: string; phone: string; city: string; addressLine1: string; addressLine2: string | null; latitude: number | null; longitude: number | null; isDefault: boolean };
const EMPTY = { label: '', firstName: '', lastName: '', phone: '', city: '', addressLine1: '', addressLine2: '' };
const msg = async (res: Response, fallback: string) => {
  const d = await res.json().catch(() => ({}));
  return (Array.isArray(d?.message) ? d.message[0] : d?.message) || fallback;
};

/** Saved delivery addresses: add, edit, remove, and pick the default. */
export default function AddressBook({ onExpired, addTick = 0, onCount }: {
  onExpired: () => void;
  /** Bumped by the tab's ＋ button to open the "new address" form. */
  addTick?: number;
  onCount?: (n: number) => void;
}) {
  const { t } = useLanguage();
  const [list, setList] = useState<Address[]>([]);
  const [editing, setEditing] = useState<Address | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toRemove, setToRemove] = useState<Address | null>(null);
  const [removeError, setRemoveError] = useState('');
  const [phoneOk, setPhoneOk] = useState(false);
  const [pin, setPin] = useState<Pin | null>(null);
  const [phoneErr, setPhoneErr] = useState('');

  const load = () => authFetch('/me/addresses').then((r) => r.json()).then((d) => Array.isArray(d) && setList(d))
    .catch((e) => { if (e instanceof SessionExpiredError) onExpired(); });
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (addTick) open('new'); }, [addTick]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { onCount?.(list.length); }, [list.length]); // eslint-disable-line react-hooks/exhaustive-deps

  function open(a: Address | 'new') {
    setEditing(a); setError(''); setPhoneErr('');
    setPhoneOk(a !== 'new' && isValidPhone(a.phone));
    setPin(a !== 'new' && a.latitude != null && a.longitude != null ? { lat: a.latitude, lng: a.longitude } : null);
    setForm(a === 'new' ? EMPTY : { label: a.label ?? '', firstName: a.firstName, lastName: a.lastName, phone: a.phone, city: a.city, addressLine1: a.addressLine1, addressLine2: a.addressLine2 ?? '' });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!phoneOk) return setPhoneErr(t('reg.e.phone'));
    setBusy(true); setError('');
    try {
      const isNew = editing === 'new';
      const res = await authFetch(isNew ? '/me/addresses' : `/me/addresses/${(editing as Address).id}`, { method: isNew ? 'POST' : 'PATCH', body: JSON.stringify({ ...form, latitude: pin?.lat ?? null, longitude: pin?.lng ?? null }) });
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
    <>
      <ul className="divide-y divide-gray-100">
        {list.map((a) => (
          <li key={a.id} className="flex items-center gap-3 py-2.5 first:pt-0">
            <span className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${a.isDefault ? 'bg-teal-50 text-teal-600' : 'bg-gray-100 text-gray-500'}`}>
              <Icon name={iconFor(a.label)} className="w-[18px] h-[18px]" />
            </span>
            <button type="button" onClick={() => open(a)} className="flex-1 min-w-0 text-left">
              <p className="text-[13px] font-semibold text-gray-900 truncate flex items-center gap-1.5">
                {a.label || `${a.firstName} ${a.lastName}`}
                {a.isDefault && <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-teal-700 bg-teal-50 rounded-full px-1.5 py-0.5"><Icon name="star" className="w-2.5 h-2.5" strokeWidth={2.8} />{t('addr.default')}</span>}
              </p>
              <p className="text-[12px] text-gray-500 truncate">{a.city}, {a.addressLine1} · {prettyPhone(a.phone)}</p>
            </button>
            <Menu label={t('addr.actions')} items={[
              { icon: 'edit', label: t('dogs.edit'), onClick: () => open(a) },
              ...(!a.isDefault ? [{ icon: 'star', label: t('addr.makeDefault'), onClick: () => makeDefault(a) }] : []),
              { icon: 'trash', label: t('dogs.remove'), tone: 'danger' as const, onClick: () => { setRemoveError(''); setToRemove(a); } },
            ]} />
          </li>
        ))}
      </ul>
      {list.length === 0 && (
        <button type="button" onClick={() => open('new')}
          className="w-full flex items-center gap-3 rounded-2xl border-2 border-dashed border-gray-200 px-4 py-3 text-gray-400 hover:border-teal-300 hover:text-teal-600 hover:bg-teal-50/40 transition-colors">
          <Icon name="pin" className="w-5 h-5" /><span className="text-[12.5px] font-medium">{t('addr.add')}</span>
        </button>
      )}

      <Modal open={editing !== null} onClose={() => !busy && setEditing(null)} title={editing === 'new' ? t('addr.add') : t('addr.edit')} size="lg"
        footer={<>
          {error && <p className="mr-auto text-[12.5px] text-red-600" role="alert">{error}</p>}
          <button type="button" onClick={() => setEditing(null)} className="px-4 sm:px-5 py-2.5 rounded-full text-[13px] font-semibold text-gray-600 hover:bg-gray-100">{t('ui.cancel')}</button>
          <button type="submit" form="address-form" disabled={busy} className="bg-teal-600 text-white text-[13px] font-semibold px-5 sm:px-6 py-2.5 hover:bg-teal-700">{busy ? t('ui.wait') : t(editing === 'new' ? 'addr.saveNew' : 'acc.save')}</button>
        </>}>
        {/* Phones: one column, map first. Tablets and up: where (map) | who. */}
        {/* Phones: one column, map first. Tablets and up: the map fills the
            left side; every field sits on the right, so both end together. */}
        <form id="address-form" onSubmit={save} noValidate className="grid md:grid-cols-2 gap-x-6 gap-y-3 pt-1">
          <div className="min-w-0 md:min-h-[420px]">
            <MapPicker key={`map-${editing === 'new' ? 'new' : editing?.id ?? 'none'}`} value={pin} mapClassName="h-56 sm:h-64 md:h-auto md:flex-1"
              onPick={(p) => {
                setPin({ lat: p.lat, lng: p.lng });
                setForm((f) => ({ ...f, ...(p.city !== undefined ? { city: p.city, addressLine1: p.street ?? '' } : {}) }));
              }} />
          </div>
          <div className="space-y-3 min-w-0">
            <Field id="a-city" label={t('co.f.city')} value={form.city} onChange={set('city')} autoComplete="address-level2" required />
            <Field id="a-line1" label={t('co.f.address')} value={form.addressLine1} onChange={set('addressLine1')} autoComplete="address-line1" required />
            <Field id="a-line2" label={t('co.f.address2')} value={form.addressLine2} onChange={set('addressLine2')} autoComplete="address-line2" />
            <div className="pt-1 border-t border-gray-100" />
            <div className="grid grid-cols-2 gap-3">
              <Field id="a-first" label={t('co.f.firstName')} value={form.firstName} onChange={set('firstName')} autoComplete="given-name" required />
              <Field id="a-last" label={t('co.f.lastName')} value={form.lastName} onChange={set('lastName')} autoComplete="family-name" required />
            </div>
            <PhoneInput floatLabel key={editing === 'new' ? 'new' : editing?.id ?? 'none'} id="a-phone" label={t('co.f.phone')} value={form.phone} required
              onChange={(v, valid) => { set('phone')(v); setPhoneOk(valid); setPhoneErr(''); }} error={phoneErr} />
            <Field id="a-label" label={t('addr.label')} value={form.label} onChange={set('label')} maxLength={40} hint={t('addr.labelHint')} />
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!toRemove} onClose={() => setToRemove(null)} onConfirm={remove} busy={busy} error={removeError} tone="danger"
        title={t('addr.removeTitle')} message={toRemove ? `${toRemove.city}, ${toRemove.addressLine1}` : ''} confirmLabel={t('dogs.remove')} />
    </>
  );
}
