import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const EDUCAREER_PARTNER_WORKSPACE = 'https://educareer.omnexagoc.com/partner-workspace';

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const normalizedPath = pathname.toLowerCase();

  if (normalizedPath === '/staff-login') {
    return NextResponse.redirect(EDUCAREER_PARTNER_WORKSPACE, 307);
  }

  // FuturePlus is intentionally frozen in this preview. Preserve the codebase,
  // but do not expose public, staff, API or operational routes while frozen.
  if (pathname !== '/') {
    const frozenUrl = request.nextUrl.clone();
    frozenUrl.pathname = '/';
    frozenUrl.search = '';
    return NextResponse.redirect(frozenUrl, 307);
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
};
