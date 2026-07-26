import StudentIntakeWizard from '@/components/StudentIntakeWizard';
import { DEFAULT_SUBJECT_AREAS, INDIA_STATES_AND_REGIONS, SUPPORT_OPTIONS } from '@/lib/constants';
import { getSubjectAreas } from '@/lib/data';
import { createStudentAction } from '../actions';

const TOTAL_COST_BUDGET_OPTIONS = [
  [200000, 'INR 2 Lakhs'],
  [500000, 'INR 5 Lakhs'],
  [1000000, 'INR 10 Lakhs'],
  [1500000, 'INR 15 Lakhs'],
  [2000000, 'INR 20 Lakhs'],
  [2500000, 'INR 25 Lakhs'],
  [3000000, 'INR 30 Lakhs'],
  [4000000, 'INR 40 Lakhs'],
  [5000000, 'INR 50 Lakhs'],
  [7500000, 'INR 75 Lakhs'],
  [10000000, 'INR 1 Crore']
] as const;

export default async function NewStudentPage() {
  let subjectAreas = DEFAULT_SUBJECT_AREAS;
  try {
    const dbSubjects = await getSubjectAreas();
    subjectAreas = [...new Set([...DEFAULT_SUBJECT_AREAS, ...dbSubjects])].sort();
  } catch {
    subjectAreas = DEFAULT_SUBJECT_AREAS;
  }

  return (
    <section className="form-card">
      <span className="kicker">Student Intake</span>
      <h1>Under Graduate counselling form</h1>
      <p className="muted">
        Capture the student requirement once. The system will store the record in Supabase and generate a first-pass recommendation score.
      </p>

      <StudentIntakeWizard
        action={createStudentAction}
        programLevel="undergraduate"
        stepLabels={['Student', 'Preferences', 'Budget & support', 'Profile', 'Notes']}
        submitLabel="Save Student and Generate Recommendations"
      >
        <div className="form-section">
          <h2>1. Student basics</h2>
          <div className="grid grid-2">
            <div className="field">
              <label htmlFor="firstName">First name *</label>
              <input id="firstName" name="firstName" required />
            </div>
            <div className="field">
              <label htmlFor="lastName">Last name *</label>
              <input id="lastName" name="lastName" required />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" />
            </div>
            <div className="field">
              <label htmlFor="phone">Phone</label>
              <input id="phone" name="phone" />
            </div>
            <div className="field">
              <label htmlFor="board">Board / curriculum</label>
              <input id="board" name="board" placeholder="CBSE, ISC, IB, State Board" />
            </div>
            <div className="field">
              <label htmlFor="yearX">Year for X Standard</label>
              <input id="yearX" name="yearX" type="number" min="1950" max="2100" placeholder="e.g. 2024" />
            </div>
            <div className="field">
              <label htmlFor="marksX">Marks in X (%)</label>
              <input id="marksX" name="marksX" type="number" min="0" max="100" step="0.01" />
            </div>
            <div className="field">
              <label htmlFor="yearXii">Year for XII</label>
              <input id="yearXii" name="yearXii" type="number" min="1950" max="2100" placeholder="e.g. 2026" />
            </div>
            <div className="field">
              <label htmlFor="marksXii">Marks in XII (%)</label>
              <input id="marksXii" name="marksXii" type="number" min="0" max="100" step="0.01" />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>2. Academic and admission preference</h2>
          <div className="grid grid-2">
            <div className="field">
              <label htmlFor="subjectsInterest">Subjects / course interests *</label>
              <select id="subjectsInterest" name="subjectsInterest" multiple required>
                {subjectAreas.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
              </select>
              <span className="help-text">Hold Ctrl/Cmd to select multiple subjects. This list is merged from default options and database course subjects.</span>
            </div>
            <div className="field">
              <label htmlFor="preferredLocations">Preferred locations</label>
              <select id="preferredLocations" name="preferredLocations" multiple>
                {INDIA_STATES_AND_REGIONS.map((location) => <option key={location} value={location}>{location}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="targetIntake">Target intake</label>
              <input id="targetIntake" name="targetIntake" placeholder="e.g. 2026 July / 2027 January" />
            </div>
            <div className="field">
              <label htmlFor="country">Country focus</label>
              <input id="country" name="country" defaultValue="India" />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>3. Commercial and support requirements</h2>
          <div className="grid grid-3">
            <div className="field">
              <label htmlFor="budgetMin">Minimum total course cost</label>
              <select id="budgetMin" name="budgetMin" defaultValue="" required>
                <option value="" disabled>Select minimum budget</option>
                {TOTAL_COST_BUDGET_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <span className="help-text">Overall programme cost, not per semester or year.</span>
            </div>
            <div className="field">
              <label htmlFor="budgetMax">Maximum total course cost</label>
              <select id="budgetMax" name="budgetMax" defaultValue="" required>
                <option value="" disabled>Select maximum budget</option>
                {TOTAL_COST_BUDGET_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <span className="help-text">Saved in the database as a numeric INR amount.</span>
            </div>
            <div className="field">
              <label htmlFor="salaryExpectation">Expected package, INR</label>
              <input id="salaryExpectation" name="salaryExpectation" type="number" min="0" step="1000" />
            </div>
          </div>
          <div className="grid grid-3 support-questions">
            <div className="field">
              <label>Does the student require hostel facilities? *</label>
              <div className="choice-group">
                <label className="choice-card"><input type="radio" name="hostelRequired" value="yes" required /> Yes</label>
                <label className="choice-card"><input type="radio" name="hostelRequired" value="no" required /> No</label>
              </div>
            </div>
            <div className="field">
              <label>Does the student require an education loan? *</label>
              <div className="choice-group">
                <label className="choice-card"><input type="radio" name="loanRequired" value="yes" required /> Yes</label>
                <label className="choice-card"><input type="radio" name="loanRequired" value="no" required /> No</label>
              </div>
            </div>
            <div className="field">
              <label>Is the student from a below-poverty-line household? *</label>
              <div className="choice-group">
                <label className="choice-card"><input type="radio" name="belowPovertyLine" value="yes" required /> Yes</label>
                <label className="choice-card"><input type="radio" name="belowPovertyLine" value="no" required /> No</label>
              </div>
              <span className="help-text">Selecting Yes automatically flags Financial Aid Required.</span>
            </div>
          </div>
          <div className="field">
            <label htmlFor="supportRequired">Future Plus support required</label>
            <select id="supportRequired" name="supportRequired" multiple>
              {SUPPORT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
        </div>

        <div className="form-section">
          <h2>4. Student profile, achievements and digital presence</h2>
          <div className="grid grid-2">
            <div className="field"><label htmlFor="linkedinUrl">LinkedIn profile</label><input id="linkedinUrl" name="linkedinUrl" type="url" placeholder="https://linkedin.com/in/..." /></div>
            <div className="field"><label htmlFor="portfolioUrl">Portfolio / GitHub / personal site</label><input id="portfolioUrl" name="portfolioUrl" type="url" placeholder="https://..." /></div>
            <div className="field"><label htmlFor="facebookUrl">Facebook</label><input id="facebookUrl" name="facebookUrl" type="url" /></div>
            <div className="field"><label htmlFor="instagramUrl">Instagram</label><input id="instagramUrl" name="instagramUrl" type="url" /></div>
            <div className="field"><label htmlFor="xUrl">X profile</label><input id="xUrl" name="xUrl" type="url" /></div>
            <div className="field"><label htmlFor="languages">Languages</label><input id="languages" name="languages" placeholder="Odia, Hindi, English" /></div>
            <div className="field"><label htmlFor="accolades">Accolades and distinctions</label><textarea id="accolades" name="accolades" /></div>
            <div className="field"><label htmlFor="extracurricularActivities">Extracurricular activities</label><textarea id="extracurricularActivities" name="extracurricularActivities" /></div>
            <div className="field"><label htmlFor="rewards">Awards and rewards</label><textarea id="rewards" name="rewards" /></div>
            <div className="field"><label htmlFor="specialSkills">Special skills</label><textarea id="specialSkills" name="specialSkills" placeholder="Technical, creative, leadership and domain skills" /></div>
            <div className="field"><label htmlFor="certifications">Certifications</label><textarea id="certifications" name="certifications" /></div>
            <div className="field"><label htmlFor="workExperience">Projects, internships or work experience</label><textarea id="workExperience" name="workExperience" /></div>
          </div>
        </div>

        <div className="form-section">
          <h2>5. Passion, purpose and counselling notes</h2>
          <div className="grid grid-2">
            <div className="field">
              <label htmlFor="passion">Student passion</label>
              <textarea id="passion" name="passion" placeholder="What topics, problems or activities energise the student?" />
            </div>
            <div className="field">
              <label htmlFor="purpose">Student purpose</label>
              <textarea id="purpose" name="purpose" placeholder="What impact or future direction does the student want to create?" />
            </div>
            <div className="field">
              <label htmlFor="strengths">Strengths</label>
              <textarea id="strengths" name="strengths" />
            </div>
            <div className="field">
              <label htmlFor="constraints">Constraints</label>
              <textarea id="constraints" name="constraints" placeholder="Budget, location, marks, family, travel or other constraints" />
            </div>
            <div className="field"><label htmlFor="careerGoals">Career goals</label><textarea id="careerGoals" name="careerGoals" placeholder="Roles, industries or problems the student wants to pursue" /></div>
          </div>
          <div className="field">
            <label htmlFor="notes">Internal staff notes</label>
            <textarea id="notes" name="notes" />
          </div>
        </div>

      </StudentIntakeWizard>
    </section>
  );
}
