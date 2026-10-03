'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Wallet, BarChart3, Users, LogOut, Menu, X, Home, Nfc, ChevronRight } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

const allMenuItems = [
  { name: 'Dashboard', desc: 'Kelola kartu NFC', path: '/admin', icon: LayoutDashboard, roles: ['super_admin', 'staff'] },
  { name: 'Penjualan', desc: 'Order & omzet', path: '/admin/sales', icon: Wallet, roles: ['super_admin', 'staff'] },
  { name: 'Statistik', desc: 'Tap NFC vs Scan QR', path: '/admin/stats', icon: BarChart3, roles: ['super_admin', 'staff'] },
  { name: 'Kelola Tim', desc: 'Akun & hak akses', path: '/admin/users', icon: Users, roles: ['super_admin'] },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('staff');
  const [userName, setUserName] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

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
    // Halaman login (admin/page.js) mengirim event ini setelah login sukses
    const onLogin = () => checkSession();
    window.addEventListener('admin:login', onLogin);
    return () => { clearInterval(interval); window.removeEventListener('admin:login', onLogin); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const filteredMenuItems = allMenuItems.filter((item) => item.roles.includes(userRole));
  const current = allMenuItems.find((m) => m.path === pathname);

  if (isCheckingSession) {
    return (
      <div className="admin-theme min-h-screen bg-background flex items-center justify-center">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-violet-500 animate-pulse" />
      </div>
    );
  }
  if (!isAuthenticated) return <div className="admin-theme min-h-screen bg-background">{children}</div>;

  return (
    <div className="admin-theme min-h-screen flex bg-background text-foreground">
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 lg:w-64 flex flex-col border-r border-border bg-card transition-transform duration-300 lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-violet-500 text-white flex items-center justify-center shadow-lg shadow-primary/30">
              <Nfc className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-sm leading-none tracking-tight">NFC Review</div>
              <div className="text-[11px] text-muted-foreground mt-1">Admin Console</div>
            </div>
          </Link>
          <button className="lg:hidden rounded-lg p-1.5 text-muted-foreground hover:bg-accent" onClick={() => setIsSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Menu</div>
          <div className="space-y-1">
            {filteredMenuItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  data-testid={`nav-${item.path.replace(/\//g, '-').slice(1)}`}
                  onClick={() => setIsSidebarOpen(false)}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg transition-colors', isActive ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30' : 'bg-muted group-hover:bg-background')}>
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1">
                    <span className="block leading-tight">{item.name}</span>
                    <span className="block text-[11px] font-normal text-muted-foreground">{item.desc}</span>
                  </span>
                  {isActive && <ChevronRight className="h-4 w-4" />}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-border p-3 space-y-2">
          <div className="flex items-center gap-3 rounded-xl bg-muted/60 p-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center text-sm font-bold text-white">
              {userName.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{userName || 'Admin'}</div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {userRole === 'super_admin' ? 'Super Admin' : 'Staff Admin'}
              </div>
            </div>
          </div>
          <button
            data-testid="logout-btn"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Keluar Akun
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur-xl flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button className="lg:hidden rounded-lg border border-border bg-card p-2 shadow-sm" onClick={() => setIsSidebarOpen(true)} data-testid="open-sidebar">
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="hidden sm:inline text-muted-foreground">Admin</span>
              <ChevronRight className="hidden sm:inline h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold">{current?.name || 'Admin'}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <Link href="/" className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 h-9 text-sm font-medium shadow-sm hover:bg-accent">
              <Home className="h-4 w-4" /> Beranda
            </Link>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
