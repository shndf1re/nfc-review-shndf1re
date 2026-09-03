'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import JSZip from 'jszip';
import AutoLogout from './AutoLogout';

let SITE_CONFIG = {
  brandName: 'NFC Review',
  adminTitle: 'Dashboard NFC',
  adminSubtitle: 'Sistem Manajemen Perangkat',
  domainUrl: 'https://tokonine.my.id',
  nfcDomainUrl: 'https://reviewmaps.link',
  qrLogoUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg'
};

try {
  const configModule = require('../../lib/config');
  if (configModule?.SITE_CONFIG) {
    SITE_CONFIG = configModule.SITE_CONFIG;
  }
} catch (e) {
  // Fallback jika file config tidak ditemukan
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const getNfcBaseUrl = () => {
  return SITE_CONFIG?.nfcDomainUrl || (typeof window !== 'undefined' ? window.location.origin : '');
};

const cmToPx = (cm) => Math.round((cm / 2.54) * 300);

function loadImageSafe(primarySrc, fallbackSrc) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = primarySrc;
    img.onload = () => resolve(img);
    img.onerror = () => {
      if (fallbackSrc) {
        const fallbackImg = new Image();
        fallbackImg.crossOrigin = 'Anonymous';
        fallbackImg.src = fallbackSrc;
        fallbackImg.onload = () => resolve(fallbackImg);
        fallbackImg.onerror = () => resolve(null);
      } else {
        resolve(null);
      }
    };
  });
}

async function drawCustomStickerToCanvas(qrText, configCm) {
  try {
    const canvasWidth = cmToPx(configCm.stikerWidthCm);    
    const canvasHeight = cmToPx(configCm.stikerHeightCm); 

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const primaryUrl = `${origin}/stiker-template.png`;
    const fallbackUrl = `${origin}/stiker_template.png`;

    const bgImage = await loadImageSafe(primaryUrl, fallbackUrl);
    if (!bgImage) return null;
    ctx.drawImage(bgImage, 0, 0, canvasWidth, canvasHeight);

    const qrRenderSize = cmToPx(configCm.qrSizeCm); 
    const qrPosX = cmToPx(configCm.xCm);              
    const qrPosY = cmToPx(configCm.yCm);              

    const qrUrl = qrText.includes('?') ? `${qrText}&src=qr` : `${qrText}?src=qr`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrRenderSize}x${qrRenderSize}&data=${encodeURIComponent(qrUrl)}`;
    
    const qrImage = await loadImageSafe(qrApiUrl, null);
    if (qrImage) {
      ctx.drawImage(qrImage, qrPosX, qrPosY, qrRenderSize, qrRenderSize);

      const logoSize = qrRenderSize * 0.22;
      const centerX = qrPosX + (qrRenderSize / 2);
      const centerY = qrPosY + (qrRenderSize / 2);
      const circleRadius = (logoSize / 2) + 3;

      ctx.beginPath();
      ctx.arc(centerX, centerY, circleRadius, 0, 2 * Math.PI, false);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      const logoUrl = SITE_CONFIG?.qrLogoUrl || 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg';
      const logoImage = await loadImageSafe(logoUrl, null);
      
      if (logoImage) {
        ctx.drawImage(
          logoImage,
          centerX - (logoSize / 2),
          centerY - (logoSize / 2),
          logoSize,
          logoSize
        );
      }
    }

    return canvas.toDataURL('image/png', 1.0);
  } catch (err) {
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
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'

  const [selectedDeviceIds, setSelectedDeviceIds] = useState([]);
  const [bulkEditLabel, setBulkEditLabel] = useState('');
  const [bulkEditUrl, setBulkEditUrl] = useState('');
  const [showBulkEditForm, setShowBulkEditForm] = useState(false);
  const [isDownloadingBulk, setIsDownloadingBulk] = useState(false);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [showScrollTop, setShowScrollTop] = useState(false);

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

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  useEffect(() => {
    const savedSession = localStorage.getItem('nfc_admin_session');
    if (savedSession === 'true') {
      setIsAuthenticated(true);
      fetchDashboardData();
    }

    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, () => { fetchDashboardData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => { fetchDashboardData(); })
      .subscribe();

    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const fetchDashboardData = async () => {
    const { data: devData } = await supabase.from('devices').select('*');
    if (devData) setDevices(devData);

    const { data: invData } = await supabase.from('inventory').select('stock_quantity').eq('item_name', 'Papan Akrilik').maybeSingle();
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
        setUsernameInput('');
        setPasswordInput('');
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
    setUsernameInput('');
    setPasswordInput('');
    localStorage.removeItem('nfc_admin_session');
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
    const baseUrl = getNfcBaseUrl();
    const nfcUrl = `${baseUrl}/r/${deviceId}?src=nfc`;
    navigator.clipboard.writeText(nfcUrl);
    showToast('📋 Link NFC disalin ke clipboard!');
  };

  const handleSendWaCustomer = (device) => {
    const baseUrl = getNfcBaseUrl();
    const setupUrl = `${baseUrl}/setup/${device.id}`;
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
    const baseUrl = getNfcBaseUrl();
    const targetUrl = `${baseUrl}/r/${deviceId}`;
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
    const baseUrl = getNfcBaseUrl();

    for (let i = 0; i < selectedDeviceIds.length; i++) {
      const deviceId = selectedDeviceIds[i];
      const targetUrl = `${baseUrl}/r/${deviceId}`;
      
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
    const matchesSearch = idMatch || labelMatch;

    const isCardActive = Boolean(device.is_active);
    let matchesStatus = true;
    if (statusFilter === 'active') matchesStatus = isCardActive === true;
    if (statusFilter === 'inactive') matchesStatus = isCardActive === false;

    return matchesSearch && matchesStatus;
  });

  const sortedDevices = [...filteredDevices].sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;

    if (sortBy === 'newest') {
      if (timeA !== timeB) return timeB - timeA;
      return b.id.localeCompare(a.id);
    } else if (sortBy === 'oldest') {
      if (timeA !== timeB) return timeA - timeB;
      return a.id.localeCompare(b.id);
    }
    return 0;
  });

  const activeCardsCount = devices.filter(d => d.is_active).length;

  return (
    <AutoLogout isAuthenticated={isAuthenticated} onLogout={handleLogout}>
      {!isAuthenticated ? (
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
              <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Masuk untuk mengelola chip NFC &amp; QR</p>
            </div>

            <form onSubmit={handleLogin} autoComplete="off">
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Username</label>
                <input 
                  type="text" 
                  required 
                  autoComplete="off"
                  placeholder="Username" 
                  value={usernameInput} 
                  onChange={(e) => setUsernameInput(e.target.value)} 
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', backgroundColor: '#f8fafc' }} 
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Password / PIN</label>
                <input 
                  type="password" 
                  required 
                  autoComplete="new-password"
                  placeholder="••••••••" 
                  value={passwordInput} 
                  onChange={(e) => setPasswordInput(e.target.value)} 
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', backgroundColor: '#f8fafc' }} 
                />
              </div>
              <button type="submit" disabled={loginLoading} style={{ width: '100%', padding: '12px', backgroundColor: loginLoading ? '#94a3b8' : '#2563eb', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '600', fontSize: '15px', cursor: loginLoading ? 'not-allowed' : 'pointer' }}>
                {loginLoading ? 'Memeriksa...' : 'Masuk Dashboard'}
              </button>
              {loginError && <p style={{ marginTop: '16px', color: '#ef4444', textAlign: 'center', fontSize: '13px', fontWeight: '500' }}>{loginError}</p>}
            </form>
          </div>
        </div>
      ) : (
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
              style={{ flex: 1, padding: '12px', backgroundColor: '#475569', color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: '600', fontSize: '12px', textDecoration: 'none', textAlign: 'center', boxSizing: 'border-box' }}
            >
              🖼️ Master Template
            </a>
          </div>

          {/* PREVIEW SINGLE STICKER CODE */}
          {(currentDevice || previewDeviceModal) && (
            <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '2px solid #2563eb', marginBottom: '24px', position: 'relative' }}>
              <button onClick={() => { setCurrentDevice(null); setPreviewDeviceModal(null); }} style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', color: '#64748b' }}>
                ✖
              </button>
              
              <h4 style={{ margin: '0 0 12px 0', color: '#2563eb' }}>
                ✨ {currentDevice ? 'Kartu Baru Dibuat:' : `Detail Stiker (${(currentDevice || previewDeviceModal).id}):`}
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                <button 
                  onClick={() => handleDownloadSingleSticker((currentDevice || previewDeviceModal).id)} 
                  style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                >
                  🖨️ Download Stiker Siap Cetak (PNG HD)
                </button>
                <button onClick={() => handleSendWaCustomer(currentDevice || previewDeviceModal)} style={{ width: '100%', padding: '12px', backgroundColor: '#25d366', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  💬 Kirim Format WA Setup ke Pembeli
                </button>
                <button onClick={() => handleCopyNfcUrl((currentDevice || previewDeviceModal).id)} style={{ width: '100%', padding: '10px', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '10px', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>
                  📋 Salin URL NFC
                </button>
              </div>
            </div>
          )}

          {/* BAR KONTROL SELECTION & BULK DOWNLOAD STIKER CETAK */}
          {selectedDeviceIds.length > 0 && (
            <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '14px', borderRadius: '14px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e40af' }}>
                  ☑️ Terpilih: {selectedDeviceIds.length} Kartu
                </span>
                <button onClick={() => setSelectedDeviceIds([])} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                  Batal Pilih
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={handleDownloadSelectedStickersZip} disabled={isDownloadingBulk} style={{ flex: 1, padding: '10px 12px', backgroundColor: isDownloadingBulk ? '#94a3b8' : '#059669', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: isDownloadingBulk ? 'not-allowed' : 'pointer' }}>
                  {isDownloadingBulk ? '⏳ Membuat Stiker HD...' : '🖨️ Download Stiker Siap Cetak (.ZIP)'}
                </button>
                <button onClick={() => setShowBulkEditForm(!showBulkEditForm)} style={{ flex: 1, padding: '10px 12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                  ✏️ Bulk Edit Terpilih
                </button>
              </div>

              {/* FORM SETUP KOORDINAT PENGGARIS CM */}
              <div style={{ marginTop: '12px', backgroundColor: '#ffffff', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                <h5 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#0f172a' }}>📐 Setting Posisi Penggaris (cm):</h5>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '8px' }}>
                  <div>
                    <label style={{ fontSize: '10px', color: '#64748b' }}>Jarak X (cm):</label>
                    <input type="number" step="0.1" value={stickerCmConfig.xCm} onChange={(e) => setStickerCmConfig({ ...stickerCmConfig, xCm: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '6px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', color: '#64748b' }}>Jarak Y (cm):</label>
                    <input type="number" step="0.1" value={stickerCmConfig.yCm} onChange={(e) => setStickerCmConfig({ ...stickerCmConfig, yCm: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '6px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', color: '#64748b' }}>Ukuran QR (cm):</label>
                    <input type="number" step="0.1" value={stickerCmConfig.qrSizeCm} onChange={(e) => setStickerCmConfig({ ...stickerCmConfig, qrSizeCm: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '6px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                  </div>
                </div>
              </div>

              {/* FORM BULK EDIT */}
              {showBulkEditForm && (
                <div style={{ marginTop: '12px', backgroundColor: '#ffffff', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                  <h5 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#0f172a' }}>Edit Massal Untuk {selectedDeviceIds.length} Kartu:</h5>
                  <input type="text" placeholder="Nama Toko Massal (Opsional)" value={bulkEditLabel} onChange={(e) => setBulkEditLabel(e.target.value)} style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '8px', boxSizing: 'border-box' }} />
                  <input type="text" placeholder="Link Google Review Massal (Opsional)" value={bulkEditUrl} onChange={(e) => setBulkEditUrl(e.target.value)} style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '8px', boxSizing: 'border-box' }} />
                  <button onClick={() => setPinModal({ isOpen: true, actionType: 'bulkEditSave', targetDevice: null, bulkQty: 10, pinInput: '', errorMsg: '', isSubmitting: false })} style={{ width: '100%', padding: '8px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                    Simpan Edit Massal (PIN)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* BAR KONTROL SEARCH, FILTER STATUS & SORT TANGGAL */}
          <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="🔍 Cari ID atau Nama Toko..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                    🏷️ Status Kartu:
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: '600', outline: 'none' }}
                  >
                    <option value="all">Semua Kartu ({devices.length})</option>
                    <option value="active">🟢 Hanya Aktif ({devices.filter(d => d.is_active).length})</option>
                    <option value="inactive">🟡 Belum Dipakai ({devices.filter(d => !d.is_active).length})</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                    📅 Urutan Tanggal:
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: '600', outline: 'none' }}
                  >
                    <option value="newest">⬇️ Terbaru Dibuat</option>
                    <option value="oldest">⬆️ Terlama Dibuat</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b' }}>
              <input 
                type="checkbox" 
                id="selectAll" 
                checked={selectedDeviceIds.length === sortedDevices.length && sortedDevices.length > 0} 
                onChange={handleSelectAll} 
                style={{ cursor: 'pointer' }} 
              />
              <label htmlFor="selectAll" style={{ cursor: 'pointer', fontWeight: '600' }}>
                Pilih Semua Kartu Terfilter ({sortedDevices.length})
              </label>
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
                const isSelected = selectedDeviceIds.includes(device.id);

                return (
                  <div key={device.id} style={{ padding: '14px', borderRadius: '12px', border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0', backgroundColor: isSelected ? '#eff6ff' : isCardActive ? '#f8fafc' : '#ffffff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="checkbox" checked={isSelected} onChange={() => handleToggleSelectCard(device.id)} style={{ cursor: 'pointer' }} />
                        <strong style={{ fontSize: '15px' }}>{device.id}</strong>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', backgroundColor: isCardActive ? '#dcfce7' : '#fef3c7', color: isCardActive ? '#15803d' : '#b45309', fontWeight: '600' }}>
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

                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {editingDeviceId === device.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px', backgroundColor: '#f1f5f9', padding: '10px', borderRadius: '8px' }}>
                          <input type="text" placeholder="Nama Toko" value={editLabelName} onChange={(e) => setEditLabelName(e.target.value)} style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                          <input type="text" placeholder="Link Direct Review" value={editTargetUrl} onChange={(e) => setEditTargetUrl(e.target.value)} style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => setPinModal({ isOpen: true, actionType: 'saveEdit', targetDevice: device, bulkQty: 10, pinInput: '', errorMsg: '', isSubmitting: false })} style={{ flex: 1, padding: '8px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                              Simpan (PIN)
                            </button>
                            <button onClick={() => setEditingDeviceId(null)} style={{ padding: '8px 12px', backgroundColor: '#cbd5e1', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                              Batal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => setPreviewDeviceModal(device)} style={{ flex: 1, padding: '6px 10px', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', textAlign: 'center' }}>
                              👁️ Lihat &amp; Download Stiker
                            </button>
                            <button onClick={() => handleSendWaCustomer(device)} style={{ flex: 1, padding: '6px 10px', backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', textAlign: 'center' }}>
                              💬 Send Format WA
                            </button>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                            <button onClick={() => { setEditingDeviceId(device.id); setEditTargetUrl(device.target_url || ''); setEditLabelName(device.label_name || ''); }} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', padding: 0, fontWeight: '600', cursor: 'pointer' }}>
                              ✏️ Edit Nama &amp; Link (PIN)
                            </button>
                            
                            <button onClick={() => setPinModal({ isOpen: true, actionType: 'deleteCard', targetDevice: device, bulkQty: 10, pinInput: '', errorMsg: '', isSubmitting: false })} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                              🗑️ Hapus Kartu (PIN)
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* MODAL PIN CONFIRMATION */}
          {pinModal.isOpen && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
              <div style={{ width: '100%', maxWidth: '360px', backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: '700', color: '#0f172a' }}>
                  {pinModal.actionType === 'bulkGenerate' ? '⚡ Bulk Generate ID' : pinModal.actionType === 'bulkEditSave' ? '✏️ Edit Massal Terpilih' : pinModal.actionType === 'deleteCard' ? 'Hapus Kartu NFC' : 'Konfirmasi Perubahan'}
                </h3>

                <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748b' }}>
                  {pinModal.actionType === 'bulkGenerate' ? 'Masukkan jumlah ID dan PIN Admin:' : pinModal.actionType === 'bulkEditSave' ? `Konfirmasi edit massal untuk ${selectedDeviceIds.length} kartu terpilih:` : `Masukkan PIN Kartu (${pinModal.targetDevice?.pin}):`}
                </p>

                <form onSubmit={handleModalAction}>
                  {pinModal.actionType === 'bulkGenerate' && (
                    <div style={{ marginBottom: '12px', textAlign: 'left' }}>
                      <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Jumlah Kartu (Qty)</label>
                      <input type="number" min="1" max="100" required value={pinModal.bulkQty} onChange={(e) => setPinModal(prev => ({ ...prev, bulkQty: e.target.value }))} style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                    </div>
                  )}

                  <div style={{ marginBottom: '16px', textAlign: 'left' }}>
                    <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>
                      {pinModal.actionType === 'bulkGenerate' || pinModal.actionType === 'bulkEditSave' ? 'PIN Admin Konfirmasi' : 'PIN Kartu Konfirmasi'}
                    </label>
                    <input type="password" required autoFocus placeholder="Masukkan PIN 6-digit" value={pinModal.pinInput} onChange={(e) => setPinModal(prev => ({ ...prev, pinInput: e.target.value }))} style={{ width: '100%', padding: '10px', fontSize: '15px', textAlign: 'center', letterSpacing: '4px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', backgroundColor: '#f8fafc' }} />
                  </div>

                  {pinModal.errorMsg && <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#ef4444', fontWeight: '600' }}>{pinModal.errorMsg}</p>}

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={() => setPinModal({ isOpen: false, actionType: null, targetDevice: null, bulkQty: 10, pinInput: '', errorMsg: '', isSubmitting: false })} style={{ flex: 1, padding: '10px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Batal</button>
                    <button type="submit" disabled={pinModal.isSubmitting} style={{ flex: 1, padding: '10px', backgroundColor: pinModal.actionType === 'deleteCard' ? '#ef4444' : '#059669', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: pinModal.isSubmitting ? 'not-allowed' : 'pointer' }}>
                      {pinModal.isSubmitting ? 'Memproses...' : 'Konfirmasi'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TOAST NOTIFICATION */}
          {toast.show && (
            <div style={{ position: 'fixed', bottom: '24px', right: '24px', backgroundColor: toast.type === 'error' ? '#ef4444' : '#16a34a', color: '#ffffff', padding: '12px 20px', borderRadius: '10px', boxShadow: '0 4px 14px rgba(0,0,0,0.2)', fontSize: '13px', fontWeight: '600', zIndex: 10000 }}>
              {toast.message}
            </div>
          )}

          {/* TOMBOL FLOATING BACK TO TOP */}
          {showScrollTop && (
            <button
              onClick={scrollToTop}
              title="Kembali ke Atas"
              style={{
                position: 'fixed',
                bottom: '28px',
                right: '28px',
                width: '46px',
                height: '46px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '50%',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 'bold',
                zIndex: 999
              }}
            >
              ⬆️
            </button>
          )}

        </div>
      )}
    </AutoLogout>
  );
}
