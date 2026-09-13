'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BeliRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Generate UUID acak unik (contoh: 9f8a7b6c-5d4e-4f3a-8b2c-1d0e9f8a7b6c)
    const uniqueSessionId = crypto.randomUUID();

    // Simpan session ID ke browser pengguna
    if (typeof window !== 'undefined') {
      localStorage.setItem('active_checkout_session', uniqueSessionId);
    }

    // Direct pembeli ke URL unik dinamis
    router.replace(`/c/${uniqueSessionId}`);
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
      <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>⏳ Memuat halaman pembayaran aman...</p>
    </div>
  );
}
