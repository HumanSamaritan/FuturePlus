import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function getPublicOrigin(request: NextRequest) {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const origin = getPublicOrigin(request);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
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
      error?.message ?? 'Supabase did not create a Google sign-in URL.'
    );
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(data.url);
}
