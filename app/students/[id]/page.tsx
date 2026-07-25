import ScorePill from '@/components/ScorePill';
import { STUDENT_STATUS } from '@/lib/constants';
import { getCourseCatalog } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import { CourseWithCollege } from '@/lib/types';
import { updateStudentStatusAction } from '../actions';

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: student, error: studentError }, { data: recommendations, error: recError }, courses] = await Promise.all([
    supabase.from('students').select('*').eq('id', id).single(),
    supabase.from('recommendations').select('*').eq('student_id', id).order('rank', { ascending: true }),
    getCourseCatalog()
  ]);

  if (studentError) throw new Error(studentError.message);
  if (recError) throw new Error(recError.message);

  const courseById = new Map(courses.map((course: CourseWithCollege) => [course.course_id, course]));

  return (
    <section className="grid">
      <div className="card">
        <span className="kicker">Student Profile</span>
        <h1>{student.first_name} {student.last_name}</h1>
        <p className="muted">
          {student.email || 'No email'} · {student.phone || 'No phone'} · {student.city || 'City not captured'} {student.state ? `, ${student.state}` : ''}
        </p>
        <div className="actions">
          <ScorePill score={student.score} />
          <span className="badge">Status: {student.status}</span>
          {student.future_plus_id ? <span className="badge">{student.future_plus_id}</span> : null}
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2>Requirement</h2>
          <p><strong>Class X:</strong> {student.marks_x ?? '-'}% {student.year_x ? `(${student.year_x})` : ''}</p>
          <p><strong>Class XII:</strong> {student.marks_xii ?? '-'}% {student.year_xii ? `(${student.year_xii})` : ''}</p>
          <p><strong>Board:</strong> {student.board || '-'}</p>
          <p><strong>Subjects:</strong> {student.subjects_interest?.join(', ') || '-'}</p>
          <p><strong>Locations:</strong> {student.preferred_locations?.join(', ') || '-'}</p>
          <p><strong>Fee range:</strong> {student.budget_min || '-'} to {student.budget_max || '-'} INR</p>
          <p><strong>Expected package:</strong> {student.salary_expectation || '-'} INR</p>
          <p><strong>Hostel required:</strong> {student.hostel_required ? 'Yes' : 'No'}</p>
          <p><strong>Support:</strong> {student.support_required?.join(', ') || '-'}</p>
        </div>
        <div className="card">
          <h2>Passion and purpose</h2>
          <p><strong>Passion:</strong> {student.passion || '-'}</p>
          <p><strong>Purpose:</strong> {student.purpose || '-'}</p>
          <p><strong>Strengths:</strong> {student.strengths || '-'}</p>
          <p><strong>Constraints:</strong> {student.constraints || '-'}</p>
        </div>
      </div>

      <div className="card">
        <h2>Counselling summary</h2>
        <pre>{student.ai_summary || 'No summary generated yet.'}</pre>
      </div>

      <div className="form-card">
        <h2>Update student status</h2>
        <p className="muted">When status changes to admitted or onboarded, Supabase will automatically generate a Future Plus ID.</p>
        <form action={updateStudentStatusAction}>
          <input type="hidden" name="studentId" value={student.id} />
          <div className="grid grid-2">
            <div className="field">
              <label htmlFor="status">Status</label>
              <select id="status" name="status" defaultValue={student.status}>
                {STUDENT_STATUS.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
            <div className="field" style={{ alignSelf: 'end' }}>
              <button className="primary-button" type="submit">Update Status</button>
            </div>
          </div>
        </form>
      </div>

      <div className="table-card">
        <h2>College recommendations</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>College / Course</th>
                <th>Fee</th>
                <th>Location</th>
                <th>Placements</th>
                <th>Hostel</th>
                <th>Partner</th>
                <th>Fit</th>
              </tr>
            </thead>
            <tbody>
              {(recommendations ?? []).map((rec) => {
                const course = courseById.get(rec.course_id);
                return (
                  <tr key={rec.id}>
                    <td>#{rec.rank}</td>
                    <td>
                      <strong>{course?.college_name || 'Unknown college'}</strong><br />
                      {course?.course_name || rec.course_id}<br />
                      <span className="muted">{rec.reason}</span>
                      {rec.staff_hidden_reason ? <p className="alert"><strong>Staff-only:</strong> {rec.staff_hidden_reason}</p> : null}
                    </td>
                    <td>{course?.total_fee ? `${course.total_fee.toLocaleString('en-IN')} ${course.currency || 'INR'}` : '-'}</td>
                    <td>{[course?.city, course?.state].filter(Boolean).join(', ') || '-'}</td>
                    <td>
                      Count: {course?.placement_count ?? '-'}<br />
                      Avg: {course?.average_package ? course.average_package.toLocaleString('en-IN') : '-'}<br />
                      High: {course?.highest_package ? course.highest_package.toLocaleString('en-IN') : '-'}
                    </td>
                    <td>{course?.hostel_available ? 'Yes' : 'No / verify'}</td>
                    <td>{course?.partner_status || 'non_partner'}<br />{course?.commission_based ? 'Commission' : 'No commission flag'}</td>
                    <td><ScorePill score={rec.fit_score} /></td>
                  </tr>
                );
              })}
              {!recommendations?.length ? <tr><td colSpan={8}>No recommendations yet. Check that college course data exists.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
