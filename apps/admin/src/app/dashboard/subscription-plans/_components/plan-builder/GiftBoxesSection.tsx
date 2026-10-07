'use client';
import type { PlanBuilderState } from './usePlanBuilder';

/** Free bonus boxes bundled with the plan, each with its own items. */
export default function GiftBoxesSection({ b }: { b: PlanBuilderState }) {
  const {
    boxItems, cfg, giftSearch, setGiftSearch, addGiftBox, removeGiftBox, updateGiftBox,
    addGiftItem, removeGiftItem, setGiftItemQty
  } = b;
  return (
    <div style={{ borderTop: '2px dashed var(--slate-200)', paddingTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)' }}>🎁 Gift Boxes</span>
          <span style={{ fontSize: 11, color: 'var(--slate-400)', marginLeft: 8 }}>Free bonus boxes included with this plan</span>
        </div>
        <button
          onClick={addGiftBox}
          style={{ background: 'var(--fuchsia-50)', color: 'var(--purple-600)', border: '1px solid var(--purple-200)', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
        >
          + Add Gift Box
        </button>
      </div>

      {(cfg.giftBoxes || []).length === 0 && (
        <div style={{ background: 'var(--fuchsia-50)', border: '1px dashed var(--purple-200)', borderRadius: 10, padding: '20px 16px', textAlign: 'center', color: 'var(--purple-600)', fontSize: 13 }}>
          No gift boxes yet — click "+ Add Gift Box" to create a free bonus box for this plan
        </div>
      )}

      {(cfg.giftBoxes || []).map((gift, gi) => {
        const gTotal = gift.items.reduce((s, i) => s + i.price * i.qty, 0);
        const gUnadded = boxItems.filter(b => !gift.items.find(i => i.productId === b.id));
        return (
          <div key={gift.id} style={{ background: 'var(--fuchsia-50)', border: '1px solid var(--purple-200)', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
            {/* Gift box header */}
            <div style={{ padding: '10px 14px', background: 'var(--violet-50)', borderBottom: '1px solid var(--purple-200)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>🎁</span>
              <input
                value={gift.label}
                onChange={e => updateGiftBox(gift.id, { label: e.target.value })}
                style={{ flex: 1, border: '1px solid var(--purple-200)', borderRadius: 7, padding: '4px 8px', fontSize: 13, fontWeight: 700, outline: 'none', background: 'var(--white)', color: 'var(--violet-700)' }}
              />
              <input
                value={gift.description}
                onChange={e => updateGiftBox(gift.id, { description: e.target.value })}
                placeholder="Short description (shown to customer)"
                style={{ flex: 2, border: '1px solid var(--purple-200)', borderRadius: 7, padding: '4px 8px', fontSize: 12, outline: 'none', background: 'var(--white)', color: 'var(--slate-500)' }}
              />
              <span style={{ fontSize: 11, color: 'var(--purple-600)', fontWeight: 600, whiteSpace: 'nowrap' }}>₾{gTotal.toFixed(2)} cost</span>
              <button onClick={() => removeGiftBox(gift.id)} style={{ background: 'var(--red-50)', color: 'var(--red-600)', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>✕ Remove</button>
            </div>

            {/* Gift box items */}
            {gift.items.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <tbody>
                  {gift.items.map(item => (
                    <tr key={item.productId} style={{ borderBottom: '1px solid var(--purple-100)' }}>
                      <td style={{ padding: '7px 14px', fontWeight: 600, color: 'var(--slate-800)' }}>{item.name}</td>
                      <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                          <button onClick={() => setGiftItemQty(gift.id, item.productId, item.qty - 1)} style={{ width: 20, height: 20, border: '1px solid var(--purple-200)', borderRadius: 4, background: 'var(--white)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--violet-700)' }}>−</button>
                          <span style={{ width: 20, textAlign: 'center', fontWeight: 700, color: 'var(--violet-700)' }}>{item.qty}</span>
                          <button onClick={() => setGiftItemQty(gift.id, item.productId, item.qty + 1)} style={{ width: 20, height: 20, border: '1px solid var(--purple-200)', borderRadius: 4, background: 'var(--white)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--violet-700)' }}>+</button>
                        </div>
                      </td>
                      <td style={{ padding: '7px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--violet-700)' }}>₾{(item.price * item.qty).toFixed(2)}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                        <button onClick={() => removeGiftItem(gift.id, item.productId)} style={{ background: 'var(--red-50)', color: 'var(--red-600)', border: 'none', borderRadius: 5, padding: '2px 6px', fontSize: 11, cursor: 'pointer' }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Add items to gift box */}
            {gUnadded.length > 0 && (
              <div style={{ padding: '8px 14px', borderTop: gift.items.length > 0 ? '1px solid var(--purple-100)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <p style={{ fontSize: 11, color: 'var(--purple-600)', fontWeight: 600, margin: 0, flex: 1 }}>Add items to this gift box:</p>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--purple-400)', pointerEvents: 'none' }}>🔍</span>
                    <input
                      value={giftSearch[gift.id] || ''}
                      onChange={e => setGiftSearch(prev => ({ ...prev, [gift.id]: e.target.value }))}
                      placeholder="Search..."
                      style={{ paddingLeft: 24, paddingRight: giftSearch[gift.id] ? 22 : 8, paddingTop: 3, paddingBottom: 3, fontSize: 11, border: '1px solid var(--purple-200)', borderRadius: 7, outline: 'none', width: 120, background: 'var(--white)' }}
                    />
                    {giftSearch[gift.id] && (
                      <button onClick={() => setGiftSearch(prev => ({ ...prev, [gift.id]: '' }))} style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--purple-400)', padding: 0, lineHeight: 1 }}>×</button>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {gUnadded.filter(p => { const s = giftSearch[gift.id] || ''; return !s || p.name.toLowerCase().includes(s.toLowerCase()) || (p.sku || '').toLowerCase().includes(s.toLowerCase()); }).map(p => (
                    <button
                      key={p.id}
                      onClick={() => addGiftItem(gift.id, p)}
                      style={{ background: 'var(--white)', color: 'var(--violet-700)', border: '1px solid var(--purple-200)', borderRadius: 7, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--violet-50)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--white)')}
                    >
                      + {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

    </div>
  );
}
