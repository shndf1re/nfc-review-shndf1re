'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const TIMEOUT_30_MINS = 30 * 60 * 1000; // 30 Menit

export default function AutoLogout({ children, onLogout }) {
  const router = useRouter();
  const timerRef = useRef(null);

  const handleLogout = () => {
    // 1. Hapus semua kunci session lokal
    localStorage.removeItem('nfc_admin_session');
    localStorage.removeItem('admin_token');
    sessionStorage.clear();

    // 2. Hapus cookie jika ada
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';

    // 3. Panggil callback logout dari parent jika ada
    if (typeof onLogout === 'function') {
      onLogout('Session expired karena tidak ada aktivitas selama 30 menit.');
    }

    // 4. Redirect ke login admin
    router.push('/admin?reason=expired');
  };

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(handleLogout, TIMEOUT_30_MINS);
  };

  useEffect(() => {
    // Cek apakah user sedang dalam posisi terautentikasi
    const isAuth = localStorage.getItem('nfc_admin_session') === 'true';
    if (!isAuth) return;

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    let lastActivityTime = Date.now();

    const handleActivity = () => {
      const now = Date.now();
      // Throttle 1 detik agar hemat performa tapi tetap responsif
      if (now - lastActivityTime > 1000) {
        lastActivityTime = now;
        resetTimer();
      }
    };

    events.forEach((evt) => {
      window.addEventListener(evt, handleActivity);
    });

    // Jalankan timer saat mount
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((evt) => {
        window.removeEventListener(evt, handleActivity);
      });
    };
  }, []);

  return <>{children}</>;
}
