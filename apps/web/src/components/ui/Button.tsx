'use client';
import SmartLink from '@/components/SmartLink';
import { Icon } from './icons';

const SIZE = {
  sm: 'h-8 px-3 gap-1.5 text-[12.5px] rounded-[11px]',
  md: 'h-10 px-4 gap-2 text-[13.5px] rounded-[13px]',
  /** Full width, for the one main action of a form (sign in, next, pay). */
  lg: 'w-full h-12 px-5 gap-2 text-[14.5px] rounded-[16px] font-bold',
} as const;
const TONE = {
  primary: 'bg-teal-600 text-white hover:bg-teal-700',
  soft: 'bg-teal-50 text-teal-700 hover:bg-teal-100',
  ghost: 'text-gray-600 hover:bg-gray-100',
} as const;

/** The one look for a labelled button or link: card-style rounded corners; `lg` is the full-width main action of a form. */
export function buttonClass(size: keyof typeof SIZE = 'md', tone: keyof typeof TONE = 'primary') {
  return `inline-flex items-center justify-center font-semibold whitespace-nowrap transition-colors disabled:opacity-50 ${SIZE[size]} ${TONE[tone]}`;
}

/**
 * A small pill with an icon and a short label, for links that take you
 * somewhere (view plans, go to shop). Actions inside forms and pop-ups use
 * IconButton instead.
 */
export default function Button({ icon, label, href, onClick, size = 'md', tone = 'primary', type = 'button', disabled, className = '' }: {
  icon?: string;
  label: string;
  href?: string;
  onClick?: () => void;
  size?: keyof typeof SIZE;
  tone?: keyof typeof TONE;
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
}) {
  const cls = `${buttonClass(size, tone)} ${className}`;
  const body = <>{icon && <Icon name={icon} className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} strokeWidth={2.2} />}{label}</>;
  return href
    ? <SmartLink href={href} className={cls}>{body}</SmartLink>
    : <button type={type} onClick={onClick} disabled={disabled} className={cls}>{body}</button>;
}
