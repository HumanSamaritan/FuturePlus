import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { isAllowedUserEmail } from '@/lib/env';
import { headers } from 'next/headers';
import { unstable_noStore as noStore } from 'next/cache';

export default async function Header() {
  noStore();
  const pathname = (await headers()).get('x-future-plus-pathname') || '/';
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const isStaff = pathname !== '/' && Boolean(user && isAllowedUserEmail(user.email));
  let staffName = '';
  let staffEmail = '';
  let staffRole = 'Staff';
  if (isStaff && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name,email,role')
      .eq('id', user.id)
      .maybeSingle();
    staffEmail = profile?.email || user.email || '';
    staffRole = profile?.role === 'admin' ? 'Super User' : 'Staff';
    staffName =
      profile?.full_name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      staffEmail.split('@')[0] ||
      'Future Plus Staff';
  }

  return (
    <header className={`site-header ${isStaff ? 'workspace-nav' : 'public-nav'}`}>
      <Link href={isStaff ? '/dashboard' : '/'} className="brand">
        <Image
          src="/future-plus-logo.jpg"
          alt="Future Plus Education"
          className="brand-logo"
          width={64}
          height={64}
          priority
        />
        <span>
          <strong>Future Plus</strong>
          <small>Education & career ecosystem</small>
        </span>
      </Link>
      <nav>
        {isStaff ? (
          <>
            <Link href="/dashboard">
              <span className="workspace-nav-icon" aria-hidden="true">&#10024;</span>
              <span>Dashboard</span>
            </Link>
            <Link href="/students/new">
              <span className="workspace-nav-icon" aria-hidden="true">&#127891;</span>
              <span>Under Graduate intake</span>
            </Link>
            <Link href="/students/postgraduate/new">
              <span className="workspace-nav-icon" aria-hidden="true">&#128640;</span>
              <span>Post Graduate intake</span>
            </Link>
            <Link href="/colleges">
              <span className="workspace-nav-icon" aria-hidden="true">&#127963;</span>
              <span>Universities Database</span>
            </Link>
            <Link href="/admin">
              <span className="workspace-nav-icon" aria-hidden="true">&#128229;</span>
              <span>Imports &amp; admin</span>
            </Link>
            <a href="https://futureplusedus.com/" target="_blank" rel="noreferrer">
              <span className="workspace-nav-icon" aria-hidden="true">&#127760;</span>
              <span>Public website</span>
            </a>
            <a href="/logout" className="logout-link">
              <span className="workspace-nav-icon" aria-hidden="true">&#128075;</span>
              <span>Logout</span>
            </a>
          </>
        ) : (
          <>
            <Link href="/#about">About</Link>
            <Link href="/#programmes">Programmes</Link>
            <Link href="/#universities">Universities</Link>
            <Link href="/#media">Media & Updates</Link>
            <a href="https://futureplusedus.com/" target="_blank" rel="noreferrer">Corporate Website</a>
            <Link href="/login" className="nav-login">Staff Login</Link>
          </>
        )}
      </nav>
      {isStaff ? (
        <div className="staff-identity" aria-label="Signed-in staff member">
          <span className="staff-avatar">{staffName.slice(0, 1).toUpperCase()}</span>
          <span><strong>Welcome, {staffName}</strong><small>{staffRole} · {staffEmail}</small></span>
        </div>
      ) : null}
    </header>
  );
}
