import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getConfiguredStaffRole, getSupabaseConfig, isAllowedUserEmail } from '@/lib/env';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const providerError =
    requestUrl.searchParams.get('error_description') ??
    requestUrl.searchParams.get('error');
  const requestedNext = requestUrl.searchParams.get('next') ?? '/dashboard';
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//')
    ? requestedNext
    : '/dashboard';

  if (providerError) {
    const loginUrl = new URL('/login', requestUrl.origin);
    loginUrl.searchParams.set('error', `Google sign-in failed: ${providerError}`);
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    const forwardedHost = request.headers.get('x-forwarded-host');
    const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
    const destination = forwardedHost
      ? `${forwardedProto}://${forwardedHost}${next}`
      : new URL(next, requestUrl.origin);
    const response = NextResponse.redirect(destination);
    const { url, publishableKey } = getSupabaseConfig();
    const supabase = createServerClient(url, publishableKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        }
      }
    });
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email || !isAllowedUserEmail(user.email)) {
        console.warn('[auth-callback] Google account is not in the configured access lists', {
          googleEmail: user?.email || 'missing',
          staffListConfigured: Boolean(process.env.FUTURE_PLUS_STAFF_EMAILS),
          superUserListConfigured: Boolean(process.env.FUTURE_PLUS_SUPER_USER_EMAILS)
        });
        const loginUrl = new URL('/login', requestUrl.origin);
        loginUrl.searchParams.set(
          'error',
          user?.email
            ? `Google signed in as ${user.email}, but this address is not configured in FUTURE_PLUS_STAFF_EMAILS or FUTURE_PLUS_SUPER_USER_EMAILS.`
            : 'Google did not return an email address for this account.'
        );
        return NextResponse.redirect(loginUrl);
      }

      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!serviceRoleKey) {
        const loginUrl = new URL('/login', requestUrl.origin);
        loginUrl.searchParams.set('error', 'Staff role synchronization is not configured. Add SUPABASE_SERVICE_ROLE_KEY to the server environment.');
        return NextResponse.redirect(loginUrl);
      }

      const role = getConfiguredStaffRole(user.email);
      const admin = createAdminClient(url, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
      const fullName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email.split('@')[0];
      const { error: profileError } = await admin.from('profiles').upsert({
        id: user.id,
        email: user.email.toLowerCase(),
        full_name: fullName,
        role,
        allowed: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
      if (profileError) {
        console.error('[auth-callback] role synchronization failed', { email: user.email, role, error: profileError });
        const loginUrl = new URL('/login', requestUrl.origin);
        loginUrl.searchParams.set('error', 'Your account was verified, but the Staff/Super User role could not be saved.');
        return NextResponse.redirect(loginUrl);
      }

      return response;
    }

    const loginUrl = new URL('/login', requestUrl.origin);
    loginUrl.searchParams.set('error', `Google sign-in could not be completed: ${error.message}`);
    return NextResponse.redirect(loginUrl);
  }

  const loginUrl = new URL('/login', requestUrl.origin);
  loginUrl.searchParams.set(
    'error',
    'No sign-in code was received. Start again using the Continue with Google button.'
  );
  return NextResponse.redirect(loginUrl);
}
