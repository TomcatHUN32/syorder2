'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  Bell,
  UtensilsCrossed,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { SyorderLogoMark } from '@/components/syorder-logo';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const navItems = [
  { href: '/dashboard', label: 'Irányítópult', icon: LayoutDashboard },
  { href: '/dashboard/orders', label: 'Rendelések', icon: ShoppingBag },
  { href: '/dashboard/menu', label: 'Termékek', icon: UtensilsCrossed },
  { href: '/dashboard/inventory', label: 'Készlet (Összetevők)', icon: Package },
  { href: '/dashboard/customers', label: 'Ügyfelek', icon: Users },
  { href: '/dashboard/analytics', label: 'Statisztika', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Nyitvatartás & Városok', icon: Settings },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    toast.success('Sikeresen kijelentkeztél');
    router.push('/login');
    router.refresh();
  }

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="h-9 w-9 flex items-center justify-center rounded-xl overflow-hidden bg-slate-800 border border-slate-700 shrink-0">
            <SyorderLogoMark size={28} variant="light" />
          </div>
          <span className="text-sm font-bold tracking-widest uppercase">SYORDER</span>
        </Link>
      </div>
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
      <div className="p-4 border-t">
        <Button variant="outline" className="w-full justify-start gap-2" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          Kijelentkezés
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobil oldalpanel */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Asztali oldalpanel */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-64 md:flex-col border-r bg-background">
        <Sidebar />
      </aside>

      {/* Fő tartalom */}
      <div className="md:pl-64">
        {/* Fejléc sáv */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 md:static md:h-auto md:border-0 md:bg-transparent md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Oldal tartalma */}
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
