import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Authorised Workspace Sign In',
  description: 'Secure organisational workspace access.'
};

export default async function StaffLoginPage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user && !params?.error) redirect('/dashboard');

  return (
    <section className="staff-login-page neutral-login-page">
      <div className="staff-login-intro">
        <span className="kicker">Secure organisational workspace</span>
        <h1>Authorised staff access.</h1>
        <p>Sign in to a protected workspace for student, client and operational records. Access is controlled by the organisation’s approved-account list and role permissions.</p>
        <div className="login-assurance" aria-label="Workspace safeguards">
          <span>Role-based access</span>
          <span>Protected records</span>
          <span>Controlled organisational workflow</span>
        </div>
      </div>
      <div className="staff-login-card">
        <span className="login-card-label">Authorised access</span>
        <h2>Continue securely</h2>
        {params?.error ? <p className="alert">{params.error}</p> : null}
        <p className="muted">Use the Google account approved by your organisation. Your permissions determine the records and functions available after sign-in.</p>
        <a className="primary-button" href="/auth/login">Continue with approved Google account</a>
        <p className="login-privacy-note">This page is intentionally separate from the public website.</p>
        {user ? <p className="help-text">Signed in with {user.email}. <a href="/logout"><u>Sign out</u></a> to choose another account.</p> : null}
      </div>
    </section>
  );
}
