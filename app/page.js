'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Inter } from 'next/font/google';
import { SITE_CONFIG } from '../lib/config';

const inter = Inter({ subsets: ['latin'] });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function LandingPage() {
  const router = useRouter();
  const waUrl = `https://wa.me/${SITE_CONFIG.supportWhatsapp}?text=${encodeURIComponent(SITE_CONFIG.waPromoText)}`;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [cardIdInput, setCardIdInput] = useState('');
  const [cardPinInput, setCardPinInput] = useState('');
  const [activateError, setActivateError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleVerifyAndRedirect = async (e) => {
    e.preventDefault();
    setActivateError('');
    setVerifying(true);

    const cleanId = cardIdInput.trim();
    const cleanPin = cardPinInput.trim();

    if (!cleanId || !cleanPin) {
      setActivateError('ID Kartu dan PIN wajib diisi.');
      setVerifying(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('devices')
        .select('id, pin')
        .eq('id', cleanId)
        .maybeSingle();

      if (error || !data) {
        setActivateError('ID Kartu tidak ditemukan.');
      } else if (String(data.pin).trim() !== cleanPin) {
        setActivateError('PIN Kartu salah.');
      } else {
        setShowActivateModal(false);
        router.push(`/setup/${cleanId}`);
      }
    } catch (err) {
      setActivateError('Terjadi kesalahan jaringan.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className={inter.className} style={{ backgroundColor: '#f8fafc', color: '#0f172a', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* NAVIGATION BAR */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(226, 232, 240, 0.8)', padding: '16px 24px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/app-icon.png" alt="App Logo" style={{ width: '38px', height: '38px', borderRadius: '12px', objectFit: 'cover' }} />
            <span style={{ fontSize: '19px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>
              {SITE_CONFIG.brandName}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link href="/beli" style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff', backgroundColor: '#16a34a', padding: '10px 18px', borderRadius: '10px', textDecoration: 'none' }}>
              🛒 Beli Akrilik
            </Link>
            <button onClick={() => setShowActivateModal(true)} style={{ fontSize: '14px', fontWeight: '700', color: '#2563eb', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px 16px', borderRadius: '10px', cursor: 'pointer' }}>
              🚀 Aktivasi Papan
            </button>
            <button onClick={() => setSidebarOpen(true)} style={{ fontSize: '18px', fontWeight: '800', backgroundColor: 'transparent', border: 'none', padding: '8px', cursor: 'pointer' }}>
              ☰
            </button>
          </div>
        </div>
      </nav>

      {/* SIDEBAR OVERLAY */}
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: '300px', backgroundColor: '#ffffff', height: '100%', padding: '24px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <span style={{ fontSize: '16px', fontWeight: '800' }}>Menu Navigasi</span>
              <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Link href="/beli" onClick={() => setSidebarOpen(false)} style={{ padding: '16px', backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '12px', fontSize: '14px', fontWeight: '700', textDecoration: 'none' }}>
                🛒 Pesan Akrilik Baru (QRIS / VA)
              </Link>
              <button onClick={() => { setSidebarOpen(false); setShowActivateModal(true); }} style={{ textAlign: 'left', padding: '16px', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                🚀 Aktivasi Kartu NFC
              </button>
              <Link href="/admin" onClick={() => setSidebarOpen(false)} style={{ padding: '16px', backgroundColor: '#f8fafc', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', fontWeight: '600', textDecoration: 'none' }}>
                🔑 Login Admin Portal
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AKTIVASI */}
      {showActivateModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '360px', backgroundColor: '#ffffff', borderRadius: '24px', padding: '32px 24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', backgroundColor: '#eff6ff', color: '#2563eb', borderRadius: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '16px' }}>🚀</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '800' }}>Mulai Aktivasi Papan</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#64748b' }}>Masukkan ID Kartu dan PIN Akses Anda.</p>
            <form onSubmit={handleVerifyAndRedirect} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input type="text" required placeholder="ID Kartu (contoh: NFC-xxxx)" value={cardIdInput} onChange={(e) => setCardIdInput(e.target.value)} style={{ width: '100%', padding: '16px', fontSize: '14px', borderRadius: '14px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: '600', boxSizing: 'border-box' }} />
              <input type="password" required maxLength={6} placeholder="PIN 6-Digit" value={cardPinInput} onChange={(e) => setCardPinInput(e.target.value)} style={{ width: '100%', padding: '16px', fontSize: '20px', textAlign: 'center', letterSpacing: '8px', borderRadius: '14px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
              {activateError && <p style={{ margin: '0', fontSize: '13px', color: '#ef4444', fontWeight: '600' }}>{activateError}</p>}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setShowActivateModal(false)} style={{ flex: 1, padding: '14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Batal</button>
                <button type="submit" disabled={verifying} style={{ flex: 1, padding: '14px', backgroundColor: verifying ? '#94a3b8' : '#2563eb', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: verifying ? 'not-allowed' : 'pointer' }}>
                  {verifying ? 'Memeriksa...' : 'Lanjut Setup'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HERO SECTION */}
      <section style={{ padding: '80px 24px 60px 24px', textAlign: 'center', maxWidth: '850px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '46px', fontWeight: '800', lineHeight: '1.15', margin: '0 0 20px 0', color: '#0f172a' }}>
          Tingkatkan Reputasi Bisnis Anda Dengan <span style={{ color: '#2563eb' }}>Sekali Sentuh</span>
        </h1>
        <p style={{ fontSize: '17px', color: '#475569', lineHeight: '1.6', margin: '0 auto 32px auto', maxWidth: '650px' }}>
          Kumpulkan ulasan Bintang 5 di Google Maps 10x lebih cepat. Pelanggan cukup tap HP ke papan pintar kami tanpa perlu mengetik nama toko Anda.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <Link href="/beli" style={{ padding: '16px 32px', backgroundColor: '#16a34a', color: '#ffffff', fontWeight: '700', fontSize: '15px', borderRadius: '14px', textDecoration: 'none', boxShadow: '0 10px 25px -5px rgba(22, 163, 74, 0.4)' }}>
            🛒 Pesan Papan Akrilik
          </Link>
          <a href={waUrl} target="_blank" rel="noreferrer" style={{ padding: '16px 32px', backgroundColor: '#ffffff', color: '#0f172a', fontWeight: '600', fontSize: '15px', textDecoration: 'none', borderRadius: '14px', border: '1px solid #cbd5e1' }}>
            💬 Konsultasi WA
          </a>
        </div>
      </section>

      {/* FLOATING WA BUTTON */}
      <a href={waUrl} target="_blank" rel="noreferrer" style={{ position: 'fixed', bottom: '24px', right: '24px', backgroundColor: '#25d366', color: '#ffffff', borderRadius: '50px', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 25px rgba(37, 211, 102, 0.4)', textDecoration: 'none', fontWeight: '700', fontSize: '14px', zIndex: 999 }}>
        <span style={{ fontSize: '20px' }}>💬</span>
        <span>Chat CS</span>
      </a>
    </div>
  );
}
