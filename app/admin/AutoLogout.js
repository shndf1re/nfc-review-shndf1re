'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const TIMEOUT_30_MINS = 30 * 60 * 1000; // 30 Menit dalam milidetik

export default function AutoLogout({ children }) {
  const router = useRouter();
  const timerRef = useRef(null);

  const handleLogout = () => {
    // 1. Hapus session storage / local storage token admin
    localStorage.removeItem('admin_token');
    sessionStorage.clear();

    // 2. Hapus cookie auth (jika memakai cookie)
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';

    // 3. Redirect ke halaman admin dengan parameter expired
    router.push('/admin?reason=expired');
  };

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(handleLogout, TIMEOUT_30_MINS);
  };

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

    const handleActivity = () => {
      resetTimer();
    };

    // Pasang listener aktivitas pengguna
    events.forEach((evt) => {
      window.addEventListener(evt, handleActivity);
    });

    // Jalankan timer awal
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
