import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const { id, notes } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Az ID megadása kötelező' }, { status: 400, headers: corsHeaders });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return NextResponse.json(
        { error: 'Hiányzó SUPABASE_SERVICE_ROLE_KEY' },
        { status: 400, headers: corsHeaders }
      );
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { error } = await adminClient
      .from('restaurant_requests')
      .update({
        status: 'rejected',
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ success: true }, { status: 200, headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Belső szerver hiba' },
      { status: 500, headers: corsHeaders }
    );
  }
}
