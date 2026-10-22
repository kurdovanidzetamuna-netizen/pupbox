'use client';
import type { PlanItem } from '../../_lib/types';
import { num } from '../../_lib/plan-config';
import GiftBoxesSection from './GiftBoxesSection';
import CostBreakdown from './CostBreakdown';
import type { PlanBuilderState } from './usePlanBuilder';
import { NumInput } from '@/components/NumberField';

export default function BoxBuilderTab({ b }: { b: PlanBuilderState }) {
  const {
    boxItems, saving, boxCount, setActiveBox, catalogueSearch, setCatalogueSearch,
    setShowNewBoxItemDrawer, syncedCfg, safeActiveBox, activeItems, activeProductTotal,
    allProductTotal, updateBox, addItem, removeItem, setItemQty, setItemPrice, save,
    unaddedItems
  } = b;
  return (
    <>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>

      {/* Left: product picker + items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Box selector tabs for multi-box plans */}
        {boxCount > 1 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Array.from({ length: boxCount }, (_, i) => {
              const bItems = syncedCfg.boxes[i]?.items || [];
              const bTotal = bItems.reduce((s: number, it: PlanItem) => s + it.price * it.qty, 0);
              const isActive = safeActiveBox === i;
              return (
                <button
                  key={i}
                  onClick={() => { setActiveBox(i); setCatalogueSearch(''); }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '8px 14px', borderRadius: 10, border: `2px solid ${isActive ? 'var(--teal-600)' : 'var(--slate-200)'}`, background: isActive ? 'var(--teal-50)' : 'var(--white)', cursor: 'pointer', minWidth: 90, transition: 'all 0.12s' }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? 'var(--teal-600)' : 'var(--slate-500)' }}>Box {i + 1}</span>
                  <span style={{ fontSize: 10, color: isActive ? 'var(--teal-600)' : 'var(--slate-400)', marginTop: 1 }}>
                    {bItems.length} item{bItems.length !== 1 ? 's' : ''} · ₾{bTotal.toFixed(2)}
                  </span>
                </button>
              );
            })}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--slate-400)' }}>Total across all boxes:</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)' }}>₾{allProductTotal.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Current box items */}
        <div style={{ background: 'var(--slate-50)', borderRadius: 12, border: '1px solid var(--slate-200b)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--slate-200b)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)', flex: 1 }}>
              {boxCount > 1 ? `Box ${safeActiveBox + 1} Contents` : 'Box Contents'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--slate-400)' }}>{activeItems.length} item{activeItems.length !== 1 ? 's' : ''} · ₾{activeProductTotal.toFixed(2)} product cost</span>
            {activeItems.length > 0 && (
              <button
                onClick={() => updateBox(safeActiveBox, () => [])}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--red-50)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--red-300)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--red-600)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--white)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--slate-200)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--slate-500)'; }}
                onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'; }}
                onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                style={{ background: 'var(--white)', color: 'var(--slate-500)', border: '1px solid var(--slate-200)', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s, border-color 0.15s, color 0.15s, transform 0.1s' }}
              >
                Remove All
              </button>
            )}
          </div>
          {activeItems.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--slate-400)', fontSize: 13 }}>
              No items added yet — add products from the catalogue below
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Product', 'Box price (₾)', 'Qty', 'Line total', ''].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Qty' || h === 'Line total' ? 'center' : 'left', fontSize: 10, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', background: 'var(--slate-100)', borderBottom: '1px solid var(--slate-200b)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeItems.map((item: PlanItem) => (
                  <tr key={item.productId} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--slate-800)' }}>{item.name}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ color: 'var(--slate-400)', fontSize: 12 }}>₾</span>
                        <NumInput min="0" step="0.01"
                          value={item.price}
                          onChange={e => setItemPrice(item.productId, num(e.target.value))}
                          style={{ width: 70, border: '1px solid var(--slate-200)', borderRadius: 7, padding: '5px 8px', fontSize: 12, outline: 'none', textAlign: 'right' }}
                        />
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                        <button onClick={() => setItemQty(item.productId, item.qty - 1)} style={{ width: 22, height: 22, border: '1px solid var(--slate-200)', borderRadius: 5, background: 'var(--white)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate-500)' }}>−</button>
                        <span style={{ width: 24, textAlign: 'center', fontWeight: 700, color: 'var(--slate-900)' }}>{item.qty}</span>
                        <button onClick={() => setItemQty(item.productId, item.qty + 1)} style={{ width: 22, height: 22, border: '1px solid var(--slate-200)', borderRadius: 5, background: 'var(--white)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate-500)' }}>+</button>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--slate-900)' }}>₾{(item.price * item.qty).toFixed(2)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <button onClick={() => removeItem(item.productId)} style={{ background: 'var(--red-50)', color: 'var(--red-600)', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Add from catalogue */}
        {/* New Box Item button — above catalogue */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setShowNewBoxItemDrawer(true)}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--slate-50)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--slate-300)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--white)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--slate-200)'; }}
            onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'; }}
            onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
            style={{ background: 'var(--white)', color: 'var(--slate-700)', border: '1.5px solid var(--slate-200)', borderRadius: 9, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s, transform 0.1s' }}
          >+ New Box Item</button>
        </div>

        {boxItems.length > 0 && (
          <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--slate-200b)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--slate-200b)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)', flex: 1 }}>Add from Box Items catalogue</span>
              {unaddedItems.length > 0 && (
                <button
                  onClick={() => {
                    const visible = unaddedItems.filter(p => !catalogueSearch || p.name.toLowerCase().includes(catalogueSearch.toLowerCase()) || (p.sku || '').toLowerCase().includes(catalogueSearch.toLowerCase()) || (p.brand || '').toLowerCase().includes(catalogueSearch.toLowerCase()));
                    visible.forEach(p => addItem(p));
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-700)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-600)'; }}
                  onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'; }}
                  onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                  style={{ background: 'var(--teal-600)', color: 'var(--white)', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s, transform 0.1s' }}
                >
                  + Add All
                </button>
              )}
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--slate-400)', pointerEvents: 'none' }}>🔍</span>
                <input
                  value={catalogueSearch}
                  onChange={e => setCatalogueSearch(e.target.value)}
                  placeholder="Search items..."
                  style={{ paddingLeft: 28, paddingRight: catalogueSearch ? 28 : 10, paddingTop: 5, paddingBottom: 5, fontSize: 12, border: '1px solid var(--slate-200)', borderRadius: 8, outline: 'none', width: 160, background: 'var(--slate-50)' }}
                />
                {catalogueSearch && (
                  <button onClick={() => setCatalogueSearch('')} style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--slate-400)', padding: 0, lineHeight: 1 }}>×</button>
                )}
              </div>
            </div>
            {unaddedItems.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {unaddedItems.filter(p => !catalogueSearch || p.name.toLowerCase().includes(catalogueSearch.toLowerCase()) || (p.sku || '').toLowerCase().includes(catalogueSearch.toLowerCase()) || (p.brand || '').toLowerCase().includes(catalogueSearch.toLowerCase())).map(p => (
                  <div
                    key={p.id}
                    onClick={() => addItem(p)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--slate-50)', cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--teal-50)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, color: 'var(--slate-800)', margin: 0, fontSize: 13 }}>{p.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '2px 0 0' }}>RRP ₾{Number(p.price).toFixed(2)}{p.inventory?.quantity !== undefined ? ` · ${p.inventory.quantity} in stock` : ''}</p>
                    </div>
                    <span style={{ background: 'var(--teal-50)', color: 'var(--teal-600)', border: '1px solid var(--teal-200)', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>+ Add</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '14px 16px', fontSize: 12, color: 'var(--green-700)', fontWeight: 600, background: 'var(--green-50)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>✓</span><span>All catalogue items are in this box</span>
              </div>
            )}
          </div>
        )}

        {boxItems.length === 0 && (
          <div style={{ background: 'var(--amber-50)', border: '1px solid var(--amber-200)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--amber-800)' }}>
            💡 No box items found. Go to <strong>Box Items</strong> page and toggle products as box-included first.
          </div>
        )}

        {/* ── Gift Boxes ── */}
        <GiftBoxesSection b={b} />
      </div>

      {/* Right: cost breakdown */}
      <CostBreakdown b={b} />
    </div>
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--slate-200b)' }}>
      <button onClick={() => save()} disabled={saving}
        onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-700)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-600)'; }}
        onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'; }}
        onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
        onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
        style={{ background: 'var(--teal-600)', color: 'var(--white)', border: 'none', borderRadius: 9, padding: '8px 22px', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1, transition: 'background 0.15s, transform 0.1s' }}>
        {saving ? 'Saving…' : '💾 Save Box Builder'}
      </button>
    </div>
    </>
  );
}
