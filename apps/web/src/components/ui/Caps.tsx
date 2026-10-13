/**
 * Georgian titles in capital letters (Mtavruli), after bog.ge. CSS can't do
 * this — browsers don't uppercase Georgian — so the letters are swapped when
 * drawn. Screen readers and search engines get the ordinary text.
 */
const toMtavruli = (s: string) => s.replace(/[ა-ჺჽ-ჿ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0xbc0));

export default function Caps({ text }: { text: string }) {
  const caps = toMtavruli(text);
  if (caps === text) return <>{text}</>;
  return <><span aria-hidden="true">{caps}</span><span className="sr-only">{text}</span></>;
}
