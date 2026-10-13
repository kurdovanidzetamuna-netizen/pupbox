import SmartLink from '@/components/SmartLink';
import { Icon } from './icons';

/**
 * The page's main call to action: a mint button with the cards' rounded
 * corners, a white icon, then the label. On hover it
 * grows a flowing green → sunny-yellow ring and glow (styles in globals.css).
 * The wrapper gives the ring a layer to sit in behind the pill.
 */
export default function CtaGlow({ href, label, icon = 'box', className = '' }: { href: string; label: string; icon?: string; className?: string }) {
  return (
    <span className={`relative z-0 inline-flex ${className}`}>
      <SmartLink href={href} className="cta-glow">
        <span className="cta-glow-icon"><Icon name={icon} className="w-[18px] h-[18px]" strokeWidth={2.2} /></span>
        {label}
      </SmartLink>
    </span>
  );
}
