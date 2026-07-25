import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getStaffAccessResult, getSupabaseConfig } from '@/lib/env';

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

  const access = getStaffAccessResult(user.email);
  if (!access.allowed) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    const messages = {
      missing_email: 'Google did not return an email address. Please choose a Google account that has a verified email.',
      allowlist_not_configured: 'Staff login is not configured yet. Add FUTURE_PLUS_STAFF_EMAILS in Vercel and redeploy.',
      not_approved: `The Google account ${user.email} is not approved for the Future Plus staff workspace.`,
      approved: 'Staff access approved.'
    };
    url.searchParams.set('error', messages[access.reason]);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
