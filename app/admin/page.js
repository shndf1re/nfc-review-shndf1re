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

  const [devices, setDevices] = useState([]);
  const [currentDevice, setCurrentDevice] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingDeviceId, setEditingDeviceId] = useState(null);
  const [editTargetUrl, setEditTargetUrl] = useState('');
  const [editLabelName, setEditLabelName] = useState('');

  useEffect(() => {
    const savedSession = localStorage.getItem('nfc_admin_session');
    if (savedSession === 'true') {
      setIsAuthenticated(true);
      fetchDevices();
    }
  }, []);

  const fetchDevices = async () => {
    const { data, error } = await supabase.from('devices').select('*');
    if (!error && data) {
      const sortedData = data.sort((a, b) => b.id.localeCompare(a.id));
      setDevices(sortedData);
    }
  };

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
        fetchDevices();
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
      fetchDevices();
    }
    setLoading(false);
  };

  const handleCopyNfcUrl = (deviceId) => {
    const nfcUrl = `${window.location.origin}/r/${deviceId}`;
    navigator.clipboard.writeText(nfcUrl);
    alert(`📋 URL NFC disalin ke clipboard:\n${nfcUrl}`);
  };

  const handleWriteAndLockNFC = async (deviceId) => {
    if (!('NDEFReader' in window)) {
      setStatus('⚠️ Browser tidak mendukung Web NFC. Gunakan aplikasi NFC Tools di iPhone.');
      return;
    }

    try {
      setStatus('📱 Dekatkan chip NFC ke bagian belakang HP...');
      const ndef = new window.NDEFReader();
      const targetUrl = `${window.location.origin}/r/${deviceId}`;

      await ndef.write({ records: [{ recordType: 'url', data: targetUrl }] });

      setStatus('🔒 Menulis sukses! Mengunci chip NFC secara permanen...');
      await ndef.makeReadOnly();
      setStatus(`🎉 SUKSES! Perangkat ${deviceId} selesai ditulis & TERKUNCI PERMANEN.`);
    } catch (error) {
      setStatus('❌ Gagal NFC: ' + error.message);
    }
  };

  const formatReviewUrl = (url) => {
    let cleanUrl = url.trim();
    if (!cleanUrl) return '';
    if (cleanUrl.startsWith('ChIJ') && !cleanUrl.includes(' ')) {
      return `https://search.google.com/local/writereview?placeid=${cleanUrl}`;
    }
    const match = cleanUrl.match(/placeid=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://search.google.com/local/writereview?placeid=${match[1]}`;
    }
    return cleanUrl;
  };

  // Simpan Edit Link & Label Toko Menggunakan PIN
  const handleSaveEditWithPin = async (device) => {
    const inputPin = prompt(`Masukkan PIN untuk mengonfirmasi perubahan pada ${device.id}:`);
    if (!inputPin) return;

    if (inputPin.trim() !== String(device.pin).trim()) {
      alert('❌ PIN Konfirmasi Salah! Perubahan dibatalkan.');
      return;
    }

    const formattedUrl = formatReviewUrl(editTargetUrl);

    const updatePayload = {
      label_name: editLabelName.trim() || null
    };

    if (formattedUrl) {
      updatePayload.target_url = formattedUrl;
      updatePayload.is_active = true;
    }

    const { error } = await supabase
      .from('devices')
      .update(updatePayload)
      .eq('id', device.id);

    if (error) {
      alert('Gagal memperbarui data: ' + error.message);
    } else {
      alert(`✅ Berhasil memperbarui data ${device.id}!`);
      setEditingDeviceId(null);
      setEditTargetUrl('');
      setEditLabelName('');
      fetchDevices();
    }
  };

  const handleDeleteDeviceWithPin = async (device) => {
    const inputPin = prompt(`⚠️ PERINGATAN: Menghapus kartu ${device.id}.\nMasukkan PIN kartu untuk mengonfirmasi penghapusan:`);
    if (!inputPin) return;

    if (inputPin.trim() !== String(device.pin).trim()) {
      alert('❌ PIN Konfirmasi Salah! Penghapusan dibatalkan.');
      return;
    }

    const { error } = await supabase.from('devices').delete().eq('id', device.id);
    if (error) {
      alert('Gagal menghapus kartu!');
    } else {
      alert(`🗑️ Kartu ${device.id} berhasil dihapus.`);
      fetchDevices();
      if (currentDevice?.id === device.id) setCurrentDevice(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box' }}>
        <div style={{ width: '100%', maxWidth: '380px', backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px 24px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ width: '48px', height: '48px', backgroundColor: '#eff6ff', color: '#2563eb', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '12px' }}>🔒</div>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>Admin Portal</h2>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Masuk untuk mengelola chip NFC & QR</p>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Username</label>
              <input type="text" required placeholder="Username" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', backgroundColor: '#f8fafc' }} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Password</label>
              <input type="password" required placeholder="••••••••" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', backgroundColor: '#f8fafc' }} />
            </div>
            <button type="submit" disabled={loginLoading} style={{ width: '100%', padding: '12px', backgroundColor: loginLoading ? '#94a3b8' : '#2563eb', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '600', fontSize: '15px', cursor: loginLoading ? 'not-allowed' : 'pointer' }}>
              {loginLoading ? 'Memeriksa...' : 'Masuk Dashboard'}
            </button>
            {loginError && <p style={{ marginTop: '16px', color: '#ef4444', textAlign: 'center', fontSize: '13px', fontWeight: '500' }}>{loginError}</p>}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto', padding: '24px 16px', boxSizing: 'border-box', fontFamily: '-apple-system, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#ffffff', padding: '16px 20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Dashboard NFC</h2>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Sistem Manajemen Perangkat</p>
        </div>
        <button onClick={handleLogout} style={{ padding: '8px 14px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Logout</button>
      </div>

      <button onClick={handleGenerateNew} disabled={loading} style={{ width: '100%', padding: '14px', backgroundColor: loading ? '#94a3b8' : '#2563eb', color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: '600', fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer', marginBottom: '20px', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' }}>
        + Generate Kartu / QR Baru
      </button>

      {currentDevice && (
        <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '2px solid #2563eb', marginBottom: '24px' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#2563eb' }}>✨ Kartu Baru Berhasil dibuat:</h4>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>ID Device:</span>
            <strong>{currentDevice.id}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>PIN Pembeli:</span>
            <strong style={{ color: '#dc2626' }}>{currentDevice.pin}</strong>
          </div>

          <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '12px', marginBottom: '12px' }}>
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(typeof window !== 'undefined' ? `${window.location.origin}/r/${currentDevice.id}` : '')}`} alt="QR Code" style={{ borderRadius: '8px' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button onClick={() => handleCopyNfcUrl(currentDevice.id)} style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
              📋 Salin URL NFC (iPhone / App NFC Tools)
            </button>
            <button onClick={() => handleWriteAndLockNFC(currentDevice.id)} style={{ width: '100%', padding: '10px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>
              📲 Tulis via Chrome (Android Only)
            </button>
          </div>
        </div>
      )}

      {status && <div style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '10px', borderLeft: '4px solid #2563eb', fontSize: '13px', marginBottom: '20px' }}>{status}</div>}

      <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Daftar Kartu NFC ({devices.length})</h3>
          <button onClick={fetchDevices} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>🔄 Refresh</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {devices.map((device) => {
            const isCardActive = Boolean(device.is_active);
            return (
              <div key={device.id} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: isCardActive ? '#f8fafc' : '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div>
                    <strong style={{ fontSize: '15px' }}>{device.id}</strong>
                    <span style={{ marginLeft: '8px', fontSize: '11px', padding: '2px 8px', borderRadius: '12px', backgroundColor: isCardActive ? '#dcfce7' : '#fef3c7', color: isCardActive ? '#15803d' : '#b45309', fontWeight: '600' }}>
                      {isCardActive ? 'Aktif' : 'Belum Dipakai'}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>PIN: <strong>{device.pin || '-'}</strong></span>
                </div>

                {/* Display Nama / Label Toko */}
                {device.label_name && (
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '4px' }}>
                    🏪 Toko: <span style={{ color: '#2563eb' }}>{device.label_name}</span>
                  </div>
                )}

                {isCardActive && (
                  <div style={{ fontSize: '12px', color: '#475569', wordBreak: 'break-all', marginTop: '4px', marginBottom: '8px' }}>
                    🔗 Link Review: <a href={device.target_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>{device.target_url}</a>
                  </div>
                )}

                <div style={{ marginTop: '8px' }}>
                  {editingDeviceId === device.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px', backgroundColor: '#f1f5f9', padding: '10px', borderRadius: '8px' }}>
                      <input
                        type="text"
                        placeholder="Nama Toko / Catatan (misal: Kopi Tiam Sebelas Satu)"
                        value={editLabelName}
                        onChange={(e) => setEditLabelName(e.target.value)}
                        style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                      />
                      <input
                        type="text"
                        placeholder="Link Direct Review atau Place ID (ChIJ...)"
                        value={editTargetUrl}
                        onChange={(e) => setEditTargetUrl(e.target.value)}
                        style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                      />
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => handleSaveEditWithPin(device)} style={{ flex: 1, padding: '8px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                          Simpan (PIN)
                        </button>
                        <button onClick={() => setEditingDeviceId(null)} style={{ padding: '8px 12px', backgroundColor: '#cbd5e1', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button onClick={() => { setEditingDeviceId(device.id); setEditTargetUrl(device.target_url || ''); setEditLabelName(device.label_name || ''); }} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', padding: 0, fontWeight: '600', cursor: 'pointer' }}>
                          ✏️ Edit Nama & Link (PIN)
                        </button>
                        
                        <button onClick={() => handleDeleteDeviceWithPin(device)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                          🗑️ Hapus Kartu (PIN)
                        </button>
                      </div>

                      <button onClick={() => handleCopyNfcUrl(device.id)} style={{ width: '100%', padding: '6px 10px', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', textAlign: 'center' }}>
                        📋 Salin URL NFC ({device.id})
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {devices.length === 0 && <p style={{ textAlign: 'center', fontSize: '13px', color: '#94a3b8' }}>Belum ada kartu terdaftar.</p>}
        </div>
      </div>
    </div>
  );
}
