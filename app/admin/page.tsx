import SubmitButton from '@/components/SubmitButton';
import { DEFAULT_SUBJECT_AREAS, INDIA_STATES_AND_REGIONS } from '@/lib/constants';
import { addCollegeCourseAction } from './actions';
import CollegeImport from '@/components/CollegeImport';
import { createClient } from '@/lib/supabase/server';
import { decideDeletionRequestAction } from './deletion-actions';

export default async function AdminPage({
  searchParams
}: {
  searchParams: Promise<{ decision?: string }>;
}) {
  const { decision } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    : { data: null };
  const isAdmin = profile?.role === 'admin';
  const { data: deletionRequests } = isAdmin
    ? await supabase.from('deletion_requests').select('*').eq('status', 'pending').order('created_at')
    : { data: [] };

  return (
    <section className="grid">
      {isAdmin ? (
        <div className="table-card">
          <span className="kicker">Super User approval</span>
          <h2>Pending deletion requests</h2>
          {decision ? <p className="success-message">Deletion request {decision}.</p> : null}
          <div className="table-wrap">
            <table>
              <thead><tr><th>Record</th><th>Type</th><th>Requested by</th><th>Requested</th><th>Decision</th></tr></thead>
              <tbody>
                {(deletionRequests ?? []).map((request) => (
                  <tr key={request.id}>
                    <td><strong>{request.target_name}</strong></td>
                    <td>{request.target_type.replaceAll('_', ' ')}</td>
                    <td>{request.requested_by_email || request.requested_by}</td>
                    <td>{new Date(request.created_at).toLocaleString('en-IN')}</td>
                    <td>
                      <div className="deletion-decision-actions">
                        <form action={decideDeletionRequestAction}>
                          <input type="hidden" name="requestId" value={request.id} />
                          <input type="hidden" name="decision" value="approved" />
                          <button className="danger-button" type="submit">Approve deletion</button>
                        </form>
                        <form action={decideDeletionRequestAction}>
                          <input type="hidden" name="requestId" value={request.id} />
                          <input type="hidden" name="decision" value="rejected" />
                          <button className="secondary-button" type="submit">Reject</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
                {!deletionRequests?.length ? <tr><td colSpan={5}>No deletion requests are awaiting approval.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
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
                <option value="undergraduate">Under Graduate</option>
                <option value="postgraduate">Post Graduate</option>
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
