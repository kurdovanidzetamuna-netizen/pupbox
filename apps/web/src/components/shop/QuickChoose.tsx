'use client';
import Link from '@/components/LangLink';
import Modal from '@/components/ui/Modal';
import Field from '@/components/ui/Field';
import { FieldError } from '@/components/ui/FormError';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import QuantityStepper from '@/components/shop/QuantityStepper';
import SizeChips from '@/components/shop/SizeChips';
import AddButton from '@/components/shop/AddButton';
import PicksList from '@/components/shop/PicksList';
import type { Choice } from '@/lib/useChoice';

const money = (n: unknown) => `₾${Number(n).toFixed(2)}`;

/**
 * Choosing from the shop list without leaving it: size, name to engrave and
 * how many, with what was already picked underneath. Shares its state with
 * the card, so a size tapped on the card is already chosen here.
 */
export default function QuickChoose({ open, onClose, product, name, img, c }: {
  open: boolean;
  onClose: () => void;
  product: any;
  name: string;
  img?: string;
  c: Choice;
}) {
  const { t } = useLanguage();
  const sale = product.salePrice && Number(product.salePrice) < Number(product.price);
  const unit = Number(sale ? product.salePrice : product.price);

  return (
    <Modal open={open} onClose={onClose} title={name}
      footer={<div className="w-full flex items-center gap-2.5">
        <QuantityStepper value={c.qty} onLess={() => c.setQty((q) => Math.max(1, q - 1))} onMore={() => c.setQty((q) => Math.min(c.room || 1, q + 1))} max={c.room} />
        <AddButton picked={c.picked} inBasket={c.basket.inCart} qty={c.qty} unit={unit} busy={c.basket.busy} disabled={c.room === 0} onClick={c.add} className="flex-1" />
      </div>}>
      <div className="flex items-center gap-3 mb-4">
        <span className="w-16 h-16 shrink-0 rounded-2xl overflow-hidden bg-teal-50/60 flex items-center justify-center text-2xl">
          {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : <span aria-hidden="true">🐾</span>}
        </span>
        <div className="min-w-0">
          <p className={`text-[17px] font-extrabold ${sale ? 'text-peach-600' : 'text-gray-900'}`}>{money(unit)}</p>
          <Link href={`/shop/${product.slug}`} onClick={onClose} className="text-[12px] font-semibold text-teal-700 hover:underline">{t('shop.details')}</Link>
        </div>
      </div>

      {c.sizes.length > 0 && (
        <div className="mb-4">
          <p className="text-[12px] font-semibold text-gray-500 mb-1.5">{t('pdp.size')} <span className="text-red-400">*</span></p>
          <SizeChips sizes={c.sizes} value={c.size} onPick={c.setSize} counts={c.sizeCounts} error={!!c.errs.size} label={t('pdp.size')} />
          {c.errs.size && <FieldError message={c.errs.size} />}
        </div>
      )}
      {c.engr && (
        <div className="mb-4">
          <Field id={`qc-engraving-${product.id}`} label={t('pdp.p.name')} value={c.engraving} required maxLength={c.engr.maxLength} error={c.errs.engraving}
            hint={fill(t('pdp.p.hint'), { n: c.engr.maxLength - [...c.engraving].length })} onChange={c.setEngraving} />
        </div>
      )}
      {c.basket.error && <FieldError message={c.basket.error} />}
      <PicksList c={c} />
    </Modal>
  );
}
