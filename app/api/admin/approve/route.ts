import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
  const bytes = randomBytes(length);
  return Array.from(bytes as Uint8Array, (b: number) => chars[b % chars.length]).join('');
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const { requestId, subdomain } = await request.json();

    if (!requestId || !subdomain) {
      return NextResponse.json({ error: 'requestId és subdomain kötelező' }, { status: 400, headers: corsHeaders });
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Load request details
    const { data: req, error: reqErr } = await adminClient
      .from('restaurant_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (reqErr || !req) {
      return NextResponse.json({ error: 'Igénylés nem található' }, { status: 404, headers: corsHeaders });
    }

    const posEmail = `${subdomain}@pos2.syorder.hu`;
    const posPassword = generatePassword(12);

    // 1. Create tenant
    const { data: tenant, error: tenantErr } = await adminClient
      .from('tenants')
      .insert({
        slug: subdomain,
        name: req.business_name,
        email: req.email,
        phone: req.phone,
        address: req.address,
        subscription_plan: req.plan || 'trial',
      })
      .select()
      .single();

    if (tenantErr) {
      return NextResponse.json({ error: `Tenant létrehozás sikertelen: ${tenantErr.message}` }, { status: 500, headers: corsHeaders });
    }

    // 2. Create auth user (triggers public.users insert via handle_new_user)
    const { data: authUser, error: authErr } = await adminClient.auth.admin.createUser({
      email: posEmail,
      password: posPassword,
      email_confirm: true,
      user_metadata: { full_name: req.contact_name },
    });

    if (authErr || !authUser.user) {
      // Rollback tenant
      await adminClient.from('tenants').delete().eq('id', tenant.id);
      return NextResponse.json({ error: `Auth user létrehozás sikertelen: ${authErr?.message}` }, { status: 500, headers: corsHeaders });
    }

    // 3. Update public.users with tenant_id and role
    await adminClient
      .from('users')
      .update({ tenant_id: tenant.id, role: 'owner', full_name: req.contact_name })
      .eq('id', authUser.user.id);

    // 4. Update request to approved
    await adminClient
      .from('restaurant_requests')
      .update({
        status: 'approved',
        subdomain,
        pos_email: posEmail,
        pos_tenant_id: tenant.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    return NextResponse.json(
      { posEmail, posPassword, tenantId: tenant.id },
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'Belső szerver hiba' },
      { status: 500, headers: corsHeaders }
    );
  }
}
