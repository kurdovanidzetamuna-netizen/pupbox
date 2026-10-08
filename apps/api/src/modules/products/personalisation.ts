import { BadRequestException } from '@nestjs/common';

/** What a product lets customers choose: a name to engrave, a size, or both. */
export type PersonalisationConfig = {
  engraving?: { maxLength: number };
  sizes?: string[];
};

/** What a customer chose, stored on the cart line and copied to the order. */
export type PersonalisationChoice = {
  engraving?: string;
  size?: string;
};

const MAX_ENGRAVING = 40;

/** Cleans what admin entered; null when the product has nothing to choose. */
export function parseConfig(raw: unknown): PersonalisationConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as any;
  const out: PersonalisationConfig = {};
  const max = Math.round(Number(r.engraving?.maxLength));
  if (r.engraving && max > 0) out.engraving = { maxLength: Math.min(max, MAX_ENGRAVING) };
  const sizes = Array.isArray(r.sizes)
    ? [...new Set(r.sizes.map((s: unknown) => String(s ?? '').trim().slice(0, 20)).filter(Boolean))].slice(0, 10) as string[]
    : [];
  if (sizes.length) out.sizes = sizes;
  return out.engraving || out.sizes ? out : null;
}

/**
 * Checks a customer's choices against the product. Products without
 * personalisation ignore whatever was sent; personalised ones refuse to go in
 * the cart until every choice is made, so nothing ships unengraved.
 */
export function checkChoice(config: unknown, input: unknown): PersonalisationChoice | null {
  const cfg = parseConfig(config);
  if (!cfg) return null;
  const i = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const out: PersonalisationChoice = {};

  if (cfg.engraving) {
    // One line of plain text: no control characters, single spaces.
    const text = String(i.engraving ?? '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
    if (!text) throw new BadRequestException('Enter the name to engrave');
    if ([...text].length > cfg.engraving.maxLength) throw new BadRequestException(`The engraving can be up to ${cfg.engraving.maxLength} characters`);
    out.engraving = text;
  }
  if (cfg.sizes) {
    const size = String(i.size ?? '');
    if (!cfg.sizes.includes(size)) throw new BadRequestException('Choose a size');
    out.size = size;
  }
  return out;
}

/**
 * Two cart lines are the same item only if the choices match too. Compared
 * field by field: Postgres returns JSON keys in its own order.
 */
export function sameChoice(a: unknown, b: unknown) {
  const x = (a ?? {}) as PersonalisationChoice, y = (b ?? {}) as PersonalisationChoice;
  return (x.engraving ?? '') === (y.engraving ?? '') && (x.size ?? '') === (y.size ?? '');
}
