'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

// UBAH DURASI TIMEOUT DI SINI:
// Untuk pengujian: 10 * 1000 (10 Detik)
// Untuk produksi: 10 * 60 * 1000 (10 Menit)
const TIMEOUT_DURATION = 10 * 60 * 1000;

export default function AutoLogout({ children, isAuthenticated, onLogout }) {
  const router = useRouter();
  const lastActivityTimeRef = useRef(Date.now());

  const handleLogout = useCallback(() => {
    // 1. Hapus semua kredensial session dari browser (sesuai kode original Anda)
    localStorage.removeItem('nfc_admin_session');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('nfc_admin_last_activity'); // Bersihkan memori aktivitas
    sessionStorage.clear();
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';

    // 2. Panggil callback logout ke parent (page.js)
    if (typeof onLogout === 'function') {
      onLogout('Session expired karena tidak ada aktivitas.');
    }

    // 3. Redirect halaman
    router.push('/admin?reason=expired');
  }, [onLogout, router]);

  const checkActivity = useCallback(() => {
    if (!isAuthenticated) return;
    
    // Ambil waktu terakhir admin bergerak dari memori penyimpanan lokal browser
    const lastActivityStr = localStorage.getItem('nfc_admin_last_activity');
    if (lastActivityStr) {
      const now = Date.now();
      const timeSinceLastActivity = now - parseInt(lastActivityStr, 10);
      
      // Jika waktu diam melebihi batas (baik di background, tab tertutup, atau diam saja)
      if (timeSinceLastActivity > TIMEOUT_DURATION) {
        handleLogout();
      }
    }
  }, [isAuthenticated, handleLogout]);

  const updateActivity = useCallback(() => {
    if (!isAuthenticated) return;
    
    const now = Date.now();
    // Throttle 1 detik agar tidak memberatkan CPU & akses penulisan localStorage berlebihan
    if (now - lastActivityTimeRef.current > 1000) {
      lastActivityTimeRef.current = now;
      localStorage.setItem('nfc_admin_last_activity', now.toString());
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // 1. Cek langsung saat pertama kali dirender (contoh: buka ulang browser setelah ditutup)
    checkActivity();

    // 2. Simpan waktu awal saat baru login / membuka dashboard
    localStorage.setItem('nfc_admin_last_activity', Date.now().toString());
    lastActivityTimeRef.current = Date.now();

    // 3. Jalankan interval pengecekan otomatis setiap 5 detik di belakang layar
    const interval = setInterval(checkActivity, 5000);

    // 4. Daftarkan deteksi aktivitas fisik user (sama dengan kode original Anda)
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
  }, [isAuthenticated, checkActivity, updateActivity]);

  // Cek aktivitas segera setelah tab kembali aktif / difokuskan (pindah antar tab)
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
