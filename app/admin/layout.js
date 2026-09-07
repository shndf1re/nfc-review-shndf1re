'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menuItems = [
    { name: 'Dashboard', path: '/admin', icon: '📱' },
    { name: 'Penjualan', path: '/admin/sales', icon: '💰' },
    { name: 'Statistik', path: '/admin/stats', icon: '📊' },
    { name: 'Kelola Tim', path: '/admin/users', icon: '👥' },
  ];

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleLogout = () => {
    // Hapus sesi dari localStorage
    localStorage.removeItem('nfc_admin_session');
    localStorage.removeItem('nfc_admin_last_activity');
    
    // Redirect langsung ke halaman login
    if (typeof window !== 'undefined') {
      window.location.href = '/admin';
    }
  };

  return (
    <div className={inter.className} style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      
      {/* Overlay Mobile */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 40,
            display: 'block'
          }}
        />
      )}

      {/* Sidebar Component */}
      <aside style={{
        width: '250px',
        backgroundColor: '#0f172a',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: isSidebarOpen ? 0 : '-250px',
        transition: 'left 0.3s ease',
        zIndex: 50,
        boxShadow: '4px 0 25px rgba(0,0,0,0.1)'
      }}>
        {/* Header Sidebar */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', letterSpacing: '-0.5px' }}>NFC Admin</h2>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Management Portal</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}>
            ✕
          </button>
        </div>

        {/* Menu Items */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsSidebarOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: isActive ? '700' : '500',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  backgroundColor: isActive ? '#2563eb' : 'transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{ fontSize: '18px' }}>{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer Sidebar (Logout & Navigasi) */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button 
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '10px 14px',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justify: 'center',
              gap: '8px'
            }}
          >
            🚪 Keluar (Logout)
          </button>
          
          <Link href="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#94a3b8', textDecoration: 'none', fontSize: '12px', fontWeight: '600' }}>
            ⬅️ Ke Beranda Utama
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        
        {/* Top Bar untuk Mobile & Toggle Sidebar */}
        <header style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 30
        }}>
          <button 
            onClick={toggleSidebar}
            style={{
              padding: '8px 12px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '700',
              color: '#0f172a'
            }}
          >
            ☰ <span style={{ fontSize: '12px' }}>Menu</span>
          </button>

          <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b' }}>
            {menuItems.find(m => m.path === pathname)?.name || 'Admin'}
          </span>

          <button 
            onClick={handleLogout}
            style={{
              padding: '6px 12px',
              backgroundColor: '#fef2f2',
              color: '#ef4444',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </header>

        {/* Dynamic Page Content */}
        <main style={{ flex: 1 }}>
          {children}
        </main>
      </div>

    </div>
  );
}
