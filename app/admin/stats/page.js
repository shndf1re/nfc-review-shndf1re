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
  const [loading, setLoading] = useState(true);

  // REALTIME LISTENER STATISTIK
  useEffect(() => {
    fetchStats();

    const channel = supabase
      .channel('stats-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'device_stats' }, () => {
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStats = async () => {
    setLoading(true);

    const { data: statsData } = await supabase
      .from('device_stats')
      .select('device_id, type, created_at');

    if (statsData) {
      setTotalScans(statsData.length);

      // Kelompokkan statistik berdasarkan Device ID
      const grouped = statsData.reduce((acc, curr) => {
        const id = curr.device_id || 'Unknown';
        if (!acc[id]) {
          acc[id] = { id, nfc: 0, qr: 0, total: 0 };
        }
        if (curr.type === 'nfc') acc[id].nfc += 1;
        else acc[id].qr += 1;
        acc[id].total += 1;
        return acc;
      }, {});

      setStats(Object.values(grouped));
    }

    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 16px', fontFamily: '-apple-system, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>📊 Statistik Pemakaian</h2>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Analisis Tap NFC vs Scan QR Code</p>
        </div>
        <Link href="/admin" style={{ padding: '8px 14px', backgroundColor: '#2563eb', color: '#fff', textDecoration: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600' }}>
          ⬅️ Dashboard
        </Link>
      </div>

      <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', display: 'block' }}>🔥 Total Interaksi (Tap & Scan)</span>
        <strong style={{ fontSize: '28px', color: '#2563eb' }}>{totalScans} <span style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>kali</span></strong>
      </div>

      <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700' }}>Detail Per Kartu NFC</h3>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Memuat statistik realtime...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {stats.map((item) => (
              <div key={item.id} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <strong style={{ fontSize: '14px' }}>{item.id}</strong>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#2563eb' }}>{item.total} Total</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#475569' }}>
                  <span>📱 NFC Tap: <strong>{item.nfc}</strong></span>
                  <span>📷 QR Scan: <strong>{item.qr}</strong></span>
                </div>
              </div>
            ))}

            {stats.length === 0 && <p style={{ textAlign: 'center', fontSize: '13px', color: '#94a3b8' }}>Belum ada interaksi tercatat.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
