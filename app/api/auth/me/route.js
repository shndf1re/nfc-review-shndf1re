import { NextResponse } from 'next/server';
import { getAdminFromCookie } from '@/lib/auth-server';

export async function GET() {
  const user = await getAdminFromCookie();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    },
  });
}
