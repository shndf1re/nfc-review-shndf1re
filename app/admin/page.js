'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import JSZip from 'jszip';
import AutoLogout from './AutoLogout';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

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
  // Fallback
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const getNfcBaseUrl = () => SITE_CONFIG?.nfcDomainUrl || (typeof window !== 'undefined' ? window.location.origin : '');
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
        ctx.drawImage(logoImage, centerX - (logoSize / 2), centerY - (logoSize / 2), logoSize, logoSize);
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
  const [sortBy, setSortBy] = useState('newest'); 
  const [statusFilter, setStatusFilter] = useState('all'); 

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
    xCm: 6.1, yCm: 5.3, qrSizeCm: 2.6   
  });

  const [pinModal, setPinModal] = useState({
    isOpen: false, actionType: null, targetDevice: null, bulkQty: 10, pinInput: '', errorMsg: '', isSubmitting: false
  });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  useEffect(() => {
    const savedSession = localStorage.getItem('nfc_admin_session');
    if (savedSession === 'true') {
      setIsAuthenticated(true);
      fetchDashboardData();
    }

    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => fetchDashboardData())
      .subscribe();

    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const fetchDashboardData = async () => {
    const { data: devData } = await supabase.from('devices').select('*');
    if (devData) setDevices(devData);

    const { data: invData } = await supabase.from('inventory').select('stock_quantity').eq('item_name', 'Papan Akrilik').maybeSingle();
    if (invData) setAcrylicStock(invData.stock_quantity);

    const { data: salesData } = await supabase.from('sales').select('total_price');
    if (salesData) setTotalOmzet(salesData.reduce((acc, curr) => acc + (parseFloat(curr.total_price) || 0), 0));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const { data: users, error } = await supabase.from('admin_users').select('*').eq('username', usernameInput.trim());
      let isSuccess = false;

      if (!error && users && users.length > 0) {
        const matchedUser = users.find(u => String(u.password).trim() === passwordInput.trim() || String(u.pin).trim() === passwordInput.trim());
        if (matchedUser) isSuccess = true;
      }

      if (!isSuccess) {
        const { data: isValidPin } = await supabase.rpc('verify_sales_pin', { input_pin: passwordInput.trim() });
        if (isValidPin) isSuccess = true;
      }

      if (isSuccess) {
        setIsAuthenticated(true);
        localStorage.setItem('nfc_admin_session', 'true');
        setUsernameInput(''); setPasswordInput('');
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
    setIsAuthenticated(false); setUsernameInput(''); setPasswordInput('');
    localStorage.removeItem('nfc_admin_session');
    if (typeof msg === 'string') showToast(msg, 'error');
  };

  const generateUniqueCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return 'NFC-' + result;
  };

  const handleGenerateNew = async () => {
    setLoading(true);
    const randomId = generateUniqueCode();
    const randomPin = Math.floor(100000 + Math.random() * 900000).toString();

    const { data, error } = await supabase.from('devices').insert([{ id: randomId, pin: randomPin, is_active: false }]).select().single();
    if (error) {
      showToast('❌ Gagal membuat ID baru: ' + error.message, 'error');
    } else {
      setCurrentDevice(data); setPreviewDeviceModal(data);
      showToast(`Kartu Baru ${data.id} Berhasil Dibuat!`);
      fetchDashboardData();
      setTimeout(() => { const el = document.getElementById(`card-${data.id}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 200);
    }
    setLoading(false);
  };

  const openBulkGenerateModal = () => setPinModal({ isOpen: true, actionType: 'bulkGenerate', targetDevice: null, bulkQty: 10, pinInput: '', errorMsg: '', isSubmitting: false });
  const handleCopyNfcUrl = (deviceId) => { navigator.clipboard.writeText(`${getNfcBaseUrl()}/r/${deviceId}?src=nfc`); showToast('📋 Link NFC disalin ke clipboard!'); };
  const handleSendWaCustomer = (device) => window.open(`https://wa.me/?text=${encodeURIComponent(`Halo Kak! Terima kasih telah memesan Papan Akrilik Google Review (${SITE_CONFIG.brandName}).\n\nBerikut detail aktivasi papan Anda:\n- ID Kartu: ${device.id}\n- PIN Akses: ${device.pin}\n\nSilakan buka link aktivasi berikut:\n🔗 ${getNfcBaseUrl()}/setup/${device.id}`)}`, '_blank');

  const formatReviewUrl = (url) => {
    let cleanUrl = url.trim();
    if (!cleanUrl) return '';
    if (cleanUrl.startsWith('ChIJ') && !cleanUrl.includes(' ')) return `https://search.google.com/local/writereview?placeid=${cleanUrl}`;
    const match = cleanUrl.match(/placeid=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) return `https://search.google.com/local/writereview?placeid=${match[1]}`;
    return cleanUrl;
  };

  const handleSelectAll = (e) => setSelectedDeviceIds(e.target.checked ? sortedDevices.map(d => d.id) : []);
  const handleToggleSelectCard = (id) => setSelectedDeviceIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);

  const handleTogglePreview = (device) => {
    if (previewDeviceModal?.id === device.id) {
      setPreviewDeviceModal(null);
    } else {
      setPreviewDeviceModal(device); setCurrentDevice(null);
      setTimeout(() => { const el = document.getElementById(`card-${device.id}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
    }
  };

  const handleDownloadSingleSticker = async (deviceId) => {
    showToast(`Membuat stiker untuk ${deviceId}...`);
    const dataUrl = await drawCustomStickerToCanvas(`${getNfcBaseUrl()}/r/${deviceId}`, stickerCmConfig);
    if (dataUrl) {
      const link = document.createElement('a'); link.href = dataUrl; link.download = `stiker-${deviceId}.png`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      showToast(`✅ Stiker ${deviceId} berhasil terunduh!`);
    } else {
      showToast(`❌ Gagal! Pastikan stiker-template.png ada di public/`, 'error');
    }
  };

  const handleDownloadSelectedStickersZip = async () => {
    if (selectedDeviceIds.length === 0 || isDownloadingBulk) return;
    setIsDownloadingBulk(true);
    showToast(`Membuat file ZIP (${selectedDeviceIds.length} Stiker HD)...`);
    const zip = new JSZip();
    for (let i = 0; i < selectedDeviceIds.length; i++) {
      const deviceId = selectedDeviceIds[i];
      const dataUrl = await drawCustomStickerToCanvas(`${getNfcBaseUrl()}/r/${deviceId}`, stickerCmConfig);
      if (dataUrl) zip.file(`stiker-${deviceId}.png`, dataUrl.replace(/^data:image\/png;base64,/, ''), { base64: true });
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    if (zipBlob.size > 22) { 
      const link = document.createElement('a'); link.href = URL.createObjectURL(zipBlob); link.download = `Stiker-Cetak-Batch-${new Date().toISOString().substring(0, 10)}.zip`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      showToast(`✅ Berhasil mendownload ${selectedDeviceIds.length} stiker!`);
    } else {
      showToast(`❌ Gagal membuat ZIP!`, 'error');
    }
    setIsDownloadingBulk(false);
  };

  const handleModalAction = async (e) => {
    e.preventDefault();
    setPinModal(prev => ({ ...prev, isSubmitting: true, errorMsg: '' }));

    if (pinModal.actionType === 'bulkGenerate') {
      const { data: isValidPin } = await supabase.rpc('verify_sales_pin', { input_pin: pinModal.pinInput.trim() });
      if (!isValidPin) return setPinModal(prev => ({ ...prev, isSubmitting: false, errorMsg: '❌ PIN Admin Salah!' }));
      const count = parseInt(pinModal.bulkQty) || 1;
      const newDevices = Array.from({ length: count }, () => ({ id: generateUniqueCode(), pin: Math.floor(100000 + Math.random() * 900000).toString(), is_active: false }));
      const { error } = await supabase.from('devices').insert(newDevices);
      if (error) return setPinModal(prev => ({ ...prev, isSubmitting: false, errorMsg: error.message }));
      showToast(`⚡ Berhasil membuat ${count} kartu baru!`);
      fetchDashboardData();
      return setPinModal({ isOpen: false, actionType: null, targetDevice: null, bulkQty: 10, pinInput: '', errorMsg: '', isSubmitting: false });
    }

    if (pinModal.actionType === 'bulkEditSave') {
      const { data: isValidPin } = await supabase.rpc('verify_sales_pin', { input_pin: pinModal.pinInput.trim() });
      if (!isValidPin) return setPinModal(prev => ({ ...prev, isSubmitting: false, errorMsg: '❌ PIN Admin Salah!' }));
      const formattedUrl = formatReviewUrl(bulkEditUrl);
      const { error } = await supabase.from('devices').update({ label_name: bulkEditLabel.trim() || null, target_url: formattedUrl || null, is_active: Boolean(formattedUrl) }).in('id', selectedDeviceIds);
      if (error) return setPinModal(prev => ({ ...prev, isSubmitting: false, errorMsg: error.message }));
      showToast(`✅ ${selectedDeviceIds.length} Kartu berhasil di-update!`);
      setShowBulkEditForm(false); setBulkEditLabel(''); setBulkEditUrl(''); setSelectedDeviceIds([]); fetchDashboardData();
      return setPinModal({ isOpen: false, actionType: null, targetDevice: null, bulkQty: 10, pinInput: '', errorMsg: '', isSubmitting: false });
    }

    const device = pinModal.targetDevice;
    const inputPinClean = String(pinModal.pinInput).trim();
    let isPinValid = inputPinClean === String(device?.pin || '').trim();
    if (!isPinValid) {
      const { data: isValidAdminPin } = await supabase.rpc('verify_sales_pin', { input_pin: inputPinClean });
      if (isValidAdminPin) isPinValid = true;
    }
    if (!isPinValid) return setPinModal(prev => ({ ...prev, isSubmitting: false, errorMsg: '❌ PIN Konfirmasi Salah!' }));

    if (pinModal.actionType === 'saveEdit') {
      const formattedUrl = formatReviewUrl(editTargetUrl);
      const { error } = await supabase.from('devices').update({ label_name: editLabelName.trim() || null, target_url: formattedUrl || null, is_active: Boolean(formattedUrl) }).eq('id', device.id);
      if (error) return setPinModal(prev => ({ ...prev, isSubmitting: false, errorMsg: error.message }));
      setEditingDeviceId(null); setEditTargetUrl(''); setEditLabelName('');
      showToast(formattedUrl ? 'Data toko berhasil diperbarui!' : '🔄 Kartu di-reset menjadi Belum Dipakai!');
    } else if (pinModal.actionType === 'resetCard') {
      const { error } = await supabase.from('devices').update({ label_name: null, target_url: null, is_active: false }).eq('id', device.id);
      if (error) return setPinModal(prev => ({ ...prev, isSubmitting: false, errorMsg: error.message }));
      showToast(`🔄 Kartu ${device.id} berhasil di-reset!`);
    } else if (pinModal.actionType === 'deleteCard') {
      const { error } = await supabase.from('devices').delete().eq('id', device.id);
      if (error) return setPinModal(prev => ({ ...prev, isSubmitting: false, errorMsg: error.message }));
      showToast(`Kartu ${device.id} berhasil dihapus!`, 'error');
      if (currentDevice?.id === device.id) setCurrentDevice(null);
      if (previewDeviceModal?.id === device.id) setPreviewDeviceModal(null);
    }
    fetchDashboardData();
    setPinModal({ isOpen: false, actionType: null, targetDevice: null, bulkQty: 10, pinInput: '', errorMsg: '', isSubmitting: false });
  };

  const filteredDevices = devices.filter((device) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = device.id.toLowerCase().includes(q) || (device.label_name && device.label_name.toLowerCase().includes(q));
    const isAct = Boolean(device.is_active);
    const matchesStatus = statusFilter === 'all' ? true : statusFilter === 'active' ? isAct : !isAct;
    return matchesSearch && matchesStatus;
  });

  const sortedDevices = [...filteredDevices].sort((a, b) => {
    const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (sortBy === 'newest') return tA !== tB ? tB - tA : b.id.localeCompare(a.id);
    return tA !== tB ? tA - tB : a.id.localeCompare(b.id);
  });

  const activeCardsCount = devices.filter(d => d.is_active).length;

  return (
    <AutoLogout isAuthenticated={isAuthenticated} onLogout={handleLogout}>
      {!isAuthenticated ? (
        <div className={inter.className} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', boxSizing: 'border-box', backgroundColor: '#f8fafc' }}>
          <div style={{ width: '100%', maxWidth: '400px', backgroundColor: '#ffffff', borderRadius: '24px', padding: '40px 32px', boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.05)', border: '1px solid #f1f5f9' }}>
            
            <div style={{ marginBottom: '24px' }}>
              <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', color: '#64748b', textDecoration: 'none', padding: '8px 12px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                ⬅️ Beranda Utama
              </Link>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ width: '56px', height: '56px', backgroundColor: '#0f172a', color: '#ffffff', borderRadius: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '16px', boxShadow: '0 10px 15px -3px rgba(15,23,42,0.1)' }}>
                🔒
              </div>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>Admin Portal</h2>
              <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Masuk untuk mengelola sistem NFC</p>
            </div>

            <form onSubmit={handleLogin} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>Username</label>
                <input type="text" required placeholder="Masukkan username" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box', backgroundColor: '#f8fafc', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = '#0f172a'} onBlur={(e) => e.target.style.borderColor = '#e2e8f0'} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>Password / PIN</label>
                <input type="password" required placeholder="••••••••" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box', backgroundColor: '#f8fafc', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = '#0f172a'} onBlur={(e) => e.target.style.borderColor = '#e2e8f0'} />
              </div>
              <button type="submit" disabled={loginLoading} style={{ width: '100%', padding: '16px', backgroundColor: loginLoading ? '#94a3b8' : '#0f172a', color: '#ffffff', border: 'none', borderRadius: '14px', fontWeight: '700', fontSize: '14px', cursor: loginLoading ? 'not-allowed' : 'pointer', marginTop: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                {loginLoading ? 'Memverifikasi...' : 'Masuk Dashboard'}
              </button>
              {loginError && <p style={{ margin: 0, color: '#ef4444', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>{loginError}</p>}
            </form>
          </div>
        </div>
      ) : (
        <div className={inter.className} style={{ minHeight: '100vh', backgroundColor: '#f8fafc', paddingBottom: '60px' }}>
          
          {/* TOP NAVBAR ADMIN */}
          <div style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 50 }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>{SITE_CONFIG?.adminTitle || 'Dashboard'}</h2>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>Sistem Manajemen Terpusat</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Link href="/admin/sales" style={{ padding: '8px 14px', backgroundColor: '#f0fdf4', color: '#15803d', borderRadius: '10px', fontSize: '13px', fontWeight: '700', textDecoration: 'none' }}>
                  💰 Penjualan
                </Link>
                <Link href="/admin/stats" style={{ padding: '8px 14px', backgroundColor: '#eff6ff', color: '#1d4ed8', borderRadius: '10px', fontSize: '13px', fontWeight: '700', textDecoration: 'none' }}>
                  📊 Statistik
                </Link>
                <button onClick={() => handleLogout('Berhasil logout.')} style={{ padding: '8px 14px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>Keluar</button>
              </div>
            </div>
          </div>

          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 16px', boxSizing: 'border-box' }}>
            
            {/* KPI CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '32px' }}>
              <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '20px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', display: 'block', marginBottom: '8px' }}>🏷️ KARTU AKTIF</span>
                <strong style={{ fontSize: '24px', color: '#0f172a', fontWeight: '800' }}>{activeCardsCount} <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '500' }}>/ {devices.length}</span></strong>
              </div>

              <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '20px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', display: 'block', marginBottom: '8px' }}>📦 STOK AKRILIK</span>
                <strong style={{ fontSize: '24px', color: acrylicStock <= 5 ? '#ef4444' : '#0f172a', fontWeight: '800' }}>{acrylicStock} <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '500' }}>pcs</span></strong>
              </div>

              <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '20px', border: '1px solid #f1f5f9', gridColumn: 'span 2', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', display: 'block', marginBottom: '8px' }}>💵 TOTAL OMZET</span>
                <strong style={{ fontSize: '28px', color: '#15803d', fontWeight: '800', letterSpacing: '-0.5px' }}>Rp {totalOmzet.toLocaleString('id-ID')}</strong>
              </div>
            </div>

            {/* QUICK ACTIONS */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
              <button onClick={handleGenerateNew} disabled={loading} style={{ flex: 1, padding: '14px', backgroundColor: loading ? '#94a3b8' : '#0f172a', color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                + Generate 1 ID
              </button>
              <button onClick={openBulkGenerateModal} style={{ flex: 1, padding: '14px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(37,99,235,0.2)' }}>
                ⚡ Bulk Generate
              </button>
              <a href="/stiker-template.png" download="stiker-template.png" style={{ flex: 1, padding: '14px', backgroundColor: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '12px', fontWeight: '700', fontSize: '13px', textDecoration: 'none', textAlign: 'center', boxSizing: 'border-box' }}>
                🖼️ Download Master
              </a>
            </div>

            {/* BULK SELECTION CONTROL PANEL */}
            {selectedDeviceIds.length > 0 && (
              <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '20px', marginBottom: '32px', color: '#fff', boxShadow: '0 20px 25px -5px rgba(15,23,42,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '700' }}>
                    ☑️ {selectedDeviceIds.length} Kartu Terpilih
                  </span>
                  <button onClick={() => setSelectedDeviceIds([])} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                    Batal Pilih
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  <button onClick={handleDownloadSelectedStickersZip} disabled={isDownloadingBulk} style={{ flex: 1, padding: '12px', backgroundColor: isDownloadingBulk ? '#475569' : '#16a34a', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: isDownloadingBulk ? 'not-allowed' : 'pointer' }}>
                    {isDownloadingBulk ? '⏳ Memproses ZIP...' : '🖨️ Download Stiker (.ZIP)'}
                  </button>
                  <button onClick={() => setShowBulkEditForm(!showBulkEditForm)} style={{ flex: 1, padding: '12px', backgroundColor: '#334155', color: '#fff', border: '1px solid #475569', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                    ✏️ Edit Massal
                  </button>
                </div>

                {/* FORM SETUP CM IN DARK MODE */}
                <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '16px', border: '1px solid #334155' }}>
                  <h5 style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#cbd5e1' }}>📐 Pengaturan Posisi QR (cm):</h5>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Pos X (cm)</label>
                      <input type="number" step="0.1" value={stickerCmConfig.xCm} onChange={(e) => setStickerCmConfig({ ...stickerCmConfig, xCm: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '8px', fontSize: '13px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', boxSizing: 'border-box', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Pos Y (cm)</label>
                      <input type="number" step="0.1" value={stickerCmConfig.yCm} onChange={(e) => setStickerCmConfig({ ...stickerCmConfig, yCm: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '8px', fontSize: '13px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', boxSizing: 'border-box', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Size (cm)</label>
                      <input type="number" step="0.1" value={stickerCmConfig.qrSizeCm} onChange={(e) => setStickerCmConfig({ ...stickerCmConfig, qrSizeCm: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '8px', fontSize: '13px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', boxSizing: 'border-box', outline: 'none' }} />
                    </div>
                  </div>
                </div>

                {showBulkEditForm && (
                  <div style={{ marginTop: '16px', backgroundColor: '#1e293b', padding: '16px', borderRadius: '16px', border: '1px solid #334155' }}>
                    <h5 style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#cbd5e1' }}>✏️ Ubah Data Toko Massal:</h5>
                    <input type="text" placeholder="Nama Toko (Kosongkan = Reset)" value={bulkEditLabel} onChange={(e) => setBulkEditLabel(e.target.value)} style={{ width: '100%', padding: '10px', fontSize: '13px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', marginBottom: '10px', boxSizing: 'border-box', outline: 'none' }} />
                    <input type="text" placeholder="Link Review (Kosongkan = Reset)" value={bulkEditUrl} onChange={(e) => setBulkEditUrl(e.target.value)} style={{ width: '100%', padding: '10px', fontSize: '13px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', marginBottom: '12px', boxSizing: 'border-box', outline: 'none' }} />
                    <button onClick={() => setPinModal({ isOpen: true, actionType: 'bulkEditSave', targetDevice: null, bulkQty: 10, pinInput: '', errorMsg: '', isSubmitting: false })} style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                      Simpan Edit Massal
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* FILTER & SEARCH PANEL */}
            <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '20px', border: '1px solid #f1f5f9', marginBottom: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
                <input
                  type="text"
                  placeholder="🔍 Cari ID Kartu atau Nama Toko..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '14px 16px', fontSize: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', boxSizing: 'border-box', backgroundColor: '#f8fafc' }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px' }}>STATUS KARTU</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: '600', outline: 'none' }}
                    >
                      <option value="all">Semua ({devices.length})</option>
                      <option value="active">🟢 Aktif ({devices.filter(d => d.is_active).length})</option>
                      <option value="inactive">🟡 Belum Dipakai ({devices.filter(d => !d.is_active).length})</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px' }}>URUTAN</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: '600', outline: 'none' }}
                    >
                      <option value="newest">⬇️ Terbaru</option>
                      <option value="oldest">⬆️ Terlama</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569' }}>
                <input type="checkbox" id="selectAll" checked={selectedDeviceIds.length === sortedDevices.length && sortedDevices.length > 0} onChange={handleSelectAll} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                <label htmlFor="selectAll" style={{ cursor: 'pointer', fontWeight: '600' }}>Pilih Semua Data Filter ({sortedDevices.length})</label>
              </div>
            </div>

            {/* CARD LIST */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '0 8px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Daftar Kartu NFC ({sortedDevices.length})</h3>
              <button onClick={fetchDashboardData} style={{ background: '#f1f5f9', border: 'none', color: '#475569', fontSize: '12px', fontWeight: '700', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }}>🔄 Segarkan</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {sortedDevices.map((device) => {
                const isCardActive = Boolean(device.is_active);
                const isSelected = selectedDeviceIds.includes(device.id);
                const isPreviewingThis = previewDeviceModal?.id === device.id;

                const baseUrl = getNfcBaseUrl();
                const targetUrl = `${baseUrl}/r/${device.id}?src=qr`;
                const qrPreviewApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(targetUrl)}`;
                const googleLogoUrl = SITE_CONFIG?.qrLogoUrl || 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg';

                return (
                  <div 
                    key={device.id} id={`card-${device.id}`}
                    style={{ 
                      padding: '20px', borderRadius: '20px', 
                      border: isPreviewingThis ? '2px solid #2563eb' : isSelected ? '2px solid #0f172a' : '1px solid #e2e8f0', 
                      backgroundColor: '#ffffff',
                      boxShadow: isPreviewingThis || isSelected ? '0 10px 25px -5px rgba(37,99,235,0.1)' : '0 4px 6px -1px rgba(0,0,0,0.02)',
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                    {/* Header Card */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <input type="checkbox" checked={isSelected} onChange={() => handleToggleSelectCard(device.id)} style={{ cursor: 'pointer', width: '18px', height: '18px', marginTop: '2px' }} />
                        <div>
                          <strong style={{ fontSize: '16px', color: '#0f172a', display: 'block', letterSpacing: '0.5px' }}>{device.id}</strong>
                          <span style={{ fontSize: '11px', display: 'inline-block', padding: '4px 10px', borderRadius: '12px', backgroundColor: isCardActive ? '#ecfdf5' : '#f8fafc', color: isCardActive ? '#059669' : '#64748b', fontWeight: '700', marginTop: '6px' }}>
                            {isCardActive ? '🟢 Aktif' : '🟡 Belum Dipakai'}
                          </span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>PIN Akses</span>
                        <strong style={{ fontSize: '14px', color: '#dc2626', letterSpacing: '1px' }}>{device.pin || '-'}</strong>
                      </div>
                    </div>

                    {/* Data Toko */}
                    {device.label_name && (
                      <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '12px', marginBottom: '12px', border: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
                          🏪 {device.label_name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', wordBreak: 'break-all' }}>
                          🔗 <a href={device.target_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>{device.target_url}</a>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons Row */}
                    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {editingDeviceId === device.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                          <input type="text" placeholder="Nama Toko" value={editLabelName} onChange={(e) => setEditLabelName(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} />
                          <input type="text" placeholder="Link Direct Review (Kosongkan jika reset)" value={editTargetUrl} onChange={(e) => setEditTargetUrl(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} />
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => setPinModal({ isOpen: true, actionType: 'saveEdit', targetDevice: device, bulkQty: 10, pinInput: '', errorMsg: '', isSubmitting: false })} style={{ flex: 1, padding: '10px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>Simpan (PIN)</button>
                            <button onClick={() => setEditingDeviceId(null)} style={{ padding: '10px 16px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '600', color: '#475569', cursor: 'pointer' }}>Batal</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => handleTogglePreview(device)} style={{ flex: 1, padding: '10px', backgroundColor: isPreviewingThis ? '#2563eb' : '#eff6ff', color: isPreviewingThis ? '#ffffff' : '#2563eb', border: isPreviewingThis ? 'none' : '1px solid #bfdbfe', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                              {isPreviewingThis ? '✖ Tutup Stiker' : '👁️ Lihat Stiker QR'}
                            </button>
                            <button onClick={() => handleSendWaCustomer(device)} style={{ flex: 1, padding: '10px', backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                              💬 WA ke Pembeli
                            </button>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', padding: '0 4px' }}>
                            <button onClick={() => { setEditingDeviceId(device.id); setEditTargetUrl(device.target_url || ''); setEditLabelName(device.label_name || ''); }} style={{ background: 'none', border: 'none', color: '#475569', fontSize: '12px', fontWeight: '600', cursor: 'pointer', padding: 0 }}>
                              ✏️ Edit Manual
                            </button>
                            <div style={{ display: 'flex', gap: '16px' }}>
                              {isCardActive && (
                                <button onClick={() => setPinModal({ isOpen: true, actionType: 'resetCard', targetDevice: device, bulkQty: 10, pinInput: '', errorMsg: '', isSubmitting: false })} style={{ background: 'none', border: 'none', color: '#d97706', fontSize: '12px', fontWeight: '600', cursor: 'pointer', padding: 0 }}>
                                  🔄 Reset
                                </button>
                              )}
                              <button onClick={() => setPinModal({ isOpen: true, actionType: 'deleteCard', targetDevice: device, bulkQty: 10, pinInput: '', errorMsg: '', isSubmitting: false })} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', fontWeight: '600', cursor: 'pointer', padding: 0 }}>
                                🗑️ Hapus
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* LIVE PREVIEW STIKER DROPDOWN */}
                    {isPreviewingThis && (
                      <div style={{ marginTop: '20px', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                          <div style={{ position: 'relative', display: 'inline-block', backgroundColor: '#ffffff', padding: '8px', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                            <img src={qrPreviewApiUrl} alt={`QR ${device.id}`} style={{ width: '140px', height: '140px', display: 'block', borderRadius: '8px' }} />
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '32px', height: '32px', backgroundColor: '#ffffff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                              <img src={googleLogoUrl} alt="G" style={{ width: '20px', height: '20px' }} />
                            </div>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <button onClick={() => handleDownloadSingleSticker(device.id)} style={{ width: '100%', padding: '12px', backgroundColor: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                            🖨️ Download Master Cetak HD
                          </button>
                          <button onClick={() => handleCopyNfcUrl(device.id)} style={{ width: '100%', padding: '10px', backgroundColor: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '10px', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
                            📋 Salin URL NFC
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          </div>

          {/* MODAL GLOBAL (GLASSMORPHISM) */}
          {pinModal.isOpen && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
              <div style={{ width: '100%', maxWidth: '360px', backgroundColor: '#ffffff', borderRadius: '24px', padding: '32px 24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '800', color: pinModal.actionType === 'deleteCard' || pinModal.actionType === 'resetCard' ? '#ef4444' : '#0f172a', letterSpacing: '-0.5px' }}>
                  {pinModal.actionType === 'bulkGenerate' ? '⚡ Bulk Generate ID' : 
                   pinModal.actionType === 'bulkEditSave' ? '✏️ Edit Massal Terpilih' : 
                   pinModal.actionType === 'resetCard' ? '🔄 Reset Papan' :
                   pinModal.actionType === 'deleteCard' ? '🗑️ Hapus Papan' : 'Konfirmasi Tindakan'}
                </h3>

                <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
                  {pinModal.actionType === 'bulkGenerate' ? 'Tentukan jumlah ID dan otorisasi dengan PIN.' : 
                   pinModal.actionType === 'bulkEditSave' ? `Otorisasi perubahan untuk ${selectedDeviceIds.length} kartu terpilih.` : 
                   pinModal.actionType === 'resetCard' ? `Papan ${pinModal.targetDevice?.id} akan kembali ke kondisi kosong.` :
                   `Masukkan PIN (Admin/Papan) untuk verifikasi.`}
                </p>

                <form onSubmit={handleModalAction} autoComplete="off">
                  {pinModal.actionType === 'bulkGenerate' && (
                    <div style={{ marginBottom: '16px' }}>
                      <input type="number" min="1" max="100" required placeholder="Jumlah Qty" value={pinModal.bulkQty} onChange={(e) => setPinModal(prev => ({ ...prev, bulkQty: e.target.value }))} style={{ width: '100%', padding: '14px', fontSize: '15px', borderRadius: '12px', border: '1px solid #cbd5e1', textAlign: 'center', outline: 'none' }} />
                    </div>
                  )}

                  <div style={{ marginBottom: '20px' }}>
                    <input type="password" required autoFocus maxLength={6} placeholder="••••••" value={pinModal.pinInput} onChange={(e) => setPinModal(prev => ({ ...prev, pinInput: e.target.value }))} style={{ width: '100%', padding: '16px', fontSize: '20px', textAlign: 'center', letterSpacing: '8px', borderRadius: '12px', border: pinModal.actionType === 'deleteCard' || pinModal.actionType === 'resetCard' ? '1px solid #fca5a5' : '1px solid #cbd5e1', backgroundColor: pinModal.actionType === 'deleteCard' || pinModal.actionType === 'resetCard' ? '#fef2f2' : '#f8fafc', outline: 'none' }} />
                  </div>

                  {pinModal.errorMsg && <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#ef4444', fontWeight: '600' }}>{pinModal.errorMsg}</p>}

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" onClick={() => setPinModal({ isOpen: false, actionType: null, targetDevice: null, bulkQty: 10, pinInput: '', errorMsg: '', isSubmitting: false })} style={{ flex: 1, padding: '14px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Batal</button>
                    <button type="submit" disabled={pinModal.isSubmitting} style={{ flex: 1, padding: '14px', backgroundColor: pinModal.isSubmitting ? '#94a3b8' : pinModal.actionType === 'deleteCard' || pinModal.actionType === 'resetCard' ? '#ef4444' : '#0f172a', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: pinModal.isSubmitting ? 'not-allowed' : 'pointer' }}>
                      {pinModal.isSubmitting ? 'Proses...' : 'Konfirmasi'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {toast.show && (
            <div style={{ position: 'fixed', bottom: '24px', right: '24px', backgroundColor: toast.type === 'error' ? '#ef4444' : '#0f172a', color: '#ffffff', padding: '14px 24px', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)', fontSize: '13px', fontWeight: '600', zIndex: 10000 }}>
              {toast.message}
            </div>
          )}

          {showScrollTop && (
            <button onClick={scrollToTop} style={{ position: 'fixed', bottom: '28px', right: '28px', width: '50px', height: '50px', backgroundColor: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '50%', boxShadow: '0 10px 25px rgba(15,23,42,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold', zIndex: 999 }}>
              ⬆️
            </button>
          )}

        </div>
      )}
    </AutoLogout>
  );
}
