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
  if (isStaff && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name,email')
      .eq('id', user.id)
      .maybeSingle();
    staffEmail = profile?.email || user.email || '';
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
            <Link href="/dashboard">⌂ Overview</Link>
            <Link href="/students/new">＋ Student intake</Link>
            <Link href="/colleges">▦ College database</Link>
            <Link href="/admin">⇧ Imports & admin</Link>
            <a href="https://futureplusedus.com/" target="_blank" rel="noreferrer">↗ Public website</a>
            <a href="/logout" className="logout-link">Logout</a>
          </>
        ) : (
          <>
            <Link href="/#about">About</Link>
            <Link href="/#programmes">Programmes</Link>
            <Link href="/#colleges">Colleges</Link>
            <a href="https://futureplusedus.com/" target="_blank" rel="noreferrer">Future Plus Website</a>
            <a href="https://www.facebook.com/share/1BcYydGmG2/?mibextid=wwXIfr" target="_blank" rel="noreferrer">Facebook</a>
            <Link href="/login" className="nav-login">Future Plus Staff Login</Link>
          </>
        )}
      </nav>
      {isStaff ? (
        <div className="staff-identity" aria-label="Signed-in staff member">
          <span className="staff-avatar">{staffName.slice(0, 1).toUpperCase()}</span>
          <span><strong>Welcome, {staffName}</strong><small>{staffEmail}</small></span>
        </div>
      ) : null}
    </header>
  );
}
