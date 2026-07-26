import StudentIntakeWizard from '@/components/StudentIntakeWizard';
import { INDIA_STATES_AND_REGIONS, SUPPORT_OPTIONS } from '@/lib/constants';
import { createStudentAction } from '../../actions';

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

const PG_INTERESTS = [
  ['Management', 'Business Administration / MBA'],
  ['Computer Applications', 'Computer Applications / MCA'],
  ['Engineering', 'Engineering / M.Tech'],
  ['Data Science', 'Data Science / Analytics'],
  ['Science', 'Science / M.Sc'],
  ['Commerce', 'Commerce / M.Com'],
  ['Social Sciences', 'Arts / M.A'],
  ['Law', 'Law / LL.M'],
  ['Pharmacy', 'Pharmacy / M.Pharm'],
  ['Healthcare', 'Healthcare / Public Health'],
  ['Study Abroad', 'Study Abroad']
];

export default function NewPostgraduateStudentPage() {
  return (
    <section className="form-card">
      <span className="kicker">Post Graduate Student Intake</span>
      <h1>Post Graduate counselling form</h1>
      <p className="muted">Capture graduation progress, semester results, final marks and professional experience for postgraduate counselling.</p>

      <StudentIntakeWizard
        action={createStudentAction}
        programLevel="postgraduate"
        stepLabels={['Applicant', 'Academics', 'Semester marks', 'Experience', 'Preferences', 'Goals']}
        submitLabel="Save Post Graduate Student and Generate Recommendations"
      >

        <div className="form-section">
          <h2>1. Applicant details</h2>
          <div className="grid grid-2">
            <div className="field"><label htmlFor="firstName">First name *</label><input id="firstName" name="firstName" required /></div>
            <div className="field"><label htmlFor="lastName">Last name *</label><input id="lastName" name="lastName" required /></div>
            <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" /></div>
            <div className="field"><label htmlFor="phone">Phone</label><input id="phone" name="phone" /></div>
            <div className="field"><label htmlFor="city">Current city</label><input id="city" name="city" /></div>
            <div className="field"><label htmlFor="country">Country</label><input id="country" name="country" defaultValue="India" /></div>
          </div>
        </div>

        <div className="form-section">
          <h2>2. School and undergraduate academics</h2>
          <div className="grid grid-3">
            <div className="field"><label htmlFor="yearX">Year for X Standard</label><input id="yearX" name="yearX" type="number" min="1950" max="2100" /></div>
            <div className="field"><label htmlFor="marksX">Marks in X (%)</label><input id="marksX" name="marksX" type="number" min="0" max="100" step=".01" /></div>
            <div className="field"><label htmlFor="yearXii">Year for XII</label><input id="yearXii" name="yearXii" type="number" min="1950" max="2100" /></div>
            <div className="field"><label htmlFor="marksXii">Marks in XII (%)</label><input id="marksXii" name="marksXii" type="number" min="0" max="100" step=".01" /></div>
            <div className="field"><label htmlFor="undergraduateDegree">Under Graduate degree *</label><input id="undergraduateDegree" name="undergraduateDegree" placeholder="B.Tech, BBA, B.Com, B.Sc..." required /></div>
            <div className="field"><label htmlFor="undergraduateSpecialisation">Specialisation</label><input id="undergraduateSpecialisation" name="undergraduateSpecialisation" /></div>
            <div className="field"><label htmlFor="undergraduateUniversity">College / University *</label><input id="undergraduateUniversity" name="undergraduateUniversity" required /></div>
            <div className="field"><label htmlFor="undergraduateGraduationYear">Graduation / expected year *</label><input id="undergraduateGraduationYear" name="undergraduateGraduationYear" type="number" min="1950" max="2100" required /></div>
            <div className="field">
              <label htmlFor="pgApplicantStatus">Applicant status *</label>
              <select id="pgApplicantStatus" name="pgApplicantStatus" required defaultValue="">
                <option value="" disabled>Select status</option>
                <option value="final_semester">Final-semester student</option>
                <option value="passed_out">Passed out / graduate</option>
                <option value="working_professional">Working professional</option>
              </select>
            </div>
            <div className="field"><label htmlFor="semestersCompleted">Semester results available</label><input id="semestersCompleted" name="semestersCompleted" type="number" min="1" max="12" /></div>
            <div className="field"><label htmlFor="undergraduateFinalPercentage">Final graduation marks (%)</label><input id="undergraduateFinalPercentage" name="undergraduateFinalPercentage" type="number" min="0" max="100" step=".01" /><span className="help-text">Required for passed-out applicants and working professionals.</span></div>
          </div>
        </div>

        <div className="form-section">
          <h2>3. Semester-wise marks available</h2>
          <p className="help-text">Final-semester students should enter every declared semester result. Leave future or unavailable semesters blank.</p>
          <div className="grid grid-3">
            {Array.from({ length: 12 }, (_, index) => (
              <div className="field" key={index}>
                <label htmlFor={`semester${index + 1}Marks`}>Semester {index + 1} (%)</label>
                <input id={`semester${index + 1}Marks`} name={`semester${index + 1}Marks`} type="number" min="0" max="100" step=".01" />
              </div>
            ))}
          </div>
        </div>

        <div className="form-section">
          <h2>4. Work experience</h2>
          <div className="grid grid-3">
            <div className="field"><label htmlFor="currentEmployer">Current / latest employer</label><input id="currentEmployer" name="currentEmployer" /></div>
            <div className="field"><label htmlFor="currentJobTitle">Job title</label><input id="currentJobTitle" name="currentJobTitle" /></div>
            <div className="field"><label htmlFor="workExperienceMonths">Total experience (months)</label><input id="workExperienceMonths" name="workExperienceMonths" type="number" min="0" /></div>
          </div>
          <div className="field"><label htmlFor="workExperience">Experience, internships and projects</label><textarea id="workExperience" name="workExperience" /></div>
        </div>

        <div className="form-section">
          <h2>5. Post Graduate preference</h2>
          <div className="grid grid-2">
            <div className="field"><label htmlFor="subjectsInterest">Post Graduate course interests *</label><select id="subjectsInterest" name="subjectsInterest" multiple required>{PG_INTERESTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            <div className="field"><label htmlFor="preferredLocations">Preferred locations</label><select id="preferredLocations" name="preferredLocations" multiple>{INDIA_STATES_AND_REGIONS.map((item) => <option key={item}>{item}</option>)}</select></div>
            <div className="field"><label htmlFor="targetIntake">Target intake</label><input id="targetIntake" name="targetIntake" placeholder="2027 July" /></div>
            <div className="field"><label htmlFor="salaryExpectation">Expected package, INR</label><input id="salaryExpectation" name="salaryExpectation" type="number" min="0" /></div>
            <div className="field">
              <label htmlFor="budgetMin">Minimum total course cost</label>
              <select id="budgetMin" name="budgetMin" defaultValue="" required>
                <option value="" disabled>Select minimum budget</option>
                {TOTAL_COST_BUDGET_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <span className="help-text">Overall Post Graduate programme cost, not per semester or year.</span>
            </div>
            <div className="field">
              <label htmlFor="budgetMax">Maximum total course cost</label>
              <select id="budgetMax" name="budgetMax" defaultValue="" required>
                <option value="" disabled>Select maximum budget</option>
                {TOTAL_COST_BUDGET_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <span className="help-text">Saved in the database as a numeric INR amount.</span>
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
          <div className="field"><label htmlFor="supportRequired">Future Plus support required</label><select id="supportRequired" name="supportRequired" multiple>{SUPPORT_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select></div>
        </div>

        <div className="form-section">
          <h2>6. Goals and profile</h2>
          <div className="grid grid-2">
            <div className="field"><label htmlFor="careerGoals">Career goals</label><textarea id="careerGoals" name="careerGoals" /></div>
            <div className="field"><label htmlFor="passion">Interests and passion</label><textarea id="passion" name="passion" /></div>
            <div className="field"><label htmlFor="strengths">Strengths</label><textarea id="strengths" name="strengths" /></div>
            <div className="field"><label htmlFor="constraints">Constraints</label><textarea id="constraints" name="constraints" /></div>
            <div className="field"><label htmlFor="linkedinUrl">LinkedIn</label><input id="linkedinUrl" name="linkedinUrl" type="url" /></div>
            <div className="field"><label htmlFor="portfolioUrl">Portfolio</label><input id="portfolioUrl" name="portfolioUrl" type="url" /></div>
            <div className="field"><label htmlFor="certifications">Certifications</label><textarea id="certifications" name="certifications" /></div>
            <div className="field"><label htmlFor="notes">Staff notes</label><textarea id="notes" name="notes" /></div>
          </div>
        </div>

      </StudentIntakeWizard>
    </section>
  );
}
