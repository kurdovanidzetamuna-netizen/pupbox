import ErrorScreen from '@/components/ErrorScreen';

export const metadata = { title: 'გვერდი ვერ მოიძებნა' };

export default function NotFound() {
  return <ErrorScreen kind="notFound" />;
}
