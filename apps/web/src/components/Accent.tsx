import Caps from '@/components/ui/Caps';

/**
 * A heading with one part in teal (optionally in Georgian capitals). The accent is matched inside the heading;
 * if the editor typed it separately instead, it is added at the end.
 */
export default function Accent({ text, accent, className = 'text-teal-600', caps = false }: { text: string; accent?: string; className?: string; caps?: boolean }) {
  const C = (s: string) => (caps ? <Caps text={s} /> : s);
  const a = accent?.trim();
  if (!a) return <>{C(text)}</>;
  const at = text.indexOf(a);
  if (at < 0) return <>{C(text)} <span className={className}>{C(a)}</span></>;
  return <>{C(text.slice(0, at))}<span className={className}>{C(a)}</span>{C(text.slice(at + a.length))}</>;
}
