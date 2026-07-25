import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseConfig } from '@/lib/env';

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
