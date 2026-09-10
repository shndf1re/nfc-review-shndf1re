'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

// UBAH DURASI TIMEOUT DI SINI:
// Untuk pengujian: 10 * 1000 (10 Detik)
// Untuk produksi: 10 * 60 * 1000 (10 Menit)
const TIMEOUT_DURATION = 30 * 60 * 1000;

export default function AutoLogout({ children, isAuthenticated, onLogout }) {
  const router = useRouter();
  const lastActivityTimeRef = useRef(Date.now());

  const handleLogout = useCallback(() => {
    // 1. Hapus semua kredensial session dari browser
    localStorage.removeItem('nfc_admin_session');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('nfc_admin_last_activity');
    sessionStorage.clear();
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';

    // 2. Panggil callback logout ke parent
    if (typeof onLogout === 'function') {
      onLogout('Session expired karena tidak ada aktivitas.');
    }

    // 3. Redirect ke halaman login
    router.push('/admin?reason=expired');
  }, [onLogout, router]);

  const checkActivity = useCallback(() => {
    if (!isAuthenticated) return;

    const lastActivityStr = localStorage.getItem('nfc_admin_last_activity');

    // Jika tidak ada catatan aktivitas terakhir, paksa logout
    if (!lastActivityStr) {
      handleLogout();
      return;
    }

    const now = Date.now();
    const timeSinceLastActivity = now - parseInt(lastActivityStr, 10);

    // Jika waktu diam melebihi batas, jalankan fungsi logout
    if (timeSinceLastActivity > TIMEOUT_DURATION) {
      handleLogout();
    }
  }, [isAuthenticated, handleLogout]);

  const updateActivity = useCallback(() => {
    if (!isAuthenticated) return;

    const now = Date.now();
    // Throttle 1 detik agar tidak memberatkan CPU
    if (now - lastActivityTimeRef.current > 1000) {
      lastActivityTimeRef.current = now;
      localStorage.setItem('nfc_admin_last_activity', now.toString());
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // 1. Cek langsung waktu diam sebelum melakukan apa pun
    const lastActivityStr = localStorage.getItem('nfc_admin_last_activity');
    const now = Date.now();

    if (lastActivityStr) {
      const timeSinceLastActivity = now - parseInt(lastActivityStr, 10);
      if (timeSinceLastActivity > TIMEOUT_DURATION) {
        handleLogout();
        return;
      }
    } else {
      // Jika baru pertama kali login (belum ada timestamp), buat timestamp baru
      localStorage.setItem('nfc_admin_last_activity', now.toString());
    }

    lastActivityTimeRef.current = now;

    // 2. Pengecekan berkala setiap 5 detik
    const interval = setInterval(checkActivity, 5000);

    // 3. Pasang event listener aktivitas pengguna (mouse, keyboard, scroll, touch)
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    const handleUserActivity = () => updateActivity();

    events.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity);
    });

    return () => {
      clearInterval(interval);
      events.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
    };
  }, [isAuthenticated, checkActivity, updateActivity, handleLogout]);

  // Cek aktivitas begitu tab kembali difokuskan
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkActivity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkActivity]);

  return <>{children}</>;
}
