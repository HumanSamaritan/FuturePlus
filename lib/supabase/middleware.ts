import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getAllowedStaffDomain, getSupabaseConfig, isAllowedStaffEmail } from '@/lib/env';

const protectedPrefixes = ['/dashboard', '/students', '/colleges', '/admin'];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseConfig();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
      }
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const isProtectedRoute = protectedPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix));
  if (!isProtectedRoute) return supabaseResponse;

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectedFrom', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (!isAllowedStaffEmail(user.email)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('error', `Only @${getAllowedStaffDomain()} staff accounts can access this MVP.`);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
