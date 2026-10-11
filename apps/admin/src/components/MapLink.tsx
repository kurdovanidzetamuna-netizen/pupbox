/** Google Maps link for an address's pin (works without any key). */
export const mapUrl = (a: { latitude?: number | null; longitude?: number | null } | null | undefined) =>
  a?.latitude != null && a?.longitude != null ? `https://www.google.com/maps/search/?api=1&query=${a.latitude},${a.longitude}` : '';

/** "Map" link next to an address, when the customer set a pin. */
export default function MapLink({ address }: { address: { latitude?: number | null; longitude?: number | null } | null | undefined }) {
  const url = mapUrl(address);
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      style={{ marginLeft: 6, fontSize: 12, fontWeight: 600, color: 'var(--teal-700, #0f766e)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
      📍 Map ↗
    </a>
  );
}
