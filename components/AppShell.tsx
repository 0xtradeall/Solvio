'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import AppHeader from './AppHeader';
import BottomNav from './BottomNav';
import DevnetBanner from './DevnetBanner';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAppPage = pathname !== '/' && !pathname.startsWith('/pay');

  // Toggle background class on <html> so gradient covers entire viewport
  useEffect(() => {
    const html = document.documentElement;
    if (isAppPage) {
      html.classList.add('app-page-bg');
    } else {
      html.classList.remove('app-page-bg');
    }
    return () => html.classList.remove('app-page-bg');
  }, [isAppPage]);

  return (
    <>
      <DevnetBanner />
      {isAppPage && <AppHeader />}
      <main className={isAppPage ? 'min-h-screen pb-20 pt-8' : ''}>
        <div className={isAppPage ? 'max-w-lg mx-auto' : ''}>
          {children}
        </div>
      </main>
      {isAppPage && <BottomNav />}
    </>
  );
}
