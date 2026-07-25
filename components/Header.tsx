import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <header className="site-header">
      <Link href="/dashboard" className="brand">
        <span className="brand-mark">FP</span>
        <span>
          <strong>Future Plus</strong>
          <small>Admissions Counselling MVP</small>
        </span>
      </Link>
      <nav>
        {user ? (
          <>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/students/new">New Student</Link>
            <Link href="/colleges">Colleges</Link>
            <Link href="/admin">Admin</Link>
            <a href="/logout">Logout</a>
          </>
        ) : (
          <Link href="/login">Staff Login</Link>
        )}
      </nav>
    </header>
  );
}
