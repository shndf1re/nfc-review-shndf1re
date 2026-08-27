'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import JSZip from 'jszip';
import { SITE_CONFIG } from '../../lib/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const TIMEOUT_DURATION = 30 * 60 * 1000;

// FUNGSI KONVERSI CM KE PIXEL (300 DPI CETAK TAJAM)
const cmToPx = (cm) => Math.round((cm / 2.54) * 300);

// HELPER LOAD IMAGE AMAN DENGAN TIMEOUT
function loadImageSafe(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
  });
}

// FUNGSI LOAD SVG GOOGLE LOGO INLINE (ANTI CORS FAIL)
function loadGoogleLogoSvg() {
  return new Promise((resolve) => {
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.28-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// FUNGSI UTAMA DRAW STIKER + QR CODE + LOGO GOOGLE "G"
async function drawCustomStickerToCanvas(qrText, configCm) {
  try {
    const canvasWidth = cmToPx(configCm.stikerWidthCm);   
    const canvasHeight = cmToPx(configCm.stikerHeightCm); 

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');

    // 1. Gambar Template Background Stiker
    let bgImage = await loadImageSafe('/stiker-template.png');
    if (!bgImage) {
      bgImage = await loadImageSafe('/stiker_template.png');
    }

    if (!bgImage) {
      console.error('Template stiker tidak ditemukan di folder /public');
      return null;
    }
    ctx.drawImage(bgImage, 0, 0, canvasWidth, canvasHeight);

    // 2. Hitung Ukuran & Posisi QR Code
    const qrRenderSize = cmToPx(configCm.qrSizeCm); 
    const qrPosX = cmToPx(configCm.xCm);             
    const qrPosY = cmToPx(configCm.yCm);             

    const qrUrl = qrText.includes('?') ? `${qrText}&src=qr` : `${qrText}?src=qr`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrRenderSize}x${qrRenderSize}&data=${encodeURIComponent(qrUrl)}`;
    
    // 3. Tempel QR Code Utama
    const qrImage = await loadImageSafe(qrApiUrl);
    if (qrImage) {
      ctx.drawImage(qrImage, qrPosX, qrPosY, qrRenderSize, qrRenderSize);

      // 4. EMBED LOGO GOOGLE "G" DI TENGAH QR CODE (SAFE INLINE SVG)
      const logoSize = qrRenderSize * 0.22;
      const centerX = qrPosX + (qrRenderSize / 2);
      const centerY = qrPosY + (qrRenderSize / 2);
      const circleRadius = (logoSize / 2) + 3;

      // Draw Lingkaran Putih (Border Clean)
      ctx.beginPath();
      ctx.arc(centerX, centerY, circleRadius, 0, 2 * Math.PI, false);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Draw Logo Google "G" dari SVG Inline
      const googleLogoImg = await loadGoogleLogoSvg();
      if (googleLogoImg) {
        ctx.drawImage(
          googleLogoImg,
          centerX - (logoSize / 2),
          centerY - (logoSize / 2),
          logoSize,
          logoSize
        );
      }
    }

    return canvas.toDataURL('image/png', 1.0);
  } catch (err) {
    console.error('Gagal generate canvas stiker:', err);
    return null;
  }
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

  const [loading, setLoading] = useState(false);
  const [editingDeviceId, setEditingDeviceId] = useState(null);
  const [editTargetUrl, setEditTargetUrl] = useState('');
  const [editLabelName, setEditLabelName] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const [selectedDeviceIds, setSelectedDeviceIds] = useState([]);
  const [bulkEditLabel, setBulkEditLabel] = useState('');
  const [bulkEditUrl, setBulkEditUrl] = useState('');
  const [showBulkEditForm, setShowBulkEditForm] = useState(false);
  const [isDownloadingBulk, setIsDownloadingBulk] = useState(false);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // PENGATURAN PENGGARIS STIKER DEFAULT PRESISI
  const [stickerCmConfig, setStickerCmConfig] = useState({
    stikerWidthCm: 10.3,
    stikerHeightCm: 10.3,
    xCm: 6.1,       
    yCm: 5.3,       
    qrSizeCm: 2.6   
  });

  const [pinModal, setPinModal] = useState({
    isOpen: false,
    actionType: null,
    targetDevice: null,
    bulkQty: 10,
    pinInput: '',
    errorMsg: '',
    isSubmitting: false
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

    const events = ['keydown', 'click', 'touchstart'];
    let lastActivityTime = Date.now();
    
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastActivityTime > 10000) {
        lastActivityTime = now;
        if (localStorage.getItem('nfc_admin_session') === 'true') {
          resetSessionTimer();
        }
      }
    };

    events.forEach(event => window.addEventListener(event, handleUserActivity));

    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, () => { fetchDashboardData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => { fetchDashboardData(); })
      .subscribe();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach(event => window.removeEventListener(event, handleUserActivity));
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDashboardData = async () => {
    const { data: devData } = await supabase.from('devices').select('*');
    if (devData) setDevices(devData);

    const { data: invData } = await supabase.from('inventory').select('stock_quantity').eq('item_name', 'Papan Akrilik').single();
    if (invData) setAcrylicStock(invData.stock_quantity);

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
      const { data: users, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('username', usernameInput.trim());

      let isSuccess = false;

      if (!error && users && users.length > 0) {
        const matchedUser = users.find(
          u => String(u.password).trim() === passwordInput.trim() || String(u.pin).trim() === passwordInput.trim()
        );
        if (matchedUser) isSuccess = true;
      }

      if (!isSuccess) {
        const { data: isValidPin } = await supabase.rpc('verify_sales_pin', {
          input_pin: passwordInput.trim()
        });
        if (isValidPin) isSuccess = true;
      }

      if (isSuccess) {
        setIsAuthenticated(true);
        localStorage.setItem('nfc_admin_session', 'true');
        resetSessionTimer();
        fetchDashboardData();
      } else {
        setLoginError('❌ Username atau Password/PIN Salah!');
      }
    } catch (err) {
      setLoginError('❌ Terjadi kesalahan koneksi.');
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

    const randomId = generateUniqueCode();
    const randomPin = Math.floor(100000 + Math.random() * 900000).toString();

    const { data, error } = await supabase
      .from('devices')
      .insert([{ id: randomId, pin: randomPin, is_active: false }])
      .select()
      .single();

    if (error) {
      showToast('❌ Gagal membuat ID baru: ' + error.message, 'error');
    } else {
      setCurrentDevice(data);
      showToast(`Kartu Baru ${data.id} Berhasil Dibuat!`);
      fetchDashboardData();
    }
    setLoading(false);
  };

  const openBulkGenerateModal = () => {
    setPinModal({
      isOpen: true,
      actionType: 'bulkGenerate',
      targetDevice: null,
      bulkQty: 10,
      pinInput: '',
      errorMsg: '',
      isSubmitting: false
    });
  };

  const handleCopyNfcUrl = (deviceId) => {
    const nfcUrl = `${window.location.origin}/r/${deviceId}?src=nfc`;
    navigator.clipboard.writeText(nfcUrl);
    showToast('📋 Link NFC disalin ke clipboard!');
  };

  const handleSendWaCustomer = (device) => {
    const setupUrl = `${window.location.origin}/setup/${device.id}`;
    const message = `Halo Kak! Terima kasih telah memesan Papan Akrilik Google Review (${SITE_CONFIG.brandName}).\n\nBerikut detail aktivasi papan Anda:\n- ID Kartu: ${device.id}\n- PIN Akses: ${device.pin}\n\nSilakan buka link aktivasi berikut untuk menghubungkan papan ke link Google Review toko Anda:\n🔗 ${setupUrl}`;
    
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
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

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedDeviceIds(sortedDevices.map(d => d.id));
    } else {
      setSelectedDeviceIds([]);
    }
  };

  const handleToggleSelectCard = (id) => {
    if (selectedDeviceIds.includes(id)) {
      setSelectedDeviceIds(selectedDeviceIds.filter(item => item !== id));
    } else {
      setSelectedDeviceIds([...selectedDeviceIds, id]);
    }
  };

  const handleDownloadSingleSticker = async (deviceId) => {
    showToast(`Membuat stiker untuk ${deviceId}...`);
    const targetUrl = `${window.location.origin}/r/${deviceId}`;
    const dataUrl = await drawCustomStickerToCanvas(targetUrl, stickerCmConfig);
    
    if (dataUrl) {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `stiker-${deviceId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`✅ Stiker ${deviceId} berhasil terunduh!`);
    } else {
      showToast(`❌ Gagal! Pastikan stiker-template.png ada di folder public/`, 'error');
    }
  };

  const handleDownloadSelectedStickersZip = async () => {
    if (selectedDeviceIds.length === 0 || isDownloadingBulk) return;
    setIsDownloadingBulk(true);
    showToast(`Membuat file ZIP (${selectedDeviceIds.length} Stiker HD)...`);

    const zip = new JSZip();

    for (let i = 0; i < selectedDeviceIds.length; i++) {
      const deviceId = selectedDeviceIds[i];
      const targetUrl = `${window.location.origin}/r/${deviceId}`;
      
      const dataUrl = await drawCustomStickerToCanvas(targetUrl, stickerCmConfig);
      if (dataUrl) {
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
        zip.file(`stiker-${deviceId}.png`, base64Data, { base64: true });
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    if (zipBlob.size > 22) { 
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `Stiker-Cetak-Batch-${new Date().toISOString().substring(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`✅ Berhasil mendownload ${selectedDeviceIds.length} stiker siap cetak!`);
    } else {
      showToast(`❌ Gagal membuat ZIP! Periksa file gambar di folder public/`, 'error');
    }

    setIsDownloadingBulk(false);
  };

  const handleModalAction = async (e) => {
    e.preventDefault();
    setPinModal(prev => ({ ...prev, isSubmitting: true, errorMsg: '' }));

    if (pinModal.actionType === 'bulkGenerate') {
      const { data: isValidPin } = await supabase.rpc('verify_sales_pin', { input_pin: pinModal.pinInput.trim() });
      if (!isValidPin) {
        setPinModal(prev => ({ ...prev, isSubmitting: false, errorMsg: '❌ PIN Admin Salah!' }));
        return;
      }

      const count = parseInt(pinModal.bulkQty) || 1;
      const newDevices = [];

      for (let i = 0; i < count; i++) {
        newDevices.push({
          id: generateUniqueCode(),
          pin: Math.floor(100000 + Math.random() * 900000).toString(),
          is_active: false
        });
      }

      const { error: insertError } = await supabase.from('devices').insert(newDevices);
      if (insertError) {
        setPinModal(prev => ({ ...prev, isSubmitting: false, errorMsg: insertError.message }));
        return;
      }

      showToast(`⚡ Berhasil membuat ${count} kartu baru!`);
      fetchDashboardData();
      setPinModal({ isOpen: false, actionType: null, targetDevice: null, bulkQty: 10, pinInput: '', errorMsg: '', isSubmitting: false });
      return;
    }

    if (pinModal.actionType === 'bulkEditSave') {
      const { data: isValidPin } = await supabase.rpc('verify_sales_pin', { input_pin: pinModal.pinInput.trim() });
      if (!isValidPin) {
        setPinModal(prev => ({ ...prev, isSubmitting: false, errorMsg: '❌ PIN Admin Salah!' }));
        return;
      }

      const formattedUrl = formatReviewUrl(bulkEditUrl);
      const updatePayload = {};
      if (bulkEditLabel.trim()) updatePayload.label_name = bulkEditLabel.trim();
      if (formattedUrl) {
        updatePayload.target_url = formattedUrl;
        updatePayload.is_active = true;
      }

      const { error } = await supabase.from('devices').update(updatePayload).in('id', selectedDeviceIds);
      if (error) {
        setPinModal(prev => ({ ...prev, isSubmitting: false, errorMsg: error.message }));
        return;
      }

      showToast(`✅ ${selectedDeviceIds.length} Kartu berhasil di-update!`);
      setShowBulkEditForm(false);
      setBulkEditLabel('');
      setBulkEditUrl('');
      setSelectedDeviceIds([]);
      fetchDashboardData();
      setPinModal({ isOpen: false, actionType: null, targetDevice: null, bulkQty: 10, pinInput: '', errorMsg: '', isSubmitting: false });
      return;
    }

    const device = pinModal.targetDevice;
    const inputPinClean = String(pinModal.pinInput).trim();
    const devicePinClean = String(device.pin).trim();

    if (inputPinClean !== devicePinClean) {
      setPinModal(prev => ({ ...prev, isSubmitting: false, errorMsg: '❌ PIN Kartu Salah!' }));
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
      if (error) {
        setPinModal(prev => ({ ...prev, isSubmitting: false, errorMsg: error.message }));
        return;
      }

      setEditingDeviceId(null);
      setEditTargetUrl('');
      setEditLabelName('');
      showToast('Data toko berhasil diperbarui!');
      fetchDashboardData();

    } else if (pinModal.actionType === 'deleteCard') {
      const { error } = await supabase.from('devices').delete().eq('id', device.id);
      if (error) {
        setPinModal(prev => ({ ...prev, isSubmitting: false, errorMsg: error.message }));
        return;
      }

      showToast(`Kartu ${device.id} berhasil dihapus!`, 'error');
      fetchDashboardData();
      if (currentDevice?.id === device.id) setCurrentDevice(null);
      if (previewDeviceModal?.id === device.id) setPreviewDeviceModal(null);
    }

    setPinModal({ isOpen: false, actionType: null, targetDevice: null, bulkQty: 10, pinInput: '', errorMsg: '', isSubmitting: false });
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
    }
    return 0;
  });

  const activeCardsCount = devices.filter(d => d.is_active).length;

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box', backgroundColor: '#f8fafc' }}>
        <div style={{ width: '100%', maxWidth: '380px', backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px 24px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0' }}>
          
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
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Password / PIN</label>
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
      
      {/* HEADER */}
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

      {/* DASHBOARD KPI */}
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
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', display: 'block' }}>💵 Total Omzet Penjualan</span>
          <strong style={{ fontSize: '20px', color: '#16a34a' }}>Rp {totalOmzet.toLocaleString('id-ID')}</strong>
        </div>
      </div>

      {/* GENERATE & TEMPLATE BUTTONS */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button onClick={handleGenerateNew} disabled={loading} style={{ flex: 1, padding: '12px', backgroundColor: loading ? '#94a3b8' : '#2563eb', color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: '600', fontSize: '12px', cursor: loading ? 'not-allowed' : 'pointer' }}>
          + Generate 1 ID
        </button>
        <button onClick={openBulkGenerateModal} style={{ flex: 1, padding: '12px', backgroundColor: '#059669', color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
          ⚡ Bulk Generate
        </button>
        <a 
          href="/stiker-template.png" 
          download="stiker-template.png"
          style={{ flex: 1, padding: '12px', backgroundColor: '#475569', color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: '600', fontSize: '12
