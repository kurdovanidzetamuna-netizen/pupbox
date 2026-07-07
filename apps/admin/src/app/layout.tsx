import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pupbox Admin',
  description: 'Pupbox administration panel',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
