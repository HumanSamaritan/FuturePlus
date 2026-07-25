import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host');
      const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';

      if (forwardedHost) {
        return NextResponse.redirect(`${forwardedProto}://${forwardedHost}${next}`);
      }

      return NextResponse.redirect(new URL(next, requestUrl.origin));
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
