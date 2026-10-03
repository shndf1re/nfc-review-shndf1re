'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, DollarSign, BarChart3, Users, LogOut, Menu, X, Home, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('staff');
  const [userName, setUserName] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const allMenuItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard, roles: ['super_admin', 'staff'] },
    { name: 'Penjualan', path: '/admin/sales', icon: DollarSign, roles: ['super_admin', 'staff'] },
    { name: 'Statistik', path: '/admin/stats', icon: BarChart3, roles: ['super_admin', 'staff'] },
    { name: 'Kelola Tim', path: '/admin/users', icon: Users, roles: ['super_admin'] },
  ];

  const checkSession = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data?.user) {
          setIsAuthenticated(true);
          setUserRole(data.user.role || 'staff');
          setUserName(data.user.name || data.user.username || '');
        } else setIsAuthenticated(false);
      } else setIsAuthenticated(false);
    } catch (e) {
      setIsAuthenticated(false);
    } finally {
      setIsCheckingSession(false);
    }
  };

  const handleLogout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch (e) {}
    setIsAuthenticated(false);
    if (typeof window !== 'undefined') window.location.href = '/admin';
  };

  useEffect(() => {
    checkSession();
    const interval = setInterval(checkSession, 60 * 1000);
    return () => clearInterval(interval);
  }, [pathname]);

  const filteredMenuItems = allMenuItems.filter((item) => item.roles.includes(userRole));

  if (isCheckingSession) return <div className="min-h-screen bg-background" />;
  if (!isAuthenticated) return <div className="min-h-screen bg-background">{children}</div>;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 flex-col border-r border-border bg-card transition-transform duration-200 lg:translate-x-0 lg:static lg:flex',
          isSidebarOpen ? 'translate-x-0 flex' : '-translate-x-full'
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-sm leading-none">NFC Portal</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Admin Panel</div>
            </div>
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={() => setIsSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Menu Utama</div>
          <div className="space-y-1">
            {filteredMenuItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User footer */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3 mb-2">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
              {userName.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{userName || 'Admin'}</div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-chart-2 animate-pulse" />
                {userRole === 'super_admin' ? 'Super Admin' : 'Staff Admin'}
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30">
            <LogOut className="h-4 w-4 mr-2" />
            Keluar Akun
          </Button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur-xl flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="lg:hidden h-9 w-9" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="h-4 w-4" />
            </Button>
            <div>
              <div className="text-sm font-semibold">
                {allMenuItems.find((m) => m.path === pathname)?.name || 'Admin'}
              </div>
              <div className="text-[11px] text-muted-foreground hidden sm:block">
                Portal manajemen NFC Review
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link href="/">
                <Home className="h-4 w-4 mr-1.5" />
                Beranda
              </Link>
            </Button>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
