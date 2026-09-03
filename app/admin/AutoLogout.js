'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// KHUSUS PENGUJIAN: Setel ke 10 detik (10 * 1000 ms)
// Nanti jika sudah berhasil, ubah kembali ke (30 * 60 * 1000) untuk 30 menit
const TIMEOUT_DURATION = 10 * 1000; 

export default function AutoLogout({ children, isAuthenticated, onLogout }) {
  const router = useRouter();
  const timerRef = useRef(null);

  const handleLogout = () => {
    // 1. Hapus semua kredensial session dari browser
    localStorage.removeItem('nfc_admin_session');
    localStorage.removeItem('admin_token');
    sessionStorage.clear();
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';

    // 2. Panggil callback logout ke parent (page.js)
    if (typeof onLogout === 'function') {
      onLogout('Session expired karena tidak ada aktivitas.');
    }

    // 3. Redirect halaman
    router.push('/admin?reason=expired');
  };

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(handleLogout, TIMEOUT_DURATION);
  };

  useEffect(() => {
    // JIKA USER BELUM LOGIN, JANGAN JALANKAN TIMER
    if (!isAuthenticated) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    let lastActivityTime = Date.now();

    const handleActivity = () => {
      const now = Date.now();
      // Throttle 1 detik agar tidak memberatkan CPU
      if (now - lastActivityTime > 1000) {
        lastActivityTime = now;
        resetTimer();
      }
    };

    // Pasang listener aktivitas
    events.forEach((evt) => {
      window.addEventListener(evt, handleActivity);
    });

    // Jalankan timer pertama kali saat user terautentikasi
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((evt) => {
        window.removeEventListener(evt, handleActivity);
      });
    };
  }, [isAuthenticated]); // Re-run effect setiap kali status autentikasi berubah!

  return <>{children}</>;
}
