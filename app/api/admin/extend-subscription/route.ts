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
    const { tenant_id, plan_name, billing_period, starts_at, expires_at } = await request.json();

    if (!tenant_id || !plan_name) {
      return NextResponse.json({ error: 'tenant_id és plan_name megadása kötelező' }, { status: 400, headers: corsHeaders });
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

    // 1. Upsert subscription
    const { error: subErr } = await adminClient
      .from('subscriptions')
      .upsert({
        tenant_id,
        plan_name,
        status: 'active',
        billing_period,
        starts_at: starts_at || new Date().toISOString(),
        expires_at,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id' });

    if (subErr) {
      return NextResponse.json({ error: `Előfizetés mentése sikertelen: ${subErr.message}` }, { status: 500, headers: corsHeaders });
    }

    // 2. Sync corresponding plan on tenants table
    const tenantPlan = plan_name === 'Professzionális' ? 'pro' : 'basic';
    const { error: tenantErr } = await adminClient
      .from('tenants')
      .update({
        subscription_plan: tenantPlan,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenant_id);

    if (tenantErr) {
      return NextResponse.json({ error: `Étterem terv frissítése sikertelen: ${tenantErr.message}` }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ success: true }, { status: 200, headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Belső szerver hiba' },
      { status: 500, headers: corsHeaders }
    );
  }
}
