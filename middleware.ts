import { NextResponse, NextRequest } from 'next/server';

/**
 * SYORDER Subdomain Routing Middleware
 *
 * Production subdomains:
 *   syorder.hu / www.syorder.hu  → app/page.tsx        (marketing landing page)
 *   admin.syorder.hu             → /admin/*             (superadmin panel)
 *   keres.syorder.hu             → /search              (restaurant finder)
 *   pos2.syorder.hu              → /login → /dashboard  (staff login/POS)
 *   <slug>.syorder.hu            → /restaurant/<slug>   (restaurant public page)
 *
 * Development: use ?subdomain=<value> to simulate any subdomain locally.
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const host = request.headers.get('host') || '';
  const hostWithoutPort = host.split(':')[0];
  const parts = hostWithoutPort.split('.');

  // ── Subdomain detection ──────────────────────────────────────
  const subdomainParam = request.nextUrl.searchParams.get('subdomain');
  let subdomain: string | null = null;

  if (subdomainParam) {
    subdomain = subdomainParam;
  } else if (parts.length >= 3 && parts[0] !== 'www') {
    subdomain = parts[0];
  }

  const isAdminSubdomain = subdomain === 'admin';
  const isPos2Subdomain = subdomain === 'pos2';
  const isKeresSubdomain = subdomain === 'keres';
  const isRestaurantSubdomain =
    subdomain !== null && !isAdminSubdomain && !isPos2Subdomain && !isKeresSubdomain;

  // ── Auth cookie ──────────────────────────────────────────────
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1] ?? '';
  const supabaseCookieName = `sb-${projectRef}-auth-token`;
  const hasSession = request.cookies.has(supabaseCookieName) ||
    [...request.cookies.getAll()].some(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));

  // ── admin.syorder.hu → /admin/* ──────────────────────────────
  if (isAdminSubdomain) {
    if (pathname === '/login') return NextResponse.next();
    if (pathname.startsWith('/admin')) return NextResponse.next();
    if (!hasSession) return NextResponse.redirect(new URL('/login', request.url));
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // ── keres.syorder.hu → /search ───────────────────────────────
  if (isKeresSubdomain) {
    const url = request.nextUrl.clone();
    url.pathname = '/search';
    url.searchParams.delete('subdomain');
    return NextResponse.rewrite(url);
  }

  // ── pos2.syorder.hu → staff login / dashboard ────────────────
  if (isPos2Subdomain) {
    if (hasSession && !pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    if (!hasSession && pathname !== '/login') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // ── <slug>.syorder.hu → /restaurant/<slug> (rewrite) ─────────
  if (isRestaurantSubdomain) {
    if (pathname.startsWith('/dashboard')) {
      if (!hasSession) return NextResponse.redirect(new URL('/login', request.url));
      return NextResponse.next();
    }
    if (pathname === '/login') return NextResponse.next();

    const url = request.nextUrl.clone();
    url.pathname = `/restaurant/${subdomain}`;
    url.searchParams.delete('subdomain');
    const response = NextResponse.rewrite(url);
    response.headers.set('X-Restaurant-Slug', subdomain!);
    return response;
  }

  // ── Standard path-based routing (syorder.hu / localhost) ─────
  const isPublicRoute =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/search' ||
    pathname === '/aszf' ||
    pathname.startsWith('/menu/') ||
    pathname.startsWith('/restaurant/') ||
    pathname.startsWith('/admin');

  if (!hasSession && !isPublicRoute) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (hasSession && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
