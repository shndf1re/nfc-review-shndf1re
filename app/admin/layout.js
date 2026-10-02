'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('staff');
  const [userName, setUserName] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const allMenuItems = [
    { name: 'Dashboard', path: '/admin', icon: '📱', roles: ['super_admin', 'staff'] },
    { name: 'Penjualan', path: '/admin/sales', icon: '💰', roles: ['super_admin', 'staff'] },
    { name: 'Statistik', path: '/admin/stats', icon: '📊', roles: ['super_admin', 'staff'] },
    { name: 'Kelola Tim', path: '/admin/users', icon: '👥', roles: ['super_admin'] },
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
        } else {
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (e) {
      setIsAuthenticated(false);
    } finally {
      setIsCheckingSession(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {}
    setIsAuthenticated(false);
    if (typeof window !== 'undefined') window.location.href = '/admin';
  };

  useEffect(() => {
    checkSession();
    // Re-check sesi setiap 60 detik (deteksi JWT expired tanpa aktivitas user)
    const interval = setInterval(checkSession, 60 * 1000);
    return () => clearInterval(interval);
  }, [pathname]);

  const filteredMenuItems = allMenuItems.filter(item => item.roles.includes(userRole));

  if (isCheckingSession) {
    return <div className={inter.className} style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }} />;
  }

  // Jika belum login & bukan di halaman /admin (yang punya form login) → render children saja
  // (middleware sudah redirect ke /admin). Khusus /admin, render children untuk tampilkan form.
  if (!isAuthenticated) {
    return (
      <div className={inter.className} style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
        {children}
      </div>
    );
  }

  return (
    <div className={inter.className} style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 40 }}
        />
      )}

      <aside
        className="admin-sidebar"
        style={{
          width: '260px',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: isSidebarOpen ? 0 : '-260px',
          transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1)',
          zIndex: 50,
          borderRight: '1px solid #1e293b',
        }}
      >
        <style>{`
          @media (min-width: 1024px) {
            .admin-sidebar { left: 0 !important; }
            .admin-content { margin-left: 260px; }
            .admin-menu-btn { display: none !important; }
          }
        `}</style>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', backgroundColor: '#2563eb', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '18px' }}>N</div>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#f8fafc', letterSpacing: '-0.3px' }}>NFC Portal</h2>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Management System</span>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '18px', cursor: 'pointer' }}>✕</button>
        </div>

        <nav style={{ flex: 1, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '10px', fontWeight: '700', color: '#475569', letterSpacing: '0.8px', padding: '0 12px 8px 12px' }}>MENU UTAMA</span>
          {filteredMenuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsSidebarOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '10px',
                  textDecoration: 'none', fontSize: '13px', fontWeight: isActive ? '700' : '500',
                  color: isActive ? '#ffffff' : '#94a3b8', backgroundColor: isActive ? '#2563eb' : 'transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '16px', borderTop: '1px solid #1e293b', backgroundColor: '#090d16' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: '#f8fafc' }}>
              {userRole === 'super_admin' ? '👑' : '👤'}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <strong style={{ fontSize: '12px', color: '#f8fafc', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {userName || (userRole === 'super_admin' ? 'Super Admin' : 'Staff Admin')}
              </strong>
              <span style={{ fontSize: '10px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }} /> Sesi Aktif
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: '10px', backgroundColor: '#1e293b', color: '#f87171',
              border: '1px solid #334155', borderRadius: '8px', fontSize: '12px', fontWeight: '600',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}
          >
            🚪 Keluar Akun
          </button>
        </div>
      </aside>

      <div className="admin-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header
          style={{
            backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '12px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            position: 'sticky', top: 0, zIndex: 30,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="admin-menu-btn"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              style={{
                padding: '8px 10px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1',
                borderRadius: '8px', fontSize: '14px', cursor: 'pointer', display: 'flex',
                alignItems: 'center', gap: '6px', fontWeight: '600', color: '#0f172a',
              }}
            >
              ☰ Menu
            </button>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
              {allMenuItems.find((m) => m.path === pathname)?.name || 'Admin'}
            </span>
          </div>

          <Link href="/" style={{ fontSize: '12px', color: '#64748b', textDecoration: 'none', fontWeight: '600' }}>
            🌐 Beranda
          </Link>
        </header>

        <main style={{ flex: 1 }}>{children}</main>
      </div>
    </div>
  );
}
