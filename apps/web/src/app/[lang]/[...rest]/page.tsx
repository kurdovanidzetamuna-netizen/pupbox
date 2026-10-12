import { notFound } from 'next/navigation';

/** Any address that isn't a page shows the site's own "not found" page. */
export default function Unknown() {
  notFound();
}
