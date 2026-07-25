import Link from 'next/link';
import { getCourseCatalog } from '@/lib/data';
import { updateCollegeCourseAction } from '@/app/admin/actions';

export default async function CollegesPage() {
  const courses = await getCourseCatalog();

  return (
    <section className="grid">
      <div className="card">
        <span className="kicker">College Database</span>
        <h1>UG college and course catalogue</h1>
        <p className="muted">
          Partner colleges are visible to staff and preferred by the recommendation score. Non-partner standout colleges remain visible for unbiased counselling and future collaboration review.
        </p>
        <div className="actions">
          <Link href="/admin" className="primary-button">Add College / Course</Link>
          <Link href="/students/new" className="secondary-button">Create Student Intake</Link>
        </div>
      </div>

      <div className="table-card college-database">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>College Name</th>
                <th>Subject / Course</th>
                <th>Duration</th>
                <th>Total Fee</th>
                <th>Location</th>
                <th>POC / annual review</th>
                <th>Placement Count</th>
                <th>Placement Package</th>
                <th>Hostel</th>
                <th>Future Plus Flag</th>
                <th>Edit</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.course_id}>
                  <td><strong>{course.college_name}</strong></td>
                  <td>{course.subject_area}<br /><span className="muted">{course.course_name}</span></td>
                  <td>{course.duration || '-'}</td>
                  <td>{course.total_fee ? `${course.total_fee.toLocaleString('en-IN')} ${course.currency || 'INR'}` : 'Verify'}</td>
                  <td>{[course.city, course.state, course.country].filter(Boolean).join(', ')}</td>
                  <td>{course.poc_name || 'Not captured'}<br /><span className="muted">{course.poc_email || 'No POC email'}<br />Review: {course.next_review_at ? new Date(course.next_review_at).toLocaleDateString('en-IN') : 'Not scheduled'}</span></td>
                  <td>{course.placement_count ?? 'Verify'}</td>
                  <td>
                    Avg: {course.average_package ? course.average_package.toLocaleString('en-IN') : 'Verify'}<br />
                    High: {course.highest_package ? course.highest_package.toLocaleString('en-IN') : 'Verify'}
                  </td>
                  <td>{course.hostel_available ? 'Yes' : 'No / verify'}</td>
                  <td>
                    <span className="badge">{course.partner_status || 'non_partner'}</span><br />
                    {course.commission_based ? 'Commission based' : 'No commission flag'}
                  </td>
                  <td>
                    <details className="row-editor">
                      <summary>Edit</summary>
                      <form action={updateCollegeCourseAction} className="inline-edit-form">
                        <input type="hidden" name="collegeId" value={course.college_id} />
                        <input type="hidden" name="courseId" value={course.course_id} />
                        <label>College<input name="collegeName" defaultValue={course.college_name} required /></label>
                        <label>Course<input name="courseName" defaultValue={course.course_name} required /></label>
                        <label>Subject<input name="subjectArea" defaultValue={course.subject_area} required /></label>
                        <label>Duration<input name="duration" defaultValue={course.duration || ''} /></label>
                        <label>City<input name="city" defaultValue={course.city || ''} /></label>
                        <label>State<input name="state" defaultValue={course.state || ''} /></label>
                        <label>Country<input name="country" defaultValue={course.country || 'India'} /></label>
                        <label>Total fee<input name="totalFee" type="number" min="0" defaultValue={course.total_fee ?? ''} /></label>
                        <label>Placements<input name="placementCount" type="number" min="0" defaultValue={course.placement_count ?? ''} /></label>
                        <label>Highest package<input name="highestPackage" type="number" min="0" defaultValue={course.highest_package ?? ''} /></label>
                        <label>Average package<input name="averagePackage" type="number" min="0" defaultValue={course.average_package ?? ''} /></label>
                        <label>Currency<input name="currency" defaultValue={course.currency || 'INR'} /></label>
                        <label>POC name<input name="pocName" defaultValue={course.poc_name || ''} /></label>
                        <label>POC email<input name="pocEmail" type="email" defaultValue={course.poc_email || ''} /></label>
                        <label>Source URL<input name="sourceUrl" type="url" defaultValue={course.source_url || ''} /></label>
                        <label>Status<select name="partnerStatus" defaultValue={course.partner_status || 'non_partner'}><option value="preferred_partner">Preferred</option><option value="pipeline_partner">Pipeline</option><option value="non_partner">Non-partner</option></select></label>
                        <label className="checkbox-label"><input name="hostelAvailable" type="checkbox" defaultChecked={Boolean(course.hostel_available)} /> Hostel</label>
                        <label className="checkbox-label"><input name="commissionBased" type="checkbox" defaultChecked={Boolean(course.commission_based)} /> Commission</label>
                        <button className="primary-button" type="submit">Save changes</button>
                      </form>
                    </details>
                  </td>
                </tr>
              ))}
              {!courses.length ? <tr><td colSpan={11}>No college records yet. Add seed data in Supabase or use the Admin page.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
