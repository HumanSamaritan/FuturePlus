import Link from 'next/link';
import Image from 'next/image';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { isAllowedUserEmail } from '@/lib/env';
import { unstable_noStore as noStore } from 'next/cache';

const workspacePrefixes = ['/dashboard', '/students', '/colleges', '/admin'];

export default async function Header() {
  noStore();
  const pathname = (await headers()).get('x-future-plus-pathname') || '/';
  const normalizedPath = pathname.toLowerCase();
  const isNeutralLogin = normalizedPath === '/staff-login';
  const isWorkspaceRoute = workspacePrefixes.some((prefix) => normalizedPath.startsWith(prefix));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isStaff = Boolean(user && isAllowedUserEmail(user.email));
  const showWorkspace = isStaff && isWorkspaceRoute;

  if (isNeutralLogin) {
    return (
      <header className="site-header auth-neutral-header">
        <div className="neutral-brand-mark">AW</div>
        <div className="neutral-brand-copy"><strong>Authorised Workspace</strong><small>Secure organisational access</small></div>
      </header>
    );
  }

  let staffName = '';
  let staffEmail = '';
  let staffRole = 'Staff';
  if (showWorkspace && user) {
    const { data: profile } = await supabase.from('profiles').select('full_name,email,role').eq('id', user.id).maybeSingle();
    staffEmail = profile?.email || user.email || '';
    staffRole = profile?.role === 'admin' ? 'Administrator' : 'Staff';
    staffName = profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || staffEmail.split('@')[0] || 'Authorised Staff';
  }

  return (
    <header className={`site-header ${showWorkspace ? 'workspace-nav' : 'public-nav'}`}>
      {showWorkspace ? (
        <Link href="/dashboard" className="brand workspace-neutral-brand">
          <span className="neutral-brand-mark">CW</span>
          <span><strong>Counselling Workspace</strong><small>Secure staff environment</small></span>
        </Link>
      ) : (
        <Link href="/" className="brand">
          <Image src="/future-plus-logo.jpg" alt="Future Plus Education" className="brand-logo" width={64} height={64} priority />
          <span><strong>Future Plus</strong><small>Education & career ecosystem</small></span>
        </Link>
      )}

      {showWorkspace ? (
        <div className="staff-identity staff-identity-top" aria-label="Signed-in staff member">
          <span className="staff-avatar">{staffName.slice(0, 1).toUpperCase()}</span>
          <span><strong title={staffName}>{staffName}</strong><small>{staffRole} · {staffEmail}</small></span>
        </div>
      ) : null}

      <nav>
        {showWorkspace ? (
          <>
            <Link href="/dashboard"><span className="workspace-nav-icon" aria-hidden="true">✨</span><span>Dashboard</span></Link>
            <Link href="/students/new"><span className="workspace-nav-icon" aria-hidden="true">🎓</span><span>Under Graduate intake</span></Link>
            <Link href="/students/postgraduate/new"><span className="workspace-nav-icon" aria-hidden="true">🚀</span><span>Post Graduate intake</span></Link>
            <Link href="/colleges"><span className="workspace-nav-icon" aria-hidden="true">🏛</span><span>Universities database</span></Link>
            <Link href="/admin"><span className="workspace-nav-icon" aria-hidden="true">📥</span><span>Imports & admin</span></Link>
            <a href="/logout" className="logout-link"><span className="workspace-nav-icon" aria-hidden="true">👋</span><span>Logout</span></a>
          </>
        ) : (
          <>
            <Link href="/about">About</Link>
            <Link href="/programmes">Programmes</Link>
            <Link href="/universities">Universities</Link>
            <Link href="/destinations">Destinations</Link>
            <Link href="/gallery">Gallery</Link>
            <Link href="/#media">Media & Updates</Link>
            <a href="https://futureplusedus.com/" target="_blank" rel="noreferrer">Corporate Website</a>
          </>
        )}
      </nav>
    </header>
  );
}
