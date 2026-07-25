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
        <span className="kicker">Secure Google Login</span>
        <h1>Welcome to Future Plus.</h1>
        <p className="muted">
          During development and testing, any Google account may sign in. Student records and
          recommendations remain protected by Supabase authentication and row-level security.
        </p>
      </div>
      <div className="hero-card">
        <h2>Sign in</h2>
        {params?.error ? <p className="alert">{params.error}</p> : null}
        <p className="muted">Continue with Google to open the Future Plus dashboard.</p>
        <LoginButton />
      </div>
    </section>
  );
}
