'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function StatsPage() {
  const [stats, setStats] = useState([]);
  const [totalScans, setTotalScans] = useState(0);
  const [nfcCount, setNfcCount] = useState(0);
  const [qrCount, setQrCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // REALTIME LISTENER STATISTIK SUPABASE
  useEffect(() => {
    fetchStats();

    const channel = supabase
      .channel('stats-realtime-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'device_stats' },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStats = async () => {
    setLoading(true);

    // Ambil data dari tabel device_stats
    const { data: statsData, error } = await supabase
      .from('device_stats')
      .select('device_id, type, created_at')
      .order('created_at', { ascending: false });

    if (!error && statsData) {
      setTotalScans(statsData.length);

      let totalNfc = 0;
      let totalQr = 0;

      // Kelompokkan data berdasarkan Device ID
      const grouped = statsData.reduce((acc, curr) => {
        const id = curr.device_id || 'Unknown';
        if (!acc[id]) {
          acc[id] = { id, nfc: 0, qr: 0, total: 0, lastScan: curr.created_at };
        }
        if (curr.type === 'nfc') {
          acc[id].nfc += 1;
          totalNfc += 1;
        } else {
          acc[id].qr += 1;
          totalQr += 1;
        }
        acc[id].total += 1;
        return acc;
      }, {});

      setNfcCount(totalNfc);
      setQrCount(totalQr);
      setStats(Object.values(grouped));
    }

    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 16px', fontFamily: '-apple-system, sans-serif' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>📊 Statistik Interaksi</h2>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Analisis Realtime Scan QR & Tap NFC</p>
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

      {/* Details List */}
      <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>Rincian Per Kartu Akrilik</h3>
          <button onClick={fetchStats} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
            🔄 Refresh
          </button>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Memuat data statistik...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {stats.map((item) => (
              <div key={item.id} style={{ padding: '12px 14px', borderRadius: '12px', border: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <strong style={{ fontSize: '14px', color: '#0f172a' }}>{item.id}</strong>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#2563eb', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '6px' }}>
                    {item.total} Scan/Tap
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <span>📱 NFC: <strong>{item.nfc}</strong></span>
                    <span>📷 QR: <strong>{item.qr}</strong></span>
                  </div>
                  <span>Terakhir: {new Date(item.lastScan).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
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

    </div>
  );
}
