'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const ADMIN_PASSWORD = 'passwordrahasia123';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passError, setPassError] = useState(false);

  const [currentDevice, setCurrentDevice] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPassError(false);
    } else {
      setPassError(true);
    }
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
      setStatus(`✅ Berhasil dibuat: ${data.id} | PIN: ${data.pin}`);
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
      setStatus('📱 Tempelkan chip NFC ke bagian belakang HP...');
      const ndef = new window.NDEFReader();
      
      const targetUrl = `${window.location.origin}/r/${currentDevice.id}`;

      await ndef.write({
        records: [{ recordType: 'url', data: targetUrl }]
      });

      setStatus('🔒 Menulis sukses! Mengunci chip NFC secara permanen...');

      await ndef.makeReadOnly();

      setStatus(`🎉 SUKSES KONTAN! ${currentDevice.id} selesai ditulis & TERKUNCI PERMANEN.`);
    } catch (error) {
      setStatus('❌ Gagal NFC: ' + error.message);
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: '360px', margin: '80px auto', padding: '24px', fontFamily: 'sans-serif', border: '1px solid #ddd', borderRadius: '12px', textAlign: 'center' }}>
        <h2>Login Admin</h2>
        <form onSubmit={handleLogin}>
          <input
            type="password"
            placeholder="Masukkan Password Admin"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            style={{ width: '100%', padding: '10px', margin: '16px 0', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
          <button
            type="submit"
            style={{ width: '100%', padding: '10px', backgroundColor: '#1976d2', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Masuk
          </button>
        </form>
        {passError && <p style={{ color: 'red', marginTop: '12px', fontSize: '14px' }}>Password Salah!</p>}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '500px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Dashboard Admin NFC</h2>
        <button onClick={() => setIsAuthenticated(false)} style={{ padding: '6px 12px', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Logout</button>
      </div>
      <hr style={{ marginBottom: '20px' }} />

      <button
        onClick={handleGenerateNew}
        disabled={loading}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: '#1976d2',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          fontWeight: 'bold',
          fontSize: '16px',
          cursor: 'pointer',
          marginBottom: '16px'
        }}
      >
        + 1. Generate ID & PIN Baru
      </button>

      {currentDevice && (
        <div style={{ border: '1px solid #ccc', padding: '16px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
          <p style={{ margin: '4px 0' }}><strong>ID Device:</strong> {currentDevice.id}</p>
          <p style={{ margin: '4px 0' }}><strong>PIN (Cetak di Kertas):</strong> <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>{currentDevice.pin}</span></p>
          <p style={{ margin: '4px 0', fontSize: '12px', wordBreak: 'break-all' }}>
            <strong>URL NFC:</strong> {typeof window !== 'undefined' ? `${window.location.origin}/r/${currentDevice.id}` : ''}
          </p>

          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            <p style={{ fontSize: '12px', color: '#666' }}>Scan / Cetak QR Code Ini:</p>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                typeof window !== 'undefined' ? `${window.location.origin}/r/${currentDevice.id}` : ''
              )}`}
              alt="QR Code"
              style={{ borderRadius: '8px', border: '1px solid #ddd' }}
            />
          </div>

          <button
            onClick={handleWriteAndLockNFC}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#2e7d32',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            📲 2. Tempel, Tulis & Kunci NFC Ini
          </button>
        </div>
      )}

      {status && (
        <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#eee', borderRadius: '6px', fontSize: '14px' }}>
          {status}
        </div>
      )}
    </div>
  );
}
