import Link from 'next/link';
import type { ComponentProps } from 'react';

/**
 * A link whose address was typed in admin: pages on the site use Next's
 * client-side Link, full https:// addresses open in a new tab.
 */
export default function SmartLink({ href, ...rest }: Omit<ComponentProps<'a'>, 'href'> & { href: string }) {
  const target = href?.trim() || '/';
  if (/^(https?:|mailto:|tel:)/i.test(target)) {
    const external = /^https?:/i.test(target);
    return <a href={target} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} {...rest} />;
  }
  return <Link href={target} {...rest} />;
}
