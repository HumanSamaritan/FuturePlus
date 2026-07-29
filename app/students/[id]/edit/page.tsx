import Link from 'next/link';
import { INDIA_STATES_AND_REGIONS, SUPPORT_OPTIONS } from '@/lib/constants';
import { getSubjectAreas } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import { updateStudentProfileAction } from '../../actions';

const BUDGETS = [200000, 500000, 1000000, 1500000, 2000000, 2500000, 3000000, 4000000, 5000000, 7500000, 10000000];

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: student, error } = await supabase.from('students').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  const subjects = await getSubjectAreas(
    student.desired_program_level === 'postgraduate' ? 'postgraduate' : 'undergraduate'
  ).catch(() => student.subjects_interest || []);
  const subjectOptions = [...new Set([...(subjects || []), ...(student.subjects_interest || [])])].sort();
  const locations = [...new Set([...INDIA_STATES_AND_REGIONS, ...(student.preferred_locations || [])])];
  const semesterMarks = student.semester_marks || {};
  const isPostgraduate = student.desired_program_level === 'postgraduate';

  return (
    <section className="form-card">
      <span className="kicker">Student record</span>
      <h1>Edit {student.first_name} {student.last_name}</h1>
      <p className="muted">Save profile changes first, then regenerate AI Insights from the updated student record.</p>

      <form action={updateStudentProfileAction} className="grid">
        <input type="hidden" name="studentId" value={student.id} />

        <div className="form-section">
          <h2>Student basics</h2>
          <div className="grid grid-3">
            <div className="field"><label htmlFor="firstName">First name *</label><input id="firstName" name="firstName" required defaultValue={student.first_name} /></div>
            <div className="field"><label htmlFor="lastName">Last name *</label><input id="lastName" name="lastName" required defaultValue={student.last_name} /></div>
            <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" defaultValue={student.email || ''} /></div>
            <div className="field"><label htmlFor="phone">Phone *</label><input id="phone" name="phone" type="tel" required defaultValue={student.phone || ''} /></div>
            <div className="field"><label htmlFor="city">City</label><input id="city" name="city" defaultValue={student.city || ''} /></div>
            <div className="field"><label htmlFor="state">State</label><input id="state" name="state" defaultValue={student.state || ''} /></div>
            <div className="field"><label htmlFor="country">Country</label><input id="country" name="country" defaultValue={student.country || 'India'} /></div>
            <div className="field"><label htmlFor="board">Board</label><input id="board" name="board" defaultValue={student.board || ''} /></div>
            <div className="field"><label htmlFor="targetIntake">Target intake</label><input id="targetIntake" name="targetIntake" defaultValue={student.target_intake || ''} /></div>
            <div className="field"><label htmlFor="yearX">Class X year</label><input id="yearX" name="yearX" type="number" defaultValue={student.year_x ?? ''} /></div>
            <div className="field"><label htmlFor="marksX">Class X marks (%)</label><input id="marksX" name="marksX" type="number" min="0" max="100" step=".01" defaultValue={student.marks_x ?? ''} /></div>
            <div className="field"><label htmlFor="yearXii">Class XII year</label><input id="yearXii" name="yearXii" type="number" defaultValue={student.year_xii ?? ''} /></div>
            <div className="field"><label htmlFor="marksXii">Class XII marks (%)</label><input id="marksXii" name="marksXii" type="number" min="0" max="100" step=".01" defaultValue={student.marks_xii ?? ''} /></div>
          </div>
        </div>

        <div className="form-section">
          <h2>Preferences and budget</h2>
          <div className="grid grid-2">
            <div className="field">
              <label htmlFor="subjectsInterest">Subjects / course interests</label>
              <select id="subjectsInterest" name="subjectsInterest" multiple defaultValue={student.subjects_interest || []}>
                {subjectOptions.map((subject) => <option key={subject}>{subject}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="preferredLocations">Preferred locations</label>
              <select id="preferredLocations" name="preferredLocations" multiple defaultValue={student.preferred_locations || []}>
                {locations.map((location) => <option key={location}>{location}</option>)}
              </select>
            </div>
            <div className="field"><label htmlFor="budgetMin">Minimum total course cost</label><select id="budgetMin" name="budgetMin" defaultValue={student.budget_min ?? ''}><option value="">Not specified</option>{BUDGETS.map((value) => <option key={value} value={value}>INR {value.toLocaleString('en-IN')}</option>)}</select></div>
            <div className="field"><label htmlFor="budgetMax">Maximum total course cost</label><select id="budgetMax" name="budgetMax" defaultValue={student.budget_max ?? ''}><option value="">Not specified</option>{BUDGETS.map((value) => <option key={value} value={value}>INR {value.toLocaleString('en-IN')}</option>)}</select></div>
            <div className="field"><label htmlFor="salaryExpectation">Expected package (INR)</label><input id="salaryExpectation" name="salaryExpectation" type="number" min="0" defaultValue={student.salary_expectation ?? ''} /></div>
          </div>
          <div className="grid grid-3">
            <div className="field"><label>Hostel required</label><select name="hostelRequired" defaultValue={student.hostel_required ? 'yes' : 'no'}><option value="yes">Yes</option><option value="no">No</option></select></div>
            <div className="field"><label>Education loan required</label><select name="loanRequired" defaultValue={student.loan_required ? 'yes' : 'no'}><option value="yes">Yes</option><option value="no">No</option></select></div>
            <div className="field"><label>Below poverty line</label><select name="belowPovertyLine" defaultValue={student.below_poverty_line ? 'yes' : 'no'}><option value="yes">Yes</option><option value="no">No</option></select></div>
          </div>
          <div className="field">
            <label htmlFor="supportRequired">Future Plus support required</label>
            <select id="supportRequired" name="supportRequired" multiple defaultValue={student.support_required || []}>
              {SUPPORT_OPTIONS.map((option) => <option key={option}>{option}</option>)}
            </select>
          </div>
        </div>

        {isPostgraduate ? (
          <div className="form-section">
            <h2>Post Graduate profile</h2>
            <div className="grid grid-3">
              <div className="field"><label htmlFor="undergraduateDegree">Under Graduate degree</label><input id="undergraduateDegree" name="undergraduateDegree" defaultValue={student.undergraduate_degree || ''} /></div>
              <div className="field"><label htmlFor="undergraduateSpecialisation">Specialisation</label><input id="undergraduateSpecialisation" name="undergraduateSpecialisation" defaultValue={student.undergraduate_specialisation || ''} /></div>
              <div className="field"><label htmlFor="undergraduateUniversity">University</label><input id="undergraduateUniversity" name="undergraduateUniversity" defaultValue={student.undergraduate_university || ''} /></div>
              <div className="field"><label htmlFor="undergraduateGraduationYear">Graduation year</label><input id="undergraduateGraduationYear" name="undergraduateGraduationYear" type="number" defaultValue={student.undergraduate_graduation_year ?? ''} /></div>
              <div className="field"><label htmlFor="pgApplicantStatus">Applicant status</label><select id="pgApplicantStatus" name="pgApplicantStatus" defaultValue={student.pg_applicant_status || ''}><option value="">Not specified</option><option value="final_semester">Final semester</option><option value="passed_out">Passed out</option><option value="working_professional">Working professional</option></select></div>
              <div className="field"><label htmlFor="semestersCompleted">Semesters completed</label><input id="semestersCompleted" name="semestersCompleted" type="number" min="0" max="12" defaultValue={student.semesters_completed ?? ''} /></div>
              <div className="field"><label htmlFor="undergraduateFinalPercentage">Final percentage</label><input id="undergraduateFinalPercentage" name="undergraduateFinalPercentage" type="number" min="0" max="100" step=".01" defaultValue={student.undergraduate_final_percentage ?? ''} /></div>
              <div className="field"><label htmlFor="currentEmployer">Employer</label><input id="currentEmployer" name="currentEmployer" defaultValue={student.current_employer || ''} /></div>
              <div className="field"><label htmlFor="currentJobTitle">Job title</label><input id="currentJobTitle" name="currentJobTitle" defaultValue={student.current_job_title || ''} /></div>
              <div className="field"><label htmlFor="workExperienceMonths">Experience (months)</label><input id="workExperienceMonths" name="workExperienceMonths" type="number" min="0" defaultValue={student.work_experience_months ?? ''} /></div>
            </div>
            <div className="grid grid-3">
              {Array.from({ length: 12 }, (_, index) => (
                <div className="field" key={index}>
                  <label htmlFor={`semester${index + 1}Marks`}>Semester {index + 1} (%)</label>
                  <input id={`semester${index + 1}Marks`} name={`semester${index + 1}Marks`} type="number" min="0" max="100" step=".01" defaultValue={semesterMarks[`semester_${index + 1}`] ?? ''} />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="form-section">
          <h2>Student profile, achievements and digital presence</h2>
          <div className="grid grid-2">
            <div className="field"><label htmlFor="linkedinUrl">LinkedIn profile</label><input id="linkedinUrl" name="linkedinUrl" type="url" defaultValue={student.linkedin_url || ''} /></div>
            <div className="field"><label htmlFor="portfolioUrl">Portfolio / GitHub / personal site</label><input id="portfolioUrl" name="portfolioUrl" type="url" defaultValue={student.portfolio_url || ''} /></div>
            <div className="field"><label htmlFor="facebookUrl">Facebook</label><input id="facebookUrl" name="facebookUrl" type="url" defaultValue={student.facebook_url || ''} /></div>
            <div className="field"><label htmlFor="instagramUrl">Instagram</label><input id="instagramUrl" name="instagramUrl" type="url" defaultValue={student.instagram_url || ''} /></div>
            <div className="field"><label htmlFor="xUrl">X profile</label><input id="xUrl" name="xUrl" type="url" defaultValue={student.x_url || ''} /></div>
            <div className="field"><label htmlFor="languages">Languages</label><input id="languages" name="languages" defaultValue={student.languages || ''} /></div>
            <div className="field"><label htmlFor="accolades">Accolades and distinctions</label><textarea id="accolades" name="accolades" defaultValue={student.accolades || ''} /></div>
            <div className="field"><label htmlFor="extracurricularActivities">Extracurricular activities</label><textarea id="extracurricularActivities" name="extracurricularActivities" defaultValue={student.extracurricular_activities || ''} /></div>
            <div className="field"><label htmlFor="rewards">Awards and rewards</label><textarea id="rewards" name="rewards" defaultValue={student.rewards || ''} /></div>
            <div className="field"><label htmlFor="specialSkills">Special skills</label><textarea id="specialSkills" name="specialSkills" defaultValue={student.special_skills || ''} /></div>
            <div className="field"><label htmlFor="certifications">Certifications</label><textarea id="certifications" name="certifications" defaultValue={student.certifications || ''} /></div>
            <div className="field"><label htmlFor="workExperience">Projects, internships or work experience</label><textarea id="workExperience" name="workExperience" defaultValue={student.work_experience || ''} /></div>
          </div>
        </div>

        <div className="form-section">
          <h2>Counselling profile</h2>
          <div className="grid grid-2">
            <div className="field"><label htmlFor="passion">Passion</label><textarea id="passion" name="passion" defaultValue={student.passion || ''} /></div>
            <div className="field"><label htmlFor="purpose">Purpose</label><textarea id="purpose" name="purpose" defaultValue={student.purpose || ''} /></div>
            <div className="field"><label htmlFor="strengths">Strengths</label><textarea id="strengths" name="strengths" defaultValue={student.strengths || ''} /></div>
            <div className="field"><label htmlFor="constraints">Constraints</label><textarea id="constraints" name="constraints" defaultValue={student.constraints || ''} /></div>
            <div className="field"><label htmlFor="careerGoals">Career goals</label><textarea id="careerGoals" name="careerGoals" defaultValue={student.career_goals || ''} /></div>
            <div className="field"><label htmlFor="notes">Staff notes</label><textarea id="notes" name="notes" defaultValue={student.notes || ''} /></div>
          </div>
        </div>

        <div className="actions">
          <button className="primary-button" type="submit">Save Student Changes</button>
          <Link className="secondary-button" href={`/students/${student.id}`}>Cancel</Link>
        </div>
      </form>
    </section>
  );
}
