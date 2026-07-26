import SubmitButton from '@/components/SubmitButton';
import { DEFAULT_SUBJECT_AREAS, INDIA_STATES_AND_REGIONS } from '@/lib/constants';
import { addCollegeCourseAction } from './actions';
import CollegeImport from '@/components/CollegeImport';

export default function AdminPage() {
  return (
    <section className="grid">
      <div className="form-card">
      <span className="kicker">Admin Data Entry</span>
      <h1>Add college and course data</h1>
      <p className="muted">
        Add or update one institution manually, or use the bulk spreadsheet workflow below.
      </p>
      <div className="bulk-import-grid">
        <CollegeImport programLevel="undergraduate" />
        <CollegeImport programLevel="postgraduate" />
      </div>

      <form action={addCollegeCourseAction}>
        <div className="form-section">
          <h2>College details</h2>
          <div className="grid grid-2">
            <div className="field">
              <label htmlFor="programLevel">Program level</label>
              <select id="programLevel" name="programLevel" defaultValue="undergraduate">
                <option value="undergraduate">Undergraduate</option>
                <option value="postgraduate">Postgraduate</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="collegeName">College name *</label>
              <input id="collegeName" name="collegeName" required />
            </div>
            <div className="field">
              <label htmlFor="country">Country</label>
              <input id="country" name="country" defaultValue="India" />
            </div>
            <div className="field">
              <label htmlFor="city">City</label>
              <input id="city" name="city" />
            </div>
            <div className="field">
              <label htmlFor="state">State / region</label>
              <select id="state" name="state" defaultValue="">
                <option value="">Select</option>
                {INDIA_STATES_AND_REGIONS.filter((item) => item !== 'Anywhere in India').map((location) => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="partnerStatus">Future Plus partner status</label>
              <select id="partnerStatus" name="partnerStatus" defaultValue="non_partner">
                <option value="preferred_partner">Preferred partner</option>
                <option value="pipeline_partner">Pipeline partner</option>
                <option value="non_partner">Non-partner</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="sourceUrl">Source URL / verification link</label>
              <input id="sourceUrl" name="sourceUrl" type="url" placeholder="https://..." />
            </div>
            <div className="field"><label htmlFor="pocName">College POC name</label><input id="pocName" name="pocName" /></div>
            <div className="field"><label htmlFor="pocEmail">College POC email</label><input id="pocEmail" name="pocEmail" type="email" /></div>
          </div>
          <div className="grid grid-2">
            <label><input type="checkbox" name="commissionBased" /> Commission based arrangement</label>
            <label><input type="checkbox" name="hostelAvailable" /> Hostel available</label>
          </div>
        </div>

        <div className="form-section">
          <h2>Course and placement details</h2>
          <div className="grid grid-2">
            <div className="field">
              <label htmlFor="courseName">Course name *</label>
              <input id="courseName" name="courseName" required placeholder="BBA, B.Tech CSE, B.Pharm" />
            </div>
            <div className="field">
              <label htmlFor="subjectArea">Subject area *</label>
              <select id="subjectArea" name="subjectArea" required>
                {DEFAULT_SUBJECT_AREAS.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="duration">Duration</label>
              <input id="duration" name="duration" placeholder="3 years / 4 years" />
            </div>
            <div className="field">
              <label htmlFor="currency">Currency</label>
              <input id="currency" name="currency" defaultValue="INR" />
            </div>
            <div className="field">
              <label htmlFor="totalFee">Total fee</label>
              <input id="totalFee" name="totalFee" type="number" min="0" step="1000" />
            </div>
            <div className="field">
              <label htmlFor="placementCount">Placement count</label>
              <input id="placementCount" name="placementCount" type="number" min="0" step="1" />
            </div>
            <div className="field">
              <label htmlFor="highestPackage">Highest package</label>
              <input id="highestPackage" name="highestPackage" type="number" min="0" step="1000" />
            </div>
            <div className="field">
              <label htmlFor="averagePackage">Average package</label>
              <input id="averagePackage" name="averagePackage" type="number" min="0" step="1000" />
            </div>
          </div>
        </div>

        <SubmitButton>Add College Course</SubmitButton>
      </form>
      </div>
    </section>
  );
}
