import Link from 'next/link';
import ScorePill from '@/components/ScorePill';
import StatCard from '@/components/StatCard';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ count: studentCount }, { count: collegeCount }, { count: courseCount }, { data: students, error }] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }),
    supabase.from('colleges').select('*', { count: 'exact', head: true }),
    supabase.from('courses').select('*', { count: 'exact', head: true }),
    supabase
      .from('students')
      .select('id, first_name, last_name, email, status, score, future_plus_id, created_at, subjects_interest, created_by, assigned_staff_name, assigned_staff_email')
      .order('created_at', { ascending: false })
      .limit(12)
  ]);

  if (error) throw new Error(error.message);

  const creatorIds = [...new Set(
    (students ?? [])
      .map((student) => student.created_by)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
  )];
  const { data: creatorProfiles } = creatorIds.length
    ? await supabase.from('profiles').select('id,full_name,email').in('id', creatorIds)
    : { data: [] };
  const profileById = new Map((creatorProfiles ?? []).map((profile) => [profile.id, profile]));
  const { data: currentProfile } = user
    ? await supabase.from('profiles').select('full_name,email').eq('id', user.id).maybeSingle()
    : { data: null };
  const staffEmail = currentProfile?.email || user?.email || '';
  const staffName =
    currentProfile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    staffEmail.split('@')[0] ||
    'Future Plus Staff';

  const onboarded = (students ?? []).filter((student) => ['admitted', 'onboarded'].includes(student.status)).length;

  return (
    <section className="grid">
      <div className="card">
        <span className="kicker">Future Plus organiser workspace</span>
        <h1>Welcome, {staffName}. Here’s your counselling pipeline.</h1>
        <p className="muted">
          Manage student profiles, institutional relationships, recommendations and annual data reviews from one place.
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
                <th>Managing Staff</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {(students ?? []).map((student) => {
                const creator = student.created_by ? profileById.get(student.created_by) : null;
                const managingStaffName = student.assigned_staff_name || creator?.full_name || 'Not assigned';
                const managingStaffEmail = student.assigned_staff_email || creator?.email || '-';
                return (
                <tr key={student.id}>
                  <td>
                    <Link href={`/students/${student.id}`}><strong>{student.first_name} {student.last_name}</strong></Link>
                    <br /><span className="muted">{student.email || 'No email captured'}</span>
                  </td>
                  <td>{student.subjects_interest?.join(', ') || '-'}</td>
                  <td><span className="badge">{student.status}</span></td>
                  <td>{student.future_plus_id || '-'}</td>
                  <td>
                    <strong>{managingStaffName}</strong><br />
                    <span className="muted">{managingStaffEmail}</span>
                  </td>
                  <td><ScorePill score={student.score} /></td>
                </tr>
                );
              })}
              {!students?.length ? (
                <tr><td colSpan={6}>No student records yet. Create the first student intake.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
