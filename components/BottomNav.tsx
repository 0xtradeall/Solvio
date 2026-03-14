'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CreditCard, Users, FileText, Settings } from 'lucide-react';

const tabs = [
  { href: '/request', label: 'Request', icon: CreditCard },
  { href: '/split', label: 'Split', icon: Users },
  { href: '/receipts', label: 'Receipts', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="flex h-full max-w-lg mx-auto">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors
                ${isActive
                  ? 'text-primary-500'
                  : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 1.8}
                className={isActive ? 'text-primary-500' : ''}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
