'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function StatsPage() {
  const [stats, setStats] = useState([]);
  const [topDevices, setTopDevices] = useState([]);
  const [totalScans, setTotalScans] = useState(0);
  const [nfcCount, setNfcCount] = useState(0);
  const [qrCount, setQrCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // State Toast & Modal Konfirmasi PIN Admin
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [pinModal, setPinModal] = useState({
    isOpen: false,
    actionType: null,
    targetDeviceId: null,
    pinInput: '',
    errorMsg: '',
    isSubmitting: false
  });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // REALTIME LISTENER SUPABASE
  useEffect(() => {
    fetchStats();

    const channel = supabase
      .channel('stats-realtime-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'device_stats' },
        () => { fetchStats(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'devices' },
        () => { fetchStats(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // FUNGSI FETCH STATS (DIREVISI TOTAL AGAR HINDARI DATA HILANG/STUCK)
  const fetchStats = async () => {
    setLoading(true);

    // 1. Ambil seluruh log dari device_stats
    const { data: statsData, error: statsErr } = await supabase
      .from('device_stats')
      .select('device_id, type, created_at')
      .order('created_at', { ascending: false });

    // 2. Ambil data nama label dari tabel devices
    const { data: devicesData } = await supabase
      .from('devices')
      .select('id, label_name');

    const deviceMap = {};
    if (devicesData) {
      devicesData.forEach(d => {
        deviceMap[d.id] = d.label_name || null;
      });
    }

    if (!statsErr && statsData) {
      // SET TOTAL KESELURUHAN LANGSUNG DARI PANJANG ARRAY (TIDAK AKAN STUCK DI 88)
      setTotalScans(statsData.length);

      let totalNfc = 0;
      let totalQr = 0;

      const grouped = {};

      statsData.forEach(curr => {
        const rawId = curr.device_id ? String(curr.device_id).trim() : 'Unknown';
        const labelName = deviceMap[rawId] || null;

        if (!grouped[rawId]) {
          grouped[rawId] = {
            id: rawId,
            labelName,
            nfc: 0,
            qr: 0,
            total: 0,
            lastScan: curr.created_at
          };
        }

        const scanType = (curr.type || '').toLowerCase();
        if (scanType === 'nfc') {
          grouped[rawId].nfc += 1;
          totalNfc += 1;
        } else {
          grouped[rawId].qr += 1;
          totalQr += 1;
        }
        grouped[rawId].total += 1;
      });

      const allStatsList = Object.values(grouped);

      // Top 5 Peringkat Toko
      const sortedTop = [...allStatsList]
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      setNfcCount(totalNfc);
      setQrCount(totalQr);
      setStats(allStatsList);
      setTopDevices(sortedTop);
    } else {
      setStats([]);
      setTopDevices([]);
      setTotalScans(0);
      setNfcCount(0);
      setQrCount(0);
    }

    setLoading(false);
  };

  const handleModalAction = async (e) => {
    e.preventDefault();
    setPinModal(prev => ({ ...prev, isSubmitting: true, errorMsg: '' }));

    const inputPin = pinModal.pinInput.trim();

    const { data: isValidPin, error: rpcErr } = await supabase.rpc('verify_sales_pin', {
      input_pin: inputPin
    });

    if (rpcErr || !isValidPin) {
      setPinModal(prev => ({ ...prev, isSubmitting: false, errorMsg: '❌ PIN Admin Salah atau Tidak Valid!' }));
      return;
    }

    if (pinModal.actionType === 'resetAll') {
      const { error } = await supabase.rpc('reset_device_stats');
      if (error) {
        setPinModal(prev => ({ ...prev, isSubmitting: false, errorMsg: 'Gagal database: ' + error.message }));
        return;
      }
      showToast('🧹 Semua statistik interaksi berhasil di-reset!');
    } else if (pinModal.actionType === 'resetSingle') {
      const targetId = pinModal.targetDeviceId;
      const { error } = await supabase.rpc('reset_device_stats', { target_device_id: targetId });
      if (error) {
        setPinModal(prev => ({ ...prev, isSubmitting: false, errorMsg: 'Gagal database: ' + error.message }));
        return;
      }
      showToast(`🔄 Statistik kartu ${targetId} berhasil di-reset!`);
    }

    setPinModal({ isOpen: false, actionType: null, targetDeviceId: null, pinInput: '', errorMsg: '', isSubmitting: false });
    fetchStats();
  };

  return (
    <div className={inter.className} style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 16px', boxSizing: 'border-box' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>📊 Statistik Interaksi</h2>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Analisis Realtime Scan QR &amp; Tap NFC</p>
        </div>
        <Link href="/admin" style={{ padding: '8px 14px', backgroundColor: '#2563eb', color: '#fff', textDecoration: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600' }}>
          ⬅️ Dashboard
        </Link>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '14px 12px', borderRadius: '14px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', display: 'block' }}>🔥 Total Interaksi</span>
          <strong style={{ fontSize: '20px', color: '#2563eb' }}>{totalScans}</strong>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '14px 12px', borderRadius: '14px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', display: 'block' }}>📱 NFC Tap</span>
          <strong style={{ fontSize: '20px', color: '#16a34a' }}>{nfcCount}</strong>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '14px 12px', borderRadius: '14px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', display: 'block' }}>📷 QR Scan</span>
          <strong style={{ fontSize: '20px', color: '#d97706' }}>{qrCount}</strong>
        </div>
      </div>

      {/* WIDGET TOP PERFORMING DEVICES */}
      <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
          🏆 Top Performing Devices (Toko Teraktif)
        </h3>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: '12px' }}>Menghitung peringkat...</p>
        ) : topDevices.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {topDevices.map((dev, idx) => {
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
              return (
                <div key={dev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '700', width: '24px', textAlign: 'center' }}>{medal}</span>
                    <div>
                      <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>
                        {dev.labelName ? `🏪 ${dev.labelName}` : dev.id}
                      </strong>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        ID: {dev.id}
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#2563eb' }}>
                      {dev.total} Tap/Scan
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ textAlign: 'center', fontSize: '12px', color: '#94a3b8', margin: 0 }}>Belum ada data interaksi untuk diperingkatkan.</p>
        )}
      </div>

      {/* Details List */}
      <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>Rincian Per Kartu Akrilik</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={fetchStats} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
              🔄 Refresh
            </button>
            {stats.length > 0 && (
              <button 
                onClick={() => setPinModal({ isOpen: true, actionType: 'resetAll', targetDeviceId: null, pinInput: '', errorMsg: '', isSubmitting: false })} 
                style={{ padding: '6px 10px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
              >
                🧹 Reset Semua
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Memuat data statistik...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {stats.map((item) => (
              <div key={item.id} style={{ padding: '12px 14px', borderRadius: '12px', border: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <div>
                    <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>{item.id}</strong>
                    {item.labelName ? (
                      <span style={{ fontSize: '12px', fontWeight: '600', color: '#2563eb' }}>
                        🏪 {item.labelName}
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                        Belum set nama toko
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#2563eb', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '6px' }}>
                      {item.total} Scan
                    </span>
                    <button 
                      onClick={() => setPinModal({ isOpen: true, actionType: 'resetSingle', targetDeviceId: item.id, pinInput: '', errorMsg: '', isSubmitting: false })}
                      title="Reset statistik kartu ini"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: '2px' }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <span>📱 NFC: <strong>{item.nfc}</strong></span>
                    <span>📷 QR: <strong>{item.qr}</strong></span>
                  </div>
                  <span>Terakhir: {item.lastScan ? new Date(item.lastScan).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}</span>
                </div>
              </div>
            ))}

            {stats.length === 0 && (
              <p style={{ textAlign: 'center', fontSize: '13px', color: '#94a3b8', padding: '20px 0' }}>
                Belum ada interaksi scan/tap yang tercatat.
              </p>
            )}
          </div>
        )}
      </div>

      {/* MODAL PIN VERIFIKASI ADMIN */}
      {pinModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '360px', backgroundColor: '#ffffff', borderRadius: '18px', padding: '24px 20px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <div style={{ width: '44px', height: '44px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '10px' }}>
              🔐
            </div>
            
            <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: '700', color: '#0f172a' }}>
              {pinModal.actionType === 'resetAll' ? '🧹 Reset Semua Statistik' : `🔄 Reset Statistik (${pinModal.targetDeviceId})`}
            </h3>

            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
              Masukkan <strong>PIN / Password Admin</strong> untuk mengonfirmasi tindakan penghapusan data ini.
            </p>

            <form onSubmit={handleModalAction} autoComplete="off">
              <div style={{ marginBottom: '12px' }}>
                <input
                  type="password"
                  required
                  autoFocus
                  maxLength={10}
                  placeholder="Masukkan PIN Admin"
                  value={pinModal.pinInput}
                  onChange={(e) => setPinModal(prev => ({ ...prev, pinInput: e.target.value }))}
                  style={{
                    width: '100%', padding: '12px', fontSize: '16px', textAlign: 'center',
                    letterSpacing: '4px', borderRadius: '10px', border: '1px solid #cbd5e1',
                    boxSizing: 'border-box', backgroundColor: '#f8fafc', outline: 'none'
                  }}
                />
              </div>

              {pinModal.errorMsg && (
                <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#ef4444', fontWeight: '600' }}>
                  {pinModal.errorMsg}
                </p>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setPinModal({ isOpen: false, actionType: null, targetDeviceId: null, pinInput: '', errorMsg: '', isSubmitting: false })}
                  style={{ flex: 1, padding: '12px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={pinModal.isSubmitting}
                  style={{
                    flex: 1, padding: '12px', backgroundColor: pinModal.isSubmitting ? '#94a3b8' : '#dc2626',
                    color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700',
                    cursor: pinModal.isSubmitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {pinModal.isSubmitting ? 'Memproses...' : 'Ya, Reset Data'}
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

    </div>
  );
}
