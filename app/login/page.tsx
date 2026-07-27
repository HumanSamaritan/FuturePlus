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
    <section className="staff-login-page">
      <div className="staff-login-intro">
        <span className="kicker">Private staff workspace</span>
        <h1>Welcome to your Future Plus workspace.</h1>
        <p>
          Securely manage student enquiries, institutional information and counselling
          activity from one place.
        </p>
        <div className="login-assurance" aria-label="Workspace benefits">
          <span>Role-based access</span>
          <span>Protected student records</span>
          <span>Centralised counselling workflow</span>
        </div>
      </div>
      <div className="staff-login-card">
        <span className="login-card-label">Authorised access</span>
        <h2>Sign in to continue</h2>
        {params?.error ? <p className="alert">{params.error}</p> : null}
        <p className="muted">
          Use your approved Google account. Your account permissions automatically determine
          the student and staff information available to you.
        </p>
        <LoginButton />
        <p className="login-privacy-note">Access is restricted to approved Future Plus employees.</p>
        {user ? <p className="help-text">Signed in with {user.email}. You can choose another account above or <a href="/logout"><u>sign out</u></a>.</p> : null}
      </div>
    </section>
  );
}
