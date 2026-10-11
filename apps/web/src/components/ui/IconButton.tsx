'use client';
import { Icon } from './icons';

/**
 * A round icon-only button with a small tooltip on hover/focus. The label is
 * what screen readers say and what the tooltip shows.
 */
export default function IconButton({ icon, label, onClick, tone = 'default', size = 'md', type = 'button', disabled }: {
  icon: string;
  label: string;
  onClick?: () => void;
  tone?: 'default' | 'primary' | 'danger';
  size?: 'sm' | 'md';
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  const tones = {
    default: 'text-gray-500 hover:text-gray-900 hover:bg-gray-100',
    primary: 'text-teal-700 bg-teal-50 hover:bg-teal-100',
    danger: 'text-gray-400 hover:text-red-600 hover:bg-red-50',
  };
  return (
    <span className="relative inline-flex group/tip">
      <button type={type} onClick={onClick} disabled={disabled} aria-label={label}
        className={`inline-flex items-center justify-center rounded-full transition-colors disabled:opacity-40 ${size === 'sm' ? 'w-8 h-8' : 'w-9 h-9'} ${tones[tone]}`}>
        <Icon name={icon} className={size === 'sm' ? 'w-4 h-4' : 'w-[18px] h-[18px]'} />
      </button>
      <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-lg bg-gray-800 text-white text-[11px] font-medium px-2 py-1 opacity-0 translate-y-1 transition-all duration-150 group-hover/tip:opacity-100 group-hover/tip:translate-y-0 group-focus-within/tip:opacity-100 group-focus-within/tip:translate-y-0 z-30">
        {label}
      </span>
    </span>
  );
}
