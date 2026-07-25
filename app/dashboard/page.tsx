import Link from 'next/link';
import ScorePill from '@/components/ScorePill';
import StatCard from '@/components/StatCard';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ count: studentCount }, { count: collegeCount }, { count: courseCount }, { data: students, error }] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }),
    supabase.from('colleges').select('*', { count: 'exact', head: true }),
    supabase.from('courses').select('*', { count: 'exact', head: true }),
    supabase
      .from('students')
      .select('id, first_name, last_name, email, status, score, future_plus_id, created_at, subjects_interest')
      .order('created_at', { ascending: false })
      .limit(12)
  ]);

  if (error) throw new Error(error.message);

  const onboarded = (students ?? []).filter((student) => ['admitted', 'onboarded'].includes(student.status)).length;

  return (
    <section className="grid">
      <div className="card">
        <span className="kicker">Staff Dashboard</span>
        <h1>Student counselling pipeline</h1>
        <p className="muted">
          Capture new students, shortlist colleges and track onboarding for Future Plus undergraduate programmes.
        </p>
        <div className="actions">
          <Link href="/students/new" className="primary-button">Create Student Intake</Link>
          <Link href="/admin" className="secondary-button">Add College / Course</Link>
        </div>
      </div>

      <div className="dashboard-grid">
        <StatCard label="Students" value={studentCount ?? 0} helper="All intake records" />
        <StatCard label="Colleges" value={collegeCount ?? 0} helper="Partner and non-partner" />
        <StatCard label="Courses" value={courseCount ?? 0} helper="UG catalogue records" />
        <StatCard label="Admitted / Onboarded" value={onboarded} helper="Recent visible records" />
      </div>

      <div className="table-card">
        <h2>Recent student records</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Subjects</th>
                <th>Status</th>
                <th>Future Plus ID</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {(students ?? []).map((student) => (
                <tr key={student.id}>
                  <td>
                    <Link href={`/students/${student.id}`}><strong>{student.first_name} {student.last_name}</strong></Link>
                    <br /><span className="muted">{student.email || 'No email captured'}</span>
                  </td>
                  <td>{student.subjects_interest?.join(', ') || '-'}</td>
                  <td><span className="badge">{student.status}</span></td>
                  <td>{student.future_plus_id || '-'}</td>
                  <td><ScorePill score={student.score} /></td>
                </tr>
              ))}
              {!students?.length ? (
                <tr><td colSpan={5}>No student records yet. Create the first student intake.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
