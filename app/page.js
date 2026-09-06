'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Inter } from 'next/font/google';
import { SITE_CONFIG } from '../lib/config';

// Menggunakan Font Premium Inter
const inter = Inter({ subsets: ['latin'] });

// Inisialisasi Supabase untuk verifikasi aktivasi di Landing Page
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function LandingPage() {
  const router = useRouter();
  const waUrl = `https://wa.me/${SITE_CONFIG.supportWhatsapp}?text=${encodeURIComponent(SITE_CONFIG.waPromoText)}`;

  // State untuk Fitur Baru: Sidebar & Modal Aktivasi
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [cardIdInput, setCardIdInput] = useState('');
  const [cardPinInput, setCardPinInput] = useState('');
  const [activateError, setActivateError] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Handler Verifikasi Aktivasi
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
        setActivateError('ID Kartu tidak ditemukan di sistem.');
      } else if (String(data.pin).trim() !== cleanPin) {
        setActivateError('PIN Kartu salah. Periksa kembali pesan WA Anda.');
      } else {
        // Jika valid, tutup modal dan arahkan ke halaman setup
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
      
      {/* 1. STICKY NAVIGATION BAR (GLASSMORPHISM) */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(226, 232, 240, 0.8)', padding: '16px 24px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* LOGO GAMBAR DARI PUBLIC/APP-ICON.PNG */}
            <img 
              src="/app-icon.png" 
              alt="App Logo" 
              style={{ width: '38px', height: '38px', borderRadius: '12px', objectFit: 'cover', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} 
            />
            <span style={{ fontSize: '19px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>
              {SITE_CONFIG.brandName}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Tombol Aktivasi Langsung */}
            <button 
              onClick={() => setShowActivateModal(true)}
              style={{ fontSize: '14px', fontWeight: '700', color: '#2563eb', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px 16px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              🚀 Aktivasi Papan
            </button>
            
            {/* Tombol Sidebar Menu (Hamburger) */}
            <button 
              onClick={() => setSidebarOpen(true)}
              style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', backgroundColor: 'transparent', border: 'none', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ☰
            </button>
          </div>
        </div>
      </nav>

      {/* SIDEBAR OVERLAY */}
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: '300px', backgroundColor: '#ffffff', height: '100%', padding: '24px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 25px rgba(0,0,0,0.1)', animation: 'slideIn 0.3s forwards' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <span style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Menu Navigasi</span>
              <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => { setSidebarOpen(false); setShowActivateModal(true); }} style={{ textAlign: 'left', padding: '16px', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                🚀 Aktivasi Kartu NFC
              </button>
              
              <Link href="/admin" onClick={() => setSidebarOpen(false)} style={{ padding: '16px', backgroundColor: '#f8fafc', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', fontWeight: '600', textDecoration: 'none', display: 'block' }}>
                🔑 Login Admin Portal
              </Link>
              
              <a href={waUrl} target="_blank" rel="noreferrer" style={{ padding: '16px', backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '12px', fontSize: '14px', fontWeight: '600', textDecoration: 'none', display: 'block' }}>
                💬 Chat Bantuan CS
              </a>
            </div>

            <div style={{ marginTop: 'auto', textAlign: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>© {new Date().getFullYear()} {SITE_CONFIG.brandName}</p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AKTIVASI (INPUT KODE & PIN) */}
      {showActivateModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '360px', backgroundColor: '#ffffff', borderRadius: '24px', padding: '32px 24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', backgroundColor: '#eff6ff', color: '#2563eb', borderRadius: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '16px', boxShadow: '0 10px 15px -3px rgba(37,99,235,0.1)' }}>
              🚀
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>Mulai Aktivasi Papan</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>Masukkan ID Kartu dan PIN Akses dari pesan WhatsApp Anda.</p>

            <form onSubmit={handleVerifyAndRedirect} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <input 
                  type="text" 
                  required 
                  placeholder="ID Kartu (contoh: NFC-xxxx)" 
                  value={cardIdInput} 
                  onChange={(e) => setCardIdInput(e.target.value)} 
                  style={{ width: '100%', padding: '16px', fontSize: '14px', borderRadius: '14px', border: '1px solid #cbd5e1', boxSizing: 'border-box', backgroundColor: '#f8fafc', outline: 'none', textAlign: 'center', fontWeight: '600' }} 
                />
              </div>
              
              <div>
                <input 
                  type="password" 
                  required 
                  maxLength={6} 
                  placeholder="PIN 6-Digit" 
                  value={cardPinInput} 
                  onChange={(e) => setCardPinInput(e.target.value)} 
                  style={{ width: '100%', padding: '16px', fontSize: '20px', textAlign: 'center', letterSpacing: '8px', borderRadius: '14px', border: '1px solid #cbd5e1', boxSizing: 'border-box', backgroundColor: '#f8fafc', outline: 'none' }} 
                />
              </div>

              {activateError && <p style={{ margin: '0', fontSize: '13px', color: '#ef4444', fontWeight: '600' }}>{activateError}</p>}

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button type="button" onClick={() => { setShowActivateModal(false); setActivateError(''); setCardIdInput(''); setCardPinInput(''); }} style={{ flex: 1, padding: '14px', backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                  Batal
                </button>
                <button type="submit" disabled={verifying} style={{ flex: 1, padding: '14px', backgroundColor: verifying ? '#94a3b8' : '#2563eb', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: verifying ? 'not-allowed' : 'pointer' }}>
                  {verifying ? 'Memeriksa...' : 'Lanjut Setup'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. HERO SECTION (MODERN SAAS STYLE) */}
      <section style={{ padding: '80px 24px 60px 24px', textAlign: 'center', maxWidth: '850px', margin: '0 auto', background: 'radial-gradient(circle at top, #ffffff 0%, #f8fafc 100%)' }}>
        <div style={{ display: 'inline-block', padding: '6px 16px', backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: '13px', fontWeight: '700', borderRadius: '24px', marginBottom: '24px', border: '1px solid #bfdbfe', letterSpacing: '0.3px' }}>
          ✨ Inovasi Review Google Terbaru
        </div>
        
        <h1 style={{ fontSize: '46px', fontWeight: '800', lineHeight: '1.15', margin: '0 0 20px 0', color: '#0f172a', letterSpacing: '-1px' }}>
          Tingkatkan Reputasi Bisnis Anda Dengan <span style={{ color: '#2563eb' }}>Sekali Sentuh</span>
        </h1>
        
        <p style={{ fontSize: '17px', color: '#475569', lineHeight: '1.6', margin: '0 auto 36px auto', maxWidth: '650px' }}>
          Kumpulkan ulasan Bintang 5 di Google Maps 10x lebih cepat. Pelanggan cukup tap HP ke papan pintar kami tanpa perlu mengetik nama toko Anda.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <a href={waUrl} target="_blank" rel="noreferrer" style={{ padding: '16px 32px', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: '700', fontSize: '15px', textDecoration: 'none', borderRadius: '14px', boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.4)', minWidth: '200px' }}>
            Pesan Papan Sekarang
          </a>
          <a href="#fitur" style={{ padding: '16px 32px', backgroundColor: '#ffffff', color: '#0f172a', fontWeight: '600', fontSize: '15px', textDecoration: 'none', borderRadius: '14px', border: '1px solid #cbd5e1', minWidth: '200px' }}>
            Pelajari Cara Kerjanya
          </a>
        </div>
      </section>

      {/* 3. KEUNGGULAN PRODUK (ELEVATED CARDS) */}
      <section id="fitur" style={{ padding: '60px 24px', maxWidth: '1100px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <h2 style={{ textAlign: 'center', fontSize: '28px', fontWeight: '800', marginBottom: '12px', letterSpacing: '-0.5px' }}>
          Desain Pintar Untuk Hasil Maksimal
        </h2>
        <p style={{ textAlign: 'center', fontSize: '15px', color: '#64748b', marginBottom: '48px' }}>
          Semua fitur yang Anda butuhkan untuk mendominasi pencarian lokal.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          
          <div style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 20px 40px -15px rgba(0,0,0,0.03)' }}>
            <div style={{ width: '56px', height: '56px', backgroundColor: '#eff6ff', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '20px' }}>⚡</div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>Direct Google Review</h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>
              Bypass pencarian manual. Pelanggan akan langsung dihadapkan pada form rating Bintang 5 untuk toko Anda dalam hitungan detik.
            </p>
          </div>

          <div style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 20px 40px -15px rgba(0,0,0,0.03)' }}>
            <div style={{ width: '56px', height: '56px', backgroundColor: '#f0fdf4', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '20px' }}>🔒</div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>Cloud-Synced & Secure</h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>
              Chip NFC diamankan dengan PIN unik. Anda memegang kendali penuh untuk mengubah atau mereset link lokasi kapan saja melalui portal.
            </p>
          </div>

          <div style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 20px 40px -15px rgba(0,0,0,0.03)' }}>
            <div style={{ width: '56px', height: '56px', backgroundColor: '#fef2f2', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '20px' }}>📷</div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>QR Code Ultra HD</h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>
              Tidak semua HP memiliki NFC. Kami menyertakan QR Code sekunder beresolusi tinggi dengan integrasi logo resmi di tengahnya.
            </p>
          </div>

        </div>
      </section>

      {/* 4. CARA KERJA (CLEAN STEPPER) */}
      <section style={{ backgroundColor: '#ffffff', padding: '80px 24px', margin: '40px 0', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '48px', letterSpacing: '-0.5px' }}>Semudah 1-2-3</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '32px', position: 'relative' }}>
            <div>
              <div style={{ width: '48px', height: '48px', backgroundColor: '#0f172a', color: '#ffffff', fontWeight: '800', fontSize: '18px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', boxShadow: '0 10px 15px -3px rgba(15,23,42,0.2)' }}>1</div>
              <strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px', color: '#0f172a' }}>Tap / Scan Papan</strong>
              <span style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.5', display: 'block' }}>Pelanggan menempelkan smartphone mereka ke papan akrilik di meja kasir.</span>
            </div>

            <div>
              <div style={{ width: '48px', height: '48px', backgroundColor: '#0f172a', color: '#ffffff', fontWeight: '800', fontSize: '18px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', boxShadow: '0 10px 15px -3px rgba(15,23,42,0.2)' }}>2</div>
              <strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px', color: '#0f172a' }}>Browser Terbuka</strong>
              <span style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.5', display: 'block' }}>Sistem NFC otomatis memicu browser untuk membuka halaman ulasan toko Anda.</span>
            </div>

            <div>
              <div style={{ width: '48px', height: '48px', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: '800', fontSize: '18px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', boxShadow: '0 10px 15px -3px rgba(37,99,235,0.3)' }}>3</div>
              <strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px', color: '#0f172a' }}>Bintang 5 Diterima</strong>
              <span style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.5', display: 'block' }}>Pelanggan memposting ulasan positif. Reputasi online Anda meningkat pesat.</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CALL TO ACTION & FOOTER */}
      <section style={{ textAlign: 'center', padding: '40px 24px 80px 24px', maxWidth: '600px', margin: '0 auto', flexGrow: 1 }}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '16px', letterSpacing: '-0.5px' }}>Siap Mengembangkan Bisnis Anda?</h2>
        <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '32px' }}>
          Jadilah yang terdepan di pencarian Google. Konsultasikan kebutuhan toko Anda bersama tim kami.
        </p>
        <a href={waUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', padding: '16px 32px', backgroundColor: '#16a34a', color: '#ffffff', fontWeight: '700', fontSize: '15px', textDecoration: 'none', borderRadius: '14px', boxShadow: '0 10px 25px -5px rgba(22, 163, 74, 0.4)' }}>
          💬 Hubungi via WhatsApp Sekarang
        </a>
      </section>

      {/* 6. FLOATING WHATSAPP BUTTON */}
      <a
        href={waUrl}
        target="_blank"
        rel="noreferrer"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: '#25d366',
          color: '#ffffff',
          borderRadius: '50px',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 10px 25px rgba(37, 211, 102, 0.4)',
          textDecoration: 'none',
          fontWeight: '700',
          fontSize: '14px',
          zIndex: 999
        }}
      >
        <span style={{ fontSize: '20px' }}>💬</span>
        <span>Chat CS</span>
      </a>
      
      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
