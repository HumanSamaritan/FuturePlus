import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getConfiguredStaffRole, getSupabaseConfig, isAllowedUserEmail } from '@/lib/env';

function loginError(origin: string, message: string) {
  const loginUrl = new URL('/Staff-login', origin);
  loginUrl.searchParams.set('error', message);
  return NextResponse.redirect(loginUrl);
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const providerError = requestUrl.searchParams.get('error_description') ?? requestUrl.searchParams.get('error');
  const requestedNext = requestUrl.searchParams.get('next') ?? '/dashboard';
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/dashboard';

  if (providerError) return loginError(requestUrl.origin, `Google sign-in failed: ${providerError}`);
  if (!code) return loginError(requestUrl.origin, 'No sign-in code was received. Start again from the authorised workspace sign-in page.');

  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
  const destination = forwardedHost ? `${forwardedProto}://${forwardedHost}${next}` : new URL(next, requestUrl.origin);
  const response = NextResponse.redirect(destination);
  const { url, publishableKey } = getSupabaseConfig();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
    }
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return loginError(requestUrl.origin, `Google sign-in could not be completed: ${error.message}`);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !isAllowedUserEmail(user.email)) {
    return loginError(requestUrl.origin, user?.email ? `Google signed in as ${user.email}, but this address is not approved for the workspace.` : 'Google did not return an email address for this account.');
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return loginError(requestUrl.origin, 'Staff role synchronisation is not configured for this workspace.');

  const role = getConfiguredStaffRole(user.email);
  const admin = createAdminClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0];
  const { error: profileError } = await admin.from('profiles').upsert({
    id: user.id,
    email: user.email.toLowerCase(),
    full_name: fullName,
    role,
    allowed: true,
    updated_at: new Date().toISOString()
  }, { onConflict: 'id' });
  if (profileError) return loginError(requestUrl.origin, 'Your account was verified, but the workspace role could not be saved.');

  return response;
}
