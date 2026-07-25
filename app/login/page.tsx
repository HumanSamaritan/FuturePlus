import LoginButton from './signin-button';
import { getAllowedStaffDomain } from '@/lib/env';

export default function LoginPage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  return <LoginPageContent searchParams={searchParams} />;
}

async function LoginPageContent({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const domain = getAllowedStaffDomain();

  return (
    <section className="hero">
      <div>
        <span className="kicker">Secure Staff Login</span>
        <h1>Login with your Future Plus / OMNeXa staff account.</h1>
        <p className="muted">
          This MVP is restricted to approved staff using the <strong>@{domain}</strong> email domain.
          Student records and recommendations are stored in Supabase with row-level security.
        </p>
      </div>
      <div className="hero-card">
        <h2>Staff access</h2>
        {params?.error ? <p className="alert">{params.error}</p> : null}
        <p className="muted">Use Google Sign-In. After login, you will be redirected to the dashboard.</p>
        <LoginButton />
      </div>
    </section>
  );
}
