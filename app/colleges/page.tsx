import Link from 'next/link';
import { getCourseCatalog } from '@/lib/data';

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

      <div className="table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>College Name</th>
                <th>Subject / Course</th>
                <th>Duration</th>
                <th>Total Fee</th>
                <th>Location</th>
                <th>Placement Count</th>
                <th>Placement Package</th>
                <th>Hostel</th>
                <th>Future Plus Flag</th>
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
                </tr>
              ))}
              {!courses.length ? <tr><td colSpan={9}>No college records yet. Add seed data in Supabase or use the Admin page.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
