import Link from 'next/link';
import { getCourseCatalog } from '@/lib/data';
import { updateCollegeCourseAction } from '@/app/admin/actions';
import { requestUniversityDeletionAction } from '@/app/admin/deletion-actions';
import { CourseWithCollege } from '@/lib/types';
import DeleteUniversityButton from '@/components/DeleteUniversityButton';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type UniversityGroup = {
  university: CourseWithCollege;
  courses: CourseWithCollege[];
};

function groupUniversities(courses: CourseWithCollege[]): UniversityGroup[] {
  const groups = new Map<string, UniversityGroup>();
  for (const course of courses) {
    const key = course.college_id;
    const existing = groups.get(key);
    if (existing) existing.courses.push(course);
    else groups.set(key, { university: course, courses: [course] });
  }
  return [...groups.values()].sort((a, b) =>
    a.university.college_name.localeCompare(b.university.college_name)
  );
}

export default async function CollegesPage({
  searchParams
}: {
  searchParams: Promise<{ imported?: string; saved?: string; deleted?: string; deletionRequested?: string; deletionError?: string }>;
}) {
  const { imported, saved, deleted, deletionRequested, deletionError } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    : { data: null };
  const isAdmin = profile?.role === 'admin';
  let courses: CourseWithCollege[] = [];
  let catalogueError = '';
  try {
    courses = await getCourseCatalog();
  } catch (error) {
    catalogueError = crypto.randomUUID();
    console.error('[college-catalogue] render failed', { reference: catalogueError, error });
  }

  const catalogueSections = [
    {
      key: 'undergraduate',
      title: 'Under Graduate Universities and Courses',
      courses: courses.filter((course) => course.program_level !== 'postgraduate')
    },
    {
      key: 'postgraduate',
      title: 'Post Graduate Universities and Courses',
      courses: courses.filter((course) => course.program_level === 'postgraduate')
    }
  ];

  return (
    <section className="grid">
      <div className="card">
        <span className="kicker">Universities</span>
        <h1>Under Graduate and Post Graduate university catalogue</h1>
        {imported ? <p className="success-message">{imported} uploaded row(s) are now visible in Universities.</p> : null}
        {saved ? <p className="success-message">University and course changes saved successfully.</p> : null}
        {deleted ? <p className="success-message">University and all associated courses were deleted successfully.</p> : null}
        {deletionRequested ? <p className="success-message">Deletion request sent to the Super User for approval.</p> : null}
        {deletionError ? <p className="alert"><strong>Deletion request was not submitted:</strong> {deletionError}</p> : null}
        {catalogueError ? <p className="alert">Universities could not be loaded. Please check the server log using reference {catalogueError} and confirm all database migrations are applied.</p> : null}
        <p className="muted">
          Each university appears once in each programme section. Open its course selector to scroll through every available subject and course.
        </p>
        <div className="actions">
          <Link href="/admin" className="primary-button">Add University / Course</Link>
          <Link href="/students/new" className="secondary-button">Create Student Intake</Link>
        </div>
      </div>

      {catalogueSections.map((section) => {
        const universities = groupUniversities(section.courses);
        return (
          <div className={`catalogue-section catalogue-${section.key}`} key={section.key}>
            <div className="catalogue-section-heading">
              <span className={`programme-badge programme-${section.key}`}>
                {section.key === 'postgraduate' ? 'Post Graduate' : 'Under Graduate'}
              </span>
              <h2>{section.title}</h2>
              <p className="muted">{universities.length} university record(s) · {section.courses.length} course record(s)</p>
            </div>

            <div className="table-card college-database">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>University Name</th>
                      <th>Subjects / Courses</th>
                      <th>Location</th>
                      <th>POC / annual review</th>
                      <th>Hostel</th>
                      <th>Future Plus Flag</th>
                      {!isAdmin ? <th>Deletion request</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {universities.map(({ university, courses: universityCourses }) => (
                      <tr
                        className={
                          university.partner_status === 'preferred_partner'
                            ? 'preferred-partner-row'
                            : university.partner_status === 'pipeline_partner'
                              ? 'pipeline-partner-row'
                              : 'non-partner-row'
                        }
                        key={university.college_id}
                      >
                        <td>
                          <strong>{university.college_name}</strong><br />
                          <span className="muted">{universityCourses.length} course(s)</span>
                        </td>
                        <td>
                          <details className="course-selector">
                            <summary>View all {universityCourses.length} courses</summary>
                            <div className="course-scroll-list">
                              {universityCourses.map((course) => (
                                <article className="course-option" key={course.course_id}>
                                  <div className="course-option-heading">
                                    <div>
                                      <strong>{course.course_name}</strong><br />
                                      <span className="muted">{course.subject_area} · {course.duration || 'Duration not captured'}</span>
                                    </div>
                                    <span className="badge">
                                      {course.total_fee ? `${course.total_fee.toLocaleString('en-IN')} ${course.currency || 'INR'}` : 'Fee to verify'}
                                    </span>
                                  </div>
                                  <p className="muted">
                                    Placements: {course.placement_count ?? 'Verify'} · Average package: {course.average_package?.toLocaleString('en-IN') || 'Verify'} · Highest package: {course.highest_package?.toLocaleString('en-IN') || 'Verify'}
                                  </p>
                                  <details className="row-editor">
                                    <summary>Edit this course</summary>
                                    <form action={updateCollegeCourseAction} className="inline-edit-form">
                                      <input type="hidden" name="collegeId" value={course.college_id} />
                                      <input type="hidden" name="courseId" value={course.course_id} />
                                      <label>University<input name="collegeName" defaultValue={course.college_name} required /></label>
                                      <label>Course<input name="courseName" defaultValue={course.course_name} required /></label>
                                      <label>Programme level<select name="programLevel" defaultValue={course.program_level || 'undergraduate'}><option value="undergraduate">Under Graduate</option><option value="postgraduate">Post Graduate</option></select></label>
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
                                </article>
                              ))}
                            </div>
                          </details>
                        </td>
                        <td>{[university.city, university.state, university.country].filter(Boolean).join(', ')}</td>
                        <td>{university.poc_name || 'Not captured'}<br /><span className="muted">{university.poc_email || 'No POC email'}<br />Review: {university.next_review_at ? new Date(university.next_review_at).toLocaleDateString('en-IN') : 'Not scheduled'}</span></td>
                        <td>{university.hostel_available ? 'Yes' : 'No / verify'}</td>
                        <td>
                          <span className={`partner-status partner-${university.partner_status || 'non_partner'}`}>
                            {(university.partner_status || 'non_partner').replaceAll('_', ' ')}
                          </span><br />
                          {university.commission_based ? 'Commission based' : 'No commission flag'}
                        </td>
                        {!isAdmin ? <td>
                          <DeleteUniversityButton
                            action={requestUniversityDeletionAction}
                            collegeId={university.college_id}
                            universityName={university.college_name}
                            programLevel={section.key as 'undergraduate' | 'postgraduate'}
                          />
                        </td> : null}
                      </tr>
                    ))}
                    {!universities.length ? <tr><td colSpan={isAdmin ? 6 : 7}>No {section.key === 'postgraduate' ? 'Post Graduate' : 'Under Graduate'} university records yet. Use the Admin page to add or upload records.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
