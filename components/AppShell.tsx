'use client';

import { usePathname } from 'next/navigation';
import AppHeader from './AppHeader';
import BottomNav from './BottomNav';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAppPage = pathname !== '/' && !pathname.startsWith('/pay');

  return (
    <>
      {isAppPage && <AppHeader />}
      <main className={isAppPage ? 'app-bg min-h-screen pb-20 max-w-lg mx-auto' : ''}>
        {children}
      </main>
      {isAppPage && <BottomNav />}
    </>
  );
}
