import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const workspacePrefixes = [
  '/staff-login',
  '/auth',
  '/dashboard',
  '/students',
  '/colleges',
  '/admin',
  '/logout'
];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const normalizedPath = pathname.toLowerCase();
  const isWorkspaceRoute = workspacePrefixes.some(
    (prefix) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
  );

  // Keep the complete authorised staff workflow available while the public
  // FuturePlus website is frozen. This is temporary until the EduCareer
  // Partner Workspace has its own approved preview deployment.
  if (isWorkspaceRoute) {
    return updateSession(request);
  }

  // FuturePlus public access is intentionally frozen in this preview.
  // Preserve all code and data, but send public application routes to the
  // neutral frozen landing page.
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
