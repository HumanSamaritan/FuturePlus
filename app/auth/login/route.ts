import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { getSupabaseConfig, isAllowedUserEmail } from '@/lib/env';

function getPublicOrigin(request: NextRequest) {
  if (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_BRANCH_URL) {
    return `https://${process.env.VERCEL_BRANCH_URL}`;
  }

  if (process.env.VERCEL_ENV === 'production' && process.env.NEXT_PUBLIC_SITE_URL) {
    try {
      return new URL(process.env.NEXT_PUBLIC_SITE_URL).origin;
    } catch {
      // Fall back to request headers below.
    }
  }

  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return request.nextUrl.origin;
}

function safeNext(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get('next') || '/dashboard';
  return requested.startsWith('/') && !requested.startsWith('//') ? requested : '/dashboard';
}

export async function GET(request: NextRequest) {
  const origin = getPublicOrigin(request);
  const next = safeNext(request);
  const pendingCookies: Array<{ name: string; value: string; options: CookieOptions }> = [];
  const { url, publishableKey } = getSupabaseConfig();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        pendingCookies.push(...cookiesToSet);
      }
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user && isAllowedUserEmail(user.email)) {
    const destination = new URL(next, origin);
    const response = NextResponse.redirect(destination);
    pendingCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }

  const callback = new URL('/auth/callback', origin);
  callback.searchParams.set('next', next);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callback.toString(),
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account'
      }
    }
  });

  if (error || !data.url) {
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set(
      'error',
      error?.message ?? 'Google sign-in could not be started.'
    );
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.redirect(data.url);
  pendingCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
