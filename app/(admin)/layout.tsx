'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  LayoutDashboard,
  FileText,
  Building2,
  LogOut,
  Menu,
  Shield,
  Bell,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { SyorderLogoMark } from '@/components/syorder-logo';

const navItems = [
  { href: '/admin', label: 'Áttekintés', icon: LayoutDashboard },
  { href: '/admin/requests', label: 'Igénylések', icon: FileText },
  { href: '/admin/partners', label: 'Partnerek', icon: Building2 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setAdminEmail(data.user.email || '');
    });
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    toast.success('Kijelentkezve');
    router.push('/login');
  }

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      <div className="p-5 border-b border-slate-800">
        <Link href="/admin" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-slate-800 rounded-lg overflow-hidden flex items-center justify-center border border-slate-700">
            <SyorderLogoMark size={26} variant="light" />
          </div>
          <div>
            <div className="font-bold text-white leading-tight tracking-widest text-sm uppercase">SYORDER</div>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Shield className="h-2.5 w-2.5" />
              Admin Panel
            </div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-slate-400 hover:bg-white/8 hover:text-slate-200'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 mb-3 px-1">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-white/20 text-white text-xs">SA</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white truncate">{adminEmail || 'Szuperadmin'}</div>
            <div className="text-xs text-slate-500">Rendszergazda</div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-slate-400 hover:text-white hover:bg-white/10"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Kijelentkezés
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar />
        </SheetContent>
      </Sheet>

      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-64 md:flex-col">
        <Sidebar />
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-slate-200 bg-white px-4 md:static md:h-auto md:border-0 md:bg-transparent md:px-6 md:pt-6 md:pb-0">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
          </Button>
        </header>

        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
