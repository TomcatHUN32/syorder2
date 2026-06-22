import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
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

    // Fetch all completed/paid orders to calculate revenue
    const { data: orders, error: ordersErr } = await adminClient
      .from('orders')
      .select('tenant_id, total');

    if (ordersErr) {
      return NextResponse.json({ error: ordersErr.message }, { status: 500, headers: corsHeaders });
    }

    const revenues: Record<string, number> = {};
    (orders || []).forEach((order) => {
      const tid = order.tenant_id;
      if (tid) {
        revenues[tid] = (revenues[tid] || 0) + Number(order.total || 0);
      }
    });

    return NextResponse.json({ revenues }, { status: 200, headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Belső szerver hiba' },
      { status: 500, headers: corsHeaders }
    );
  }
}
