'use client';

import AnnouncementBar from './AnnouncementBar';

import { usePathname } from 'next/navigation';

export default function MainWrapper({ children }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  return (
    <main style={{ marginTop: isAdmin ? '0px' : '90px' }}>
      <AnnouncementBar />
      {children}
    </main>
  );
}
