import { NextResponse } from 'next/server';

export async function GET() {
  const isServiceRoleKeySet = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const isSupabaseUrlSet = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isAnonKeySet = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return NextResponse.json({
    configured: isServiceRoleKeySet && isSupabaseUrlSet && isAnonKeySet,
    serviceRoleKeySet: isServiceRoleKeySet,
    urlSet: isSupabaseUrlSet,
    anonKeySet: isAnonKeySet,
  });
}
