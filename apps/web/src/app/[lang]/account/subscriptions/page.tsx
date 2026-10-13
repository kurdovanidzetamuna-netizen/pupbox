import { redirect } from 'next/navigation';

/** Plans now live beside orders; old links (and ?cancel=id) land on that tab. */
export default function SubscriptionsRedirect({ searchParams }: { searchParams: Record<string, string> }) {
  redirect(`/account/orders?${new URLSearchParams({ tab: 'plans', ...searchParams })}`);
}
