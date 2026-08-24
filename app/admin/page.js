'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [currentDevice, setCurrentDevice] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  // Cek apakah admin sudah pernah login sebelumnya (Auto Login)
  useEffect(() => {
    const savedSession = localStorage.getItem('nfc_admin_session');
    if (savedSession === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Login dengan memeriksa ke Database Supabase
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const { data: user, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('username', usernameInput)
        .eq('password', passwordInput)
        .single();

      if (error || !user) {
        setLoginError('Username atau Password salah!');
      } else {
        setIsAuthenticated(true);
        localStorage.setItem('nfc_admin_session', 'true');
      }
    } catch (err) {
      setLoginError('Terjadi kesalahan koneksi.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('nfc_admin_session');
  };

  const handleGenerateNew = async () => {
    setLoading(true);
    setStatus('Membuat ID & PIN baru...');

    const randomId = 'CARD-' + Math.floor(1000 + Math.random() * 9000);
    const randomPin = Math.floor(100000 + Math.random() * 900000).toString();

    const { data, error } = await supabase
      .from('devices')
      .insert([{ id: randomId, pin: randomPin, is_active: false }])
      .select()
      .single();

    if (error) {
      setStatus('❌ Gagal membuat ID baru: ' + error.message);
    } else {
      setCurrentDevice(data);
      setStatus(`✅ Berhasil dibuat: ${data.id}`);
    }
    setLoading(false);
  };

  const handleWriteAndLockNFC = async () => {
    if (!currentDevice) return;
    if (!('NDEFReader' in window)) {
      setStatus('⚠️ Browser tidak mendukung Web NFC. Gunakan Chrome di Android.');
      return;
    }

    try {
      setStatus('📱 Dekatkan chip NFC ke bagian belakang HP...');
      const ndef = new window.NDEFReader();
      const targetUrl = `${window.location.origin}/r/${currentDevice.id}`;

      await ndef.write({
        records: [{ recordType: 'url', data: targetUrl }]
      });

      setStatus('🔒 Menulis sukses! Mengunci chip NFC secara permanen...');
      await ndef.makeReadOnly();
      setStatus(`🎉 SUKSES! Perangkat ${currentDevice.id} selesai ditulis & TERKUNCI PERMANEN.`);
    } catch (error) {
      setStatus('❌ Gagal NFC: ' + error.message);
    }
  };

  // LAYAR LOGIN ADMIN
  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '380px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '32px 24px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              borderRadius: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              marginBottom: '12px'
            }}>🔒</div>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>Admin Portal</h2>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Masuk untuk mengelola chip NFC & QR</p>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Username</label>
              <input
                type="text"
                required
                placeholder="Masukkan username"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  backgroundColor: '#f8fafc'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  backgroundColor: '#f8fafc'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: loginLoading ? '#94a3b8' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontWeight: '600',
                fontSize: '15px',
                cursor: loginLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {loginLoading ? 'Memeriksa...' : 'Masuk Dashboard'}
            </button>

            {loginError && (
              <p style={{ marginTop: '16px', color: '#ef4444', textAlign: 'center', fontSize: '13px', fontWeight: '500' }}>
                {loginError}
              </p>
            )}
          </form>
        </div>
      </div>
    );
  }

  // LAYAR DASHBOARD UTAMA
  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 16px', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        backgroundColor: '#ffffff',
        padding: '16px 20px',
        borderRadius: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        border: '1px solid #e2e8f0'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Dashboard NFC</h2>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Sistem Manajemen Perangkat</p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: '8px 14px',
            backgroundColor: '#f1f5f9',
            color: '#475569',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>

      {/* Action Button */}
      <button
        onClick={handleGenerateNew}
        disabled={loading}
        style={{
          width: '100%',
          padding: '14px',
          backgroundColor: loading ? '#94a3b8' : '#2563eb',
          color: '#ffffff',
          border: 'none',
          borderRadius: '12px',
          fontWeight: '600',
          fontSize: '15px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '20px',
          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
        }}
      >
        + Generate Kartu / QR Baru
      </button>

      {/* Device Card Result */}
      {currentDevice && (
        <div style={{
          backgroundColor: '#ffffff',
          padding: '20px',
          borderRadius: '16px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          border: '1px solid #e2e8f0',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', pb: '10px' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>ID Device:</span>
            <strong style={{ fontSize: '14px', color: '#0f172a' }}>{currentDevice.id}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>PIN Pembeli:</span>
            <strong style={{ fontSize: '16px', color: '#dc2626', letterSpacing: '1px' }}>{currentDevice.pin}</strong>
          </div>

          <div style={{
            textAlign: 'center',
            padding: '16px',
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            marginBottom: '16px'
          }}>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                typeof window !== 'undefined' ? `${window.location.origin}/r/${currentDevice.id}` : ''
              )}`}
              alt="QR Code"
              style={{ borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
            <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#64748b' }}>Cetak / Simpan QR Code Ini</p>
          </div>

          <button
            onClick={handleWriteAndLockNFC}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            📲 Tulis & Kunci Chip NFC
          </button>
        </div>
      )}

      {/* Status Log */}
      {status && (
        <div style={{
          padding: '14px 16px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          borderLeft: '4px solid #2563eb',
          fontSize: '13px',
          color: '#334155',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          {status}
        </div>
      )}
    </div>
  );
}
