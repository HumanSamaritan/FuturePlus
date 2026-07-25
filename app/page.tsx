import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <section className="hero">
      <div>
        <span className="kicker">Undergraduate MVP</span>
        <h1>Career counselling built around passion, purpose and practical admissions outcomes.</h1>
        <p className="muted">
          Staff can capture student details, compare private colleges, score fit across subjects, fees,
          hostel availability, placements and Future Plus partner support, then track conversion to onboarding.
        </p>
        <div className="actions">
          <Link href={user ? '/dashboard' : '/login'} className="primary-button">
            {user ? 'Open Dashboard' : 'Staff Login'}
          </Link>
          <Link href="/colleges" className="secondary-button">View College Database</Link>
        </div>
      </div>
      <div className="hero-card">
        <h2>MVP workflow</h2>
        <div className="timeline">
          <div className="timeline-item"><strong>1. Staff login</strong><br /><span className="muted">Google OAuth restricted to the approved company domain.</span></div>
          <div className="timeline-item"><strong>2. Student intake</strong><br /><span className="muted">Capture UG interest, budget, salary expectation, hostel need, passion and purpose.</span></div>
          <div className="timeline-item"><strong>3. College fit score</strong><br /><span className="muted">Score courses using transparent rule-based logic, with partner preference and hidden staff notes.</span></div>
          <div className="timeline-item"><strong>4. Future Plus ID</strong><br /><span className="muted">Generated when a student is moved to admitted/onboarded status.</span></div>
        </div>
      </div>
    </section>
  );
}
