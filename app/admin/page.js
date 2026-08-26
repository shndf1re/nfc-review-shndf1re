'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { SITE_CONFIG } from '../../lib/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const TIMEOUT_DURATION = 30 * 60 * 1000;

function QrCodeWithLogo({ text, deviceId }) {
  const canvasRef = useRef(null);
  const renderSize = 1000;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const qrUrl = text.includes('?') ? `${text}&src=qr` : `${text}?src=qr`;

    const qrImage = new Image();
    qrImage.crossOrigin = 'Anonymous';
    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=${renderSize}x${renderSize}&data=${encodeURIComponent(qrUrl)}`;

    qrImage.onload = () => {
      ctx.drawImage(qrImage, 0, 0, renderSize, renderSize);

      const logoSize = renderSize * 0.22;
      const center = renderSize / 2;
      const radius = logoSize / 2 + 15;

      ctx.beginPath();
      ctx.arc(center, center, radius, 0, 2 * Math.PI, false);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      const customLogo = new Image();
      customLogo.crossOrigin = 'Anonymous';
      customLogo.src = SITE_CONFIG?.qrLogoUrl || 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg';

      customLogo.onload = () => {
        ctx.drawImage(
          customLogo,
          center - logoSize / 2,
          center - logoSize / 2,
          logoSize,
          logoSize
        );
      };
    };
  }, [text]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const image = canvas.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    link.href = image;
    link.download = `qrcode-HD-${deviceId}.png`;
    link.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <canvas
        ref={canvasRef}
        width={renderSize}
        height={renderSize}
        style={{
          width: '180px',
          height: '180px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          backgroundColor: '#ffffff'
        }}
      />
      <button
        onClick={handleDownload}
        style={{
          padding: '8px 16px',
          backgroundColor: '#2563eb',
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: '600',
          cursor: 'pointer'
        }}
      >
        📥 Download QR Code Ultra HD (PNG)
      </button>
    </div>
  );
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [devices, setDevices] = useState([]);
  const [currentDevice, setCurrentDevice] = useState(null);
  const [previewDeviceModal, setPreviewDeviceModal] = useState(null);

  const [acrylicStock, setAcrylicStock] = useState(0);
  const [totalOmzet, setTotalOmzet] = useState(0);

  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingDeviceId, setEditingDeviceId] = useState(null);
  const [editTargetUrl, setEditTargetUrl] = useState('');
  const [editLabelName, setEditLabelName] = useState('');
  const [activeQrDeviceId, setActiveQrDeviceId] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Toast State
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Modal State
  const [pinModal, setPinModal] = useState({
    isOpen: false,
    actionType: null,
    targetDevice: null,
    pinInput: '',
    errorMsg: ''
  });

  const timeoutRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  const resetSessionTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      handleLogout('Session expired karena tidak ada aktivitas selama 30 menit.');
    }, TIMEOUT_DURATION);
  };

  useEffect(() => {
    const savedSession = localStorage.getItem('nfc_admin_session');
    if (savedSession === 'true') {
      setIsAuthenticated(true);
      fetchDashboardData();
      resetSessionTimer();
    }

    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    const handleUserActivity = () => {
      if (localStorage.getItem('nfc_admin_session') === 'true') {
        resetSessionTimer();
      }
    };

    events.forEach(event => window.addEventListener(event, handleUserActivity));

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach(event => window.removeEventListener(event, handleUserActivity));
    };
  }, []);

  const fetchDashboardData = async () => {
    // 1. Fetch Devices
    const { data: devData } = await supabase.from('devices').select('*');
    if (devData) setDevices(devData);

    // 2. Fetch Stok
    const { data: invData } = await supabase.from('inventory').select('stock_quantity').eq('item_name', 'Papan Akrilik').single();
    if (invData) setAcrylicStock(invData.stock_quantity);

    // 3. Fetch Omzet
    const { data: salesData } = await supabase.from('sales').select('total_price');
    if (salesData) {
      const sum = salesData.reduce((acc, curr) => acc + (parseFloat(curr.total_price) || 0), 0);
      setTotalOmzet(sum);
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
        resetSessionTimer();
        fetchDashboardData();
      }
    } catch (err) {
      setLoginError('Terjadi kesalahan koneksi.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = (msg) => {
    setIsAuthenticated(false);
    localStorage.removeItem('nfc_admin_session');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (typeof msg === 'string') showToast(msg, 'error');
  };

  const generateUniqueCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return 'NFC-' + result;
  };

  const handleGenerateNew = async () => {
    setLoading(true);
    setStatus('Membuat Unique Code & PIN baru...');

    const randomId = generateUniqueCode();
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
      setStatus(`✅ Unique Code Berhasil dibuat: ${data.id}`);
      showToast(`Kartu Baru ${data.id} Berhasil Dibuat!`);
      fetchDashboardData();
    }
    setLoading(false);
  };

  const handleCopyNfcUrl = (deviceId) => {
    const nfcUrl = `${window.location.origin}/r/${deviceId}?src=nfc`;
    navigator.clipboard.writeText(nfcUrl);
    showToast('📋 Link NFC disalin ke clipboard!');
  };

  // KIRIM PESAN SETUP OTOMATIS KE PEMBELI VIA WHATSAPP
  const handleSendWaCustomer = (device) => {
    const setupUrl = `${window.location.origin}/setup/${device.id}`;
    const message = `Halo Kak! Terima kasih telah memesan Papan Akrilik Google Review (${SITE_CONFIG.brandName}).\n\nBerikut detail aktivasi papan Anda:\n- ID Kartu: ${device.id}\n- PIN Akses: ${device.pin}\n\nSilakan buka link aktivasi berikut untuk menghubungkan papan ke link Google Review toko Anda:\n🔗 ${setupUrl}`;
    
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const handleWriteAndLockNFC = async (deviceId) => {
    if (!('NDEFReader' in window)) {
      setStatus('⚠️ Browser tidak mendukung Web NFC. Gunakan aplikasi NFC Tools di iPhone.');
      return;
    }

    try {
      setStatus('📱 Dekatkan chip NFC ke bagian belakang HP...');
      const ndef = new window.NDEFReader();
      const targetUrl = `${window.location.origin}/r/${deviceId}?src=nfc`;

      await ndef.write({ records: [{ recordType: 'url', data: targetUrl }] });

      setStatus('🔒 Menulis sukses! Mengunci chip NFC secara permanen...');
      await ndef.makeReadOnly();
      setStatus(`🎉 SUKSES! Perangkat ${deviceId} selesai ditulis & TERKUNCI PERMANEN.`);
      showToast(`Chip ${deviceId} Terkunci Permanen!`);
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

  const handleCardPinAction = async (e) => {
    e.preventDefault();
    const device = pinModal.targetDevice;

    if (pinModal.pinInput.trim() !== String(device.pin).trim()) {
      setPinModal(prev => ({ ...prev, errorMsg: '❌ PIN Kartu Salah!' }));
      return;
    }

    if (pinModal.actionType === 'saveEdit') {
      const formattedUrl = formatReviewUrl(editTargetUrl);
      const updatePayload = { label_name: editLabelName.trim() || null };

      if (formattedUrl) {
        updatePayload.target_url = formattedUrl;
        updatePayload.is_active = true;
      }

      const { error } = await supabase.from('devices').update(updatePayload).eq('id', device.id);
      if (!error) {
        setEditingDeviceId(null);
        setEditTargetUrl('');
        setEditLabelName('');
        showToast('Data toko berhasil diperbarui!');
        fetchDashboardData();
      }
    } else if (pinModal.actionType === 'deleteCard') {
      const { error } = await supabase.from('devices').delete().eq('id', device.id);
      if (!error) {
        showToast(`Kartu ${device.id} berhasil dihapus!`, 'error');
        fetchDashboardData();
        if (currentDevice?.id === device.id) setCurrentDevice(null);
        if (previewDeviceModal?.id === device.id) setPreviewDeviceModal(null);
      }
    }

    setPinModal({ isOpen: false, actionType: null, targetDevice: null, pinInput: '', errorMsg: '' });
  };

  const filteredDevices = devices.filter((device) => {
    const query = searchQuery.toLowerCase();
    const idMatch = device.id.toLowerCase().includes(query);
    const labelMatch = device.label_name ? device.label_name.toLowerCase().includes(query) : false;
    return idMatch || labelMatch;
  });

  const sortedDevices = [...filteredDevices].sort((a, b) => {
    if (sortBy === 'newest') {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      return b.id.localeCompare(a.id);
    } else if (sortBy === 'oldest') {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (timeA !== timeB) return timeA - timeB;
      return a.id.localeCompare(b.id);
    }
    return 0;
  });

  const activeCardsCount = devices.filter(d => d.is_active).length;

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box', backgroundColor: '#f8fafc' }}>
        <div style={{ width: '100%', maxWidth: '380px', backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px 24px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0', position: 'relative' }}>
          
          <div style={{ marginBottom: '16px' }}>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#64748b', textDecoration: 'none', padding: '6px 10px', borderRadius: '8px', backgroundColor: '#f1f5f9' }}>
              ⬅️ Kembali ke Home
            </Link>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ width: '48px', height: '48px', backgroundColor: '#eff6ff', color: '#2563eb', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '12px' }}>🔒</div>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>{SITE_CONFIG?.brandName || 'Admin'} Portal</h2>
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
    <div style={{ maxWidth: '560px', margin: '0 auto', padding: '24px 16px', boxSizing: 'border-box', fontFamily: '-apple-system, sans-serif' }}>
      
      {/* HEADER UTAMA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', backgroundColor: '#ffffff', padding: '16px 20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>{SITE_CONFIG?.adminTitle || 'Dashboard NFC'}</h2>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{SITE_CONFIG?.adminSubtitle || 'Sistem Manajemen Perangkat'}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Link href="/admin/sales" style={{ padding: '8px 12px', backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '8px', fontSize: '12px', fontWeight: '600', textDecoration: 'none' }}>
            💰 Penjualan
          </Link>
          <Link href="/admin/stats" style={{ padding: '8px 12px', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '8px', fontSize: '12px', fontWeight: '600', textDecoration: 'none' }}>
            📊 Statistik
          </Link>
          <button onClick={() => handleLogout('Berhasil logout.')} style={{ padding: '8px 12px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Logout</button>
        </div>
      </div>

      {/* 1. DASHBOARD KPI CARDS (RINGKASAN UTAMA) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', display: 'block' }}>🏷️ Kartu Aktif / Total</span>
          <strong style={{ fontSize: '18px', color: '#2563eb' }}>{activeCardsCount} <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'normal' }}>/ {devices.length} pcs</span></strong>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', display: 'block' }}>📦 Stok Akrilik</span>
          <strong style={{ fontSize: '18px', color: acrylicStock <= 5 ? '#dc2626' : '#0f172a' }}>{acrylicStock} <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'normal' }}>pcs</span></strong>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', gridColumn: 'span 2' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', display: 'block' }}>💵 Total Omzet Tercatat</span>
          <strong style={{ fontSize: '20px', color: '#16a34a' }}>Rp {totalOmzet.toLocaleString('id-ID')}</strong>
        </div>
      </div>

      <button onClick={handleGenerateNew} disabled={loading} style={{ width: '100%', padding: '14px', backgroundColor: loading ? '#94a3b8' : '#2563eb', color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: '600', fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer', marginBottom: '20px', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' }}>
        + Generate Unique Code & QR Baru
      </button>

      {(currentDevice || previewDeviceModal) && (
        <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '2px solid #2563eb', marginBottom: '24px', position: 'relative' }}>
          <button
            onClick={() => { setCurrentDevice(null); setPreviewDeviceModal(null); }}
            style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', color: '#64748b' }}
          >
            ✖
          </button>
          
          <h4 style={{ margin: '0 0 12px 0', color: '#2563eb' }}>
            ✨ {currentDevice ? 'Kartu Baru dibuat:' : 'Preview Detail Kartu:'}
          </h4>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Unique ID:</span>
            <strong style={{ letterSpacing: '0.5px' }}>{(currentDevice || previewDeviceModal).id}</strong>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>PIN Pembeli:</span>
            <strong style={{ color: '#dc2626' }}>{(currentDevice || previewDeviceModal).pin}</strong>
          </div>

          {(currentDevice || previewDeviceModal).label_name && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>Nama Toko:</span>
              <strong style={{ color: '#2563eb' }}>{(currentDevice || previewDeviceModal).label_name}</strong>
            </div>
          )}

          <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '12px', marginBottom: '12px' }}>
            <QrCodeWithLogo
              text={typeof window !== 'undefined' ? `${window.location.origin}/r/${(currentDevice || previewDeviceModal).id}` : ''}
              deviceId={(currentDevice || previewDeviceModal).id}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button onClick={() => handleSendWaCustomer(currentDevice || previewDeviceModal)} style={{ width: '100%', padding: '12px', backgroundColor: '#25d366', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              💬 Kirim Format WA Setup ke Pembeli
            </button>
            <button onClick={() => handleCopyNfcUrl((currentDevice || previewDeviceModal).id)} style={{ width: '100%', padding: '10px', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '10px', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>
              📋 Salin URL NFC
            </button>
            <button onClick={() => handleWriteAndLockNFC((currentDevice || previewDeviceModal).id)} style={{ width: '100%', padding: '10px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>
              📲 Tulis via Chrome (Android Only)
            </button>
          </div>
        </div>
      )}

      {status && <div style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '10px', borderLeft: '4px solid #2563eb', fontSize: '13px', marginBottom: '20px' }}>{status}</div>}

      <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            type="text"
            placeholder="🔍 Cari ID atau Nama Toko..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, padding: '10px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ padding: '0 12px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
              Reset
            </button>
          )}
        </div>
      </div>

      <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Daftar Kartu NFC ({sortedDevices.length})</h3>
          <button onClick={fetchDashboardData} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>🔄 Refresh</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sortedDevices.map((device) => {
            const isCardActive = Boolean(device.is_active);
            const isQrShown = activeQrDeviceId === device.id;

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

                {isQrShown && (
                  <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #cbd5e1', margin: '10px 0' }}>
                    <QrCodeWithLogo
                      text={typeof window !== 'undefined' ? `${window.location.origin}/r/${device.id}` : ''}
                      deviceId={device.id}
                    />
                  </div>
                )}

                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button onClick={() => handleSendWaCustomer(device)} style={{ width: '100%', padding: '6px 10px', backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', textAlign: 'center' }}>
                    💬 Send Format Setup WA
                  </button>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button onClick={() => { setEditingDeviceId(device.id); setEditTargetUrl(device.target_url || ''); setEditLabelName(device.label_name || ''); }} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', padding: 0, fontWeight: '600', cursor: 'pointer' }}>
                      ✏️ Edit (PIN)
                    </button>
                    
                    <button onClick={() => setPinModal({ isOpen: true, actionType: 'deleteCard', targetDevice: device, pinInput: '', errorMsg: '' })} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                      🗑️ Hapus (PIN)
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FLOATING TOAST NOTIFICATION */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: toast.type === 'error' ? '#ef4444' : '#16a34a',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
          fontSize: '13px',
          fontWeight: '600',
          zIndex: 10000
        }}>
          {toast.message}
        </div>
      )}

    </div>
  );
}
