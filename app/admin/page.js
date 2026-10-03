'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import JSZip from 'jszip';
import AutoLogout from './AutoLogout';
import {
  LayoutDashboard, CreditCard, Package, Wallet, Plus, Zap, Download, Search, RefreshCw, Eye, MessageCircle,
  Pencil, RotateCcw, Trash2, Copy, Printer, Store, Link2, X, ChevronLeft, ChevronRight, ArrowUp, Lock,
  ShieldCheck, Nfc, QrCode, Ruler, CheckSquare, ArrowLeft, KeyRound, BarChart3, Loader2,
} from 'lucide-react';
import {
  PageContainer, PageHeader, Panel, KpiCard, StatusBadge, Pill, Field, TextInput, SelectInput, Checkbox,
  Btn, Modal, PinField, useToast, EmptyState, Skeleton, Th, Td, formatRupiah, formatRupiahCompact,
} from '@/components/admin/kit';

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
  const [userRole, setUserRole] = useState('staff'); // Tambahan Role State
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

  const { showToast, ToastViewport } = useToast();
  const [dataLoading, setDataLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const [stickerCmConfig, setStickerCmConfig] = useState({
    stikerWidthCm: 10.3,
    stikerHeightCm: 10.3,
    xCm: 6.1, yCm: 5.3, qrSizeCm: 2.6   
  });

  const [pinModal, setPinModal] = useState({
    isOpen: false, actionType: null, targetDevice: null, bulkQty: 10, pinInput: '', errorMsg: '', isSubmitting: false
  });


  useEffect(() => {
    // Verifikasi sesi via httpOnly cookie (/api/auth/me) - tidak bisa dibypass dari DevTools
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.user) {
          setIsAuthenticated(true);
          setUserRole(data.user.role || 'staff');
          fetchDashboardData();
        } else {
          const params = new URLSearchParams(window.location.search);
          if (params.get('reason') === 'login_required') setLoginError('Silakan login terlebih dahulu.');
          else if (params.get('reason') === 'expired') setLoginError('Sesi Anda telah berakhir. Silakan login kembali.');
          else if (params.get('reason') === 'forbidden') setLoginError('Akses ditolak. Butuh hak Super Admin.');
        }
      })
      .catch(() => {});

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
    setDataLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: usernameInput.trim(), password: passwordInput.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setIsAuthenticated(true);
        setUserRole(data.user?.role || 'staff');
        setUsernameInput('');
        setPasswordInput('');
        fetchDashboardData();
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('admin:login'));
      } else {
        setLoginError(data.error || 'Username atau password salah.');
      }
    } catch (err) {
      setLoginError('Terjadi kesalahan koneksi.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async (msg) => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {}
    setIsAuthenticated(false);
    setUsernameInput('');
    setPasswordInput('');
    if (typeof window !== 'undefined') {
      window.location.href = '/admin';
    }
  };

  const generateUniqueCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return 'NFC-' + result;
  };

  const handleGenerateNew = async () => {
    if (userRole !== 'super_admin') {
      showToast('❌ Akses ditolak: Hanya Super Admin!', 'error');
      return;
    }

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

  const openBulkGenerateModal = () => {
    if (userRole !== 'super_admin') {
      showToast('❌ Akses ditolak: Hanya Super Admin!', 'error');
      return;
    }
    setPinModal({ isOpen: true, actionType: 'bulkGenerate', targetDevice: null, bulkQty: 10, pinInput: '', errorMsg: '', isSubmitting: false });
  };

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
      if (userRole !== 'super_admin') return setPinModal(prev => ({ ...prev, isSubmitting: false, errorMsg: '❌ Akses ditolak!' }));
      
      const { data: verifyRes } = await supabase.rpc('verify_sales_pin', { input_pin: pinModal.pinInput.trim() });
      if (!verifyRes || !verifyRes[0]?.is_valid) return setPinModal(prev => ({ ...prev, isSubmitting: false, errorMsg: '❌ PIN Admin Salah!' }));
      const count = parseInt(pinModal.bulkQty) || 1;
      const newDevices = Array.from({ length: count }, () => ({ id: generateUniqueCode(), pin: Math.floor(100000 + Math.random() * 900000).toString(), is_active: false }));
      const { error } = await supabase.from('devices').insert(newDevices);
      if (error) return setPinModal(prev => ({ ...prev, isSubmitting: false, errorMsg: error.message }));
      showToast(`⚡ Berhasil membuat ${count} kartu baru!`);
      fetchDashboardData();
      return setPinModal({ isOpen: false, actionType: null, targetDevice: null, bulkQty: 10, pinInput: '', errorMsg: '', isSubmitting: false });
    }

    if (pinModal.actionType === 'bulkEditSave') {
      const { data: verifyRes } = await supabase.rpc('verify_sales_pin', { input_pin: pinModal.pinInput.trim() });
      if (!verifyRes || !verifyRes[0]?.is_valid) return setPinModal(prev => ({ ...prev, isSubmitting: false, errorMsg: '❌ PIN Admin Salah!' }));
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
      const { data: verifyRes } = await supabase.rpc('verify_sales_pin', { input_pin: inputPinClean });
      if (verifyRes && verifyRes[0]?.is_valid) isPinValid = true;
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
      if (userRole !== 'super_admin') return setPinModal(prev => ({ ...prev, isSubmitting: false, errorMsg: '❌ Akses Ditolak: Hanya Super Admin!' }));
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
  const PAGE_SIZE = 12;
  const totalPages = Math.max(1, Math.ceil(sortedDevices.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedDevices = sortedDevices.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const inactiveCardsCount = devices.length - activeCardsCount;
  const activePct = devices.length ? Math.round((activeCardsCount / devices.length) * 100) : 0;
  const isSuper = userRole === 'super_admin';
  const closePinModal = () => setPinModal({ isOpen: false, actionType: null, targetDevice: null, bulkQty: 10, pinInput: '', errorMsg: '', isSubmitting: false });
  const openPin = (actionType, targetDevice = null) => setPinModal({ isOpen: true, actionType, targetDevice, bulkQty: 10, pinInput: '', errorMsg: '', isSubmitting: false });
  const isDanger = pinModal.actionType === 'deleteCard' || pinModal.actionType === 'resetCard';
  const editingDevice = devices.find((d) => d.id === editingDeviceId);

  const pinMeta = {
    bulkGenerate: { title: 'Bulk Generate ID', desc: 'Tentukan jumlah kartu baru, lalu otorisasi dengan PIN admin.', icon: Zap, tone: 'violet' },
    bulkEditSave: { title: 'Konfirmasi Edit Massal', desc: `Otorisasi perubahan untuk ${selectedDeviceIds.length} kartu terpilih.`, icon: Pencil, tone: 'indigo' },
    resetCard: { title: 'Reset Papan', desc: `Papan ${pinModal.targetDevice?.id || ''} akan kembali ke kondisi kosong.`, icon: RotateCcw, tone: 'amber' },
    deleteCard: { title: 'Hapus Papan', desc: `Kartu ${pinModal.targetDevice?.id || ''} akan dihapus permanen.`, icon: Trash2, tone: 'rose' },
    saveEdit: { title: 'Konfirmasi Perubahan', desc: 'Masukkan PIN (Admin/Papan) untuk verifikasi.', icon: ShieldCheck, tone: 'indigo' },
  }[pinModal.actionType] || { title: 'Konfirmasi Tindakan', desc: 'Masukkan PIN untuk verifikasi.', icon: Lock, tone: 'indigo' };

  const startEdit = (device) => { setEditingDeviceId(device.id); setEditTargetUrl(device.target_url || ''); setEditLabelName(device.label_name || ''); };

  const RowActions = ({ device }) => (
    <div className="flex items-center justify-end gap-0.5">
      <Btn variant="ghost" size="icon" title="Lihat stiker QR" onClick={() => handleTogglePreview(device)} data-testid={`preview-${device.id}`}><QrCode /></Btn>
      <Btn variant="ghost" size="icon" title="Kirim WA ke pembeli" onClick={() => handleSendWaCustomer(device)}><MessageCircle /></Btn>
      <Btn variant="ghost" size="icon" title="Edit" onClick={() => startEdit(device)} data-testid={`edit-${device.id}`}><Pencil /></Btn>
      {device.is_active && <Btn variant="ghost" size="icon" title="Reset" className="hover:text-amber-600" onClick={() => openPin('resetCard', device)}><RotateCcw /></Btn>}
      {isSuper && <Btn variant="danger-soft" size="icon" title="Hapus" onClick={() => openPin('deleteCard', device)}><Trash2 /></Btn>}
    </div>
  );

  return (
    <AutoLogout isAuthenticated={isAuthenticated} onLogout={handleLogout}>
      {!isAuthenticated ? (
        /* ===================== LOGIN ===================== */
        <div className="min-h-screen grid lg:grid-cols-2">
          <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-12 text-white">
            <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-violet-400/30 blur-3xl" />
            <div className="relative flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center ring-1 ring-white/20"><Nfc className="h-5 w-5" /></div>
              <span className="font-bold tracking-tight">NFC Review Console</span>
            </div>
            <div className="relative space-y-6">
              <h2 className="text-4xl font-bold leading-tight tracking-tight">Kelola ratusan papan<br />Google Review dalam<br />satu dashboard.</h2>
              <div className="grid grid-cols-3 gap-3 max-w-md">
                {[{ i: CreditCard, t: 'Kartu NFC' }, { i: BarChart3, t: 'Statistik' }, { i: Wallet, t: 'Penjualan' }].map(({ i: I, t }) => (
                  <div key={t} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
                    <I className="h-5 w-5 mb-3 opacity-90" />
                    <div className="text-sm font-semibold">{t}</div>
                  </div>
                ))}
              </div>
            </div>
            <p className="relative text-xs text-white/70">© 2026 NFC Review by shndf1re</p>
          </div>

          <div className="flex items-center justify-center p-5 sm:p-10">
            <div className="w-full max-w-sm">
              <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground mb-8">
                <ArrowLeft className="h-4 w-4" /> Kembali ke Beranda
              </Link>
              <div className="lg:hidden mb-6 h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-violet-500 text-white flex items-center justify-center shadow-lg shadow-primary/30"><Nfc className="h-6 w-6" /></div>
              <h1 className="text-2xl font-bold tracking-tight">Masuk ke Admin</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">Gunakan akun tim Anda untuk mengelola sistem NFC Review.</p>

              <form onSubmit={handleLogin} autoComplete="off" className="mt-8 space-y-4">
                <Field label="Username">
                  <TextInput data-testid="login-username" required placeholder="Masukkan username" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} className="h-11" />
                </Field>
                <Field label="Password / PIN">
                  <TextInput data-testid="login-password" type="password" required placeholder="••••••••" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="h-11" />
                </Field>
                {loginError && (
                  <div data-testid="login-error" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                    <Lock className="mt-0.5 h-4 w-4 shrink-0" /> {loginError}
                  </div>
                )}
                <Btn data-testid="login-submit" type="submit" variant="gradient" size="lg" loading={loginLoading} className="w-full">
                  {loginLoading ? 'Memverifikasi...' : 'Masuk Dashboard'}
                </Btn>
              </form>
              <p className="mt-8 text-center text-xs text-muted-foreground">Sesi login aman via cookie httpOnly · berlaku 12 jam</p>
            </div>
          </div>
        </div>
      ) : (
        /* ===================== DASHBOARD ===================== */
        <PageContainer>
          <PageHeader
            icon={LayoutDashboard}
            eyebrow={isSuper ? 'Super Admin' : 'Staff Admin'}
            title="Manajemen Papan NFC"
            description="Kelola unique code, aktivasi, dan stiker QR untuk setiap papan akrilik."
            actions={
              <>
                <Btn as="a" variant="outline" href="/stiker-template.png" download="stiker-template.png"><Download /> Master Stiker</Btn>
                {isSuper && (
                  <>
                    <Btn variant="outline" onClick={openBulkGenerateModal} data-testid="bulk-generate-btn"><Zap /> Bulk Generate</Btn>
                    <Btn variant="gradient" onClick={handleGenerateNew} loading={loading} data-testid="generate-one-btn"><Plus /> Generate ID</Btn>
                  </>
                )}
              </>
            }
          />

          {/* KPI */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <KpiCard testId="kpi-active" label="Kartu Aktif" value={dataLoading ? '—' : activeCardsCount} suffix={`/ ${devices.length}`} icon={CreditCard} tone="indigo" hint={`${activePct}% sudah terpasang`} />
            <KpiCard testId="kpi-inactive" label="Belum Dipakai" value={dataLoading ? '—' : inactiveCardsCount} suffix="kartu" icon={Nfc} tone="violet" hint="Siap dikirim ke pembeli" />
            <KpiCard testId="kpi-stock" label="Stok Akrilik" value={dataLoading ? '—' : acrylicStock} suffix="pcs" icon={Package} tone={acrylicStock <= 5 ? 'rose' : 'amber'} hint={acrylicStock <= 5 ? 'Stok menipis — segera restock' : 'Stok aman'} hintTone={acrylicStock <= 5 ? 'bad' : 'good'} />
            <KpiCard testId="kpi-omzet" label="Total Omzet" value={dataLoading ? '—' : formatRupiahCompact(totalOmzet)} icon={Wallet} tone="emerald" hint={<Link href="/admin/sales" className="font-medium text-primary hover:underline">Lihat laporan penjualan →</Link>} />
          </div>

          {/* BULK SELECTION BAR */}
          {selectedDeviceIds.length > 0 && (
            <div data-testid="bulk-bar" className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/[0.07] to-violet-500/[0.07] p-4 sm:p-5 space-y-4 animate-in fade-in-0 slide-in-from-top-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><CheckSquare className="h-4 w-4" /></div>
                  <div>
                    <div className="text-sm font-semibold">{selectedDeviceIds.length} kartu terpilih</div>
                    <div className="text-xs text-muted-foreground">Download stiker massal atau ubah data toko sekaligus</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Btn size="sm" variant="success" onClick={handleDownloadSelectedStickersZip} loading={isDownloadingBulk}><Printer /> {isDownloadingBulk ? 'Memproses ZIP...' : 'Download Stiker (.ZIP)'}</Btn>
                  <Btn size="sm" variant={showBulkEditForm ? 'primary' : 'outline'} onClick={() => setShowBulkEditForm(!showBulkEditForm)}><Pencil /> Edit Massal</Btn>
                  <Btn size="sm" variant="ghost" onClick={() => setSelectedDeviceIds([])}><X /> Batal</Btn>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-foreground"><Ruler className="h-4 w-4 text-primary" /> Posisi QR pada stiker (cm)</div>
                  <div className="grid grid-cols-3 gap-2">
                    <Field label="Pos X"><TextInput type="number" step="0.1" value={stickerCmConfig.xCm} onChange={(e) => setStickerCmConfig({ ...stickerCmConfig, xCm: parseFloat(e.target.value) || 0 })} /></Field>
                    <Field label="Pos Y"><TextInput type="number" step="0.1" value={stickerCmConfig.yCm} onChange={(e) => setStickerCmConfig({ ...stickerCmConfig, yCm: parseFloat(e.target.value) || 0 })} /></Field>
                    <Field label="Ukuran"><TextInput type="number" step="0.1" value={stickerCmConfig.qrSizeCm} onChange={(e) => setStickerCmConfig({ ...stickerCmConfig, qrSizeCm: parseFloat(e.target.value) || 0 })} /></Field>
                  </div>
                </div>
                {showBulkEditForm && (
                  <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground"><Store className="h-4 w-4 text-primary" /> Ubah data toko massal</div>
                    <TextInput placeholder="Nama Toko (kosongkan = reset)" value={bulkEditLabel} onChange={(e) => setBulkEditLabel(e.target.value)} />
                    <TextInput placeholder="Link Review (kosongkan = reset)" value={bulkEditUrl} onChange={(e) => setBulkEditUrl(e.target.value)} />
                    <Btn size="sm" className="w-full" onClick={() => openPin('bulkEditSave')}><ShieldCheck /> Simpan Edit Massal</Btn>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TABLE PANEL */}
          <Panel
            noPadding
            title={`Daftar Kartu NFC`}
            description={`${sortedDevices.length} dari ${devices.length} kartu ditampilkan`}
            actions={<Btn size="sm" variant="outline" onClick={fetchDashboardData} data-testid="refresh-btn"><RefreshCw /> Segarkan</Btn>}
          >
            {/* Toolbar */}
            <div className="flex flex-col gap-3 border-b border-border p-4 sm:px-6 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <TextInput data-testid="search-input" placeholder="Cari ID kartu atau nama toko..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} className="pl-9" />
              </div>
              <div className="flex gap-2">
                <div className="flex rounded-lg border border-border bg-muted/50 p-0.5" data-testid="status-filter">
                  {[
                    { v: 'all', l: 'Semua', c: devices.length },
                    { v: 'active', l: 'Aktif', c: activeCardsCount },
                    { v: 'inactive', l: 'Kosong', c: inactiveCardsCount },
                  ].map((o) => (
                    <button key={o.v} onClick={() => { setStatusFilter(o.v); setPage(1); }} className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all ${statusFilter === o.v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                      {o.l} <span className="ml-0.5 text-muted-foreground">{o.c}</span>
                    </button>
                  ))}
                </div>
                <SelectInput value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-[120px]">
                  <option value="newest">Terbaru</option>
                  <option value="oldest">Terlama</option>
                </SelectInput>
              </div>
            </div>

            {dataLoading ? (
              <div className="space-y-3 p-6">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : sortedDevices.length === 0 ? (
              <EmptyState icon={CreditCard} title="Tidak ada kartu" description={devices.length ? 'Coba ubah kata kunci atau filter status.' : 'Generate ID pertama untuk mulai.'} />
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/40">
                      <tr>
                        <Th className="w-10"><Checkbox checked={selectedDeviceIds.length === sortedDevices.length && sortedDevices.length > 0} onChange={handleSelectAll} data-testid="select-all" /></Th>
                        <Th>ID Kartu</Th>
                        <Th>Status</Th>
                        <Th>Toko</Th>
                        <Th>PIN</Th>
                        <Th className="text-right">Aksi</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {pagedDevices.map((device) => {
                        const isSelected = selectedDeviceIds.includes(device.id);
                        return (
                          <tr key={device.id} id={`card-${device.id}`} data-testid={`row-${device.id}`} className={`transition-colors hover:bg-muted/40 ${isSelected ? 'bg-primary/[0.04]' : ''}`}>
                            <Td><Checkbox checked={isSelected} onChange={() => handleToggleSelectCard(device.id)} /></Td>
                            <Td>
                              <div className="font-mono text-[13px] font-semibold tracking-wide">{device.id}</div>
                              {device.created_at && <div className="text-[11px] text-muted-foreground">{new Date(device.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div>}
                            </Td>
                            <Td><StatusBadge active={Boolean(device.is_active)} /></Td>
                            <Td className="max-w-[260px]">
                              {device.label_name ? (
                                <>
                                  <div className="truncate font-medium">{device.label_name}</div>
                                  {device.target_url && <a href={device.target_url} target="_blank" rel="noreferrer" className="block truncate text-xs text-primary hover:underline">{device.target_url}</a>}
                                </>
                              ) : <span className="text-xs text-muted-foreground">—</span>}
                            </Td>
                            <Td><span className="rounded-md bg-muted px-2 py-1 font-mono text-xs font-semibold tracking-widest">{device.pin || '-'}</span></Td>
                            <Td><RowActions device={device} /></Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden">
                  <label className="flex items-center gap-2.5 border-b border-border px-4 py-3 text-xs font-medium text-muted-foreground">
                    <Checkbox checked={selectedDeviceIds.length === sortedDevices.length && sortedDevices.length > 0} onChange={handleSelectAll} />
                    Pilih semua ({sortedDevices.length})
                  </label>
                  <div className="divide-y divide-border">
                    {pagedDevices.map((device) => {
                      const isSelected = selectedDeviceIds.includes(device.id);
                      return (
                        <div key={device.id} id={`card-${device.id}`} className={`p-4 ${isSelected ? 'bg-primary/[0.04]' : ''}`}>
                          <div className="flex items-start gap-3">
                            <Checkbox className="mt-1" checked={isSelected} onChange={() => handleToggleSelectCard(device.id)} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-sm font-semibold">{device.id}</span>
                                <StatusBadge active={Boolean(device.is_active)} />
                              </div>
                              <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                                <KeyRound className="h-3.5 w-3.5" /> PIN <span className="font-mono font-semibold tracking-widest text-foreground">{device.pin || '-'}</span>
                              </div>
                              {device.label_name && (
                                <div className="mt-2.5 rounded-lg bg-muted/60 px-3 py-2">
                                  <div className="flex items-center gap-1.5 text-xs font-semibold"><Store className="h-3.5 w-3.5 text-primary" /> {device.label_name}</div>
                                  {device.target_url && <a href={device.target_url} target="_blank" rel="noreferrer" className="mt-0.5 block truncate text-[11px] text-primary">{device.target_url}</a>}
                                </div>
                              )}
                              <div className="mt-3 -mr-2"><RowActions device={device} /></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between border-t border-border px-4 py-3 sm:px-6">
                  <p className="text-xs text-muted-foreground">Hal. <span className="font-semibold text-foreground">{safePage}</span> dari {totalPages}</p>
                  <div className="flex gap-1.5">
                    <Btn size="sm" variant="outline" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}><ChevronLeft /> Prev</Btn>
                    <Btn size="sm" variant="outline" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>Next <ChevronRight /></Btn>
                  </div>
                </div>
              </>
            )}
          </Panel>
        </PageContainer>
      )}

      {/* ===== MODAL: Preview stiker ===== */}
      <Modal
        open={Boolean(previewDeviceModal) && !pinModal.isOpen}
        onClose={() => setPreviewDeviceModal(null)}
        icon={QrCode}
        title={`Stiker QR · ${previewDeviceModal?.id || ''}`}
        description="Preview QR yang akan dicetak pada stiker papan."
        testId="preview-modal"
      >
        {previewDeviceModal && (
          <div className="space-y-4">
            <div className="flex justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-violet-500/10 p-6">
              <div className="relative rounded-2xl bg-white p-3 shadow-lg ring-1 ring-black/5">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${getNfcBaseUrl()}/r/${previewDeviceModal.id}?src=qr`)}`} alt={`QR ${previewDeviceModal.id}`} className="h-44 w-44 rounded-lg" />
                <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow ring-1 ring-black/5">
                  <img src={SITE_CONFIG?.qrLogoUrl} alt="G" className="h-6 w-6" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-muted/60 p-3"><div className="text-muted-foreground">PIN Akses</div><div className="mt-0.5 font-mono font-semibold tracking-widest">{previewDeviceModal.pin}</div></div>
              <div className="rounded-lg bg-muted/60 p-3"><div className="text-muted-foreground">Status</div><div className="mt-1"><StatusBadge active={Boolean(previewDeviceModal.is_active)} /></div></div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Btn variant="primary" onClick={() => handleDownloadSingleSticker(previewDeviceModal.id)}><Printer /> Download Cetak HD</Btn>
              <Btn variant="outline" onClick={() => handleCopyNfcUrl(previewDeviceModal.id)}><Copy /> Salin URL NFC</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* ===== MODAL: Edit kartu ===== */}
      <Modal
        open={Boolean(editingDevice) && !pinModal.isOpen}
        onClose={() => setEditingDeviceId(null)}
        icon={Pencil}
        title={`Edit Kartu · ${editingDevice?.id || ''}`}
        description="Kosongkan link review untuk me-reset kartu menjadi Belum Dipakai."
        testId="edit-modal"
        footer={
          <>
            <Btn variant="outline" className="flex-1" onClick={() => setEditingDeviceId(null)}>Batal</Btn>
            <Btn className="flex-1" onClick={() => openPin('saveEdit', editingDevice)}><ShieldCheck /> Simpan (PIN)</Btn>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Nama Toko"><TextInput placeholder="Contoh: Kopi Senja" value={editLabelName} onChange={(e) => setEditLabelName(e.target.value)} /></Field>
          <Field label="Link Google Review" hint="Bisa tempel Place ID (ChIJ...) atau link writereview."><TextInput placeholder="https://search.google.com/local/writereview?placeid=..." value={editTargetUrl} onChange={(e) => setEditTargetUrl(e.target.value)} /></Field>
        </div>
      </Modal>

      {/* ===== MODAL: PIN ===== */}
      <Modal open={pinModal.isOpen} onClose={closePinModal} icon={pinMeta.icon} tone={pinMeta.tone} title={pinMeta.title} description={pinMeta.desc} testId="pin-modal">
        <form onSubmit={handleModalAction} autoComplete="off" className="space-y-4">
          {pinModal.actionType === 'bulkGenerate' && (
            <Field label="Jumlah kartu (1–100)">
              <TextInput data-testid="bulk-qty" type="number" min="1" max="100" required value={pinModal.bulkQty} onChange={(e) => setPinModal((prev) => ({ ...prev, bulkQty: e.target.value }))} className="h-11 text-center text-base font-semibold" />
            </Field>
          )}
          <Field label="PIN Otorisasi">
            <PinField testId="pin-input" danger={isDanger} value={pinModal.pinInput} onChange={(e) => setPinModal((prev) => ({ ...prev, pinInput: e.target.value }))} />
          </Field>
          {pinModal.errorMsg && <p data-testid="pin-error" className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">{String(pinModal.errorMsg).replace(/^❌\s*/, '')}</p>}
          <div className="flex gap-2 pt-1">
            <Btn type="button" variant="outline" className="flex-1" onClick={closePinModal}>Batal</Btn>
            <Btn type="submit" data-testid="pin-submit" variant={isDanger ? 'danger' : 'primary'} className="flex-1" loading={pinModal.isSubmitting}>Konfirmasi</Btn>
          </div>
        </form>
      </Modal>

      <ToastViewport />

      {showScrollTop && isAuthenticated && (
        <button onClick={scrollToTop} className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90" aria-label="Ke atas">
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </AutoLogout>
  );
}
