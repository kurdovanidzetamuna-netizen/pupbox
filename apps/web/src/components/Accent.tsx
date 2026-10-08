/**
 * A heading with one part in teal. The accent is matched inside the heading;
 * if the editor typed it separately instead, it is added at the end.
 */
export default function Accent({ text, accent, className = 'text-teal-600' }: { text: string; accent?: string; className?: string }) {
  const a = accent?.trim();
  if (!a) return <>{text}</>;
  const at = text.indexOf(a);
  if (at < 0) return <>{text} <span className={className}>{a}</span></>;
  return <>{text.slice(0, at)}<span className={className}>{a}</span>{text.slice(at + a.length)}</>;
}
