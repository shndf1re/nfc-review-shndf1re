'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function BeliRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const uniqueSessionId = crypto.randomUUID();
    if (typeof window !== 'undefined') {
      localStorage.setItem('active_checkout_session', uniqueSessionId);
    }
    router.replace(`/c/${uniqueSessionId}`);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <div className="text-sm font-medium">Memuat halaman pembayaran aman...</div>
        <div className="text-xs text-muted-foreground">Mohon tunggu sebentar</div>
      </div>
    </div>
  );
}
