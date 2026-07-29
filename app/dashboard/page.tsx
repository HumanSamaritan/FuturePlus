import Link from 'next/link';
import ScorePill from '@/components/ScorePill';
import StatCard from '@/components/StatCard';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}) {
  const params = await searchParams;
  const startDate = /^\d{4}-\d{2}-\d{2}$/.test(params.startDate || '') ? params.startDate! : '';
  const endDate = /^\d{4}-\d{2}-\d{2}$/.test(params.endDate || '') ? params.endDate! : '';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let recentStudentsQuery = supabase
    .from('students')
    .select('id, first_name, last_name, email, phone, city, state, status, score, future_plus_id, created_at, target_intake, subjects_interest, desired_program_level, financial_aid_required, created_by, assigned_staff_name, assigned_staff_email')
    .order('created_at', { ascending: false })
    .limit(200);
  if (startDate) recentStudentsQuery = recentStudentsQuery.gte('created_at', `${startDate}T00:00:00.000Z`);
  if (endDate) recentStudentsQuery = recentStudentsQuery.lte('created_at', `${endDate}T23:59:59.999Z`);

  const [
    { count: studentCount },
    { count: collegeCount },
    { count: underGraduateCourseCount },
    { count: postGraduateCourseCount },
    { data: students, error }
  ] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }),
    supabase.from('colleges').select('*', { count: 'exact', head: true }),
    supabase.from('courses').select('*', { count: 'exact', head: true }).eq('program_level', 'undergraduate'),
    supabase.from('courses').select('*', { count: 'exact', head: true }).eq('program_level', 'postgraduate'),
    recentStudentsQuery
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
    ? await supabase.from('profiles').select('full_name,email,role').eq('id', user.id).maybeSingle()
    : { data: null };
  const staffEmail = currentProfile?.email || user?.email || '';
  const staffName =
    currentProfile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    staffEmail.split('@')[0] ||
    'Future Plus Staff';
  const roleLabel = currentProfile?.role === 'admin' ? 'Super User · all staff data' : 'Staff · your leads only';

  const onboarded = (students ?? []).filter((student) => ['admitted', 'onboarded'].includes(student.status)).length;

  return (
    <section className="grid">
      <div className="card">
        <span className="kicker">Future Plus organiser workspace</span>
        <h1>Welcome, {staffName}. Here’s your counselling pipeline.</h1>
        <p className="badge">{roleLabel}</p>
        <p className="muted">
          Manage student profiles, institutional relationships, recommendations and annual data reviews from one place.
        </p>
        <div className="actions">
          <Link href="/students/new" className="primary-button">Create Under Graduate Intake</Link>
          <Link href="/students/postgraduate/new" className="primary-button">Create Post Graduate Intake</Link>
          <Link href="/admin" className="secondary-button">Add University / Course</Link>
        </div>
      </div>

      <div className="dashboard-grid">
        <StatCard label="Students" value={studentCount ?? 0} helper="All intake records" />
        <StatCard label="Universities" value={collegeCount ?? 0} helper="Partner and non-partner institutions" />
        <StatCard label="Under Graduate Courses" value={underGraduateCourseCount ?? 0} helper="Under Graduate catalogue records" />
        <StatCard label="Post Graduate Courses" value={postGraduateCourseCount ?? 0} helper="Post Graduate catalogue records" />
        <StatCard label="Admitted / Onboarded" value={onboarded} helper="Recent visible records" />
      </div>

      <div className="table-card">
        <div className="student-register-heading">
          <div>
            <h2>Student records</h2>
            <p className="muted">Showing {(students ?? []).length} record(s), up to 200. Select a date range to narrow the register.</p>
          </div>
          <form className="student-date-filter" method="get">
            <label>From<input type="date" name="startDate" defaultValue={startDate} /></label>
            <label>To<input type="date" name="endDate" defaultValue={endDate} /></label>
            <button className="primary-button" type="submit">Apply dates</button>
            {(startDate || endDate) ? <Link className="secondary-button" href="/dashboard">Clear</Link> : null}
          </form>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Programme Level</th>
                <th>Phone / Location</th>
                <th>Subjects</th>
                <th>Target Intake</th>
                <th>Status</th>
                <th>Future Plus ID</th>
                <th>Managing Staff</th>
                <th>Financial Aid</th>
                <th>Score</th>
                <th>Created</th>
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
                  <td><span className="programme-badge">{student.desired_program_level === 'postgraduate' ? 'Post Graduate' : 'Under Graduate'}</span></td>
                  <td>{student.phone || 'No phone'}<br /><span className="muted">{[student.city, student.state].filter(Boolean).join(', ') || 'Location not captured'}</span></td>
                  <td>{student.subjects_interest?.join(', ') || '-'}</td>
                  <td>{student.target_intake || '-'}</td>
                  <td><span className="badge">{student.status}</span></td>
                  <td>{student.future_plus_id || '-'}</td>
                  <td>
                    <strong>{managingStaffName}</strong><br />
                    <span className="muted">{managingStaffEmail}</span>
                  </td>
                  <td>{student.financial_aid_required ? <span className="financial-aid-flag">Required</span> : '-'}</td>
                  <td><ScorePill score={student.score} /></td>
                  <td>{new Date(student.created_at).toLocaleDateString('en-IN')}</td>
                </tr>
                );
              })}
              {!students?.length ? (
                <tr><td colSpan={11}>No student records found for the selected dates.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
