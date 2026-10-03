'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Polling /api/auth/me untuk mendeteksi JWT expired. Kalau cookie habis / dihapus,
// backend return 401 dan kita redirect user ke halaman login.
// JWT_EXPIRES_IN = 12 jam (dikonfigurasi di /app/lib/jwt.js)

const CHECK_INTERVAL = 60 * 1000; // Cek tiap 60 detik

export default function AutoLogout({ children, isAuthenticated, onLogout }) {
  const router = useRouter();

  const check = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) {
        if (typeof onLogout === 'function') onLogout('Sesi berakhir, silakan login kembali.');
        router.push('/admin?reason=expired');
      }
    } catch (e) {
      // Network error, ignore
    }
  }, [isAuthenticated, onLogout, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(check, CHECK_INTERVAL);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isAuthenticated, check]);

  return <>{children}</>;
}
