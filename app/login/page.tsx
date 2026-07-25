import LoginButton from './signin-button';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default function LoginPage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  return <LoginPageContent searchParams={searchParams} />;
}

async function LoginPageContent({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user && !params?.error) {
    redirect('/dashboard');
  }

  return (
    <section className="hero">
      <div>
        <span className="kicker">Private staff workspace</span>
        <h1>Welcome back, Future Plus team.</h1>
        <p className="muted">
          This area contains student and institutional information. Access is limited to
          approved Future Plus employee email addresses.
        </p>
      </div>
      <div className="hero-card">
        <h2>Sign in</h2>
        {params?.error ? <p className="alert">{params.error}</p> : null}
        <p className="muted">Continue with your approved Google account. Your staff name and email will be recorded against every student lead you create or manage.</p>
        <LoginButton />
        {user ? <p className="help-text">Signed in with {user.email}. You can choose another account above or <a href="/logout"><u>sign out</u></a>.</p> : null}
      </div>
    </section>
  );
}
