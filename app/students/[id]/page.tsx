import ScorePill from '@/components/ScorePill';
import FutureFitAssessmentView from '@/components/FutureFitAssessment';
import Link from 'next/link';
import { STUDENT_STATUS } from '@/lib/constants';
import { getCourseCatalog } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import { CourseWithCollege } from '@/lib/types';
import { WebCollegeInsight } from '@/lib/web-college-discovery';
import { regenerateCounsellingSummaryAction, updateStudentStatusAction } from '../actions';
import { requestStudentDeletionAction } from '@/app/admin/deletion-actions';
import RequestStudentDeletionButton from '@/components/RequestStudentDeletionButton';

export default async function StudentDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ deletionRequested?: string; deletionError?: string }>;
}) {
  const { id } = await params;
  const { deletionRequested, deletionError } = await searchParams;
  const supabase = await createClient();

  const [{ data: student, error: studentError }, { data: recommendations, error: recError }, courses] = await Promise.all([
    supabase.from('students').select('*').eq('id', id).single(),
    supabase.from('recommendations').select('*').eq('student_id', id).order('rank', { ascending: true }),
    getCourseCatalog()
  ]);

  if (studentError) throw new Error(studentError.message);
  if (recError) throw new Error(recError.message);

  const courseById = new Map(courses.map((course: CourseWithCollege) => [course.course_id, course]));
  const privateWebInsights = ((student.web_college_insights || []) as WebCollegeInsight[])
    .filter((insight) => insight.ownership === 'private');
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    : { data: null };
  const isAdmin = profile?.role === 'admin';

  return (
    <section className="grid">
      <div className="card student-profile-header">
        <div>
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
          <p className="lead-owner">
            <strong>Managing staff:</strong> {student.assigned_staff_name || 'Not assigned'}
            <span>{student.assigned_staff_email || 'No staff email recorded'}</span>
          </p>
        </div>
        <div className="profile-header-actions">
          <Link className="primary-button profile-edit-button" href={`/students/${student.id}/edit`}>Edit Student</Link>
          {!isAdmin ? <RequestStudentDeletionButton
            action={requestStudentDeletionAction}
            studentId={student.id}
            studentName={`${student.first_name} ${student.last_name}`}
          /> : null}
        </div>
      </div>
      {deletionRequested ? <p className="success-message">Deletion request sent to the Super User for approval.</p> : null}
      {deletionError ? <p className="alert"><strong>Deletion request was not submitted:</strong> {deletionError}</p> : null}

      <div className="grid grid-2">
        <div className="card">
          <h2>Requirement</h2>
          <p><strong>Class X:</strong> {student.marks_x ?? '-'}% {student.year_x ? `(${student.year_x})` : ''}</p>
          <p><strong>Class XII:</strong> {student.marks_xii ?? '-'}% {student.year_xii ? `(${student.year_xii})` : ''}</p>
          <p><strong>Board:</strong> {student.board || '-'}</p>
          <p><strong>Subjects:</strong> {student.subjects_interest?.join(', ') || '-'}</p>
          <p><strong>Locations:</strong> {student.preferred_locations?.join(', ') || '-'}</p>
          <p><strong>Total course-cost range:</strong> {student.budget_min ? `₹${Number(student.budget_min).toLocaleString('en-IN')}` : '-'} to {student.budget_max ? `₹${Number(student.budget_max).toLocaleString('en-IN')}` : '-'}</p>
          <p><strong>Expected package:</strong> {student.salary_expectation || '-'} INR</p>
          <p><strong>Hostel required:</strong> {student.hostel_required ? 'Yes' : 'No'}</p>
          <p><strong>Education loan required:</strong> {student.loan_required ? 'Yes' : 'No'}</p>
          <p><strong>Below poverty line:</strong> {student.below_poverty_line ? 'Yes' : 'No'}</p>
          <p><strong>Financial aid:</strong> {student.financial_aid_required ? <span className="financial-aid-flag">Required</span> : 'Not flagged'}</p>
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

      {student.desired_program_level === 'postgraduate' ? (
        <div className="card">
          <h2>Post Graduate applicant profile</h2>
          <p><strong>Under Graduate degree:</strong> {student.undergraduate_degree || '-'} {student.undergraduate_specialisation ? `(${student.undergraduate_specialisation})` : ''}</p>
          <p><strong>University:</strong> {student.undergraduate_university || '-'}</p>
          <p><strong>Graduation year:</strong> {student.undergraduate_graduation_year || '-'}</p>
          <p><strong>Applicant status:</strong> {student.pg_applicant_status?.replaceAll('_', ' ') || '-'}</p>
          <p><strong>Final percentage:</strong> {student.undergraduate_final_percentage ?? '-'}%</p>
          <p><strong>Semester results:</strong> {Object.entries(student.semester_marks || {}).map(([semester, marks]) => `${semester.replace('_', ' ')}: ${marks}%`).join(', ') || '-'}</p>
          <p><strong>Employment:</strong> {[student.current_job_title, student.current_employer].filter(Boolean).join(' at ') || '-'}</p>
          <p><strong>Experience:</strong> {student.work_experience_months ?? 0} months</p>
        </div>
      ) : null}

      <div className="card">
        <span className="kicker">Future Plus intelligence</span>
        <h2>Student Future-Fit assessment</h2>
        <p className="muted">A student-shareable view of chosen-stream alignment, evidence-based strengths, possible future streams and practical next steps. Staff-only interpretation is clearly separated below.</p>
        <FutureFitAssessmentView rawSummary={student.ai_summary} />
        <form action={regenerateCounsellingSummaryAction}>
          <input type="hidden" name="studentId" value={student.id} />
          <div className="actions">
            <button className="primary-button" type="submit">Regenerate AI Insights</button>
          </div>
        </form>
      </div>

      <div className="card">
        <span className="kicker">Live web discovery</span>
        <h2>Suggested private non-partner institutions</h2>
        <p className="muted">A chosen-stream shortlist of private institutions only. Government, public and government-aided institutions are excluded. Staff must verify the linked official source before advising the student.</p>
        {student.web_discovery_status ? (
          <div className="discovery-status">
            <p className="muted">
              <strong>Latest search:</strong>{' '}
              {new Date(student.web_discovery_status.searched_at).toLocaleString('en-IN')} ·{' '}
              {privateWebInsights.length} private result(s)
            </p>
          </div>
        ) : null}
        <div className="grid grid-2">
          {privateWebInsights.map((insight, index) => (
            <article className="card" key={`${insight.college_name}-${insight.course_name}-${insight.city}-${insight.state}`}>
              <span className="kicker">#{index + 1} · {insight.fit_level || 'Review'} fit · Private</span>
              <h3>{insight.college_name}</h3>
              {insight.course_name ? <p><strong>Programme:</strong> {insight.course_name}</p> : null}
              <p><strong>Location:</strong> {[insight.city, insight.state, insight.country].filter(Boolean).join(', ') || 'Verify location'}</p>
              <p>{insight.fit_feedback || insight.fit_reason || 'Potential private chosen-stream fit; staff should verify the institution against the student profile.'}</p>
              <div className="actions">
                <ScorePill score={insight.fit_score} />
                <a className="secondary-button" href={insight.source_url} target="_blank" rel="noreferrer">Verify official source</a>
              </div>
            </article>
          ))}
        </div>
        {!privateWebInsights.length ? (
          <p className="muted">
            {student.web_discovery_status
              ? 'No verified private chosen-stream institutions are currently available in the latest shortlist. Regenerate to run the private-only search.'
              : 'Select Regenerate AI Insights to search for matching private non-partner institutions.'}
          </p>
        ) : null}
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
        <div className="partner-legend" aria-label="College partnership colour guide">
          <span><i className="legend-swatch preferred" />Preferred partner</span>
          <span><i className="legend-swatch pipeline" />Partner network / pipeline</span>
          <span><i className="legend-swatch independent" />Non-partner</span>
        </div>
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
                  <tr
                    className={
                      course?.partner_status === 'preferred_partner'
                        ? 'recommendation-row preferred-partner-row'
                        : course?.partner_status === 'pipeline_partner'
                          ? 'recommendation-row pipeline-partner-row'
                          : 'recommendation-row non-partner-row'
                    }
                    key={rec.id}
                  >
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
                    <td>
                      <span className={`partner-status partner-${course?.partner_status || 'non_partner'}`}>
                        {(course?.partner_status || 'non_partner').replaceAll('_', ' ')}
                      </span>
                      <br />{course?.commission_based ? 'Commission' : 'No commission flag'}
                    </td>
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
