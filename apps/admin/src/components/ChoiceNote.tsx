/** The customer's choices on a personalised item — what to engrave, which size. Fulfilment must see this. */
export default function ChoiceNote({ choice }: { choice?: { engraving?: string; size?: string } | null }) {
  if (!choice || (!choice.engraving && !choice.size)) return null;
  return (
    <p style={{ margin: '3px 0 0', fontSize: 12, fontWeight: 600, color: 'var(--amber-800)', background: 'var(--amber-50)', border: '1px solid var(--amber-200)', borderRadius: 6, padding: '2px 8px', display: 'inline-block' }}>
      ✏️ {[choice.size && `Size ${choice.size}`, choice.engraving && `Engrave: “${choice.engraving}”`].filter(Boolean).join(' · ')}
    </p>
  );
}
